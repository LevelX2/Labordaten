"""initial core schema

Revision ID: 20260420_0001
Revises:
Create Date: 2026-04-20 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260420_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "person",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("anzeigename", sa.String(length=200), nullable=False),
        sa.Column("vollname", sa.String(length=200)),
        sa.Column("geburtsdatum", sa.Date(), nullable=False),
        sa.Column("geschlecht_code", sa.String(length=40)),
        sa.Column("blutgruppe", sa.String(length=20)),
        sa.Column("rhesusfaktor", sa.String(length=10)),
        sa.Column("hinweise_allgemein", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_person_anzeigename", "person", ["anzeigename"])
    op.create_index("ix_person_geburtsdatum", "person", ["geburtsdatum"])

    op.create_table(
        "wissensseite",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("pfad_relativ", sa.Text(), nullable=False),
        sa.Column("titel_cache", sa.String(length=255)),
        sa.Column("alias_cache", sa.Text()),
        sa.Column("frontmatter_json", sa.Text()),
        sa.Column("letzter_scan_am", sa.String(length=40)),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.UniqueConstraint("pfad_relativ"),
    )

    op.create_table(
        "labor",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("adresse", sa.Text()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_labor_name", "labor", ["name"])

    op.create_table(
        "laborparameter",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("interner_schluessel", sa.String(length=120), nullable=False),
        sa.Column("anzeigename", sa.String(length=200), nullable=False),
        sa.Column("beschreibung", sa.Text()),
        sa.Column("standard_einheit", sa.String(length=50)),
        sa.Column("wert_typ_standard", sa.String(length=20), nullable=False),
        sa.Column("wissensseite_id", sa.String(length=36), sa.ForeignKey("wissensseite.id")),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("sortierschluessel", sa.String(length=120)),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("interner_schluessel"),
    )
    op.create_index("ix_laborparameter_anzeigename", "laborparameter", ["anzeigename"])

    op.create_table(
        "dokument",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("dokument_typ", sa.String(length=50), nullable=False),
        sa.Column("pfad_relativ", sa.Text()),
        sa.Column("pfad_absolut", sa.Text()),
        sa.Column("dateiname", sa.String(length=255), nullable=False),
        sa.Column("mime_typ", sa.String(length=100)),
        sa.Column("dateigroesse_bytes", sa.Integer()),
        sa.Column("checksumme_sha256", sa.String(length=64)),
        sa.Column("originalquelle_behalten", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.String(length=40)),
        sa.CheckConstraint("pfad_relativ IS NOT NULL OR pfad_absolut IS NOT NULL", name="ck_dokument_path_present"),
    )
    op.create_index("ix_dokument_typ", "dokument", ["dokument_typ"])
    op.create_index("ix_dokument_checksum", "dokument", ["checksumme_sha256"])

    op.create_table(
        "importvorgang",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("quelle_typ", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("person_id_vorschlag", sa.String(length=36), sa.ForeignKey("person.id")),
        sa.Column("dokument_id", sa.String(length=36), sa.ForeignKey("dokument.id")),
        sa.Column("roh_payload_text", sa.Text()),
        sa.Column("schema_version", sa.String(length=30)),
        sa.Column("fingerprint", sa.String(length=120)),
        sa.Column("warnungen_text", sa.Text()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_import_status_created", "importvorgang", ["status", "erstellt_am"])

    op.create_table(
        "befund",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("labor_id", sa.String(length=36), sa.ForeignKey("labor.id")),
        sa.Column("dokument_id", sa.String(length=36), sa.ForeignKey("dokument.id")),
        sa.Column("entnahmedatum", sa.Date()),
        sa.Column("befunddatum", sa.Date()),
        sa.Column("eingangsdatum", sa.Date()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("importvorgang_id", sa.String(length=36), sa.ForeignKey("importvorgang.id")),
        sa.Column("quelle_typ", sa.String(length=30), nullable=False),
        sa.Column("duplikat_warnung", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_befund_person_entnahme", "befund", ["person_id", "entnahmedatum"])
    op.create_index("ix_befund_labor_entnahme", "befund", ["labor_id", "entnahmedatum"])

    op.create_table(
        "messwert",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("befund_id", sa.String(length=36), sa.ForeignKey("befund.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("original_parametername", sa.String(length=200), nullable=False),
        sa.Column("wert_typ", sa.String(length=20), nullable=False),
        sa.Column("wert_operator", sa.String(length=30), nullable=False, server_default="exakt"),
        sa.Column("wert_roh_text", sa.Text(), nullable=False),
        sa.Column("wert_num", sa.Float()),
        sa.Column("wert_text", sa.Text()),
        sa.Column("einheit_original", sa.String(length=50)),
        sa.Column("wert_normiert_num", sa.Float()),
        sa.Column("einheit_normiert", sa.String(length=50)),
        sa.Column("umrechnungsregel_id", sa.String(length=36)),
        sa.Column("bemerkung_kurz", sa.String(length=255)),
        sa.Column("bemerkung_lang", sa.Text()),
        sa.Column("unsicher_flag", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("pruefbedarf_flag", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("importvorgang_id", sa.String(length=36), sa.ForeignKey("importvorgang.id")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messwert_befund", "messwert", ["befund_id"])
    op.create_index("ix_messwert_person_parameter_created", "messwert", ["person_id", "laborparameter_id", "erstellt_am"])

    op.create_table(
        "messwert_referenz",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("messwert_id", sa.String(length=36), sa.ForeignKey("messwert.id"), nullable=False),
        sa.Column("referenz_typ", sa.String(length=30), nullable=False),
        sa.Column("referenz_text_original", sa.Text()),
        sa.Column("wert_typ", sa.String(length=20), nullable=False),
        sa.Column("untere_grenze_num", sa.Float()),
        sa.Column("obere_grenze_num", sa.Float()),
        sa.Column("einheit", sa.String(length=50)),
        sa.Column("soll_text", sa.Text()),
        sa.Column("geschlecht_code", sa.String(length=40)),
        sa.Column("alter_min_tage", sa.Integer()),
        sa.Column("alter_max_tage", sa.Integer()),
        sa.Column("bemerkung", sa.Text()),
    )
    op.create_index("ix_messwert_referenz_messwert", "messwert_referenz", ["messwert_id"])


def downgrade() -> None:
    op.drop_index("ix_messwert_referenz_messwert", table_name="messwert_referenz")
    op.drop_table("messwert_referenz")
    op.drop_index("ix_messwert_person_parameter_created", table_name="messwert")
    op.drop_index("ix_messwert_befund", table_name="messwert")
    op.drop_table("messwert")
    op.drop_index("ix_befund_labor_entnahme", table_name="befund")
    op.drop_index("ix_befund_person_entnahme", table_name="befund")
    op.drop_table("befund")
    op.drop_index("ix_import_status_created", table_name="importvorgang")
    op.drop_table("importvorgang")
    op.drop_index("ix_dokument_checksum", table_name="dokument")
    op.drop_index("ix_dokument_typ", table_name="dokument")
    op.drop_table("dokument")
    op.drop_index("ix_laborparameter_anzeigename", table_name="laborparameter")
    op.drop_table("laborparameter")
    op.drop_index("ix_labor_name", table_name="labor")
    op.drop_table("labor")
    op.drop_table("wissensseite")
    op.drop_index("ix_person_geburtsdatum", table_name="person")
    op.drop_index("ix_person_anzeigename", table_name="person")
    op.drop_table("person")

