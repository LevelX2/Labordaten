from __future__ import annotations

from datetime import date
from pathlib import Path

import labordaten_backend.models  # noqa: F401
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from labordaten_backend.models.base import Base
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.parameter_dublettenausschluss import ParameterDublettenausschluss
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.person import Person
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.modules.einheiten import schemas as einheiten_schemas
from labordaten_backend.modules.einheiten import service as einheiten_service
from labordaten_backend.modules.parameter import schemas as parameter_schemas
from labordaten_backend.modules.parameter import service as parameter_service


def _make_session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", future=True)
    Base.metadata.create_all(engine)
    return Session(engine)


def test_parameter_duplicate_suggestions_detect_similar_existing_parameters(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        first = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="vitamin_d3_25_oh",
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        second = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="vitamin_d3_25_oh_lcms",
                anzeigename="Vitamin D3 (25 OH) LCMS",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        suggestions = parameter_service.list_parameter_duplicate_suggestions(db)

        assert len(suggestions) == 1
        suggestion = suggestions[0]
        assert {suggestion.ziel_parameter_id, suggestion.quell_parameter_id} == {first.id, second.id}
        assert suggestion.aehnlichkeit >= 0.75
        assert "Namensaehnlichkeit" in suggestion.begruendung or "Normalisierung" in suggestion.begruendung


def test_parameter_duplicate_suggestions_detect_name_containment_with_same_target_range(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        first = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Gesamt-Testosteron",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        second = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Gesamt-Testosteron im Serum",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        db.add_all(
            [
                Zielbereich(
                    laborparameter_id=first.id,
                    wert_typ="numerisch",
                    untere_grenze_num=2.49,
                    obere_grenze_num=8.36,
                    einheit="ng/ml",
                ),
                Zielbereich(
                    laborparameter_id=second.id,
                    wert_typ="numerisch",
                    untere_grenze_num=2.49,
                    obere_grenze_num=8.36,
                    einheit="ng/ml",
                ),
            ]
        )
        db.commit()

        suggestions = parameter_service.list_parameter_duplicate_suggestions(db)

        assert len(suggestions) == 1
        suggestion = suggestions[0]
        assert {suggestion.ziel_parameter_id, suggestion.quell_parameter_id} == {first.id, second.id}
        assert suggestion.aehnlichkeit >= 0.8
        assert "Zielbereiche stimmen" in suggestion.begruendung


def test_parameter_duplicate_suggestions_ignore_name_containment_with_conflicting_target_range(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        first = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Gesamt-Testosteron",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        second = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Gesamt-Testosteron im Serum",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        db.add_all(
            [
                Zielbereich(
                    laborparameter_id=first.id,
                    wert_typ="numerisch",
                    untere_grenze_num=2.49,
                    obere_grenze_num=8.36,
                    einheit="ng/ml",
                ),
                Zielbereich(
                    laborparameter_id=second.id,
                    wert_typ="numerisch",
                    untere_grenze_num=9.9,
                    obere_grenze_num=19.9,
                    einheit="ng/ml",
                ),
            ]
        )
        db.commit()

        suggestions = parameter_service.list_parameter_duplicate_suggestions(db)

        assert suggestions == []


def test_parameter_duplicate_suggestions_detect_name_containment_with_same_measurement_reference(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        first = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Gesamt-Testosteron",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        second = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Gesamt-Testosteron im Serum",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 1, 15), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 2, 15), quelle_typ="manuell")
        db.add_all([first_befund, second_befund])
        db.commit()
        db.refresh(first_befund)
        db.refresh(second_befund)

        first_measurement = Messwert(
            person_id=person.id,
            befund_id=first_befund.id,
            laborparameter_id=first.id,
            original_parametername="Gesamt-Testosteron",
            wert_typ="numerisch",
            wert_operator="exakt",
            wert_roh_text="3.75",
            wert_num=3.75,
            einheit_original="ng/ml",
        )
        second_measurement = Messwert(
            person_id=person.id,
            befund_id=second_befund.id,
            laborparameter_id=second.id,
            original_parametername="Gesamt-Testosteron im Serum",
            wert_typ="numerisch",
            wert_operator="exakt",
            wert_roh_text="3.75",
            wert_num=3.75,
            einheit_original="ng/ml",
        )
        db.add_all([first_measurement, second_measurement])
        db.commit()
        db.refresh(first_measurement)
        db.refresh(second_measurement)

        db.add_all(
            [
                MesswertReferenz(
                    messwert_id=first_measurement.id,
                    referenz_typ="labor",
                    referenz_text_original="1,93 - 7,40",
                    wert_typ="numerisch",
                    untere_grenze_num=1.93,
                    obere_grenze_num=7.4,
                    einheit="ng/ml",
                ),
                MesswertReferenz(
                    messwert_id=second_measurement.id,
                    referenz_typ="labor",
                    referenz_text_original="1,93 - 7,40",
                    wert_typ="numerisch",
                    untere_grenze_num=1.93,
                    obere_grenze_num=7.4,
                    einheit="ng/ml",
                ),
            ]
        )
        db.commit()

        suggestions = parameter_service.list_parameter_duplicate_suggestions(db)

        assert len(suggestions) == 1
        suggestion = suggestions[0]
        assert {suggestion.ziel_parameter_id, suggestion.quell_parameter_id} == {first.id, second.id}
        assert suggestion.aehnlichkeit >= 0.8
        assert "Referenzbereiche stimmen" in suggestion.begruendung


def test_parameter_duplicate_suggestions_respect_duplicate_sensitivity_levels(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        first = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Progesteron",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        second = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Progesteron im Serum",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        assert parameter_service.list_parameter_duplicate_suggestions(db, "sicher") == []
        assert parameter_service.list_parameter_duplicate_suggestions(db, "ausgewogen") == []

        suggestions = parameter_service.list_parameter_duplicate_suggestions(db, "grosszuegig")

        assert len(suggestions) == 1
        suggestion = suggestions[0]
        assert {suggestion.ziel_parameter_id, suggestion.quell_parameter_id} == {first.id, second.id}
        assert suggestion.aehnlichkeit >= 0.72
        assert "großzügige Prüfschärfe" in suggestion.begruendung


def test_parameter_duplicate_suggestions_skip_suppressed_pairs_and_list_suppressions(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        first = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                wert_typ_standard="numerisch",
            ),
        )
        second = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin im Serum",
                wert_typ_standard="numerisch",
            ),
        )

        suppression = parameter_service.create_parameter_duplicate_suppression(
            db,
            parameter_schemas.ParameterDuplicateSuppressionCreate(
                erster_parameter_id=first.id,
                zweiter_parameter_id=second.id,
            ),
        )

        assert parameter_service.list_parameter_duplicate_suggestions(db) == []

        suppressions = parameter_service.list_parameter_duplicate_suppressions(db, first.id)
        assert len(suppressions) == 1
        assert suppressions[0].id == suppression.id
        assert {suppressions[0].erster_parameter_anzeigename, suppressions[0].zweiter_parameter_anzeigename} == {
            "Ferritin",
            "Ferritin im Serum",
        }


def test_parameter_list_includes_measurement_count(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        parameter = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                anzeigename="Ferritin",
                wert_typ_standard="numerisch",
            ),
        )

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 1, 15), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 2, 15), quelle_typ="manuell")
        db.add_all([first_befund, second_befund])
        db.commit()
        db.refresh(first_befund)
        db.refresh(second_befund)

        db.add_all(
            [
                Messwert(
                    person_id=person.id,
                    befund_id=first_befund.id,
                    laborparameter_id=parameter.id,
                    original_parametername="Ferritin",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="65",
                    wert_num=65.0,
                ),
                Messwert(
                    person_id=person.id,
                    befund_id=second_befund.id,
                    laborparameter_id=parameter.id,
                    original_parametername="Ferritin",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="72",
                    wert_num=72.0,
                ),
            ]
        )
        db.commit()

        listed_parameters = parameter_service.list_parameter(db)
        assert listed_parameters[0].anzeigename == "Ferritin"
        assert listed_parameters[0].messwerte_anzahl == 2

        detailed_parameter = parameter_service.get_parameter(db, parameter.id)
        assert detailed_parameter is not None
        assert detailed_parameter.messwerte_anzahl == 2


def test_parameter_merge_reassigns_usage_and_creates_aliases(tmp_path: Path) -> None:
    with _make_session(tmp_path) as db:
        einheiten_service.create_einheit(db, einheiten_schemas.EinheitCreate(kuerzel="ng/ml"))
        person = Person(
            anzeigename="Ludwig",
            vollname="Ludwig Hirth",
            geburtsdatum=date(1964, 1, 12),
            geschlecht_code="M",
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        target = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="vitamin_d3_25_oh",
                anzeigename="Vitamin D3 (25-OH)",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )
        source = parameter_service.create_parameter(
            db,
            parameter_schemas.ParameterCreate(
                interner_schluessel="vitamin_d3_25_oh_lcms",
                anzeigename="Vitamin D3 (25 OH) LCMS",
                standard_einheit="ng/ml",
                wert_typ_standard="numerisch",
            ),
        )

        group_common = ParameterGruppe(name="Vitamine")
        group_extra = ParameterGruppe(name="Spezialwerte")
        db.add_all([group_common, group_extra])
        db.commit()
        db.refresh(group_common)
        db.refresh(group_extra)

        db.add_all(
            [
                GruppenParameter(parameter_gruppe_id=group_common.id, laborparameter_id=target.id),
                GruppenParameter(parameter_gruppe_id=group_common.id, laborparameter_id=source.id),
                GruppenParameter(parameter_gruppe_id=group_extra.id, laborparameter_id=source.id),
                Zielbereich(
                    laborparameter_id=source.id,
                    wert_typ="numerisch",
                    untere_grenze_num=30.0,
                    obere_grenze_num=100.0,
                    einheit="ng/ml",
                ),
                PlanungZyklisch(
                    person_id=person.id,
                    laborparameter_id=source.id,
                    intervall_wert=6,
                    intervall_typ="monate",
                    startdatum=date(2024, 1, 1),
                    status="aktiv",
                    prioritaet=1,
                    karenz_tage=7,
                ),
                PlanungEinmalig(
                    person_id=person.id,
                    laborparameter_id=source.id,
                    status="offen",
                    zieltermin_datum=date(2024, 5, 1),
                ),
                LaborparameterAlias(
                    laborparameter_id=source.id,
                    alias_text="25 OH Vitamin D",
                    alias_normalisiert="25ohvitamind",
                ),
                ParameterDublettenausschluss(
                    erster_parameter_id=min(target.id, source.id),
                    zweiter_parameter_id=max(target.id, source.id),
                    paar_schluessel="::".join(sorted([target.id, source.id])),
                ),
            ]
        )
        db.commit()

        first_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 1, 15), quelle_typ="manuell")
        second_befund = Befund(person_id=person.id, entnahmedatum=date(2024, 2, 15), quelle_typ="manuell")
        db.add_all([first_befund, second_befund])
        db.commit()
        db.refresh(first_befund)
        db.refresh(second_befund)

        db.add_all(
            [
                Messwert(
                    person_id=person.id,
                    befund_id=first_befund.id,
                    laborparameter_id=target.id,
                    original_parametername="Vitamin D3 (25-OH)",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="65",
                    wert_num=65.0,
                    einheit_original="ng/ml",
                ),
                Messwert(
                    person_id=person.id,
                    befund_id=second_befund.id,
                    laborparameter_id=source.id,
                    original_parametername="Vitamin D3 (25 OH) LCMS",
                    wert_typ="numerisch",
                    wert_operator="exakt",
                    wert_roh_text="72",
                    wert_num=72.0,
                    einheit_original="ng/ml",
                ),
            ]
        )
        db.commit()

        result = parameter_service.merge_parameters(
            db,
            parameter_schemas.ParameterMergeRequest(
                ziel_parameter_id=target.id,
                quell_parameter_id=source.id,
                gemeinsamer_name="Vitamin D 25 Hydroxy",
            ),
        )

        refreshed_target = db.get(Laborparameter, target.id)
        assert refreshed_target is not None
        assert refreshed_target.anzeigename == "Vitamin D 25 Hydroxy"
        assert db.get(Laborparameter, source.id) is None
        assert result.verschobene_messwerte == 1
        assert result.verschobene_zielbereiche == 1
        assert result.verschobene_planung_zyklisch == 1
        assert result.verschobene_planung_einmalig == 1
        assert result.verschobene_gruppenzuordnungen == 1
        assert result.entfernte_doppelte_gruppenzuordnungen == 1
        assert "Vitamin D3 (25-OH)" in result.angelegte_aliase
        assert "Vitamin D3 (25 OH) LCMS" in result.angelegte_aliase
        assert "25 OH Vitamin D" in result.angelegte_aliase
        assert db.scalar(select(ParameterDublettenausschluss.id)) is None

        parameter_ids_after_merge = set(db.scalars(select(Messwert.laborparameter_id)))
        assert parameter_ids_after_merge == {target.id}

        group_assignments = list(
            db.scalars(select(GruppenParameter).where(GruppenParameter.laborparameter_id == target.id))
        )
        assert len(group_assignments) == 2

        aliases = {
            alias.alias_text
            for alias in db.scalars(select(LaborparameterAlias).where(LaborparameterAlias.laborparameter_id == target.id))
        }
        assert {"Vitamin D3 (25-OH)", "Vitamin D3 (25 OH) LCMS", "25 OH Vitamin D"} <= aliases
