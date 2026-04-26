from collections import defaultdict
from datetime import datetime
from difflib import SequenceMatcher
import json

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.parameter_dublettenausschluss import ParameterDublettenausschluss
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.parameter_klassifikation import ParameterKlassifikation
from labordaten_backend.models.parameter_umrechnungsregel import ParameterUmrechnungsregel
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch
from labordaten_backend.models.wissensseite import Wissensseite
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import conversions
from labordaten_backend.modules.parameter.normalization import (
    build_parameter_key_candidate,
    normalize_parameter_name,
    tokenize_parameter_name,
)
from labordaten_backend.modules.parameter.schemas import (
    ParameterAliasCreate,
    ParameterAliasSuggestionRead,
    ParameterKlassifikationCreate,
    ParameterKlassifikationDeleteResult,
    ParameterKlassifikationRead,
    ParameterDuplicatePruefschaerfe,
    ParameterDuplicateSuppressionCreate,
    ParameterDuplicateSuppressionRead,
    ParameterDuplicateSuggestionRead,
    ParameterGruppenzuordnungRead,
    ParameterMergeRequest,
    ParameterMergeResultRead,
    ParameterCreate,
    ParameterPrimaereKlassifikationUpdate,
    ParameterPrimaereKlassifikationUpdateResult,
    ParameterRead,
    ParameterWissensseiteUpdate,
    ParameterWissensseiteUpdateResult,
    ParameterUmrechnungsregelCreate,
    ParameterUmrechnungsregelRead,
    ParameterRenameRequest,
    ParameterRenameResultRead,
    ParameterStandardEinheitUpdate,
    ParameterStandardEinheitUpdateResult,
    ParameterUsageSummaryRead,
)
from labordaten_backend.modules.wissensbasis import service as wissensbasis_service
from labordaten_backend.modules.wissensbasis.schemas import WissensseiteCreate


def list_parameter(db: Session) -> list[ParameterRead]:
    parameters = list(db.scalars(select(Laborparameter).order_by(Laborparameter.anzeigename)))
    usage_summaries = _build_parameter_usage_summaries(db, [parameter.id for parameter in parameters])
    knowledge_pages = _build_parameter_knowledge_pages(db, parameters)
    return [
        _build_parameter_read(
            parameter,
            usage_summaries.get(parameter.id),
            knowledge_pages.get(parameter.wissensseite_id),
        )
        for parameter in parameters
    ]


def create_parameter(
    db: Session,
    payload: ParameterCreate,
    *,
    create_knowledge_page: bool = False,
) -> Laborparameter:
    parameter_data = payload.model_dump()
    parameter_data["interner_schluessel"] = _build_unique_parameter_key(
        db,
        payload.interner_schluessel or payload.anzeigename,
    )
    parameter_data["standard_einheit"] = einheiten_service.require_existing_einheit(
        db,
        payload.standard_einheit,
        field_label="Standardeinheit",
    )
    parameter = Laborparameter(**parameter_data)
    db.add(parameter)
    if create_knowledge_page:
        db.flush()
        ensure_parameter_knowledge_page(db, parameter)
    db.commit()
    db.refresh(parameter)
    return parameter


def get_parameter(db: Session, parameter_id: str) -> ParameterRead | None:
    parameter = db.get(Laborparameter, parameter_id)
    if parameter is None:
        return None
    usage_summaries = _build_parameter_usage_summaries(db, [parameter.id])
    knowledge_pages = _build_parameter_knowledge_pages(db, [parameter])
    return _build_parameter_read(parameter, usage_summaries.get(parameter.id), knowledge_pages.get(parameter.wissensseite_id))


def update_parameter_standard_einheit(
    db: Session,
    parameter_id: str,
    payload: ParameterStandardEinheitUpdate,
) -> ParameterStandardEinheitUpdateResult:
    parameter = _require_parameter(db, parameter_id)
    new_standard_einheit = einheiten_service.require_existing_einheit(
        db,
        payload.standard_einheit,
        field_label="Standardeinheit",
    )
    parameter.standard_einheit = new_standard_einheit
    neu_berechnete_messwerte = conversions.recalculate_normalized_measurements_for_parameter(db, parameter_id)
    db.commit()
    db.refresh(parameter)
    return ParameterStandardEinheitUpdateResult(
        parameter_id=parameter.id,
        parameter_anzeigename=parameter.anzeigename,
        standard_einheit=parameter.standard_einheit,
        neu_berechnete_messwerte=neu_berechnete_messwerte,
    )


def update_parameter_primaere_klassifikation(
    db: Session,
    parameter_id: str,
    payload: ParameterPrimaereKlassifikationUpdate,
) -> ParameterPrimaereKlassifikationUpdateResult:
    parameter = _require_parameter(db, parameter_id)
    parameter.primaere_klassifikation = payload.primaere_klassifikation
    db.commit()
    db.refresh(parameter)
    return ParameterPrimaereKlassifikationUpdateResult(
        parameter_id=parameter.id,
        parameter_anzeigename=parameter.anzeigename,
        primaere_klassifikation=parameter.primaere_klassifikation,
    )


def update_parameter_wissensseite(
    db: Session,
    parameter_id: str,
    payload: ParameterWissensseiteUpdate,
) -> ParameterWissensseiteUpdateResult:
    parameter = _require_parameter(db, parameter_id)
    pfad_relativ = payload.pfad_relativ.strip() if payload.pfad_relativ else None

    if not pfad_relativ:
        parameter.wissensseite_id = None
        db.commit()
        db.refresh(parameter)
        return ParameterWissensseiteUpdateResult(
            parameter_id=parameter.id,
            parameter_anzeigename=parameter.anzeigename,
        )

    detail = wissensbasis_service.get_wissensseite_detail(pfad_relativ)
    if detail is None:
        raise ValueError("Die ausgewählte Wissensseite existiert nicht.")

    wissensseite = db.scalar(select(Wissensseite).where(Wissensseite.pfad_relativ == detail.pfad_relativ))
    if wissensseite is None:
        wissensseite = Wissensseite(pfad_relativ=detail.pfad_relativ)
        db.add(wissensseite)

    wissensseite.titel_cache = detail.titel
    wissensseite.alias_cache = "\n".join(detail.aliases) if detail.aliases else None
    wissensseite.frontmatter_json = json.dumps(detail.frontmatter, ensure_ascii=False) if detail.frontmatter else None
    wissensseite.letzter_scan_am = detail.geaendert_am.isoformat()
    wissensseite.aktiv = True
    db.flush()

    parameter.wissensseite_id = wissensseite.id
    db.commit()
    db.refresh(parameter)
    return ParameterWissensseiteUpdateResult(
        parameter_id=parameter.id,
        parameter_anzeigename=parameter.anzeigename,
        wissensseite_id=wissensseite.id,
        wissensseite_pfad_relativ=wissensseite.pfad_relativ,
        wissensseite_titel=wissensseite.titel_cache,
    )


def ensure_parameter_knowledge_page(db: Session, parameter: Laborparameter) -> Wissensseite | None:
    if parameter.wissensseite_id:
        return db.get(Wissensseite, parameter.wissensseite_id)

    page_path = _build_unique_parameter_knowledge_page_path(parameter)
    detail = wissensbasis_service.create_wissensseite(
        WissensseiteCreate(
            pfad_relativ=page_path,
            titel=parameter.anzeigename,
            inhalt_markdown=_build_parameter_knowledge_markdown(parameter),
        )
    )
    wissensseite = Wissensseite(
        pfad_relativ=detail.pfad_relativ,
        titel_cache=detail.titel,
        alias_cache="\n".join(detail.aliases) if detail.aliases else None,
        frontmatter_json=json.dumps(detail.frontmatter, ensure_ascii=False) if detail.frontmatter else None,
        letzter_scan_am=detail.geaendert_am.isoformat(),
        aktiv=True,
    )
    db.add(wissensseite)
    db.flush()
    parameter.wissensseite_id = wissensseite.id
    return wissensseite


def list_parameter_aliase(db: Session, parameter_id: str) -> list[LaborparameterAlias]:
    _require_parameter(db, parameter_id)
    stmt = (
        select(LaborparameterAlias)
        .where(LaborparameterAlias.laborparameter_id == parameter_id)
        .order_by(LaborparameterAlias.alias_text.asc())
    )
    return list(db.scalars(stmt))


def list_parameter_umrechnungsregeln(
    db: Session,
    parameter_id: str,
) -> list[ParameterUmrechnungsregel]:
    _require_parameter(db, parameter_id)
    stmt = (
        select(ParameterUmrechnungsregel)
        .where(ParameterUmrechnungsregel.laborparameter_id == parameter_id)
        .where(ParameterUmrechnungsregel.aktiv.is_(True))
        .order_by(
            func.lower(ParameterUmrechnungsregel.von_einheit).asc(),
            func.lower(ParameterUmrechnungsregel.nach_einheit).asc(),
            ParameterUmrechnungsregel.erstellt_am.asc(),
        )
    )
    return list(db.scalars(stmt))


def list_parameter_gruppen(
    db: Session,
    parameter_id: str,
) -> list[ParameterGruppenzuordnungRead]:
    _require_parameter(db, parameter_id)
    stmt = (
        select(GruppenParameter, ParameterGruppe)
        .join(ParameterGruppe, GruppenParameter.parameter_gruppe_id == ParameterGruppe.id)
        .where(GruppenParameter.laborparameter_id == parameter_id)
        .where(ParameterGruppe.aktiv.is_(True))
        .order_by(
            GruppenParameter.sortierung.asc().nulls_last(),
            func.lower(ParameterGruppe.name).asc(),
        )
    )
    return [
        ParameterGruppenzuordnungRead(
            id=zuordnung.id,
            parameter_gruppe_id=gruppe.id,
            gruppenname=gruppe.name,
            sortierung=zuordnung.sortierung,
        )
        for zuordnung, gruppe in db.execute(stmt)
    ]


def list_parameter_klassifikationen(
    db: Session,
    parameter_id: str,
) -> list[ParameterKlassifikationRead]:
    _require_parameter(db, parameter_id)
    stmt = (
        select(ParameterKlassifikation)
        .where(ParameterKlassifikation.laborparameter_id == parameter_id)
        .where(ParameterKlassifikation.aktiv.is_(True))
        .order_by(ParameterKlassifikation.erstellt_am.desc())
    )
    return [ParameterKlassifikationRead.model_validate(item) for item in db.scalars(stmt)]


def create_parameter_klassifikation(
    db: Session,
    parameter_id: str,
    payload: ParameterKlassifikationCreate,
) -> ParameterKlassifikationRead:
    _require_parameter(db, parameter_id)
    klassifikation = ParameterKlassifikation(
        laborparameter_id=parameter_id,
        klassifikation=payload.klassifikation,
        kontext_beschreibung=payload.kontext_beschreibung.strip()
        if payload.kontext_beschreibung and payload.kontext_beschreibung.strip()
        else None,
        begruendung=payload.begruendung.strip() if payload.begruendung and payload.begruendung.strip() else None,
    )
    db.add(klassifikation)
    db.commit()
    db.refresh(klassifikation)
    return ParameterKlassifikationRead.model_validate(klassifikation)


def delete_parameter_klassifikation(
    db: Session,
    klassifikation_id: str,
) -> ParameterKlassifikationDeleteResult:
    klassifikation = db.get(ParameterKlassifikation, klassifikation_id)
    if klassifikation is None or not klassifikation.aktiv:
        raise ValueError("Parameter-Klassifikation nicht gefunden.")
    klassifikation.aktiv = False
    db.commit()
    return ParameterKlassifikationDeleteResult(klassifikation_id=klassifikation_id)


def create_parameter_umrechnungsregel(
    db: Session,
    parameter_id: str,
    payload: ParameterUmrechnungsregelCreate,
) -> ParameterUmrechnungsregelRead:
    parameter = _require_parameter(db, parameter_id)
    if parameter.wert_typ_standard != "numerisch":
        raise ValueError("Umrechnungsregeln sind nur für numerische Parameter sinnvoll.")

    von_einheit = einheiten_service.require_existing_einheit(db, payload.von_einheit, field_label="Von-Einheit")
    nach_einheit = einheiten_service.require_existing_einheit(db, payload.nach_einheit, field_label="Nach-Einheit")
    if von_einheit is None or nach_einheit is None:
        raise ValueError("Von- und Nach-Einheit müssen gesetzt sein.")
    if von_einheit == nach_einheit:
        raise ValueError("Von- und Nach-Einheit müssen verschieden sein.")

    _validate_conversion_payload(payload)

    existing_rule = db.scalar(
        select(ParameterUmrechnungsregel)
        .where(ParameterUmrechnungsregel.laborparameter_id == parameter_id)
        .where(ParameterUmrechnungsregel.von_einheit == von_einheit)
        .where(ParameterUmrechnungsregel.nach_einheit == nach_einheit)
        .where(ParameterUmrechnungsregel.aktiv.is_(True))
    )
    if existing_rule is not None:
        raise ValueError(
            f"Für '{parameter.anzeigename}' existiert bereits eine aktive Regel von '{von_einheit}' nach '{nach_einheit}'."
        )

    rule = ParameterUmrechnungsregel(
        laborparameter_id=parameter_id,
        von_einheit=von_einheit,
        nach_einheit=nach_einheit,
        regel_typ=payload.regel_typ,
        faktor=payload.faktor,
        offset=payload.offset if payload.regel_typ == "faktor_plus_offset" else None,
        formel_text=payload.formel_text.strip() if payload.formel_text else None,
        rundung_stellen=payload.rundung_stellen,
        quelle_beschreibung=payload.quelle_beschreibung.strip() if payload.quelle_beschreibung else None,
        bemerkung=payload.bemerkung.strip() if payload.bemerkung else None,
    )
    db.add(rule)
    db.flush()
    conversions.recalculate_normalized_measurements_for_parameter(db, parameter_id)
    db.commit()
    db.refresh(rule)
    return ParameterUmrechnungsregelRead.model_validate(rule)


def list_parameter_alias_suggestions(db: Session) -> list[ParameterAliasSuggestionRead]:
    parameters = list(db.scalars(select(Laborparameter).order_by(Laborparameter.anzeigename.asc())))
    if not parameters:
        return []

    parameter_by_id = {parameter.id: parameter for parameter in parameters}
    existing_aliases = set(db.scalars(select(LaborparameterAlias.alias_normalisiert)))
    suggestion_map: dict[tuple[str, str], dict[str, object]] = {}

    stmt = (
        select(
            Messwert.laborparameter_id,
            Messwert.original_parametername,
            func.count(Messwert.id),
            func.max(Messwert.erstellt_am),
        )
        .where(Messwert.original_parametername.is_not(None))
        .group_by(Messwert.laborparameter_id, Messwert.original_parametername)
    )

    for parameter_id, original_name, usage_count, last_used_at in db.execute(stmt):
        if not parameter_id or not original_name:
            continue

        parameter = parameter_by_id.get(parameter_id)
        if parameter is None:
            continue

        alias_text = original_name.strip()
        if not alias_text:
            continue

        alias_normalisiert = normalize_parameter_name(alias_text)
        if not alias_normalisiert:
            continue

        if alias_normalisiert in {
            normalize_parameter_name(parameter.anzeigename),
            normalize_parameter_name(parameter.interner_schluessel),
        }:
            continue

        if alias_normalisiert in existing_aliases:
            continue

        key = (parameter.id, alias_normalisiert)
        current = suggestion_map.get(key)
        if current is None:
            suggestion_map[key] = {
                "laborparameter_id": parameter.id,
                "parameter_anzeigename": parameter.anzeigename,
                "alias_text": alias_text,
                "alias_normalisiert": alias_normalisiert,
                "vorkommen_anzahl": int(usage_count or 0),
                "letzte_verwendung_am": last_used_at,
            }
            continue

        current["vorkommen_anzahl"] = int(current["vorkommen_anzahl"]) + int(usage_count or 0)
        current_last_used = current["letzte_verwendung_am"]
        if isinstance(last_used_at, datetime) and (
            current_last_used is None or last_used_at > current_last_used
        ):
            current["letzte_verwendung_am"] = last_used_at
            current["alias_text"] = alias_text

    suggestions = [ParameterAliasSuggestionRead(**payload) for payload in suggestion_map.values()]
    suggestions.sort(
        key=lambda item: (
            item.parameter_anzeigename.lower(),
            -item.vorkommen_anzahl,
            item.alias_text.lower(),
        )
    )
    return suggestions


def list_parameter_duplicate_suggestions(
    db: Session,
    pruefschaerfe: ParameterDuplicatePruefschaerfe = "ausgewogen",
) -> list[ParameterDuplicateSuggestionRead]:
    parameters = list(
        db.scalars(
            select(Laborparameter)
            .where(Laborparameter.aktiv.is_(True))
            .order_by(Laborparameter.anzeigename.asc())
        )
    )
    if len(parameters) < 2:
        return []

    usage_summaries = _build_parameter_usage_summaries(db, [parameter.id for parameter in parameters])
    target_range_signatures = _build_parameter_target_range_signatures(db, [parameter.id for parameter in parameters])
    reference_signatures = _build_parameter_reference_signatures(db, [parameter.id for parameter in parameters])
    suppressed_pair_keys = _list_duplicate_suppression_keys(db)
    suggestions: list[ParameterDuplicateSuggestionRead] = []

    for index, left in enumerate(parameters):
        for right in parameters[index + 1 :]:
            _, _, pair_key = _normalize_duplicate_pair_ids(left.id, right.id)
            if pair_key in suppressed_pair_keys:
                continue
            duplicate_assessment = _assess_parameter_duplicate(
                left,
                right,
                target_range_signatures.get(left.id, set()),
                target_range_signatures.get(right.id, set()),
                reference_signatures.get(left.id, set()),
                reference_signatures.get(right.id, set()),
                pruefschaerfe,
            )
            if duplicate_assessment is None:
                continue

            left_summary = usage_summaries[left.id]
            right_summary = usage_summaries[right.id]
            target, source = _pick_merge_target(left, right, left_summary, right_summary)
            target_summary = usage_summaries[target.id]
            source_summary = usage_summaries[source.id]
            suggestions.append(
                ParameterDuplicateSuggestionRead(
                    ziel_parameter_id=target.id,
                    ziel_parameter_anzeigename=target.anzeigename,
                    quell_parameter_id=source.id,
                    quell_parameter_anzeigename=source.anzeigename,
                    gemeinsamer_name_vorschlag=target.anzeigename,
                    begruendung=duplicate_assessment["begruendung"],
                    aehnlichkeit=duplicate_assessment["aehnlichkeit"],
                    einheiten_hinweis=duplicate_assessment["einheiten_hinweis"],
                    ziel_parameter=target_summary,
                    quell_parameter=source_summary,
                )
            )

    suggestions.sort(
        key=lambda item: (
            -item.aehnlichkeit,
            item.ziel_parameter_anzeigename.lower(),
            item.quell_parameter_anzeigename.lower(),
        )
    )
    return suggestions


def list_parameter_duplicate_suppressions(
    db: Session,
    parameter_id: str,
) -> list[ParameterDuplicateSuppressionRead]:
    _require_parameter(db, parameter_id)
    erster_parameter = aliased(Laborparameter)
    zweiter_parameter = aliased(Laborparameter)
    stmt = (
        select(ParameterDublettenausschluss, erster_parameter.anzeigename, zweiter_parameter.anzeigename)
        .join(erster_parameter, ParameterDublettenausschluss.erster_parameter_id == erster_parameter.id)
        .join(zweiter_parameter, ParameterDublettenausschluss.zweiter_parameter_id == zweiter_parameter.id)
        .where(
            or_(
                ParameterDublettenausschluss.erster_parameter_id == parameter_id,
                ParameterDublettenausschluss.zweiter_parameter_id == parameter_id,
            )
        )
        .order_by(ParameterDublettenausschluss.erstellt_am.desc())
    )
    return [
        ParameterDuplicateSuppressionRead(
            id=suppression.id,
            erster_parameter_id=suppression.erster_parameter_id,
            erster_parameter_anzeigename=first_name,
            zweiter_parameter_id=suppression.zweiter_parameter_id,
            zweiter_parameter_anzeigename=second_name,
            erstellt_am=suppression.erstellt_am,
            geaendert_am=suppression.geaendert_am,
        )
        for suppression, first_name, second_name in db.execute(stmt)
    ]


def create_parameter_duplicate_suppression(
    db: Session,
    payload: ParameterDuplicateSuppressionCreate,
) -> ParameterDuplicateSuppressionRead:
    if payload.erster_parameter_id == payload.zweiter_parameter_id:
        raise ValueError("Ein Parameter kann nicht gegen sich selbst als 'kein Dublett' markiert werden.")

    first = _require_parameter(db, payload.erster_parameter_id)
    second = _require_parameter(db, payload.zweiter_parameter_id)
    erster_parameter_id, zweiter_parameter_id, pair_key = _normalize_duplicate_pair_ids(first.id, second.id)

    suppression = db.scalar(
        select(ParameterDublettenausschluss).where(ParameterDublettenausschluss.paar_schluessel == pair_key)
    )
    if suppression is None:
        suppression = ParameterDublettenausschluss(
            erster_parameter_id=erster_parameter_id,
            zweiter_parameter_id=zweiter_parameter_id,
            paar_schluessel=pair_key,
        )
        db.add(suppression)
        db.commit()
        db.refresh(suppression)

    first_name = first.anzeigename if first.id == suppression.erster_parameter_id else second.anzeigename
    second_name = second.anzeigename if second.id == suppression.zweiter_parameter_id else first.anzeigename
    return ParameterDuplicateSuppressionRead(
        id=suppression.id,
        erster_parameter_id=suppression.erster_parameter_id,
        erster_parameter_anzeigename=first_name,
        zweiter_parameter_id=suppression.zweiter_parameter_id,
        zweiter_parameter_anzeigename=second_name,
        erstellt_am=suppression.erstellt_am,
        geaendert_am=suppression.geaendert_am,
    )


def delete_parameter_duplicate_suppression(db: Session, suppression_id: str) -> None:
    suppression = db.get(ParameterDublettenausschluss, suppression_id)
    if suppression is None:
        raise ValueError("Dublett-Unterdrückung nicht gefunden.")
    db.delete(suppression)
    db.commit()


def merge_parameters(db: Session, payload: ParameterMergeRequest) -> ParameterMergeResultRead:
    if payload.ziel_parameter_id == payload.quell_parameter_id:
        raise ValueError("Quelle und Ziel der Zusammenführung müssen verschieden sein.")

    target = _require_parameter(db, payload.ziel_parameter_id)
    source = _require_parameter(db, payload.quell_parameter_id)
    common_name = payload.gemeinsamer_name.strip()
    if not common_name:
        raise ValueError("Der gemeinsame Name darf nicht leer sein.")
    if target.wert_typ_standard != source.wert_typ_standard:
        raise ValueError("Parameter mit unterschiedlichem Werttyp sollten nicht automatisch zusammengeführt werden.")

    _assert_merge_name_is_safe(db, target, source, common_name)

    original_target_name = target.anzeigename
    target.anzeigename = common_name
    moved_measurements = _reassign_parameter_rows(db, Messwert, source.id, target.id)
    moved_target_ranges = _reassign_parameter_rows(db, Zielbereich, source.id, target.id)
    moved_cyclic_plans = _reassign_parameter_rows(db, PlanungZyklisch, source.id, target.id)
    moved_one_time_plans = _reassign_parameter_rows(db, PlanungEinmalig, source.id, target.id)
    _reassign_parameter_rows(db, ParameterKlassifikation, source.id, target.id)
    moved_group_assignments, removed_duplicate_group_assignments = _merge_group_assignments(db, source.id, target.id)
    created_aliases, skipped_aliases = _merge_parameter_aliases(db, target, source, common_name, original_target_name)
    _delete_duplicate_suppressions_for_parameter_ids(db, [source.id])

    if not target.standard_einheit and source.standard_einheit:
        target.standard_einheit = source.standard_einheit
    if not target.beschreibung and source.beschreibung:
        target.beschreibung = source.beschreibung
    if not target.sortierschluessel and source.sortierschluessel:
        target.sortierschluessel = source.sortierschluessel
    if not target.primaere_klassifikation and source.primaere_klassifikation:
        target.primaere_klassifikation = source.primaere_klassifikation

    db.delete(source)
    db.commit()
    db.refresh(target)

    return ParameterMergeResultRead(
        ziel_parameter_id=target.id,
        geloeschter_parameter_id=payload.quell_parameter_id,
        gemeinsamer_name=target.anzeigename,
        angelegte_aliase=created_aliases,
        uebersprungene_aliase=skipped_aliases,
        verschobene_messwerte=moved_measurements,
        verschobene_zielbereiche=moved_target_ranges,
        verschobene_planung_zyklisch=moved_cyclic_plans,
        verschobene_planung_einmalig=moved_one_time_plans,
        verschobene_gruppenzuordnungen=moved_group_assignments,
        entfernte_doppelte_gruppenzuordnungen=removed_duplicate_group_assignments,
    )


def rename_parameter(db: Session, parameter_id: str, payload: ParameterRenameRequest) -> ParameterRenameResultRead:
    parameter = _require_parameter(db, parameter_id)
    old_name = parameter.anzeigename
    new_name = payload.neuer_name.strip()
    if not new_name:
        raise ValueError("Der neue Name darf nicht leer sein.")

    new_name_normalized = normalize_parameter_name(new_name)
    if not new_name_normalized:
        raise ValueError("Der neue Name enthält keine auswertbaren Zeichen.")

    _assert_parameter_name_is_safe(db, parameter, new_name)

    alias_created = False
    alias_name: str | None = None
    old_name_normalized = normalize_parameter_name(old_name)

    parameter.anzeigename = new_name
    if (
        payload.alten_namen_als_alias_anlegen
        and old_name_normalized
        and old_name_normalized != new_name_normalized
    ):
        try:
            _assert_alias_is_unique_and_meaningful_for_rename(
                db,
                parameter=parameter,
                alias_text=old_name,
                alias_normalized=old_name_normalized,
                new_name_normalized=new_name_normalized,
            )
        except ValueError:
            alias_created = False
        else:
            db.add(
                LaborparameterAlias(
                    laborparameter_id=parameter.id,
                    alias_text=old_name,
                    alias_normalisiert=old_name_normalized,
                    bemerkung="Bei Umbenennung übernommen",
                )
            )
            alias_created = True
            alias_name = old_name

    db.commit()
    db.refresh(parameter)
    return ParameterRenameResultRead(
        parameter_id=parameter.id,
        neuer_name=parameter.anzeigename,
        alter_name=old_name,
        alias_angelegt=alias_created,
        alias_name=alias_name,
    )


def create_parameter_alias(db: Session, parameter_id: str, payload: ParameterAliasCreate) -> LaborparameterAlias:
    parameter = _require_parameter(db, parameter_id)

    alias_text = payload.alias_text.strip()
    if not alias_text:
        raise ValueError("Der Alias darf nicht leer sein.")

    alias_normalisiert = normalize_parameter_name(alias_text)
    if not alias_normalisiert:
        raise ValueError("Der Alias enthält keine auswertbaren Zeichen.")

    _assert_alias_is_unique_and_meaningful(db, parameter, alias_text, alias_normalisiert)

    alias = LaborparameterAlias(
        laborparameter_id=parameter_id,
        alias_text=alias_text,
        alias_normalisiert=alias_normalisiert,
        bemerkung=payload.bemerkung.strip() if payload.bemerkung else None,
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    return alias


def _require_parameter(db: Session, parameter_id: str) -> Laborparameter:
    parameter = db.get(Laborparameter, parameter_id)
    if parameter is None:
        raise ValueError("Parameter nicht gefunden.")
    return parameter


def _build_parameter_read(
    parameter: Laborparameter,
    summary: ParameterUsageSummaryRead | None = None,
    wissensseite: Wissensseite | None = None,
) -> ParameterRead:
    return ParameterRead(
        id=parameter.id,
        interner_schluessel=parameter.interner_schluessel,
        anzeigename=parameter.anzeigename,
        beschreibung=parameter.beschreibung,
        standard_einheit=parameter.standard_einheit,
        wert_typ_standard=parameter.wert_typ_standard,
        primaere_klassifikation=parameter.primaere_klassifikation,
        sortierschluessel=parameter.sortierschluessel,
        wissensseite_id=parameter.wissensseite_id,
        wissensseite_pfad_relativ=wissensseite.pfad_relativ if wissensseite is not None else None,
        wissensseite_titel=wissensseite.titel_cache if wissensseite is not None else None,
        aktiv=parameter.aktiv,
        erstellt_am=parameter.erstellt_am,
        geaendert_am=parameter.geaendert_am,
        messwerte_anzahl=summary.messwerte_anzahl if summary is not None else 0,
    )


def _build_parameter_knowledge_pages(
    db: Session,
    parameters: list[Laborparameter],
) -> dict[str, Wissensseite]:
    page_ids = sorted({parameter.wissensseite_id for parameter in parameters if parameter.wissensseite_id})
    if not page_ids:
        return {}
    return {
        wissensseite.id: wissensseite
        for wissensseite in db.scalars(select(Wissensseite).where(Wissensseite.id.in_(page_ids)))
    }


def _build_unique_parameter_knowledge_page_path(parameter: Laborparameter) -> str:
    base_slug = _slugify_knowledge_filename(parameter.anzeigename)
    candidate = f"02 Parameter/Allgemein/{base_slug}.md"
    suffix = 2
    while wissensbasis_service.get_wissensseite_detail(candidate) is not None:
        candidate = f"02 Parameter/Allgemein/{base_slug}-{suffix}.md"
        suffix += 1
    return candidate


def _slugify_knowledge_filename(value: str) -> str:
    slug = (
        value.strip()
        .replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("Ä", "Ae")
        .replace("Ö", "Oe")
        .replace("Ü", "Ue")
        .replace("ß", "ss")
    )
    normalized = []
    last_was_separator = False
    for character in slug:
        if character.isalnum():
            normalized.append(character)
            last_was_separator = False
            continue
        if not last_was_separator:
            normalized.append("-")
            last_was_separator = True
    result = "".join(normalized).strip("-")
    return result or "Parameter"


def _build_parameter_knowledge_markdown(parameter: Laborparameter) -> str:
    beschreibung = parameter.beschreibung.strip() if parameter.beschreibung and parameter.beschreibung.strip() else ""
    kurzdefinition = beschreibung or "Noch keine fachliche Kurzdefinition hinterlegt."
    standard_einheit = parameter.standard_einheit or "nicht festgelegt"
    primaere_klassifikation = parameter.primaere_klassifikation or "noch nicht eingeordnet"

    return "\n".join(
        [
            f"# {parameter.anzeigename}",
            "",
            "## Kurzdefinition",
            kurzdefinition,
            "",
            "## Bedeutung",
            "Noch fachlich zu ergänzen.",
            "",
            "## KSG-Einordnung",
            f"- Primär: {primaere_klassifikation}",
            "- Zusatzrollen: noch zu prüfen",
            "",
            "## Messung und Einheit",
            f"- Werttyp: {parameter.wert_typ_standard}",
            f"- Führende Normeinheit: {standard_einheit}",
            "",
            "## Sinnvoll gemeinsam messen",
            "- Noch zu ergänzen.",
            "",
            "## Verlauf und Zielbereiche",
            "Noch zu ergänzen.",
            "",
            "## Grenzen der Interpretation",
            "Noch zu ergänzen.",
            "",
            "## Verwandte Seiten",
            "- [[KSG-Systematik]]",
            "",
        ]
    )


def _normalize_duplicate_pair_ids(
    first_parameter_id: str,
    second_parameter_id: str,
) -> tuple[str, str, str]:
    erster_parameter_id, zweiter_parameter_id = sorted([first_parameter_id, second_parameter_id])
    return erster_parameter_id, zweiter_parameter_id, f"{erster_parameter_id}::{zweiter_parameter_id}"


def _list_duplicate_suppression_keys(db: Session) -> set[str]:
    return set(db.scalars(select(ParameterDublettenausschluss.paar_schluessel)))


def _delete_duplicate_suppressions_for_parameter_ids(db: Session, parameter_ids: list[str]) -> int:
    if not parameter_ids:
        return 0
    suppressions = list(
        db.scalars(
            select(ParameterDublettenausschluss).where(
                or_(
                    ParameterDublettenausschluss.erster_parameter_id.in_(parameter_ids),
                    ParameterDublettenausschluss.zweiter_parameter_id.in_(parameter_ids),
                )
            )
        )
    )
    for suppression in suppressions:
        db.delete(suppression)
    return len(suppressions)


def _assert_alias_is_unique_and_meaningful(
    db: Session,
    parameter: Laborparameter,
    alias_text: str,
    alias_normalisiert: str,
) -> None:
    if alias_normalisiert in {
        normalize_parameter_name(parameter.anzeigename),
        normalize_parameter_name(parameter.interner_schluessel),
    }:
        raise ValueError("Der Alias entspricht bereits dem Anzeigenamen oder internen Schlüssel dieses Parameters.")

    existing_alias = db.scalar(
        select(LaborparameterAlias).where(LaborparameterAlias.alias_normalisiert == alias_normalisiert)
    )
    if existing_alias is not None:
        raise ValueError(f"Der Alias '{alias_text}' ist bereits einem anderen Parameter zugeordnet.")

    for other_parameter in db.scalars(select(Laborparameter)):
        if other_parameter.id == parameter.id:
            continue
        if alias_normalisiert == normalize_parameter_name(other_parameter.anzeigename):
            raise ValueError(
                f"Der Alias '{alias_text}' kollidiert mit dem Anzeigenamen '{other_parameter.anzeigename}'."
            )
        if alias_normalisiert == normalize_parameter_name(other_parameter.interner_schluessel):
            raise ValueError(
                f"Der Alias '{alias_text}' kollidiert mit dem internen Schlüssel '{other_parameter.interner_schluessel}'."
            )


def _build_unique_parameter_key(db: Session, source_value: str | None) -> str:
    base_key = build_parameter_key_candidate(source_value)
    candidate = base_key
    suffix = 2
    while db.scalar(select(Laborparameter.id).where(Laborparameter.interner_schluessel == candidate)) is not None:
        candidate = f"{base_key}_{suffix}"
        suffix += 1
    return candidate


def _build_parameter_usage_summaries(
    db: Session,
    parameter_ids: list[str],
) -> dict[str, ParameterUsageSummaryRead]:
    parameters = list(
        db.scalars(select(Laborparameter).where(Laborparameter.id.in_(parameter_ids)))
    )
    summaries = {
        parameter.id: ParameterUsageSummaryRead(
            parameter_id=parameter.id,
            anzeigename=parameter.anzeigename,
            interner_schluessel=parameter.interner_schluessel,
            standard_einheit=parameter.standard_einheit,
            wert_typ_standard=parameter.wert_typ_standard,
            primaere_klassifikation=parameter.primaere_klassifikation,
        )
        for parameter in parameters
    }

    _fill_usage_count(db, Messwert, summaries, "messwerte_anzahl")
    _fill_usage_count(db, GruppenParameter, summaries, "gruppen_anzahl")
    _fill_usage_count(db, Zielbereich, summaries, "zielbereiche_anzahl")
    _fill_usage_count(db, PlanungZyklisch, summaries, "planung_zyklisch_anzahl")
    _fill_usage_count(db, PlanungEinmalig, summaries, "planung_einmalig_anzahl")
    _fill_usage_count(db, LaborparameterAlias, summaries, "alias_anzahl")
    return summaries


def _fill_usage_count(db: Session, model, summaries: dict[str, ParameterUsageSummaryRead], field_name: str) -> None:
    if not summaries:
        return
    stmt = (
        select(model.laborparameter_id, func.count(model.id))
        .where(model.laborparameter_id.in_(list(summaries.keys())))
        .group_by(model.laborparameter_id)
    )
    for parameter_id, count in db.execute(stmt):
        summary = summaries.get(parameter_id)
        if summary is not None:
            setattr(summary, field_name, int(count or 0))


def _build_parameter_target_range_signatures(
    db: Session,
    parameter_ids: list[str],
) -> dict[str, set[str]]:
    signatures = {parameter_id: set() for parameter_id in parameter_ids}
    if not parameter_ids:
        return signatures

    stmt = (
        select(Zielbereich)
        .where(Zielbereich.laborparameter_id.in_(parameter_ids))
        .where(Zielbereich.aktiv.is_(True))
    )
    for target_range in db.scalars(stmt):
        signatures.setdefault(target_range.laborparameter_id, set()).add(
            _build_target_range_signature(target_range)
        )
    return signatures


def _build_target_range_signature(target_range: Zielbereich) -> str:
    lower = "" if target_range.untere_grenze_num is None else f"{target_range.untere_grenze_num:.12g}"
    upper = "" if target_range.obere_grenze_num is None else f"{target_range.obere_grenze_num:.12g}"
    return "|".join(
        [
            target_range.wert_typ or "",
            target_range.zielbereich_typ or "",
            lower,
            upper,
            normalize_parameter_name(target_range.einheit),
            normalize_parameter_name(target_range.soll_text),
            (target_range.geschlecht_code or "").strip().lower(),
            "" if target_range.alter_min_tage is None else str(target_range.alter_min_tage),
            "" if target_range.alter_max_tage is None else str(target_range.alter_max_tage),
        ]
    )


def _build_parameter_reference_signatures(
    db: Session,
    parameter_ids: list[str],
) -> dict[str, set[str]]:
    signatures = {parameter_id: set() for parameter_id in parameter_ids}
    if not parameter_ids:
        return signatures

    stmt = (
        select(Messwert.laborparameter_id, MesswertReferenz)
        .join(MesswertReferenz, MesswertReferenz.messwert_id == Messwert.id)
        .where(Messwert.laborparameter_id.in_(parameter_ids))
    )
    for parameter_id, reference in db.execute(stmt):
        signatures.setdefault(parameter_id, set()).add(_build_reference_signature(reference))
    return signatures


def _build_reference_signature(reference: MesswertReferenz) -> str:
    lower = "" if reference.untere_grenze_num is None else f"{reference.untere_grenze_num:.12g}"
    upper = "" if reference.obere_grenze_num is None else f"{reference.obere_grenze_num:.12g}"
    return "|".join(
        [
            (reference.referenz_typ or "").strip().lower(),
            reference.wert_typ or "",
            normalize_parameter_name(reference.referenz_text_original),
            lower,
            (reference.untere_grenze_operator or "").strip().lower(),
            upper,
            (reference.obere_grenze_operator or "").strip().lower(),
            normalize_parameter_name(reference.einheit),
            normalize_parameter_name(reference.soll_text),
            (reference.geschlecht_code or "").strip().lower(),
            "" if reference.alter_min_tage is None else str(reference.alter_min_tage),
            "" if reference.alter_max_tage is None else str(reference.alter_max_tage),
        ]
    )


def _assess_target_range_overlap(
    left_signatures: set[str],
    right_signatures: set[str],
) -> tuple[str, str | None]:
    if not left_signatures or not right_signatures:
        return "unknown", None

    overlap = left_signatures & right_signatures
    if overlap:
        if left_signatures == right_signatures:
            return "exact", "Aktive Zielbereiche stimmen überein."
        return "partial", "Aktive Zielbereiche überlappen teilweise."

    return "conflict", "Aktive Zielbereiche weichen ab."


def _assess_reference_overlap(
    left_signatures: set[str],
    right_signatures: set[str],
) -> tuple[str, str | None]:
    if not left_signatures or not right_signatures:
        return "unknown", None

    overlap = left_signatures & right_signatures
    if overlap:
        return "exact", "Messwert-Referenzbereiche stimmen überein."

    return "conflict", "Messwert-Referenzbereiche weichen ab."


def _combine_duplicate_contexts(
    target_range_status: str,
    target_range_note: str | None,
    reference_status: str,
    reference_note: str | None,
) -> tuple[str, str | None]:
    notes = [note for note in [target_range_note, reference_note] if note]
    if target_range_status == "exact" or reference_status == "exact":
        return "exact", " ".join(notes) if notes else None
    if target_range_status == "partial":
        return "partial", target_range_note
    if target_range_status == "conflict" or reference_status == "conflict":
        return "conflict", " ".join(notes) if notes else None
    return "unknown", " ".join(notes) if notes else None


def _assess_parameter_duplicate(
    left: Laborparameter,
    right: Laborparameter,
    left_target_ranges: set[str],
    right_target_ranges: set[str],
    left_references: set[str],
    right_references: set[str],
    pruefschaerfe: ParameterDuplicatePruefschaerfe = "ausgewogen",
) -> dict[str, str | float | None] | None:
    if left.wert_typ_standard != right.wert_typ_standard:
        return None

    left_name_normalized = normalize_parameter_name(left.anzeigename)
    right_name_normalized = normalize_parameter_name(right.anzeigename)
    left_key_normalized = normalize_parameter_name(left.interner_schluessel)
    right_key_normalized = normalize_parameter_name(right.interner_schluessel)
    left_name_tokens = tokenize_parameter_name(left.anzeigename)
    right_name_tokens = tokenize_parameter_name(right.anzeigename)
    left_tokens = left_name_tokens | tokenize_parameter_name(left.interner_schluessel)
    right_tokens = right_name_tokens | tokenize_parameter_name(right.interner_schluessel)

    overlap = 0.0
    if left_tokens and right_tokens:
        overlap = len(left_tokens & right_tokens) / max(len(left_tokens), len(right_tokens))

    name_similarity = SequenceMatcher(None, left_name_normalized, right_name_normalized).ratio()
    key_similarity = SequenceMatcher(None, left_key_normalized, right_key_normalized).ratio()
    similarity = max(name_similarity, key_similarity)
    target_range_status, target_range_note = _assess_target_range_overlap(left_target_ranges, right_target_ranges)
    reference_status, reference_note = _assess_reference_overlap(left_references, right_references)
    context_status, context_note = _combine_duplicate_contexts(
        target_range_status,
        target_range_note,
        reference_status,
        reference_note,
    )
    token_subset = bool(
        left_name_tokens
        and right_name_tokens
        and (left_name_tokens <= right_name_tokens or right_name_tokens <= left_name_tokens)
    )
    allow_unknown_context_for_containment = pruefschaerfe == "grosszuegig"
    overlap_similarity_min = 0.72
    overlap_min = 0.75
    containment_similarity_min = 0.72
    containment_min_token_count = 2

    if pruefschaerfe == "sicher":
        overlap_similarity_min = 0.78
        overlap_min = 0.8
        containment_similarity_min = 0.78
    elif pruefschaerfe == "grosszuegig":
        overlap_similarity_min = 0.68
        overlap_min = 0.68
        containment_similarity_min = 0.74
        containment_min_token_count = 1

    name_contains_other = bool(
        left_name_normalized
        and right_name_normalized
        and (left_name_normalized in right_name_normalized or right_name_normalized in left_name_normalized)
    )
    smaller_token_count = (
        min(len(left_name_tokens), len(right_name_tokens)) if left_name_tokens and right_name_tokens else 0
    )

    if left_name_normalized == right_name_normalized:
        score = 1.0
        reason = "Gleicher Parametername nach Normalisierung."
    elif left_key_normalized == right_key_normalized:
        score = 0.97
        reason = "Sehr ähnlicher interner Schlüssel nach Normalisierung."
    elif overlap >= overlap_min and similarity >= overlap_similarity_min:
        score = round((overlap * 0.55) + (similarity * 0.45), 2)
        reason = f"Hohe Namensaehnlichkeit mit {int(round(similarity * 100))} % und stark ueberlappenden Begriffen."
    elif (
        name_contains_other
        and token_subset
        and smaller_token_count >= containment_min_token_count
        and similarity >= containment_similarity_min
        and (context_status == "exact" or (allow_unknown_context_for_containment and context_status != "conflict"))
    ):
        score_floor = 0.76 if context_status == "exact" else 0.72
        score_boost = 0.08 if context_status == "exact" else 0.03
        score = round(min(max(similarity, score_floor) + score_boost, 0.95), 2)
        reason = "Ein Parametername ist im anderen enthalten."
        if allow_unknown_context_for_containment and context_status != "exact":
            reason = f"{reason} Die großzügige Prüfschärfe zeigt auch weichere Namensvarianten."
    else:
        return None

    fuzzy_match = left_name_normalized != right_name_normalized and left_key_normalized != right_key_normalized
    if fuzzy_match and context_status == "conflict":
        return None
    if fuzzy_match and context_status == "exact":
        score = round(min(score + 0.05, 1.0), 2)
        reason = f"{reason} {context_note}"
    elif fuzzy_match and context_status == "partial":
        score = round(min(score + 0.02, 1.0), 2)
        reason = f"{reason} {context_note}"
    elif not fuzzy_match and context_status == "conflict":
        reason = f"{reason} {context_note}"

    unit_note: str | None = None
    if left.standard_einheit and right.standard_einheit and left.standard_einheit != right.standard_einheit:
        unit_note = (
            f"Standardeinheiten weichen ab: {left.standard_einheit} versus {right.standard_einheit}."
        )
        score = round(max(score - 0.08, 0.6), 2)
        reason = f"{reason} {unit_note}"

    return {
        "aehnlichkeit": score,
        "begruendung": reason,
        "einheiten_hinweis": unit_note,
    }


def _pick_merge_target(
    left: Laborparameter,
    right: Laborparameter,
    left_summary: ParameterUsageSummaryRead,
    right_summary: ParameterUsageSummaryRead,
) -> tuple[Laborparameter, Laborparameter]:
    left_score = _parameter_preference_score(left, left_summary)
    right_score = _parameter_preference_score(right, right_summary)
    if right_score > left_score:
        return right, left
    if left_score > right_score:
        return left, right
    if len(right.anzeigename) > len(left.anzeigename):
        return right, left
    return left, right


def _parameter_preference_score(parameter: Laborparameter, summary: ParameterUsageSummaryRead) -> int:
    return (
        summary.messwerte_anzahl * 5
        + summary.gruppen_anzahl * 2
        + summary.zielbereiche_anzahl * 2
        + summary.planung_zyklisch_anzahl * 2
        + summary.planung_einmalig_anzahl * 2
        + summary.alias_anzahl
        + (3 if parameter.standard_einheit else 0)
        + (2 if parameter.beschreibung else 0)
        + (1 if parameter.primaere_klassifikation else 0)
        + (1 if parameter.sortierschluessel else 0)
    )


def _assert_merge_name_is_safe(
    db: Session,
    target: Laborparameter,
    source: Laborparameter,
    common_name: str,
) -> None:
    merge_name_normalized = normalize_parameter_name(common_name)
    if not merge_name_normalized:
        raise ValueError("Der gemeinsame Name enthält keine auswertbaren Zeichen.")

    for other_parameter in db.scalars(select(Laborparameter)):
        if other_parameter.id in {target.id, source.id}:
            continue
        if merge_name_normalized in {
            normalize_parameter_name(other_parameter.anzeigename),
            normalize_parameter_name(other_parameter.interner_schluessel),
        }:
            raise ValueError(
                f"Der gemeinsame Name '{common_name}' kollidiert mit dem Parameter '{other_parameter.anzeigename}'."
            )

    conflicting_alias = db.scalar(
        select(LaborparameterAlias).where(LaborparameterAlias.alias_normalisiert == merge_name_normalized)
    )
    if conflicting_alias is not None and conflicting_alias.laborparameter_id not in {target.id, source.id}:
        raise ValueError(
            f"Der gemeinsame Name '{common_name}' ist bereits als Alias eines anderen Parameters belegt."
        )


def _assert_parameter_name_is_safe(db: Session, parameter: Laborparameter, new_name: str) -> None:
    new_name_normalized = normalize_parameter_name(new_name)
    for other_parameter in db.scalars(select(Laborparameter)):
        if other_parameter.id == parameter.id:
            continue
        if new_name_normalized in {
            normalize_parameter_name(other_parameter.anzeigename),
            normalize_parameter_name(other_parameter.interner_schluessel),
        }:
            raise ValueError(
                f"Der neue Name '{new_name}' kollidiert mit dem Parameter '{other_parameter.anzeigename}'."
            )

    conflicting_alias = db.scalar(
        select(LaborparameterAlias).where(LaborparameterAlias.alias_normalisiert == new_name_normalized)
    )
    if conflicting_alias is not None and conflicting_alias.laborparameter_id != parameter.id:
        raise ValueError(
            f"Der neue Name '{new_name}' ist bereits als Alias eines anderen Parameters belegt."
        )


def _reassign_parameter_rows(db: Session, model, source_parameter_id: str, target_parameter_id: str) -> int:
    rows = list(
        db.scalars(select(model).where(model.laborparameter_id == source_parameter_id))
    )
    for row in rows:
        row.laborparameter_id = target_parameter_id
    return len(rows)


def _merge_group_assignments(db: Session, source_parameter_id: str, target_parameter_id: str) -> tuple[int, int]:
    target_assignments = {
        entry.parameter_gruppe_id: entry
        for entry in db.scalars(
            select(GruppenParameter).where(GruppenParameter.laborparameter_id == target_parameter_id)
        )
    }
    moved = 0
    removed_duplicates = 0
    for source_assignment in list(
        db.scalars(select(GruppenParameter).where(GruppenParameter.laborparameter_id == source_parameter_id))
    ):
        existing_target = target_assignments.get(source_assignment.parameter_gruppe_id)
        if existing_target is not None:
            if existing_target.sortierung is None or (
                source_assignment.sortierung is not None and source_assignment.sortierung < existing_target.sortierung
            ):
                existing_target.sortierung = source_assignment.sortierung
            db.delete(source_assignment)
            removed_duplicates += 1
            continue
        source_assignment.laborparameter_id = target_parameter_id
        target_assignments[source_assignment.parameter_gruppe_id] = source_assignment
        moved += 1
    return moved, removed_duplicates


def _merge_parameter_aliases(
    db: Session,
    target: Laborparameter,
    source: Laborparameter,
    common_name: str,
    original_target_name: str,
) -> tuple[list[str], list[str]]:
    created_aliases: list[str] = []
    skipped_aliases: list[str] = []
    alias_candidates: list[str] = []

    for candidate in [source.anzeigename, original_target_name]:
        if candidate and candidate.strip() and candidate.strip() not in alias_candidates:
            alias_candidates.append(candidate.strip())

    source_aliases = list(
        db.scalars(select(LaborparameterAlias).where(LaborparameterAlias.laborparameter_id == source.id))
    )

    common_name_normalized = normalize_parameter_name(common_name)
    for alias_text in alias_candidates:
        alias_normalized = normalize_parameter_name(alias_text)
        if not alias_normalized or alias_normalized == common_name_normalized:
            continue
        try:
            _assert_alias_is_unique_and_meaningful_for_merge(
                db,
                target=target,
                source=source,
                alias_text=alias_text,
                alias_normalized=alias_normalized,
            )
        except ValueError:
            skipped_aliases.append(alias_text)
            continue
        db.add(
            LaborparameterAlias(
                laborparameter_id=target.id,
                alias_text=alias_text,
                alias_normalisiert=alias_normalized,
                bemerkung="Bei Parameter-Zusammenführung übernommen",
            )
        )
        created_aliases.append(alias_text)

    for alias in source_aliases:
        if not alias.alias_normalisiert or alias.alias_normalisiert == common_name_normalized:
            db.delete(alias)
            continue
        try:
            _assert_alias_is_unique_and_meaningful_for_merge(
                db,
                target=target,
                source=source,
                alias_text=alias.alias_text,
                alias_normalized=alias.alias_normalisiert,
            )
        except ValueError:
            skipped_aliases.append(alias.alias_text)
            db.delete(alias)
            continue
        alias.laborparameter_id = target.id
        if alias.alias_text not in created_aliases:
            created_aliases.append(alias.alias_text)

    target_aliases = list(
        db.scalars(select(LaborparameterAlias).where(LaborparameterAlias.laborparameter_id == target.id))
    )
    alias_groups: dict[str, list[LaborparameterAlias]] = defaultdict(list)
    for alias in target_aliases:
        alias_groups[alias.alias_normalisiert].append(alias)
    for duplicates in alias_groups.values():
        for duplicate in duplicates[1:]:
            db.delete(duplicate)

    return created_aliases, skipped_aliases


def _assert_alias_is_unique_and_meaningful_for_merge(
    db: Session,
    target: Laborparameter,
    source: Laborparameter,
    alias_text: str,
    alias_normalized: str,
) -> None:
    if alias_normalized == normalize_parameter_name(target.anzeigename):
        raise ValueError("Der Alias entspricht bereits dem Anzeigenamen des Zielparameters.")

    existing_alias = db.scalar(
        select(LaborparameterAlias).where(LaborparameterAlias.alias_normalisiert == alias_normalized)
    )
    if existing_alias is not None and existing_alias.laborparameter_id not in {target.id, source.id}:
        raise ValueError(f"Der Alias '{alias_text}' ist bereits einem anderen Parameter zugeordnet.")

    for other_parameter in db.scalars(select(Laborparameter)):
        if other_parameter.id in {target.id, source.id}:
            continue
        if alias_normalized == normalize_parameter_name(other_parameter.anzeigename):
            raise ValueError(
                f"Der Alias '{alias_text}' kollidiert mit dem Anzeigenamen '{other_parameter.anzeigename}'."
            )
        if alias_normalized == normalize_parameter_name(other_parameter.interner_schluessel):
            raise ValueError(
                f"Der Alias '{alias_text}' kollidiert mit dem internen Schlüssel '{other_parameter.interner_schluessel}'."
            )


def _validate_conversion_payload(payload: ParameterUmrechnungsregelCreate) -> None:
    if payload.regel_typ == "faktor":
        if payload.faktor is None:
            raise ValueError("Für den Regeltyp 'faktor' muss ein Faktor gesetzt sein.")
        return

    if payload.regel_typ == "faktor_plus_offset":
        if payload.faktor is None:
            raise ValueError("Für den Regeltyp 'faktor_plus_offset' muss ein Faktor gesetzt sein.")
        return

    if payload.regel_typ == "formel":
        if not (payload.formel_text and payload.formel_text.strip()):
            raise ValueError("Für den Regeltyp 'formel' muss eine Formel angegeben werden.")


def _assert_alias_is_unique_and_meaningful_for_rename(
    db: Session,
    parameter: Laborparameter,
    alias_text: str,
    alias_normalized: str,
    new_name_normalized: str,
) -> None:
    if alias_normalized == new_name_normalized:
        raise ValueError("Der Alias entspricht bereits dem neuen Anzeigenamen.")

    existing_alias = db.scalar(
        select(LaborparameterAlias).where(LaborparameterAlias.alias_normalisiert == alias_normalized)
    )
    if existing_alias is not None and existing_alias.laborparameter_id != parameter.id:
        raise ValueError(f"Der Alias '{alias_text}' ist bereits einem anderen Parameter zugeordnet.")

    for other_parameter in db.scalars(select(Laborparameter)):
        if other_parameter.id == parameter.id:
            continue
        if alias_normalized == normalize_parameter_name(other_parameter.anzeigename):
            raise ValueError(
                f"Der Alias '{alias_text}' kollidiert mit dem Anzeigenamen '{other_parameter.anzeigename}'."
            )
        if alias_normalized == normalize_parameter_name(other_parameter.interner_schluessel):
            raise ValueError(
                f"Der Alias '{alias_text}' kollidiert mit dem internen Schlüssel '{other_parameter.interner_schluessel}'."
            )
