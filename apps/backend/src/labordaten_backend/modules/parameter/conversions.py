from __future__ import annotations

import ast
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.parameter_umrechnungsregel import ParameterUmrechnungsregel


@dataclass
class NormalizedMeasurement:
    wert_normiert_num: float | None
    einheit_normiert: str | None
    umrechnungsregel_id: str | None


def resolve_measurement_normalization(
    db: Session,
    *,
    laborparameter_id: str,
    wert_typ: str,
    wert_num: float | None,
    einheit_original: str | None,
) -> NormalizedMeasurement:
    if wert_typ != "numerisch" or wert_num is None or not einheit_original:
        return NormalizedMeasurement(None, None, None)

    parameter = db.get(Laborparameter, laborparameter_id)
    if parameter is None:
        return NormalizedMeasurement(None, None, None)

    rules = list_active_conversion_rules(db, laborparameter_id)
    if not rules:
        return NormalizedMeasurement(None, None, None)

    target_unit = parameter.standard_einheit or None
    matching_rule = _select_matching_rule(rules, source_unit=einheit_original, preferred_target_unit=target_unit)
    if matching_rule is None:
        return NormalizedMeasurement(None, None, None)

    converted_value = convert_numeric_value(wert_num, matching_rule)
    if converted_value is None:
        return NormalizedMeasurement(None, None, None)

    if matching_rule.rundung_stellen is not None:
        converted_value = round(converted_value, matching_rule.rundung_stellen)

    return NormalizedMeasurement(
        wert_normiert_num=converted_value,
        einheit_normiert=matching_rule.nach_einheit,
        umrechnungsregel_id=matching_rule.id,
    )


def recalculate_normalized_measurements_for_parameter(db: Session, laborparameter_id: str) -> int:
    messwerte = list(
        db.scalars(select(Messwert).where(Messwert.laborparameter_id == laborparameter_id))
    )
    for messwert in messwerte:
        normalized = resolve_measurement_normalization(
            db,
            laborparameter_id=messwert.laborparameter_id,
            wert_typ=messwert.wert_typ,
            wert_num=messwert.wert_num,
            einheit_original=messwert.einheit_original,
        )
        messwert.wert_normiert_num = normalized.wert_normiert_num
        messwert.einheit_normiert = normalized.einheit_normiert
        messwert.umrechnungsregel_id = normalized.umrechnungsregel_id
    return len(messwerte)


def list_active_conversion_rules(db: Session, laborparameter_id: str) -> list[ParameterUmrechnungsregel]:
    stmt = (
        select(ParameterUmrechnungsregel)
        .where(ParameterUmrechnungsregel.laborparameter_id == laborparameter_id)
        .where(ParameterUmrechnungsregel.aktiv.is_(True))
    )
    return list(db.scalars(stmt))


def convert_numeric_value(value: float, rule: ParameterUmrechnungsregel) -> float | None:
    if rule.regel_typ == "faktor":
        if rule.faktor is None:
            return None
        return value * rule.faktor

    if rule.regel_typ == "faktor_plus_offset":
        if rule.faktor is None:
            return None
        return (value * rule.faktor) + (rule.offset or 0.0)

    if rule.regel_typ == "formel":
        if not rule.formel_text:
            return None
        return _evaluate_formula(rule.formel_text, value)

    return None


def _select_matching_rule(
    rules: list[ParameterUmrechnungsregel],
    *,
    source_unit: str,
    preferred_target_unit: str | None,
) -> ParameterUmrechnungsregel | None:
    direct_matches = [rule for rule in rules if rule.von_einheit == source_unit]
    if not direct_matches:
        return None

    if preferred_target_unit:
        preferred_matches = [rule for rule in direct_matches if rule.nach_einheit == preferred_target_unit]
        if len(preferred_matches) == 1:
            return preferred_matches[0]
        if len(preferred_matches) > 1:
            return None

    unique_targets = {rule.nach_einheit for rule in direct_matches}
    if len(direct_matches) == 1 or len(unique_targets) == 1:
        return direct_matches[0]
    return None


def _evaluate_formula(formula: str, x_value: float) -> float | None:
    try:
        expression = ast.parse(formula, mode="eval")
    except SyntaxError:
        return None

    try:
        result = _eval_node(expression.body, x_value)
    except (ValueError, ZeroDivisionError):
        return None
    return float(result)


def _eval_node(node: ast.AST, x_value: float) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.Name) and node.id == "x":
        return float(x_value)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        operand = _eval_node(node.operand, x_value)
        return operand if isinstance(node.op, ast.UAdd) else -operand
    if isinstance(node, ast.BinOp) and isinstance(
        node.op,
        (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow),
    ):
        left = _eval_node(node.left, x_value)
        right = _eval_node(node.right, x_value)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return left / right
        return left**right
    raise ValueError("Nicht erlaubte Formel.")
