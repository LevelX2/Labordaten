"""add safe conversion rules for import normalization

Revision ID: 20260427_0007
Revises: 20260427_0006
Create Date: 2026-04-27 00:00:00
"""

from __future__ import annotations

from alembic import op


revision = "20260427_0007"
down_revision = "20260427_0006"
branch_labels = None
depends_on = None

SOURCE_MARKER = "[seed_safe_import_conversion_rules_2026_04_27]"


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO einheit_alias (
            id, einheit_id, alias_text, alias_normalisiert, bemerkung, erstellt_am, geaendert_am
        )
        SELECT
            lower(hex(randomblob(16))),
            e.id,
            'µE/ml',
            'µe/ml',
            'Deutschsprachige Schreibvariante für Mikro-Units pro Milliliter bei Insulin.',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM einheit e
        WHERE e.kuerzel = 'µU/ml'
          AND NOT EXISTS (
              SELECT 1 FROM einheit_alias a WHERE a.alias_normalisiert = 'µe/ml'
          )
        """
    )
    _insert_factor_rule(
        parameter_key="cortisol_im_serum",
        from_unit="µg/l",
        to_unit="µg/dl",
        factor=0.1,
        source=f"SI-Maßstabsumrechnung mit Liter/Deziliter-Umrechnung. {SOURCE_MARKER}",
        note="1 µg/l entspricht 0,1 µg/dl.",
    )
    _insert_factor_rule(
        parameter_key="folsaure",
        from_unit="nmol/l",
        to_unit="ng/ml",
        factor=0.441306266548985,
        source=f"Serum-Folat: 1 ng/ml = 2,266 nmol/l. {SOURCE_MARKER}",
        note="Umrechnung für Folsäure/Folat über den etablierten Folat-Faktor; 1 nmol/l entspricht rund 0,4413 ng/ml.",
    )
    _insert_factor_rule(
        parameter_key="insulin_nuchtern",
        from_unit="µE/ml",
        to_unit="µU/ml",
        factor=1.0,
        source=f"Identische deutschsprachige Schreibvariante für Mikro-Units pro Milliliter bei Insulin. {SOURCE_MARKER}",
        note="µE/ml und µU/ml werden für Insulin numerisch gleich behandelt.",
    )
    _insert_factor_rule(
        parameter_key="kupfer",
        from_unit="µg/l",
        to_unit="mg/l",
        factor=0.001,
        source=f"SI-Maßstabsumrechnung. {SOURCE_MARKER}",
        note="1 µg/l entspricht 0,001 mg/l.",
    )
    _insert_factor_rule(
        parameter_key="zink_im_serum",
        from_unit="µmol/l",
        to_unit="µg/dl",
        factor=6.538,
        source=f"Parametergebundene Umrechnung über die relative Atommasse von Zink 65,38 g/mol. {SOURCE_MARKER}",
        note="1 µmol/l Zink entspricht 6,538 µg/dl.",
    )


def downgrade() -> None:
    op.execute(
        f"""
        DELETE FROM parameter_umrechnungsregel
        WHERE quelle_beschreibung LIKE '%{SOURCE_MARKER}%'
        """
    )
    op.execute(
        """
        DELETE FROM einheit_alias
        WHERE alias_normalisiert = 'µe/ml'
          AND bemerkung = 'Deutschsprachige Schreibvariante für Mikro-Units pro Milliliter bei Insulin.'
        """
    )


def _insert_factor_rule(
    *,
    parameter_key: str,
    from_unit: str,
    to_unit: str,
    factor: float,
    source: str,
    note: str,
) -> None:
    op.execute(
        f"""
        INSERT INTO parameter_umrechnungsregel (
            id,
            laborparameter_id,
            von_einheit,
            nach_einheit,
            regel_typ,
            faktor,
            offset,
            formel_text,
            rundung_stellen,
            quelle_beschreibung,
            bemerkung,
            aktiv,
            erstellt_am,
            geaendert_am
        )
        SELECT
            lower(hex(randomblob(16))),
            p.id,
            '{from_unit}',
            '{to_unit}',
            'faktor',
            {factor},
            NULL,
            NULL,
            NULL,
            '{source}',
            '{note}',
            1,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM laborparameter p
        WHERE p.interner_schluessel = '{parameter_key}'
          AND NOT EXISTS (
              SELECT 1
              FROM parameter_umrechnungsregel r
              WHERE r.laborparameter_id = p.id
                AND r.von_einheit = '{from_unit}'
                AND r.nach_einheit = '{to_unit}'
                AND r.aktiv = 1
          )
        """
    )
