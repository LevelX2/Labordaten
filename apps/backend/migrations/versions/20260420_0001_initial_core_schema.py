"""initial application schema

Revision ID: 20260420_0001
Revises:
Create Date: 2026-04-20 00:00:00
"""

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from alembic import op
import sqlalchemy as sa


revision = "20260420_0001"
down_revision = None
branch_labels = None
depends_on = None


CANONICAL_ALIASES: dict[str, list[str]] = {
    "Tsd./µl": ["/nl", "1000/µl"],
    "Mio./µl": ["/pl", "Mill/µl", "Mio/µl"],
    "KbE/ml": ["cfu/ml"],
    "mg/l": ["mg/L"],
    "µg/l": ["µg/L"],
    "µIU/ml": ["mIU/l"],
    "ml/min/1.73m²": ["ml/min/1,73m2", "ml/min/1.73m2", "ml/min/1,73m²"],
}


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
        "laborparameter",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("interner_schluessel", sa.String(length=120), nullable=False),
        sa.Column("anzeigename", sa.String(length=200), nullable=False),
        sa.Column("beschreibung", sa.Text()),
        sa.Column("standard_einheit", sa.String(length=50)),
        sa.Column("wert_typ_standard", sa.String(length=20), nullable=False),
        sa.Column("primaere_klassifikation", sa.String(length=40)),
        sa.Column("wissensseite_id", sa.String(length=36), sa.ForeignKey("wissensseite.id")),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("sortierschluessel", sa.String(length=120)),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("interner_schluessel"),
    )
    op.create_index("ix_laborparameter_anzeigename", "laborparameter", ["anzeigename"])
    op.create_index("ix_laborparameter_primaere_klassifikation", "laborparameter", ["primaere_klassifikation"])

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
        sa.Column("untere_grenze_operator", sa.String(length=30)),
        sa.Column("obere_grenze_num", sa.Float()),
        sa.Column("obere_grenze_operator", sa.String(length=30)),
        sa.Column("einheit", sa.String(length=50)),
        sa.Column("soll_text", sa.Text()),
        sa.Column("geschlecht_code", sa.String(length=40)),
        sa.Column("alter_min_tage", sa.Integer()),
        sa.Column("alter_max_tage", sa.Integer()),
        sa.Column("bemerkung", sa.Text()),
    )
    op.create_index("ix_messwert_referenz_messwert", "messwert_referenz", ["messwert_id"])

    op.create_table(
        "zielbereich",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("wert_typ", sa.String(length=20), nullable=False, server_default="numerisch"),
        sa.Column("zielbereich_typ", sa.String(length=40), nullable=False, server_default="allgemein"),
        sa.Column("untere_grenze_num", sa.Float()),
        sa.Column("obere_grenze_num", sa.Float()),
        sa.Column("einheit", sa.String(length=50)),
        sa.Column("soll_text", sa.Text()),
        sa.Column("geschlecht_code", sa.String(length=40)),
        sa.Column("alter_min_tage", sa.Integer()),
        sa.Column("alter_max_tage", sa.Integer()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_zielbereich_parameter_aktiv", "zielbereich", ["laborparameter_id", "aktiv"])
    op.create_index("ix_zielbereich_zielbereich_typ", "zielbereich", ["zielbereich_typ"])

    op.create_table(
        "zielbereich_person_override",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("zielbereich_id", sa.String(length=36), sa.ForeignKey("zielbereich.id"), nullable=False),
        sa.Column("untere_grenze_num", sa.Float()),
        sa.Column("obere_grenze_num", sa.Float()),
        sa.Column("einheit", sa.String(length=50)),
        sa.Column("soll_text", sa.Text()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.String(length=40)),
    )
    op.create_index(
        "ix_zielbereich_person_override_person_zielbereich",
        "zielbereich_person_override",
        ["person_id", "zielbereich_id"],
    )

    op.create_table(
        "planung_zyklisch",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("intervall_wert", sa.Integer(), nullable=False),
        sa.Column("intervall_typ", sa.String(length=20), nullable=False, server_default="monate"),
        sa.Column("startdatum", sa.Date(), nullable=False),
        sa.Column("enddatum", sa.Date()),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="aktiv"),
        sa.Column("prioritaet", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("karenz_tage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("letzte_relevante_messung_id", sa.String(length=36), sa.ForeignKey("messwert.id")),
        sa.Column("naechste_faelligkeit", sa.Date()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_planung_zyklisch_person_parameter_status",
        "planung_zyklisch",
        ["person_id", "laborparameter_id", "status"],
    )
    op.create_index("ix_planung_zyklisch_naechste_faelligkeit", "planung_zyklisch", ["naechste_faelligkeit"])

    op.create_table(
        "planung_einmalig",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("person_id", sa.String(length=36), sa.ForeignKey("person.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="offen"),
        sa.Column("zieltermin_datum", sa.Date()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erledigt_durch_messwert_id", sa.String(length=36), sa.ForeignKey("messwert.id")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_planung_einmalig_person_parameter_status",
        "planung_einmalig",
        ["person_id", "laborparameter_id", "status"],
    )
    op.create_index("ix_planung_einmalig_zieltermin", "planung_einmalig", ["zieltermin_datum"])

    op.create_table(
        "import_pruefpunkt",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("importvorgang_id", sa.String(length=36), sa.ForeignKey("importvorgang.id"), nullable=False),
        sa.Column("objekt_typ", sa.String(length=40), nullable=False),
        sa.Column("objekt_schluessel_temp", sa.String(length=120)),
        sa.Column("pruefart", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("meldung", sa.Text(), nullable=False),
        sa.Column("bestaetigt_vom_nutzer", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("bestaetigt_am", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_import_pruefpunkt_import_status", "import_pruefpunkt", ["importvorgang_id", "status"])

    op.create_table(
        "parameter_gruppe",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("beschreibung", sa.Text()),
        sa.Column("wissensseite_id", sa.String(length=36), sa.ForeignKey("wissensseite.id")),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_parameter_gruppe_name", "parameter_gruppe", ["name"])

    op.create_table(
        "gruppen_parameter",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("parameter_gruppe_id", sa.String(length=36), sa.ForeignKey("parameter_gruppe.id"), nullable=False),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("sortierung", sa.Integer()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("parameter_gruppe_id", "laborparameter_id"),
    )
    op.create_index("ix_gruppen_parameter_gruppe_sortierung", "gruppen_parameter", ["parameter_gruppe_id", "sortierung"])
    op.create_index("ix_gruppen_parameter_parameter", "gruppen_parameter", ["laborparameter_id"])

    op.create_table(
        "laborparameter_alias",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("alias_text", sa.String(length=200), nullable=False),
        sa.Column("alias_normalisiert", sa.String(length=200), nullable=False),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("alias_normalisiert"),
    )
    op.create_index("ix_laborparameter_alias_parameter", "laborparameter_alias", ["laborparameter_id"])

    op.create_table(
        "einheit",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("kuerzel", sa.String(length=50), nullable=False),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("kuerzel"),
    )

    op.create_table(
        "einheit_alias",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("einheit_id", sa.String(length=36), sa.ForeignKey("einheit.id"), nullable=False),
        sa.Column("alias_text", sa.String(length=50), nullable=False),
        sa.Column("alias_normalisiert", sa.String(length=80), nullable=False),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("alias_normalisiert"),
    )
    op.create_index("ix_einheit_alias_einheit", "einheit_alias", ["einheit_id"])
    _seed_unit_aliases()

    op.create_table(
        "parameter_umrechnungsregel",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("von_einheit", sa.String(length=50), nullable=False),
        sa.Column("nach_einheit", sa.String(length=50), nullable=False),
        sa.Column("regel_typ", sa.String(length=30), nullable=False),
        sa.Column("faktor", sa.Float()),
        sa.Column("offset", sa.Float()),
        sa.Column("formel_text", sa.Text()),
        sa.Column("rundung_stellen", sa.Integer()),
        sa.Column("quelle_beschreibung", sa.Text()),
        sa.Column("bemerkung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_parameter_umrechnungsregel_parameter", "parameter_umrechnungsregel", ["laborparameter_id"])

    op.create_table(
        "parameter_dublettenausschluss",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("erster_parameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("zweiter_parameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("paar_schluessel", sa.String(length=80), nullable=False),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("paar_schluessel"),
    )
    op.create_index(
        "ix_parameter_dublettenausschluss_erster_parameter_id",
        "parameter_dublettenausschluss",
        ["erster_parameter_id"],
    )
    op.create_index(
        "ix_parameter_dublettenausschluss_zweiter_parameter_id",
        "parameter_dublettenausschluss",
        ["zweiter_parameter_id"],
    )

    op.create_table(
        "parameter_klassifikation",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("laborparameter_id", sa.String(length=36), sa.ForeignKey("laborparameter.id"), nullable=False),
        sa.Column("klassifikation", sa.String(length=40), nullable=False),
        sa.Column("kontext_beschreibung", sa.Text()),
        sa.Column("begruendung", sa.Text()),
        sa.Column("aktiv", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("erstellt_am", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geaendert_am", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_parameter_klassifikation_laborparameter_id", "parameter_klassifikation", ["laborparameter_id"])
    op.create_index("ix_parameter_klassifikation_klassifikation", "parameter_klassifikation", ["klassifikation"])


def downgrade() -> None:
    op.drop_index("ix_parameter_klassifikation_klassifikation", table_name="parameter_klassifikation")
    op.drop_index("ix_parameter_klassifikation_laborparameter_id", table_name="parameter_klassifikation")
    op.drop_table("parameter_klassifikation")
    op.drop_index(
        "ix_parameter_dublettenausschluss_zweiter_parameter_id",
        table_name="parameter_dublettenausschluss",
    )
    op.drop_index(
        "ix_parameter_dublettenausschluss_erster_parameter_id",
        table_name="parameter_dublettenausschluss",
    )
    op.drop_table("parameter_dublettenausschluss")
    op.drop_index("ix_parameter_umrechnungsregel_parameter", table_name="parameter_umrechnungsregel")
    op.drop_table("parameter_umrechnungsregel")
    op.drop_index("ix_einheit_alias_einheit", table_name="einheit_alias")
    op.drop_table("einheit_alias")
    op.drop_table("einheit")
    op.drop_index("ix_laborparameter_alias_parameter", table_name="laborparameter_alias")
    op.drop_table("laborparameter_alias")
    op.drop_index("ix_gruppen_parameter_parameter", table_name="gruppen_parameter")
    op.drop_index("ix_gruppen_parameter_gruppe_sortierung", table_name="gruppen_parameter")
    op.drop_table("gruppen_parameter")
    op.drop_index("ix_parameter_gruppe_name", table_name="parameter_gruppe")
    op.drop_table("parameter_gruppe")
    op.drop_index("ix_import_pruefpunkt_import_status", table_name="import_pruefpunkt")
    op.drop_table("import_pruefpunkt")
    op.drop_index("ix_planung_einmalig_zieltermin", table_name="planung_einmalig")
    op.drop_index("ix_planung_einmalig_person_parameter_status", table_name="planung_einmalig")
    op.drop_table("planung_einmalig")
    op.drop_index("ix_planung_zyklisch_naechste_faelligkeit", table_name="planung_zyklisch")
    op.drop_index("ix_planung_zyklisch_person_parameter_status", table_name="planung_zyklisch")
    op.drop_table("planung_zyklisch")
    op.drop_index("ix_zielbereich_person_override_person_zielbereich", table_name="zielbereich_person_override")
    op.drop_table("zielbereich_person_override")
    op.drop_index("ix_zielbereich_zielbereich_typ", table_name="zielbereich")
    op.drop_index("ix_zielbereich_parameter_aktiv", table_name="zielbereich")
    op.drop_table("zielbereich")
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
    op.drop_index("ix_laborparameter_primaere_klassifikation", table_name="laborparameter")
    op.drop_index("ix_laborparameter_anzeigename", table_name="laborparameter")
    op.drop_table("laborparameter")
    op.drop_index("ix_dokument_checksum", table_name="dokument")
    op.drop_index("ix_dokument_typ", table_name="dokument")
    op.drop_table("dokument")
    op.drop_index("ix_labor_name", table_name="labor")
    op.drop_table("labor")
    op.drop_table("wissensseite")
    op.drop_index("ix_person_geburtsdatum", table_name="person")
    op.drop_index("ix_person_anzeigename", table_name="person")
    op.drop_table("person")


def _seed_unit_aliases() -> None:
    now = datetime.now(timezone.utc)

    unit_table = sa.table(
        "einheit",
        sa.column("id", sa.String(length=36)),
        sa.column("kuerzel", sa.String(length=50)),
        sa.column("aktiv", sa.Boolean()),
        sa.column("erstellt_am", sa.DateTime(timezone=True)),
        sa.column("geaendert_am", sa.DateTime(timezone=True)),
    )
    alias_table = sa.table(
        "einheit_alias",
        sa.column("id", sa.String(length=36)),
        sa.column("einheit_id", sa.String(length=36)),
        sa.column("alias_text", sa.String(length=50)),
        sa.column("alias_normalisiert", sa.String(length=80)),
        sa.column("bemerkung", sa.Text()),
        sa.column("erstellt_am", sa.DateTime(timezone=True)),
        sa.column("geaendert_am", sa.DateTime(timezone=True)),
    )

    unit_rows = []
    alias_rows_by_normalized = {}
    for canonical, aliases in CANONICAL_ALIASES.items():
        unit_id = str(uuid.uuid4())
        unit_rows.append(
            {
                "id": unit_id,
                "kuerzel": canonical,
                "aktiv": True,
                "erstellt_am": now,
                "geaendert_am": now,
            }
        )
        for alias in aliases:
            alias_normalisiert = _normalize_lookup(alias)
            alias_rows_by_normalized[alias_normalisiert] = {
                "id": str(uuid.uuid4()),
                "einheit_id": unit_id,
                "alias_text": alias,
                "alias_normalisiert": alias_normalisiert,
                "bemerkung": "Vorbelegte Schreibvariante aus bestehendem Datenbestand",
                "erstellt_am": now,
                "geaendert_am": now,
            }

    op.bulk_insert(unit_table, unit_rows)
    op.bulk_insert(alias_table, list(alias_rows_by_normalized.values()))


def _normalize_lookup(value: str) -> str:
    return (
        value.strip()
        .replace("μ", "µ")
        .replace("²", "2")
        .replace(" ", "")
        .replace(",", ".")
        .lower()
    )
