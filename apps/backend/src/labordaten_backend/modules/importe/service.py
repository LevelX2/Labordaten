from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labordaten_backend.models.befund import Befund
from labordaten_backend.models.import_pruefpunkt import ImportPruefpunkt
from labordaten_backend.models.importvorgang import Importvorgang
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.person import Person
from labordaten_backend.models.base import utcnow
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


@dataclass
class Pruefregel:
    objekt_typ: str
    objekt_schluessel_temp: str | None
    pruefart: str
    status: str
    meldung: str


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
    payload_json = _serialize_payload(import_payload)
    fingerprint = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()

    importvorgang = Importvorgang(
        quelle_typ=import_payload.quelle_typ,
        status="in_pruefung",
        person_id_vorschlag=import_payload.befund.person_id,
        roh_payload_text=payload_json,
        schema_version=import_payload.schema_version,
        fingerprint=fingerprint,
        bemerkung=payload.bemerkung,
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
    created_measurements: list[Messwert] = []

    for index, item in enumerate(import_payload.messwerte):
        parameter_id = item.parameter_id or mapping_lookup.get(index)
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


def _build_list_item(db: Session, importvorgang: Importvorgang) -> ImportvorgangListRead:
    counts = _count_checks(db, importvorgang.id)
    payload = _parse_payload(importvorgang.roh_payload_text or "")
    return ImportvorgangListRead(
        id=importvorgang.id,
        quelle_typ=importvorgang.quelle_typ,
        status=importvorgang.status,
        person_id_vorschlag=importvorgang.person_id_vorschlag,
        schema_version=importvorgang.schema_version,
        bemerkung=importvorgang.bemerkung,
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

    return ImportvorgangDetailRead(
        id=importvorgang.id,
        quelle_typ=importvorgang.quelle_typ,
        status=importvorgang.status,
        person_id_vorschlag=importvorgang.person_id_vorschlag,
        schema_version=importvorgang.schema_version,
        bemerkung=importvorgang.bemerkung,
        warnungen_text=importvorgang.warnungen_text,
        fingerprint=importvorgang.fingerprint,
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
            dokument_pfad=payload.befund.dokument_pfad,
        ),
        messwerte=[
            ImportMesswertPreviewRead(
                messwert_index=index,
                parameter_id=(
                    imported_measurements[index].laborparameter_id
                    if index < len(imported_measurements)
                    else item.parameter_id
                ),
                original_parametername=item.original_parametername,
                wert_typ=item.wert_typ,
                wert_roh_text=item.wert_roh_text,
                wert_num=item.wert_num,
                wert_text=item.wert_text,
                einheit_original=item.einheit_original,
                bemerkung_kurz=item.bemerkung_kurz,
                referenz_text_original=item.referenz_text_original,
            )
            for index, item in enumerate(payload.messwerte)
        ],
        pruefpunkte=[ImportPruefpunktRead.model_validate(item) for item in checks],
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
        parameter_id = item.parameter_id or mapping_lookup.get(index)
        key = f"messwert:{index}"
        if parameter_id is None:
            checks.append(
                Pruefregel(
                    "messwert",
                    key,
                    "parameter_mapping",
                    "warnung",
                    f"Für '{item.original_parametername}' fehlt noch eine Parameterzuordnung.",
                )
            )
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
