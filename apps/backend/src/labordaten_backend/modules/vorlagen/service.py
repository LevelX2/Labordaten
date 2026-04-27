from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.ansicht_vorlage import AnsichtVorlage
from labordaten_backend.models.base import utcnow
from labordaten_backend.modules.vorlagen import schemas


CONFIG_SCHEMA_BY_TYPE = {
    "auswertung_verlauf": schemas.AuswertungVorlageKonfiguration,
    "arztbericht_liste": schemas.ArztberichtVorlageKonfiguration,
    "verlaufsbericht_zeitachse": schemas.VerlaufsberichtVorlageKonfiguration,
}


def list_vorlagen(
    db: Session,
    *,
    bereich: str | None = None,
    vorlage_typ: str | None = None,
) -> list[schemas.AnsichtVorlageRead]:
    stmt = select(AnsichtVorlage).where(AnsichtVorlage.aktiv.is_(True))
    if bereich:
        stmt = stmt.where(AnsichtVorlage.bereich == bereich)
    if vorlage_typ:
        stmt = stmt.where(AnsichtVorlage.vorlage_typ == vorlage_typ)
    stmt = stmt.order_by(AnsichtVorlage.sortierung.asc().nulls_last(), AnsichtVorlage.name.asc())
    return [_to_read_model(vorlage) for vorlage in db.scalars(stmt)]


def get_vorlage(db: Session, vorlage_id: str) -> schemas.AnsichtVorlageRead | None:
    vorlage = db.get(AnsichtVorlage, vorlage_id)
    if vorlage is None or not vorlage.aktiv:
        return None
    return _to_read_model(vorlage)


def create_vorlage(db: Session, payload: schemas.AnsichtVorlageCreate) -> schemas.AnsichtVorlageRead:
    name = _clean_name(payload.name)
    _validate_type_pair(payload.bereich, payload.vorlage_typ)
    konfiguration = _validate_config(payload.vorlage_typ, payload.konfiguration_json)

    vorlage = AnsichtVorlage(
        name=name,
        bereich=payload.bereich,
        vorlage_typ=payload.vorlage_typ,
        beschreibung=_clean_optional(payload.beschreibung),
        konfiguration_json=_serialize_config(konfiguration),
        schema_version="1",
        sortierung=payload.sortierung,
    )
    db.add(vorlage)
    db.commit()
    db.refresh(vorlage)
    return _to_read_model(vorlage)


def update_vorlage(
    db: Session,
    vorlage_id: str,
    payload: schemas.AnsichtVorlageUpdate,
) -> schemas.AnsichtVorlageRead:
    vorlage = db.get(AnsichtVorlage, vorlage_id)
    if vorlage is None or not vorlage.aktiv:
        raise ValueError("Die gewählte Vorlage existiert nicht.")

    vorlage.name = _clean_name(payload.name)
    vorlage.beschreibung = _clean_optional(payload.beschreibung)
    vorlage.konfiguration_json = _serialize_config(_validate_config(vorlage.vorlage_typ, payload.konfiguration_json))
    vorlage.sortierung = payload.sortierung
    db.commit()
    db.refresh(vorlage)
    return _to_read_model(vorlage)


def mark_vorlage_used(db: Session, vorlage_id: str) -> schemas.AnsichtVorlageRead:
    vorlage = db.get(AnsichtVorlage, vorlage_id)
    if vorlage is None or not vorlage.aktiv:
        raise ValueError("Die gewählte Vorlage existiert nicht.")

    vorlage.zuletzt_verwendet_am = utcnow()
    db.commit()
    db.refresh(vorlage)
    return _to_read_model(vorlage)


def delete_vorlage(db: Session, vorlage_id: str) -> schemas.AnsichtVorlageDeleteResult:
    vorlage = db.get(AnsichtVorlage, vorlage_id)
    if vorlage is None or not vorlage.aktiv:
        raise ValueError("Die gewählte Vorlage existiert nicht.")

    vorlage.aktiv = False
    db.commit()
    return schemas.AnsichtVorlageDeleteResult(id=vorlage_id, geloescht=True)


def _to_read_model(vorlage: AnsichtVorlage) -> schemas.AnsichtVorlageRead:
    return schemas.AnsichtVorlageRead(
        id=vorlage.id,
        name=vorlage.name,
        bereich=vorlage.bereich,
        vorlage_typ=vorlage.vorlage_typ,
        beschreibung=vorlage.beschreibung,
        konfiguration_json=_load_config(vorlage.konfiguration_json),
        schema_version=vorlage.schema_version,
        aktiv=vorlage.aktiv,
        sortierung=vorlage.sortierung,
        zuletzt_verwendet_am=vorlage.zuletzt_verwendet_am,
        erstellt_am=vorlage.erstellt_am,
        geaendert_am=vorlage.geaendert_am,
    )


def _validate_type_pair(bereich: str, vorlage_typ: str) -> None:
    valid_types = schemas.VORLAGE_TYPEN_PRO_BEREICH.get(bereich)
    if valid_types is None or vorlage_typ not in valid_types:
        raise ValueError("Vorlagentyp und Bereich passen nicht zusammen.")


def _validate_config(vorlage_typ: str, config: dict[str, Any]) -> dict[str, Any]:
    config_model = CONFIG_SCHEMA_BY_TYPE.get(vorlage_typ)
    if config_model is None:
        raise ValueError("Der Vorlagentyp wird nicht unterstützt.")

    try:
        return config_model.model_validate(config).model_dump(mode="json")
    except ValidationError as exc:
        raise ValueError(f"Die Vorlagenkonfiguration ist ungültig: {exc.errors()[0]['msg']}") from exc


def _load_config(config_json: str) -> dict[str, Any]:
    try:
        config = json.loads(config_json)
        return config if isinstance(config, dict) else {}
    except json.JSONDecodeError:
        return {}


def _serialize_config(config: dict[str, Any]) -> str:
    return json.dumps(config, ensure_ascii=False, sort_keys=True)


def _clean_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned:
        raise ValueError("Vorlagen brauchen einen Namen.")
    return cleaned


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None
