from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.modules.parameter.normalization import normalize_parameter_name
from labordaten_backend.modules.parameter.schemas import ParameterAliasCreate, ParameterCreate


def list_parameter(db: Session) -> list[Laborparameter]:
    return list(db.scalars(select(Laborparameter).order_by(Laborparameter.anzeigename)))


def create_parameter(db: Session, payload: ParameterCreate) -> Laborparameter:
    parameter = Laborparameter(**payload.model_dump())
    db.add(parameter)
    db.commit()
    db.refresh(parameter)
    return parameter


def get_parameter(db: Session, parameter_id: str) -> Laborparameter | None:
    return db.get(Laborparameter, parameter_id)


def list_parameter_aliase(db: Session, parameter_id: str) -> list[LaborparameterAlias]:
    _require_parameter(db, parameter_id)
    stmt = (
        select(LaborparameterAlias)
        .where(LaborparameterAlias.laborparameter_id == parameter_id)
        .order_by(LaborparameterAlias.alias_text.asc())
    )
    return list(db.scalars(stmt))


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
