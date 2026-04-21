from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.einheit_alias import EinheitAlias
from labordaten_backend.modules.einheiten.schemas import (
    EinheitAliasCreate,
    EinheitAliasRead,
    EinheitCreate,
    EinheitRead,
)


def list_einheiten(db: Session) -> list[EinheitRead]:
    einheiten = list(
        db.scalars(
            select(Einheit).where(Einheit.aktiv.is_(True)).order_by(func.lower(Einheit.kuerzel).asc())
        )
    )
    alias_map = _build_alias_map(db, [einheit.id for einheit in einheiten])
    return [_to_einheit_read(einheit, alias_map.get(einheit.id, [])) for einheit in einheiten]


def create_einheit(db: Session, payload: EinheitCreate) -> EinheitRead:
    kuerzel = normalize_einheit(payload.kuerzel)
    if kuerzel is None:
        raise ValueError("Das Einheitenkürzel darf nicht leer sein.")

    existing_exact = _get_any_einheit_by_kuerzel(db, kuerzel)
    if existing_exact is not None and existing_exact.aktiv:
        raise ValueError(f"Die Einheit '{kuerzel}' ist bereits vorhanden.")

    resolved_active = _resolve_active_einheit(db, kuerzel)
    if resolved_active is not None:
        if resolved_active.kuerzel == kuerzel:
            raise ValueError(f"Die Einheit '{kuerzel}' ist bereits vorhanden.")
        raise ValueError(
            f"Die Schreibweise '{kuerzel}' ist bereits der Einheit '{resolved_active.kuerzel}' zugeordnet."
        )

    if existing_exact is not None:
        existing_exact.aktiv = True
        db.add(existing_exact)
        db.commit()
        db.refresh(existing_exact)
        return _to_einheit_read(existing_exact, [])

    einheit = Einheit(kuerzel=kuerzel)
    db.add(einheit)
    db.commit()
    db.refresh(einheit)
    return _to_einheit_read(einheit, [])


def list_einheit_aliase(db: Session, einheit_id: str) -> list[EinheitAlias]:
    _require_einheit(db, einheit_id)
    stmt = (
        select(EinheitAlias)
        .where(EinheitAlias.einheit_id == einheit_id)
        .order_by(func.lower(EinheitAlias.alias_text).asc())
    )
    return list(db.scalars(stmt))


def create_einheit_alias(db: Session, einheit_id: str, payload: EinheitAliasCreate) -> EinheitAlias:
    einheit = _require_einheit(db, einheit_id)
    alias_text = normalize_einheit(payload.alias_text)
    if alias_text is None:
        raise ValueError("Der Alias darf nicht leer sein.")

    alias_normalisiert = normalize_einheit_lookup(alias_text)
    if alias_normalisiert is None:
        raise ValueError("Der Alias enthält keine auswertbaren Zeichen.")

    if alias_text == einheit.kuerzel:
        raise ValueError(f"Der Alias '{alias_text}' entspricht bereits dem Kürzel '{einheit.kuerzel}'.")

    existing_alias = db.scalar(
        select(EinheitAlias).where(EinheitAlias.alias_normalisiert == alias_normalisiert)
    )
    if existing_alias is not None:
        if existing_alias.einheit_id == einheit.id:
            raise ValueError(
                f"Die Schreibweise '{alias_text}' ist der Einheit '{einheit.kuerzel}' bereits zugeordnet."
            )
        other_einheit = db.get(Einheit, existing_alias.einheit_id)
        other_kuerzel = other_einheit.kuerzel if other_einheit is not None else "einer anderen Einheit"
        raise ValueError(
            f"Die Schreibweise '{alias_text}' ist bereits der Einheit '{other_kuerzel}' zugeordnet."
        )

    for other_einheit in db.scalars(select(Einheit)):
        if other_einheit.id == einheit.id:
            continue
        if normalize_einheit_lookup(other_einheit.kuerzel) == alias_normalisiert:
            raise ValueError(
                f"Die Schreibweise '{alias_text}' kollidiert mit dem vorhandenen Kürzel '{other_einheit.kuerzel}'."
            )

    alias = EinheitAlias(
        einheit_id=einheit.id,
        alias_text=alias_text,
        alias_normalisiert=alias_normalisiert,
        bemerkung=payload.bemerkung,
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    return alias


def require_existing_einheit(
    db: Session,
    kuerzel: str | None,
    *,
    field_label: str = "Einheit",
) -> str | None:
    cleaned = normalize_einheit(kuerzel)
    if cleaned is None:
        return None

    resolved = _resolve_active_einheit(db, cleaned)
    if resolved is None:
        raise ValueError(f"{field_label} '{cleaned}' ist nicht in den Einheiten-Stammdaten vorhanden.")
    return resolved.kuerzel


def ensure_einheit_exists(db: Session, kuerzel: str | None) -> str | None:
    cleaned = normalize_einheit(kuerzel)
    if cleaned is None:
        return None

    resolved = _resolve_active_einheit(db, cleaned)
    if resolved is not None:
        return resolved.kuerzel

    existing_exact = _get_any_einheit_by_kuerzel(db, cleaned)
    if existing_exact is not None:
        if not existing_exact.aktiv:
            existing_exact.aktiv = True
            db.add(existing_exact)
            db.flush()
        return existing_exact.kuerzel

    db.add(Einheit(kuerzel=cleaned))
    db.flush()
    return cleaned


def normalize_einheit(kuerzel: str | None) -> str | None:
    if kuerzel is None:
        return None
    cleaned = kuerzel.strip()
    return cleaned or None


def normalize_einheit_lookup(kuerzel: str | None) -> str | None:
    cleaned = normalize_einheit(kuerzel)
    if cleaned is None:
        return None
    return (
        cleaned.replace("μ", "µ")
        .replace("²", "2")
        .replace(" ", "")
        .replace(",", ".")
        .lower()
    )


def _resolve_active_einheit(db: Session, kuerzel: str) -> Einheit | None:
    exact_match = db.scalar(
        select(Einheit).where(Einheit.kuerzel == kuerzel).where(Einheit.aktiv.is_(True))
    )
    if exact_match is not None:
        return exact_match

    normalized_lookup = normalize_einheit_lookup(kuerzel)
    if normalized_lookup is None:
        return None

    alias_match = db.execute(
        select(EinheitAlias, Einheit)
        .join(Einheit, EinheitAlias.einheit_id == Einheit.id)
        .where(EinheitAlias.alias_normalisiert == normalized_lookup)
        .where(Einheit.aktiv.is_(True))
    ).first()
    if alias_match is not None:
        return alias_match[1]

    for einheit in db.scalars(select(Einheit).where(Einheit.aktiv.is_(True))):
        if normalize_einheit_lookup(einheit.kuerzel) == normalized_lookup:
            return einheit
    return None


def _get_any_einheit_by_kuerzel(db: Session, kuerzel: str) -> Einheit | None:
    return db.scalar(select(Einheit).where(Einheit.kuerzel == kuerzel))


def _build_alias_map(db: Session, einheit_ids: list[str]) -> dict[str, list[EinheitAliasRead]]:
    if not einheit_ids:
        return {}

    stmt = (
        select(EinheitAlias)
        .where(EinheitAlias.einheit_id.in_(einheit_ids))
        .order_by(func.lower(EinheitAlias.alias_text).asc())
    )
    grouped: dict[str, list[EinheitAliasRead]] = defaultdict(list)
    for alias in db.scalars(stmt):
        grouped[alias.einheit_id].append(EinheitAliasRead.model_validate(alias))
    return grouped


def _to_einheit_read(einheit: Einheit, aliase: list[EinheitAliasRead]) -> EinheitRead:
    return EinheitRead(
        id=einheit.id,
        kuerzel=einheit.kuerzel,
        aktiv=einheit.aktiv,
        erstellt_am=einheit.erstellt_am,
        geaendert_am=einheit.geaendert_am,
        aliase=aliase,
    )


def _require_einheit(db: Session, einheit_id: str) -> Einheit:
    einheit = db.get(Einheit, einheit_id)
    if einheit is None:
        raise ValueError("Einheit nicht gefunden.")
    return einheit
