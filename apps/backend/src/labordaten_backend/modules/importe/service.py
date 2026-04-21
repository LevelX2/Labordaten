from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labordaten_backend.core.documents import store_document_file, store_existing_document_path
from labordaten_backend.models.base import utcnow
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.dokument import Dokument
from labordaten_backend.models.import_pruefpunkt import ImportPruefpunkt
from labordaten_backend.models.importvorgang import Importvorgang
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.modules.importe.schemas import (
    ImportBefundPreviewRead,
    ImportEntwurfCreate,
    ImportMesswertPayload,
    ImportMesswertPreviewRead,
    ImportParameterMapping,
    ImportPayload,
    ImportPruefpunktRead,
    ImportUebernehmenRequest,
    ImportvorgangDetailRead,
    ImportvorgangListRead,
)
from labordaten_backend.modules.parameter.normalization import normalize_parameter_name


HEADER_ALIASES: dict[str, set[str]] = {
    "person_id": {"personid", "person_id"},
    "labor_id": {"laborid", "labor_id"},
    "labor_name": {"laborname", "labor_name", "labor"},
    "entnahmedatum": {"entnahmedatum", "entnahme", "sampledate", "datum"},
    "befunddatum": {"befunddatum", "reportdate"},
    "befund_bemerkung": {"befundbemerkung", "befund_bemerkung", "berichtsbemerkung"},
    "parameter_id": {"parameterid", "parameter_id"},
    "original_parametername": {
        "originalparametername",
        "parametername",
        "parameter",
        "name",
        "wertname",
        "analyte",
    },
    "wert_typ": {"werttyp", "wert_typ", "typ"},
    "wert_operator": {"wertoperator", "wert_operator", "operator"},
    "wert_roh_text": {"wertrohtext", "wert_roh_text", "wert", "value", "result"},
    "wert_num": {"wertnum", "wert_num", "zahlwert", "numerisch"},
    "wert_text": {"werttext", "wert_text", "textwert"},
    "einheit_original": {"einheitoriginal", "einheit_original", "einheit", "unit"},
    "bemerkung_kurz": {"bemerkungkurz", "bemerkung_kurz", "bemerkung"},
    "bemerkung_lang": {"bemerkunglang", "bemerkung_lang"},
    "referenz_text_original": {"referenztextoriginal", "referenztext", "referenz"},
    "untere_grenze_num": {"unteregrenzenum", "untere_grenze_num", "referenzuntere", "untergrenze"},
    "obere_grenze_num": {"oberegrenzenum", "obere_grenze_num", "referenzobere", "obergrenze"},
    "referenz_einheit": {"referenzeinheit", "referenz_einheit"},
    "referenz_geschlecht_code": {"referenzgeschlechtcode", "referenz_geschlecht_code", "geschlechtreferenz"},
    "referenz_alter_min_tage": {"referenzaltermintage", "referenz_alter_min_tage"},
    "referenz_alter_max_tage": {"referenzaltermaxtage", "referenz_alter_max_tage"},
    "referenz_bemerkung": {"referenzbemerkung", "referenz_bemerkung"},
    "unsicher_flag": {"unsicherflag", "unsicher_flag", "unsicher"},
    "pruefbedarf_flag": {"pruefbedarfflag", "pruefbedarf_flag", "pruefbedarf"},
}


@dataclass
class Pruefregel:
    objekt_typ: str
    objekt_schluessel_temp: str | None
    pruefart: str
    status: str
    meldung: str


@dataclass
class ParameterResolution:
    parameter_id: str | None
    herkunft: str | None
    hinweis: str | None = None
    mehrdeutig: bool = False


class ParameterResolver:
    def __init__(self, db: Session) -> None:
        self.by_id: dict[str, Laborparameter] = {}
        self._schluessel_lookup: dict[str, list[tuple[str, str]]] = {}
        self._anzeigename_lookup: dict[str, list[tuple[str, str]]] = {}
        self._alias_lookup: dict[str, list[tuple[str, str]]] = {}

        for parameter in db.scalars(select(Laborparameter)):
            self.by_id[parameter.id] = parameter
            self._add_candidate(
                self._schluessel_lookup,
                normalize_parameter_name(parameter.interner_schluessel),
                parameter.id,
                parameter.interner_schluessel,
            )
            self._add_candidate(
                self._anzeigename_lookup,
                normalize_parameter_name(parameter.anzeigename),
                parameter.id,
                parameter.anzeigename,
            )

        for alias in db.scalars(select(LaborparameterAlias)):
            self._add_candidate(
                self._alias_lookup,
                alias.alias_normalisiert,
                alias.laborparameter_id,
                alias.alias_text,
            )

    def resolve(
        self,
        *,
        original_name: str,
        explicit_parameter_id: str | None,
        manual_parameter_id: str | None,
    ) -> ParameterResolution:
        if manual_parameter_id:
            return ParameterResolution(parameter_id=manual_parameter_id, herkunft="manuell")
        if explicit_parameter_id:
            return ParameterResolution(parameter_id=explicit_parameter_id, herkunft="explizit")

        normalized_name = normalize_parameter_name(original_name)
        if not normalized_name:
            return ParameterResolution(parameter_id=None, herkunft=None)

        for herkunft, lookup in (
            ("schluessel", self._schluessel_lookup),
            ("anzeigename", self._anzeigename_lookup),
            ("alias", self._alias_lookup),
        ):
            resolution = self._match_lookup(lookup, normalized_name, herkunft)
            if resolution is not None:
                return resolution

        return ParameterResolution(parameter_id=None, herkunft=None)

    def get_parameter_name(self, parameter_id: str | None) -> str | None:
        if not parameter_id:
            return None
        parameter = self.by_id.get(parameter_id)
        return parameter.anzeigename if parameter is not None else None

    def _match_lookup(
        self,
        lookup: dict[str, list[tuple[str, str]]],
        normalized_name: str,
        herkunft: str,
    ) -> ParameterResolution | None:
        candidates = lookup.get(normalized_name, [])
        unique_ids = {parameter_id for parameter_id, _ in candidates}
        if not unique_ids:
            return None
        if len(unique_ids) > 1:
            namen = ", ".join(
                sorted({self.by_id[parameter_id].anzeigename for parameter_id in unique_ids if parameter_id in self.by_id})
            )
            return ParameterResolution(
                parameter_id=None,
                herkunft=herkunft,
                hinweis=namen or None,
                mehrdeutig=True,
            )

        parameter_id = next(iter(unique_ids))
        matched_texts = sorted({label for candidate_id, label in candidates if candidate_id == parameter_id})
        return ParameterResolution(
            parameter_id=parameter_id,
            herkunft=herkunft,
            hinweis=matched_texts[0] if matched_texts else self.get_parameter_name(parameter_id),
        )

    @staticmethod
    def _add_candidate(
        lookup: dict[str, list[tuple[str, str]]],
        normalized_name: str,
        parameter_id: str,
        label: str,
    ) -> None:
        if not normalized_name:
            return
        lookup.setdefault(normalized_name, []).append((parameter_id, label))


def list_importe(db: Session) -> list[ImportvorgangListRead]:
    stmt = select(Importvorgang).order_by(Importvorgang.erstellt_am.desc())
    return [_build_list_item(db, importvorgang) for importvorgang in db.scalars(stmt)]


def get_import_detail(db: Session, import_id: str) -> ImportvorgangDetailRead | None:
    importvorgang = db.get(Importvorgang, import_id)
    if importvorgang is None:
        return None
    return _build_detail(db, importvorgang)


def list_pruefpunkte(db: Session, import_id: str) -> list[ImportPruefpunkt]:
    stmt = (
        select(ImportPruefpunkt)
        .where(ImportPruefpunkt.importvorgang_id == import_id)
        .order_by(ImportPruefpunkt.status.desc(), ImportPruefpunkt.objekt_typ.asc())
    )
    return list(db.scalars(stmt))


def create_import_entwurf(db: Session, payload: ImportEntwurfCreate) -> ImportvorgangDetailRead:
    import_payload = _parse_payload(payload.payload_json, payload.person_id_override)
    dokument_id = payload.dokument_id
    if dokument_id is None and import_payload.befund.dokument_pfad:
        dokument = store_existing_document_path(
            source_path=import_payload.befund.dokument_pfad,
            dokument_typ="importquelle",
            originalquelle_behalten=True,
            bemerkung=payload.bemerkung,
        )
        db.add(dokument)
        db.flush()
        dokument_id = dokument.id

    return _create_import_entwurf_record(
        db,
        import_payload=import_payload,
        bemerkung=payload.bemerkung,
        dokument_id=dokument_id,
    )


def create_import_entwurf_from_file(
    db: Session,
    *,
    filename: str,
    content_type: str | None,
    content: bytes,
    person_id_override: str | None,
    labor_id_override: str | None,
    labor_name_override: str | None,
    entnahmedatum_override: date | None,
    befunddatum_override: date | None,
    befund_bemerkung_override: str | None,
    import_bemerkung: str | None,
    quelle_behalten: bool,
) -> ImportvorgangDetailRead:
    dokument: Dokument | None = None
    if quelle_behalten:
        dokument = store_document_file(
            content=content,
            original_filename=filename,
            content_type=content_type,
            dokument_typ="importquelle",
            originalquelle_behalten=True,
            bemerkung=import_bemerkung,
        )
        db.add(dokument)
        db.flush()

    import_payload = _parse_tabular_import(
        filename=filename,
        content=content,
        person_id_override=person_id_override,
        labor_id_override=labor_id_override,
        labor_name_override=labor_name_override,
        entnahmedatum_override=entnahmedatum_override,
        befunddatum_override=befunddatum_override,
        befund_bemerkung_override=befund_bemerkung_override,
        dokument=dokument,
    )
    return _create_import_entwurf_record(
        db,
        import_payload=import_payload,
        bemerkung=import_bemerkung,
        dokument_id=dokument.id if dokument is not None else None,
    )


def uebernehmen_import(
    db: Session,
    import_id: str,
    payload: ImportUebernehmenRequest,
) -> ImportvorgangDetailRead:
    importvorgang = db.get(Importvorgang, import_id)
    if importvorgang is None:
        raise ValueError("Importvorgang nicht gefunden.")
    if importvorgang.status == "uebernommen":
        raise ValueError("Dieser Importvorgang wurde bereits übernommen.")

    import_payload = _parse_payload(importvorgang.roh_payload_text or "")
    mappings = payload.parameter_mappings
    pruefregeln = _generate_checks(db, importvorgang.id, import_payload, mappings)

    fehler = [item for item in pruefregeln if item.status == "fehler"]
    warnungen = [item for item in pruefregeln if item.status == "warnung"]
    if fehler:
        raise ValueError("Der Import enthält noch Fehler und kann noch nicht übernommen werden.")
    if warnungen and not payload.bestaetige_warnungen:
        raise ValueError("Bitte Warnungen bewusst bestätigen, bevor der Import übernommen wird.")

    person_id = import_payload.befund.person_id
    if person_id is None:
        raise ValueError("Dem Import ist keine Person zugeordnet.")

    labor_id = _resolve_labor(db, import_payload)
    befund = Befund(
        person_id=person_id,
        labor_id=labor_id,
        dokument_id=importvorgang.dokument_id,
        entnahmedatum=import_payload.befund.entnahmedatum,
        befunddatum=import_payload.befund.befunddatum,
        bemerkung=import_payload.befund.bemerkung,
        importvorgang_id=importvorgang.id,
        quelle_typ="import",
        duplikat_warnung=bool(warnungen),
    )
    db.add(befund)
    db.flush()

    mapping_lookup = {item.messwert_index: item.laborparameter_id for item in mappings}
    parameter_resolver = ParameterResolver(db)
    created_measurements: list[Messwert] = []

    for index, item in enumerate(import_payload.messwerte):
        resolution = parameter_resolver.resolve(
            original_name=item.original_parametername,
            explicit_parameter_id=item.parameter_id,
            manual_parameter_id=mapping_lookup.get(index),
        )
        parameter_id = resolution.parameter_id
        if parameter_id is None:
            raise ValueError("Es fehlt noch mindestens eine Parameterzuordnung.")

        messwert = Messwert(
            person_id=person_id,
            befund_id=befund.id,
            laborparameter_id=parameter_id,
            original_parametername=item.original_parametername,
            wert_typ=item.wert_typ,
            wert_operator=item.wert_operator,
            wert_roh_text=item.wert_roh_text,
            wert_num=item.wert_num,
            wert_text=item.wert_text if item.wert_typ == "text" else None,
            einheit_original=item.einheit_original,
            bemerkung_kurz=item.bemerkung_kurz,
            bemerkung_lang=item.bemerkung_lang,
            unsicher_flag=item.unsicher_flag,
            pruefbedarf_flag=item.pruefbedarf_flag,
            importvorgang_id=importvorgang.id,
        )
        db.add(messwert)
        db.flush()
        created_measurements.append(messwert)

        if (
            item.referenz_text_original
            or item.untere_grenze_num is not None
            or item.obere_grenze_num is not None
            or item.referenz_einheit
        ):
            db.add(
                MesswertReferenz(
                    messwert_id=messwert.id,
                    referenz_typ="labor",
                    referenz_text_original=item.referenz_text_original,
                    wert_typ=item.wert_typ,
                    untere_grenze_num=item.untere_grenze_num if item.wert_typ == "numerisch" else None,
                    obere_grenze_num=item.obere_grenze_num if item.wert_typ == "numerisch" else None,
                    einheit=item.referenz_einheit if item.wert_typ == "numerisch" else None,
                    soll_text=item.referenz_text_original if item.wert_typ == "text" else None,
                    geschlecht_code=item.referenz_geschlecht_code,
                    alter_min_tage=item.referenz_alter_min_tage,
                    alter_max_tage=item.referenz_alter_max_tage,
                    bemerkung=item.referenz_bemerkung,
                )
            )

    _replace_checks(db, importvorgang.id, pruefregeln, bestaetige_warnungen=payload.bestaetige_warnungen)
    importvorgang.status = "uebernommen"
    importvorgang.warnungen_text = _summarize_warnings(pruefregeln)

    db.add(importvorgang)
    db.commit()
    db.refresh(importvorgang)
    return _build_detail(db, importvorgang)


def verwerfen_import(db: Session, import_id: str) -> ImportvorgangDetailRead:
    importvorgang = db.get(Importvorgang, import_id)
    if importvorgang is None:
        raise ValueError("Importvorgang nicht gefunden.")
    importvorgang.status = "verworfen"
    db.add(importvorgang)
    db.commit()
    db.refresh(importvorgang)
    return _build_detail(db, importvorgang)


def _create_import_entwurf_record(
    db: Session,
    *,
    import_payload: ImportPayload,
    bemerkung: str | None,
    dokument_id: str | None,
) -> ImportvorgangDetailRead:
    payload_json = _serialize_payload(import_payload)
    fingerprint = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()

    importvorgang = Importvorgang(
        quelle_typ=import_payload.quelle_typ,
        status="in_pruefung",
        person_id_vorschlag=import_payload.befund.person_id,
        dokument_id=dokument_id,
        roh_payload_text=payload_json,
        schema_version=import_payload.schema_version,
        fingerprint=fingerprint,
        bemerkung=bemerkung,
    )
    db.add(importvorgang)
    db.flush()

    pruefregeln = _generate_checks(db, importvorgang.id, import_payload, [])
    _store_checks(db, importvorgang.id, pruefregeln)
    importvorgang.warnungen_text = _summarize_warnings(pruefregeln)

    db.add(importvorgang)
    db.commit()
    db.refresh(importvorgang)
    return _build_detail(db, importvorgang)


def _build_list_item(db: Session, importvorgang: Importvorgang) -> ImportvorgangListRead:
    counts = _count_checks(db, importvorgang.id)
    payload = _parse_payload(importvorgang.roh_payload_text or "")
    dokument = db.get(Dokument, importvorgang.dokument_id) if importvorgang.dokument_id else None
    return ImportvorgangListRead(
        id=importvorgang.id,
        quelle_typ=importvorgang.quelle_typ,
        status=importvorgang.status,
        person_id_vorschlag=importvorgang.person_id_vorschlag,
        schema_version=importvorgang.schema_version,
        bemerkung=importvorgang.bemerkung,
        dokument_id=importvorgang.dokument_id,
        dokument_dateiname=dokument.dateiname if dokument is not None else None,
        messwerte_anzahl=len(payload.messwerte),
        fehler_anzahl=counts["fehler"],
        warnung_anzahl=counts["warnung"],
        erstellt_am=importvorgang.erstellt_am,
        geaendert_am=importvorgang.geaendert_am,
    )


def _build_detail(db: Session, importvorgang: Importvorgang) -> ImportvorgangDetailRead:
    payload = _parse_payload(importvorgang.roh_payload_text or "")
    checks = list_pruefpunkte(db, importvorgang.id)
    counts = _count_checks(db, importvorgang.id)
    parameter_resolver = ParameterResolver(db)
    imported_measurements = list(
        db.scalars(
            select(Messwert)
            .where(Messwert.importvorgang_id == importvorgang.id)
            .order_by(Messwert.erstellt_am.asc())
        )
    )
    imported_befund = db.scalar(
        select(Befund).where(Befund.importvorgang_id == importvorgang.id).order_by(Befund.erstellt_am.asc())
    )
    dokument_id = imported_befund.dokument_id if imported_befund is not None else importvorgang.dokument_id
    dokument = db.get(Dokument, dokument_id) if dokument_id else None

    return ImportvorgangDetailRead(
        id=importvorgang.id,
        quelle_typ=importvorgang.quelle_typ,
        status=importvorgang.status,
        person_id_vorschlag=importvorgang.person_id_vorschlag,
        schema_version=importvorgang.schema_version,
        bemerkung=importvorgang.bemerkung,
        warnungen_text=importvorgang.warnungen_text,
        fingerprint=importvorgang.fingerprint,
        dokument_id=dokument_id,
        dokument_dateiname=dokument.dateiname if dokument is not None else None,
        erstellt_am=importvorgang.erstellt_am,
        geaendert_am=importvorgang.geaendert_am,
        messwerte_anzahl=len(payload.messwerte),
        fehler_anzahl=counts["fehler"],
        warnung_anzahl=counts["warnung"],
        befund=ImportBefundPreviewRead(
            person_id=payload.befund.person_id,
            labor_id=imported_befund.labor_id if imported_befund is not None else payload.befund.labor_id,
            labor_name=payload.befund.labor_name,
            entnahmedatum=payload.befund.entnahmedatum,
            befunddatum=payload.befund.befunddatum,
            bemerkung=payload.befund.bemerkung,
            dokument_id=dokument_id,
            dokument_dateiname=dokument.dateiname if dokument is not None else None,
            dokument_pfad=(
                dokument.pfad_absolut
                if dokument is not None and dokument.pfad_absolut
                else payload.befund.dokument_pfad
            ),
        ),
        messwerte=[
            _build_measurement_preview(
                index=index,
                item=item,
                imported_measurements=imported_measurements,
                parameter_resolver=parameter_resolver,
            )
            for index, item in enumerate(payload.messwerte)
        ],
        pruefpunkte=[ImportPruefpunktRead.model_validate(item) for item in checks],
    )


def _build_measurement_preview(
    *,
    index: int,
    item: ImportMesswertPayload,
    imported_measurements: list[Messwert],
    parameter_resolver: ParameterResolver,
) -> ImportMesswertPreviewRead:
    imported_parameter_id = imported_measurements[index].laborparameter_id if index < len(imported_measurements) else None
    resolution = parameter_resolver.resolve(
        original_name=item.original_parametername,
        explicit_parameter_id=item.parameter_id,
        manual_parameter_id=None,
    )

    if imported_parameter_id is not None:
        parameter_id = imported_parameter_id
        mapping_herkunft = "uebernommen"
        mapping_hinweis = parameter_resolver.get_parameter_name(imported_parameter_id)
    else:
        parameter_id = resolution.parameter_id
        mapping_herkunft = resolution.herkunft
        mapping_hinweis = resolution.hinweis

    return ImportMesswertPreviewRead(
        messwert_index=index,
        parameter_id=parameter_id,
        parameter_mapping_herkunft=mapping_herkunft,
        parameter_mapping_hinweis=mapping_hinweis,
        original_parametername=item.original_parametername,
        wert_typ=item.wert_typ,
        wert_roh_text=item.wert_roh_text,
        wert_num=item.wert_num,
        wert_text=item.wert_text,
        einheit_original=item.einheit_original,
        bemerkung_kurz=item.bemerkung_kurz,
        referenz_text_original=item.referenz_text_original,
        untere_grenze_num=item.untere_grenze_num,
        obere_grenze_num=item.obere_grenze_num,
        referenz_einheit=item.referenz_einheit,
        referenz_geschlecht_code=item.referenz_geschlecht_code,
        referenz_alter_min_tage=item.referenz_alter_min_tage,
        referenz_alter_max_tage=item.referenz_alter_max_tage,
        referenz_bemerkung=item.referenz_bemerkung,
    )


def _generate_checks(
    db: Session,
    importvorgang_id: str,
    payload: ImportPayload,
    mappings: list[ImportParameterMapping],
) -> list[Pruefregel]:
    del importvorgang_id
    mapping_lookup = {item.messwert_index: item.laborparameter_id for item in mappings}
    checks: list[Pruefregel] = []
    parameter_resolver = ParameterResolver(db)

    person_id = payload.befund.person_id
    if not person_id:
        checks.append(
            Pruefregel("befund", "befund", "person_zuordnung", "fehler", "Dem Befund ist noch keine Person zugeordnet.")
        )
    elif db.get(Person, person_id) is None:
        checks.append(Pruefregel("befund", "befund", "person_zuordnung", "fehler", "Die zugeordnete Person existiert nicht."))

    if payload.befund.labor_id and db.get(Labor, payload.befund.labor_id) is None:
        checks.append(Pruefregel("befund", "befund", "labor_zuordnung", "fehler", "Das angegebene Labor existiert nicht."))

    duplicate_fingerprint = db.scalar(
        select(func.count(Importvorgang.id))
        .where(Importvorgang.fingerprint == hashlib.sha256(_serialize_payload(payload).encode("utf-8")).hexdigest())
        .where(Importvorgang.status != "verworfen")
    )
    if duplicate_fingerprint and duplicate_fingerprint > 1:
        checks.append(
            Pruefregel(
                "import",
                "gesamt",
                "fingerprint_duplikat",
                "warnung",
                "Ein sehr ähnlicher Importvorgang ist bereits in der Historie vorhanden.",
            )
        )

    for index, item in enumerate(payload.messwerte):
        resolution = parameter_resolver.resolve(
            original_name=item.original_parametername,
            explicit_parameter_id=item.parameter_id,
            manual_parameter_id=mapping_lookup.get(index),
        )
        parameter_id = resolution.parameter_id
        key = f"messwert:{index}"
        if parameter_id is None:
            meldung = (
                f"Für '{item.original_parametername}' gibt es mehrere passende Parameter"
                + (f": {resolution.hinweis}." if resolution.mehrdeutig and resolution.hinweis else ".")
                if resolution.mehrdeutig
                else f"Für '{item.original_parametername}' fehlt noch eine Parameterzuordnung."
            )
            checks.append(Pruefregel("messwert", key, "parameter_mapping", "warnung", meldung))
        else:
            parameter = db.get(Laborparameter, parameter_id)
            if parameter is None:
                checks.append(
                    Pruefregel(
                        "messwert",
                        key,
                        "parameter_mapping",
                        "fehler",
                        f"Der zugeordnete Parameter für '{item.original_parametername}' existiert nicht.",
                    )
                )
            elif parameter.wert_typ_standard != item.wert_typ:
                checks.append(
                    Pruefregel(
                        "messwert",
                        key,
                        "wert_typ_abgleich",
                        "warnung",
                        f"Der Werttyp von '{item.original_parametername}' passt nicht zum erwarteten Parametertyp.",
                    )
                )

        if item.wert_typ == "numerisch" and item.wert_num is None and not item.pruefbedarf_flag:
            checks.append(
                Pruefregel(
                    "messwert",
                    key,
                    "wert_parse",
                    "warnung",
                    f"Für '{item.original_parametername}' fehlt ein parsebarer Zahlenwert.",
                )
            )

        if person_id and parameter_id and _has_duplicate_measurement(db, person_id, payload.befund.entnahmedatum, parameter_id):
            checks.append(
                Pruefregel(
                    "messwert",
                    key,
                    "duplikat",
                    "warnung",
                    f"Für '{item.original_parametername}' gibt es am selben Entnahmedatum bereits einen Messwert.",
                )
            )

    return checks


def _has_duplicate_measurement(db: Session, person_id: str, entnahmedatum, parameter_id: str) -> bool:
    stmt = (
        select(func.count(Messwert.id))
        .join(Befund, Messwert.befund_id == Befund.id)
        .where(Messwert.person_id == person_id)
        .where(Messwert.laborparameter_id == parameter_id)
        .where(Befund.entnahmedatum == entnahmedatum)
    )
    count = db.scalar(stmt) or 0
    return count > 0


def _store_checks(db: Session, importvorgang_id: str, checks: list[Pruefregel]) -> None:
    for item in checks:
        db.add(
            ImportPruefpunkt(
                importvorgang_id=importvorgang_id,
                objekt_typ=item.objekt_typ,
                objekt_schluessel_temp=item.objekt_schluessel_temp,
                pruefart=item.pruefart,
                status=item.status,
                meldung=item.meldung,
            )
        )


def _replace_checks(
    db: Session,
    importvorgang_id: str,
    checks: list[Pruefregel],
    bestaetige_warnungen: bool,
) -> None:
    for item in list_pruefpunkte(db, importvorgang_id):
        db.delete(item)
    for item in checks:
        is_warning = item.status == "warnung"
        db.add(
            ImportPruefpunkt(
                importvorgang_id=importvorgang_id,
                objekt_typ=item.objekt_typ,
                objekt_schluessel_temp=item.objekt_schluessel_temp,
                pruefart=item.pruefart,
                status="bestaetigt" if is_warning and bestaetige_warnungen else item.status,
                meldung=item.meldung,
                bestaetigt_vom_nutzer=is_warning and bestaetige_warnungen,
                bestaetigt_am=utcnow() if is_warning and bestaetige_warnungen else None,
            )
        )


def _count_checks(db: Session, import_id: str) -> dict[str, int]:
    stmt = (
        select(ImportPruefpunkt.status, func.count(ImportPruefpunkt.id))
        .where(ImportPruefpunkt.importvorgang_id == import_id)
        .group_by(ImportPruefpunkt.status)
    )
    result = {"fehler": 0, "warnung": 0}
    for status, count in db.execute(stmt):
        if status == "fehler":
            result["fehler"] = count
        elif status == "warnung":
            result["warnung"] = count
    return result


def _parse_payload(payload_json: str, person_id_override: str | None = None) -> ImportPayload:
    try:
        data = json.loads(payload_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Das Import-JSON ist nicht gültig: {exc.msg}.") from exc

    if person_id_override:
        data.setdefault("befund", {})
        data["befund"]["personId"] = person_id_override

    try:
        return ImportPayload.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"Das Import-JSON passt nicht zum erwarteten Schema: {exc}") from exc


def _serialize_payload(payload: ImportPayload) -> str:
    return json.dumps(payload.model_dump(mode="json", by_alias=True), ensure_ascii=False, sort_keys=True)


def _resolve_labor(db: Session, payload: ImportPayload) -> str | None:
    if payload.befund.labor_id:
        return payload.befund.labor_id
    if payload.befund.labor_name:
        stmt = select(Labor).where(func.lower(Labor.name) == payload.befund.labor_name.lower())
        labor = db.scalar(stmt)
        if labor is not None:
            return labor.id
        labor = Labor(name=payload.befund.labor_name)
        db.add(labor)
        db.flush()
        return labor.id
    return None


def _summarize_warnings(checks: list[Pruefregel]) -> str | None:
    warnungen = [item.meldung for item in checks if item.status in {"warnung", "fehler"}]
    if not warnungen:
        return None
    return "\n".join(warnungen[:10])


def _parse_tabular_import(
    *,
    filename: str,
    content: bytes,
    person_id_override: str | None,
    labor_id_override: str | None,
    labor_name_override: str | None,
    entnahmedatum_override: date | None,
    befunddatum_override: date | None,
    befund_bemerkung_override: str | None,
    dokument: Dokument | None,
) -> ImportPayload:
    suffix = Path(filename).suffix.lower()
    rows = _read_tabular_rows(filename=filename, content=content, suffix=suffix)
    if not rows:
        raise ValueError("Die Datei enthält keine auswertbaren Zeilen.")

    entnahmedatum = entnahmedatum_override or _extract_date(rows, "entnahmedatum")
    if entnahmedatum is None:
        raise ValueError("Für CSV- oder Excel-Importe ist ein Entnahmedatum erforderlich.")

    befunddatum = befunddatum_override or _extract_date(rows, "befunddatum")
    befund_bemerkung = befund_bemerkung_override or _extract_text(rows, "befund_bemerkung")
    person_id = person_id_override or _extract_text(rows, "person_id")
    labor_id = labor_id_override or _extract_text(rows, "labor_id")
    labor_name = labor_name_override or _extract_text(rows, "labor_name")

    messwerte = [_row_to_measurement(row) for row in rows]
    messwerte = [item for item in messwerte if item is not None]
    if not messwerte:
        raise ValueError("Es konnten keine Messwerte aus der Datei abgeleitet werden.")

    quelle_typ = "excel" if suffix in {".xlsx", ".xlsm"} else "csv"
    dokument_pfad = dokument.pfad_absolut if dokument is not None else None

    return ImportPayload.model_validate(
        {
            "schemaVersion": "1.0",
            "quelleTyp": quelle_typ,
            "personHinweis": Path(filename).name,
            "befund": {
                "personId": person_id,
                "laborId": labor_id,
                "laborName": labor_name,
                "entnahmedatum": entnahmedatum.isoformat(),
                "befunddatum": befunddatum.isoformat() if befunddatum else None,
                "bemerkung": befund_bemerkung,
                "dokumentPfad": dokument_pfad,
            },
            "messwerte": [item.model_dump(mode="json", by_alias=True) for item in messwerte],
        }
    )


def _read_tabular_rows(*, filename: str, content: bytes, suffix: str) -> list[dict[str, str]]:
    if suffix == ".csv":
        return _read_csv_rows(content)
    if suffix in {".xlsx", ".xlsm"}:
        return _read_excel_rows(content)
    raise ValueError(f"Der Dateityp von '{filename}' wird aktuell nur für CSV oder Excel unterstützt.")


def _read_csv_rows(content: bytes) -> list[dict[str, str]]:
    sample = content[:4096]
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    delimiter = ";"
    try:
        dialect = csv.Sniffer().sniff(sample.decode("utf-8-sig", errors="ignore"), delimiters=";,\t")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ";" if ";" in text else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    rows: list[dict[str, str]] = []
    for row in reader:
        normalized = {str(key or "").strip(): _stringify_cell(value) for key, value in row.items() if key}
        if any(value for value in normalized.values()):
            rows.append(normalized)
    return rows


def _read_excel_rows(content: bytes) -> list[dict[str, str]]:
    workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    sheet = workbook.active
    iterator = sheet.iter_rows(values_only=True)
    try:
        header_row = next(iterator)
    except StopIteration as exc:
        raise ValueError("Die Excel-Datei enthält keine Daten.") from exc

    headers = [str(item).strip() if item is not None else "" for item in header_row]
    rows: list[dict[str, str]] = []
    for values in iterator:
        row = {headers[index]: _stringify_cell(value) for index, value in enumerate(values) if index < len(headers) and headers[index]}
        if any(value for value in row.values()):
            rows.append(row)
    workbook.close()
    return rows


def _row_to_measurement(row: dict[str, str]) -> ImportMesswertPayload | None:
    original_name = _row_value(row, "original_parametername")
    raw_value = _row_value(row, "wert_roh_text")
    explicit_num = _parse_optional_float(_row_value(row, "wert_num"))
    explicit_text = _row_value(row, "wert_text")

    if not original_name and not raw_value and explicit_num is None and not explicit_text:
        return None
    if not original_name:
        raise ValueError("Mindestens eine Zeile enthält keinen Parameternamen.")

    operator = _row_value(row, "wert_operator") or "exakt"
    normalized_raw = raw_value or ""
    if raw_value:
        inferred_operator, cleaned_raw = _split_operator(raw_value)
        normalized_raw = cleaned_raw
        if operator == "exakt" and inferred_operator != "exakt":
            operator = inferred_operator

    raw_for_inference = normalized_raw or explicit_text or (str(explicit_num) if explicit_num is not None else "")
    wert_typ = _infer_value_type(_row_value(row, "wert_typ"), explicit_num, explicit_text, raw_for_inference)

    wert_num = explicit_num
    wert_text = explicit_text
    if wert_typ == "numerisch" and wert_num is None:
        wert_num = _parse_optional_float(normalized_raw)
    if wert_typ == "text" and not wert_text:
        wert_text = normalized_raw or raw_value or None

    payload = {
        "parameterId": _row_value(row, "parameter_id"),
        "originalParametername": original_name,
        "wertTyp": wert_typ,
        "wertOperator": operator,
        "wertRohText": raw_value or explicit_text or (str(explicit_num) if explicit_num is not None else ""),
        "wertNum": wert_num,
        "wertText": wert_text,
        "einheitOriginal": _row_value(row, "einheit_original"),
        "bemerkungKurz": _row_value(row, "bemerkung_kurz"),
        "bemerkungLang": _row_value(row, "bemerkung_lang"),
        "referenzTextOriginal": _row_value(row, "referenz_text_original"),
        "untereGrenzeNum": _parse_optional_float(_row_value(row, "untere_grenze_num")),
        "obereGrenzeNum": _parse_optional_float(_row_value(row, "obere_grenze_num")),
        "referenzEinheit": _row_value(row, "referenz_einheit"),
        "referenzGeschlechtCode": _row_value(row, "referenz_geschlecht_code"),
        "referenzAlterMinTage": _parse_optional_int(_row_value(row, "referenz_alter_min_tage")),
        "referenzAlterMaxTage": _parse_optional_int(_row_value(row, "referenz_alter_max_tage")),
        "referenzBemerkung": _row_value(row, "referenz_bemerkung"),
        "unsicherFlag": _parse_bool(_row_value(row, "unsicher_flag")),
        "pruefbedarfFlag": _parse_bool(_row_value(row, "pruefbedarf_flag")),
    }
    return ImportMesswertPayload.model_validate(payload)


def _extract_text(rows: list[dict[str, str]], field: str) -> str | None:
    for row in rows:
        value = _row_value(row, field)
        if value:
            return value
    return None


def _extract_date(rows: list[dict[str, str]], field: str) -> date | None:
    for row in rows:
        value = _parse_optional_date(_row_value(row, field))
        if value is not None:
            return value
    return None


def _row_value(row: dict[str, str], field: str) -> str | None:
    aliases = HEADER_ALIASES.get(field, {field})
    normalized_keys = {_normalize_header(key): value for key, value in row.items()}
    for alias in aliases:
        value = normalized_keys.get(alias)
        if value not in {None, ""}:
            return value
    return None


def _normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _stringify_cell(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value).strip()


def _parse_optional_float(value: str | None) -> float | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    normalized = normalized.replace(" ", "").replace("%", "")
    normalized = normalized.replace(".", "").replace(",", ".") if "," in normalized and "." in normalized and normalized.rfind(",") > normalized.rfind(".") else normalized.replace(",", ".")
    match = re.search(r"[-+]?\d+(?:\.\d+)?", normalized)
    if match is None:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def _parse_optional_int(value: str | None) -> int | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    match = re.search(r"[-+]?\d+", normalized)
    if match is None:
        return None
    try:
        return int(match.group(0))
    except ValueError:
        return None


def _parse_optional_date(value: str | None) -> date | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(normalized, fmt).date()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        return None


def _parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    normalized = value.strip().lower()
    return normalized in {"1", "true", "ja", "yes", "y", "x"}


def _split_operator(raw_value: str) -> tuple[str, str]:
    normalized = raw_value.strip()
    for token in ("<=", ">=", "<", ">"):
        if normalized.startswith(token):
            return token, normalized[len(token) :].strip()
    return "exakt", normalized


def _infer_value_type(
    explicit_type: str | None,
    explicit_num: float | None,
    explicit_text: str | None,
    raw_value: str | None,
) -> str:
    normalized_type = (explicit_type or "").strip().lower()
    if normalized_type in {"numerisch", "numeric", "zahl"}:
        return "numerisch"
    if normalized_type in {"text", "qualitativ", "qualitativtext"}:
        return "text"
    if explicit_num is not None:
        return "numerisch"
    if explicit_text:
        return "text"
    if raw_value and _parse_optional_float(raw_value) is not None:
        return "numerisch"
    return "text"
