from __future__ import annotations

from calendar import monthrange
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from labordaten_backend.core.documents import get_documents_root
from labordaten_backend.models.befund import Befund
from labordaten_backend.models.dokument import Dokument
from labordaten_backend.models.einheit import Einheit
from labordaten_backend.models.einheit_alias import EinheitAlias
from labordaten_backend.models.gruppen_parameter import GruppenParameter
from labordaten_backend.models.import_pruefpunkt import ImportPruefpunkt
from labordaten_backend.models.importvorgang import Importvorgang
from labordaten_backend.models.labor import Labor
from labordaten_backend.models.laborparameter import Laborparameter
from labordaten_backend.models.laborparameter_alias import LaborparameterAlias
from labordaten_backend.models.messwert import Messwert
from labordaten_backend.models.messwert_referenz import MesswertReferenz
from labordaten_backend.models.parameter_dublettenausschluss import ParameterDublettenausschluss
from labordaten_backend.models.parameter_gruppe import ParameterGruppe
from labordaten_backend.models.person import Person
from labordaten_backend.models.planung_einmalig import PlanungEinmalig
from labordaten_backend.models.planung_zyklisch import PlanungZyklisch
from labordaten_backend.models.parameter_umrechnungsregel import ParameterUmrechnungsregel
from labordaten_backend.models.zielbereich import Zielbereich
from labordaten_backend.models.zielbereich_person_override import ZielbereichPersonOverride
from labordaten_backend.modules.loeschlogik import schemas


@dataclass
class LetzteMessungInfo:
    messwert_id: str
    datum: date


PruefHandler = Callable[[Session, str], schemas.LoeschPruefungRead]
DeleteHandler = Callable[[Session, str, schemas.LoeschAusfuehrenRequest], schemas.LoeschAusfuehrungRead]


def get_loeschpruefung(db: Session, entitaet_typ: str, entitaet_id: str) -> schemas.LoeschPruefungRead:
    normalized = _normalize_entity_type(entitaet_typ)
    handler = _PRUEF_HANDLERS.get(normalized)
    if handler is not None:
        return handler(db, entitaet_id)
    raise ValueError(f"Die Entitaet '{entitaet_typ}' wird fuer die Loeschpruefung noch nicht unterstuetzt.")


def execute_loeschaktion(
    db: Session,
    entitaet_typ: str,
    entitaet_id: str,
    payload: schemas.LoeschAusfuehrenRequest,
) -> schemas.LoeschAusfuehrungRead:
    normalized = _normalize_entity_type(entitaet_typ)
    pruefung = get_loeschpruefung(db, normalized, entitaet_id)

    if payload.aktion == "deaktivieren":
        if not pruefung.optionen.deaktivieren_verfuegbar:
            raise ValueError("Fuer diese Entitaet ist keine Deaktivierung vorgesehen.")
        return _execute_deaktivieren(db, normalized, entitaet_id)

    if pruefung.modus == "blockiert":
        raise ValueError("Diese Entitaet darf in der aktuellen Nutzungslage nicht geloescht werden.")

    handler = _DELETE_HANDLERS.get(normalized)
    if handler is not None:
        return handler(db, entitaet_id, payload)

    raise ValueError(f"Die Entitaet '{entitaet_typ}' wird fuer die Loeschaktion noch nicht unterstuetzt.")


def _normalize_entity_type(entitaet_typ: str) -> str:
    normalized = (entitaet_typ or "").strip().lower()
    aliases = {
        "personen": "person",
        "befunde": "befund",
        "messwerte": "messwert",
        "importe": "importvorgang",
        "import": "importvorgang",
        "einheiten": "einheit",
        "labore": "labor",
        "parameter": "laborparameter",
        "gruppen": "parameter_gruppe",
        "gruppen_parameter": "parameter_gruppe",
        "zielbereiche": "zielbereich",
        "umrechnungsregeln": "parameter_umrechnungsregel",
        "planungzyklisch": "planung_zyklisch",
        "planungeinmalig": "planung_einmalig",
        "planungen_zyklisch": "planung_zyklisch",
        "planungen_einmalig": "planung_einmalig",
        "zyklisch": "planung_zyklisch",
        "einmalig": "planung_einmalig",
    }
    return aliases.get(normalized, normalized)


def _pruefe_person(db: Session, person_id: str) -> schemas.LoeschPruefungRead:
    person = db.get(Person, person_id)
    if person is None:
        raise LookupError("Person nicht gefunden.")

    dependencies = [
        _dependency("befund", _count(Befund.id, db, Befund.person_id == person_id), "nutzung", "Befunde dieser Person"),
        _dependency("messwert", _count(Messwert.id, db, Messwert.person_id == person_id), "nutzung", "Messwerte dieser Person"),
        _dependency(
            "planung_zyklisch",
            _count(PlanungZyklisch.id, db, PlanungZyklisch.person_id == person_id),
            "nutzung",
            "Zyklische Planungen dieser Person",
        ),
        _dependency(
            "planung_einmalig",
            _count(PlanungEinmalig.id, db, PlanungEinmalig.person_id == person_id),
            "nutzung",
            "Einmalige Planungen dieser Person",
        ),
        _dependency(
            "zielbereich_person_override",
            _count(ZielbereichPersonOverride.id, db, ZielbereichPersonOverride.person_id == person_id),
            "nutzung",
            "Personenspezifische Zielbereichs-Ueberschreibungen",
        ),
    ]
    used_dependencies = [item for item in dependencies if item.anzahl > 0]
    if used_dependencies:
        blockierungsgruende = [
            "Personen mit Befunden, Messwerten, Planungen oder personenspezifischen Zielbereichen werden nicht normal geloescht."
        ]
        hinweise = [
            "Empfohlene Ersatzaktion: Person deaktivieren, damit Historie und Verweise erhalten bleiben."
        ]
        if not person.aktiv:
            hinweise.append("Die Person ist bereits deaktiviert.")
        return schemas.LoeschPruefungRead(
            entitaet_typ="person",
            entitaet_id=person.id,
            anzeige_name=person.anzeigename,
            modus="blockiert",
            empfehlung="deaktivieren",
            standard_aktion="deaktivieren",
            abhaengigkeiten=used_dependencies,
            blockierungsgruende=blockierungsgruende,
            hinweise=hinweise,
            optionen=schemas.LoeschOptionenRead(deaktivieren_verfuegbar=True),
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="person",
        entitaet_id=person.id,
        anzeige_name=person.anzeigename,
        modus="direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        hinweise=["Die Person hat aktuell keine fachlichen Abhaengigkeiten."],
    )


def _pruefe_befund(db: Session, befund_id: str) -> schemas.LoeschPruefungRead:
    befund = db.get(Befund, befund_id)
    if befund is None:
        raise LookupError("Befund nicht gefunden.")

    messwerte_anzahl = _count(Messwert.id, db, Messwert.befund_id == befund_id)
    messwert_ids = list(db.scalars(select(Messwert.id).where(Messwert.befund_id == befund_id)))
    referenzen_anzahl = _count_for_ids(MesswertReferenz.id, db, MesswertReferenz.messwert_id, messwert_ids)
    dokument = db.get(Dokument, befund.dokument_id) if befund.dokument_id else None

    dependencies: list[schemas.LoeschAbhaengigkeitRead] = []
    if messwerte_anzahl:
        dependencies.append(
            _dependency("messwert", messwerte_anzahl, "kind", "Messwerte werden mitgeloescht.")
        )
    if referenzen_anzahl:
        dependencies.append(
            _dependency("messwert_referenz", referenzen_anzahl, "kind", "Messwert-Referenzen werden mitgeloescht.")
        )

    hinweise = [
        "Verweise in Planungen werden fuer betroffene Messwerte repariert, bevor der Befund entfernt wird."
    ]
    if dokument is not None:
        hinweise.append(
            f"Das verknuepfte Dokument '{dokument.dateiname}' bleibt unveraendert und wird nicht automatisch geloescht."
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="befund",
        entitaet_id=befund.id,
        anzeige_name=_befund_label(befund),
        modus="kaskade" if dependencies else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=dependencies,
        hinweise=hinweise,
    )


def _pruefe_messwert(db: Session, messwert_id: str) -> schemas.LoeschPruefungRead:
    messwert = db.get(Messwert, messwert_id)
    if messwert is None:
        raise LookupError("Messwert nicht gefunden.")

    referenzen_anzahl = _count(MesswertReferenz.id, db, MesswertReferenz.messwert_id == messwert_id)
    zyklisch_anzahl = _count(
        PlanungZyklisch.id,
        db,
        (PlanungZyklisch.person_id == messwert.person_id) & (PlanungZyklisch.laborparameter_id == messwert.laborparameter_id),
    )
    einmalig_anzahl = _count(
        PlanungEinmalig.id,
        db,
        PlanungEinmalig.erledigt_durch_messwert_id == messwert_id,
    )
    messwerte_im_befund = _count(Messwert.id, db, Messwert.befund_id == messwert.befund_id)
    leerer_befund = messwerte_im_befund == 1

    dependencies: list[schemas.LoeschAbhaengigkeitRead] = []
    if referenzen_anzahl:
        dependencies.append(
            _dependency("messwert_referenz", referenzen_anzahl, "kind", "Referenzen dieses Messwerts werden mitgeloescht.")
        )
    if zyklisch_anzahl:
        dependencies.append(
            _dependency("planung_zyklisch", zyklisch_anzahl, "folge", "Betroffene zyklische Planungen werden neu bewertet.")
        )
    if einmalig_anzahl:
        dependencies.append(
            _dependency(
                "planung_einmalig",
                einmalig_anzahl,
                "folge",
                "Erledigte Einmalplanungen werden bei Bedarf wieder geoeffnet.",
            )
        )
    if leerer_befund:
        dependencies.append(
            _dependency("befund", 1, "folge", "Der danach leere Befund wird standardmaessig mitgeloescht.")
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="messwert",
        entitaet_id=messwert.id,
        anzeige_name=f"{messwert.original_parametername} ({messwert.wert_roh_text})",
        modus="kaskade" if dependencies else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=dependencies,
        hinweise=[
            "Planungsverweise werden in derselben Transaktion repariert.",
            "Wenn der Befund danach leer waere, wird er standardmaessig mitgeloescht.",
        ],
        optionen=schemas.LoeschOptionenRead(leeren_befund_mitloeschen_standard=leerer_befund),
    )


def _pruefe_importvorgang(db: Session, importvorgang_id: str) -> schemas.LoeschPruefungRead:
    importvorgang = db.get(Importvorgang, importvorgang_id)
    if importvorgang is None:
        raise LookupError("Importvorgang nicht gefunden.")

    pruefpunkte_anzahl = _count(ImportPruefpunkt.id, db, ImportPruefpunkt.importvorgang_id == importvorgang_id)
    befund_anzahl = _count(Befund.id, db, Befund.importvorgang_id == importvorgang_id)
    messwert_anzahl = _count(Messwert.id, db, Messwert.importvorgang_id == importvorgang_id)
    dokument = db.get(Dokument, importvorgang.dokument_id) if importvorgang.dokument_id else None
    dokument_andere_importe = 0
    dokument_befunde = 0
    dokument_entfernen_verfuegbar = False
    if dokument is not None:
        dokument_andere_importe = (
            db.scalar(
                select(func.count(Importvorgang.id))
                .where(Importvorgang.dokument_id == dokument.id)
                .where(Importvorgang.id != importvorgang_id)
            )
            or 0
        )
        dokument_befunde = db.scalar(select(func.count(Befund.id)).where(Befund.dokument_id == dokument.id)) or 0
        dokument_entfernen_verfuegbar = not dokument_andere_importe and not dokument_befunde

    dependencies: list[schemas.LoeschAbhaengigkeitRead] = []
    if pruefpunkte_anzahl:
        dependencies.append(
            _dependency("import_pruefpunkt", pruefpunkte_anzahl, "kind", "Import-Pruefpunkte werden mitgeloescht.")
        )
    if befund_anzahl:
        dependencies.append(
            _dependency("befund", befund_anzahl, "nutzung", "Uebernommene Befunde belegen die Herkunft.")
        )
    if messwert_anzahl:
        dependencies.append(
            _dependency("messwert", messwert_anzahl, "nutzung", "Uebernommene Messwerte belegen die Herkunft.")
        )

    if befund_anzahl or messwert_anzahl:
        hinweise = [
            "Sobald echte Fachobjekte auf den Importvorgang zurueckverweisen, bleibt er als Provenienzanker erhalten."
        ]
        if dokument is not None:
            hinweise.append(
                f"Das verknuepfte Dokument '{dokument.dateiname}' bleibt ebenfalls unveraendert bestehen."
            )
        return schemas.LoeschPruefungRead(
            entitaet_typ="importvorgang",
            entitaet_id=importvorgang.id,
            anzeige_name=f"Import {importvorgang.id}",
            modus="blockiert",
            empfehlung="nicht_loeschen",
            abhaengigkeiten=dependencies,
            blockierungsgruende=[
                "Importvorgaenge mit uebernommenen Befunden oder Messwerten werden nicht geloescht, damit die Herkunft nachvollziehbar bleibt."
            ],
            hinweise=hinweise,
        )

    hinweise = []
    if dokument is not None:
        if dokument_entfernen_verfuegbar:
            dependencies.append(
                _dependency(
                    "dokument",
                    1,
                    "folge",
                    "Das verknuepfte Importdokument kann optional mitgeloescht werden.",
                )
            )
            hinweise.append(
                f"Das verknuepfte Dokument '{dokument.dateiname}' bleibt erhalten, wenn die Dokument-Option nicht gesetzt wird."
            )
        else:
            hinweise.append(
                f"Das verknuepfte Dokument '{dokument.dateiname}' bleibt bestehen, weil es noch anderweitig verwendet wird."
            )
    return schemas.LoeschPruefungRead(
        entitaet_typ="importvorgang",
        entitaet_id=importvorgang.id,
        anzeige_name=f"Import {importvorgang.id}",
        modus="kaskade" if pruefpunkte_anzahl or dokument_entfernen_verfuegbar else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=dependencies,
        hinweise=hinweise,
        optionen=schemas.LoeschOptionenRead(
            dokument_entfernen_verfuegbar=dokument_entfernen_verfuegbar,
            dokument_entfernen_standard=False,
        ),
    )


def _pruefe_einheit(db: Session, einheit_id: str) -> schemas.LoeschPruefungRead:
    einheit = db.get(Einheit, einheit_id)
    if einheit is None:
        raise LookupError("Einheit nicht gefunden.")

    alias_anzahl = _count(EinheitAlias.id, db, EinheitAlias.einheit_id == einheit_id)
    standard_anzahl = _count(Laborparameter.id, db, Laborparameter.standard_einheit == einheit.kuerzel)
    regel_von_anzahl = _count(
        ParameterUmrechnungsregel.id,
        db,
        ParameterUmrechnungsregel.von_einheit == einheit.kuerzel,
    )
    regel_nach_anzahl = _count(
        ParameterUmrechnungsregel.id,
        db,
        ParameterUmrechnungsregel.nach_einheit == einheit.kuerzel,
    )
    messwert_original_anzahl = _count(Messwert.id, db, Messwert.einheit_original == einheit.kuerzel)
    messwert_normiert_anzahl = _count(Messwert.id, db, Messwert.einheit_normiert == einheit.kuerzel)
    referenz_anzahl = _count(MesswertReferenz.id, db, MesswertReferenz.einheit == einheit.kuerzel)
    zielbereich_anzahl = _count(Zielbereich.id, db, Zielbereich.einheit == einheit.kuerzel)
    override_anzahl = _count(
        ZielbereichPersonOverride.id,
        db,
        ZielbereichPersonOverride.einheit == einheit.kuerzel,
    )

    dependencies = [
        _dependency("einheit_alias", alias_anzahl, "kind", "Alias-Schreibweisen dieser Einheit"),
        _dependency("laborparameter.standard_einheit", standard_anzahl, "nutzung", "Parameter mit dieser Standardeinheit"),
        _dependency("parameter_umrechnungsregel.von_einheit", regel_von_anzahl, "nutzung", "Umrechnungsregeln mit dieser Von-Einheit"),
        _dependency("parameter_umrechnungsregel.nach_einheit", regel_nach_anzahl, "nutzung", "Umrechnungsregeln mit dieser Nach-Einheit"),
        _dependency("messwert.einheit_original", messwert_original_anzahl, "nutzung", "Messwerte mit dieser Originaleinheit"),
        _dependency("messwert.einheit_normiert", messwert_normiert_anzahl, "nutzung", "Messwerte mit dieser normierten Einheit"),
        _dependency("messwert_referenz.einheit", referenz_anzahl, "nutzung", "Messwert-Referenzen mit dieser Einheit"),
        _dependency("zielbereich.einheit", zielbereich_anzahl, "nutzung", "Zielbereiche mit dieser Einheit"),
        _dependency("zielbereich_person_override.einheit", override_anzahl, "nutzung", "Personen-Overrides mit dieser Einheit"),
    ]
    positive_dependencies = [item for item in dependencies if item.anzahl > 0]
    blocking_dependencies = [item for item in positive_dependencies if item.objekt_typ != "einheit_alias"]
    if blocking_dependencies:
        hinweise = [
            "Die Nutzungspruefung beruecksichtigt hier bewusst auch denormalisierte Fachfelder und nicht nur relationale Fremdschluessel."
        ]
        if not einheit.aktiv:
            hinweise.append("Die Einheit ist bereits deaktiviert.")
        return schemas.LoeschPruefungRead(
            entitaet_typ="einheit",
            entitaet_id=einheit.id,
            anzeige_name=einheit.kuerzel,
            modus="blockiert",
            empfehlung="deaktivieren",
            standard_aktion="deaktivieren",
            abhaengigkeiten=positive_dependencies,
            blockierungsgruende=[
                "Eine fachlich verwendete Einheit wird nicht geloescht, damit keine inkonsistenten Stammdaten- und Messwertlagen entstehen."
            ],
            hinweise=hinweise,
            optionen=schemas.LoeschOptionenRead(deaktivieren_verfuegbar=True),
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="einheit",
        entitaet_id=einheit.id,
        anzeige_name=einheit.kuerzel,
        modus="kaskade" if alias_anzahl else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=positive_dependencies,
        hinweise=["Nicht verwendete Einheiten duerfen geloescht werden; vorhandene Alias-Schreibweisen werden dabei mit entfernt."],
    )


def _pruefe_labor(db: Session, labor_id: str) -> schemas.LoeschPruefungRead:
    labor = db.get(Labor, labor_id)
    if labor is None:
        raise LookupError("Labor nicht gefunden.")

    befund_anzahl = _count(Befund.id, db, Befund.labor_id == labor_id)
    dependencies = []
    if befund_anzahl:
        dependencies.append(
            _dependency("befund", befund_anzahl, "nutzung", "Befunde dieses Labors bleiben als Historie erhalten.")
        )
        hinweise = ["Labore mit bestehenden Befunden werden nicht geloescht, sondern bei Bedarf deaktiviert."]
        if not labor.aktiv:
            hinweise.append("Das Labor ist bereits deaktiviert.")
        return schemas.LoeschPruefungRead(
            entitaet_typ="labor",
            entitaet_id=labor.id,
            anzeige_name=labor.name,
            modus="blockiert",
            empfehlung="deaktivieren",
            standard_aktion="deaktivieren",
            abhaengigkeiten=dependencies,
            blockierungsgruende=["Labore mit historischen Befunden sollen als Stammdatenanker erhalten bleiben."],
            hinweise=hinweise,
            optionen=schemas.LoeschOptionenRead(deaktivieren_verfuegbar=True),
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="labor",
        entitaet_id=labor.id,
        anzeige_name=labor.name,
        modus="direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        hinweise=["Das Labor hat aktuell keine Befundverwendungen."],
    )


def _pruefe_laborparameter(db: Session, parameter_id: str) -> schemas.LoeschPruefungRead:
    parameter = db.get(Laborparameter, parameter_id)
    if parameter is None:
        raise LookupError("Parameter nicht gefunden.")

    messwerte_anzahl = _count(Messwert.id, db, Messwert.laborparameter_id == parameter_id)
    planung_zyklisch_anzahl = _count(
        PlanungZyklisch.id,
        db,
        PlanungZyklisch.laborparameter_id == parameter_id,
    )
    planung_einmalig_anzahl = _count(
        PlanungEinmalig.id,
        db,
        PlanungEinmalig.laborparameter_id == parameter_id,
    )
    alias_anzahl = _count(LaborparameterAlias.id, db, LaborparameterAlias.laborparameter_id == parameter_id)
    gruppen_anzahl = _count(GruppenParameter.id, db, GruppenParameter.laborparameter_id == parameter_id)
    zielbereich_anzahl = _count(Zielbereich.id, db, Zielbereich.laborparameter_id == parameter_id)
    dubletten_ausschluss_anzahl = _count(
        ParameterDublettenausschluss.id,
        db,
        or_(
            ParameterDublettenausschluss.erster_parameter_id == parameter_id,
            ParameterDublettenausschluss.zweiter_parameter_id == parameter_id,
        ),
    )
    regel_anzahl = _count(
        ParameterUmrechnungsregel.id,
        db,
        ParameterUmrechnungsregel.laborparameter_id == parameter_id,
    )

    blocking_dependencies: list[schemas.LoeschAbhaengigkeitRead] = []
    if messwerte_anzahl:
        blocking_dependencies.append(
            _dependency("messwert", messwerte_anzahl, "nutzung", "Messwerte auf diesem Parameter blockieren normales Loeschen.")
        )
    if planung_zyklisch_anzahl:
        blocking_dependencies.append(
            _dependency("planung_zyklisch", planung_zyklisch_anzahl, "nutzung", "Zyklische Planungen dieses Parameters blockieren normales Loeschen.")
        )
    if planung_einmalig_anzahl:
        blocking_dependencies.append(
            _dependency("planung_einmalig", planung_einmalig_anzahl, "nutzung", "Einmalige Planungen dieses Parameters blockieren normales Loeschen.")
        )
    if blocking_dependencies:
        hinweise = [
            "Statt normalem Loeschen ist bei verwendeten Parametern Deaktivieren oder fachliche Zusammenfuehrung die bevorzugte Aktion."
        ]
        if not parameter.aktiv:
            hinweise.append("Der Parameter ist bereits deaktiviert.")
        return schemas.LoeschPruefungRead(
            entitaet_typ="laborparameter",
            entitaet_id=parameter.id,
            anzeige_name=parameter.anzeigename,
            modus="blockiert",
            empfehlung="deaktivieren",
            standard_aktion="deaktivieren",
            abhaengigkeiten=blocking_dependencies,
            blockierungsgruende=[
                "Parameter mit Messwerten oder Planungen werden nicht normal geloescht, damit Verlaufs- und Planungslogik stabil bleibt."
            ],
            hinweise=hinweise,
            optionen=schemas.LoeschOptionenRead(deaktivieren_verfuegbar=True),
        )

    dependencies: list[schemas.LoeschAbhaengigkeitRead] = []
    if alias_anzahl:
        dependencies.append(_dependency("laborparameter_alias", alias_anzahl, "kind", "Parameter-Aliase werden mitgeloescht."))
    if regel_anzahl:
        dependencies.append(
            _dependency("parameter_umrechnungsregel", regel_anzahl, "kind", "Umrechnungsregeln dieses Parameters werden mitgeloescht.")
        )
    if gruppen_anzahl:
        dependencies.append(
            _dependency("gruppen_parameter", gruppen_anzahl, "kind", "Gruppenzuordnungen dieses Parameters werden mitgeloescht.")
        )
    if dubletten_ausschluss_anzahl:
        dependencies.append(
            _dependency(
                "parameter_dublettenausschluss",
                dubletten_ausschluss_anzahl,
                "kind",
                "Unterdrueckte Dublettenpaare dieses Parameters werden mitgeloescht.",
            )
        )
    if zielbereich_anzahl:
        override_anzahl = _count_overrides_for_parameter(db, parameter_id)
        dependencies.append(
            _dependency("zielbereich", zielbereich_anzahl, "kind", "Zielbereiche dieses Parameters werden mitgeloescht.")
        )
        if override_anzahl:
            dependencies.append(
                _dependency(
                    "zielbereich_person_override",
                    override_anzahl,
                    "kind",
                    "Personenspezifische Zielbereichs-Ueberschreibungen werden darunter mitgeloescht.",
                )
            )

    return schemas.LoeschPruefungRead(
        entitaet_typ="laborparameter",
        entitaet_id=parameter.id,
        anzeige_name=parameter.anzeigename,
        modus="kaskade" if dependencies else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=dependencies,
        hinweise=["Unbenutzte Parameter duerfen geloescht werden; pflegende Kindobjekte werden dabei mit entfernt."],
    )


def _pruefe_parameter_gruppe(db: Session, gruppe_id: str) -> schemas.LoeschPruefungRead:
    gruppe = db.get(ParameterGruppe, gruppe_id)
    if gruppe is None:
        raise LookupError("Gruppe nicht gefunden.")

    assignment_count = _count(
        GruppenParameter.id,
        db,
        GruppenParameter.parameter_gruppe_id == gruppe_id,
    )
    dependencies = []
    if assignment_count:
        dependencies.append(
            _dependency("gruppen_parameter", assignment_count, "kind", "Parameterzuordnungen dieser Gruppe werden mitgeloescht.")
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="parameter_gruppe",
        entitaet_id=gruppe.id,
        anzeige_name=gruppe.name,
        modus="kaskade" if assignment_count else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=dependencies,
    )


def _pruefe_zielbereich(db: Session, zielbereich_id: str) -> schemas.LoeschPruefungRead:
    zielbereich = db.get(Zielbereich, zielbereich_id)
    if zielbereich is None:
        raise LookupError("Zielbereich nicht gefunden.")

    override_count = _count(
        ZielbereichPersonOverride.id,
        db,
        ZielbereichPersonOverride.zielbereich_id == zielbereich_id,
    )
    dependencies = []
    if override_count:
        dependencies.append(
            _dependency(
                "zielbereich_person_override",
                override_count,
                "kind",
                "Personenspezifische Ueberschreibungen dieses Zielbereichs werden mitgeloescht.",
            )
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="zielbereich",
        entitaet_id=zielbereich.id,
        anzeige_name=f"Zielbereich {zielbereich.id}",
        modus="kaskade" if override_count else "direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        abhaengigkeiten=dependencies,
    )


def _pruefe_parameter_umrechnungsregel(db: Session, regel_id: str) -> schemas.LoeschPruefungRead:
    regel = db.get(ParameterUmrechnungsregel, regel_id)
    if regel is None:
        raise LookupError("Umrechnungsregel nicht gefunden.")

    messwert_anzahl = _count(Messwert.id, db, Messwert.umrechnungsregel_id == regel_id)
    if messwert_anzahl:
        hinweise = [
            "Regeln, auf die bereits normierte Messwerte zurueckverweisen, werden nicht geloescht, sondern deaktiviert."
        ]
        if not regel.aktiv:
            hinweise.append("Die Umrechnungsregel ist bereits deaktiviert.")
        return schemas.LoeschPruefungRead(
            entitaet_typ="parameter_umrechnungsregel",
            entitaet_id=regel.id,
            anzeige_name=f"{regel.von_einheit} -> {regel.nach_einheit}",
            modus="blockiert",
            empfehlung="deaktivieren",
            standard_aktion="deaktivieren",
            abhaengigkeiten=[
                _dependency(
                    "messwert",
                    messwert_anzahl,
                    "nutzung",
                    "Normierte Messwerte verweisen noch auf diese Regel.",
                )
            ],
            blockierungsgruende=[
                "Verwendete Umrechnungsregeln bleiben erhalten, damit die Herkunft normierter Werte nachvollziehbar bleibt."
            ],
            hinweise=hinweise,
            optionen=schemas.LoeschOptionenRead(deaktivieren_verfuegbar=True),
        )

    return schemas.LoeschPruefungRead(
        entitaet_typ="parameter_umrechnungsregel",
        entitaet_id=regel.id,
        anzeige_name=f"{regel.von_einheit} -> {regel.nach_einheit}",
        modus="direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        hinweise=["Nicht verwendete Umrechnungsregeln duerfen geloescht werden."],
    )


def _pruefe_planung_zyklisch(db: Session, planung_id: str) -> schemas.LoeschPruefungRead:
    planung = db.get(PlanungZyklisch, planung_id)
    if planung is None:
        raise LookupError("Zyklische Planung nicht gefunden.")

    return schemas.LoeschPruefungRead(
        entitaet_typ="planung_zyklisch",
        entitaet_id=planung.id,
        anzeige_name=f"Zyklische Planung {planung.intervall_wert} {planung.intervall_typ}",
        modus="direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        hinweise=[
            "Beim Loeschen entfaellt die wiederkehrende Terminlogik fuer diese Person-Parameter-Kombination.",
        ],
    )


def _pruefe_planung_einmalig(db: Session, planung_id: str) -> schemas.LoeschPruefungRead:
    planung = db.get(PlanungEinmalig, planung_id)
    if planung is None:
        raise LookupError("Einmalige Vormerkung nicht gefunden.")

    return schemas.LoeschPruefungRead(
        entitaet_typ="planung_einmalig",
        entitaet_id=planung.id,
        anzeige_name="Einmalige Vormerkung",
        modus="direkt",
        empfehlung="loeschen",
        standard_aktion="loeschen",
        hinweise=[
            "Beim Loeschen entfaellt diese einzelne Vormerkung oder Terminnotiz.",
        ],
    )


def _execute_deaktivieren(db: Session, entitaet_typ: str, entitaet_id: str) -> schemas.LoeschAusfuehrungRead:
    if entitaet_typ == "person":
        person = db.get(Person, entitaet_id)
        if person is None:
            raise LookupError("Person nicht gefunden.")
        person.aktiv = False
        db.add(person)
        db.commit()
        return schemas.LoeschAusfuehrungRead(
            entitaet_typ="person",
            entitaet_id=entitaet_id,
            aktion="deaktivieren",
            aktualisierte_objekte=[_dependency("person", 1, "folge", "Person wurde deaktiviert.")],
            hinweise=["Die Person bleibt fuer Historie und bestehende Verweise erhalten."],
        )

    if entitaet_typ == "einheit":
        einheit = db.get(Einheit, entitaet_id)
        if einheit is None:
            raise LookupError("Einheit nicht gefunden.")
        einheit.aktiv = False
        db.add(einheit)
        db.commit()
        return schemas.LoeschAusfuehrungRead(
            entitaet_typ="einheit",
            entitaet_id=entitaet_id,
            aktion="deaktivieren",
            aktualisierte_objekte=[_dependency("einheit", 1, "folge", "Einheit wurde deaktiviert.")],
            hinweise=["Die Einheit bleibt fuer bestehende Datenlagen erhalten."],
        )

    if entitaet_typ == "labor":
        labor = db.get(Labor, entitaet_id)
        if labor is None:
            raise LookupError("Labor nicht gefunden.")
        labor.aktiv = False
        db.add(labor)
        db.commit()
        return schemas.LoeschAusfuehrungRead(
            entitaet_typ="labor",
            entitaet_id=entitaet_id,
            aktion="deaktivieren",
            aktualisierte_objekte=[_dependency("labor", 1, "folge", "Labor wurde deaktiviert.")],
            hinweise=["Das Labor bleibt fuer bestehende Befundhistorie erhalten."],
        )

    if entitaet_typ == "laborparameter":
        parameter = db.get(Laborparameter, entitaet_id)
        if parameter is None:
            raise LookupError("Parameter nicht gefunden.")
        parameter.aktiv = False
        db.add(parameter)
        db.commit()
        return schemas.LoeschAusfuehrungRead(
            entitaet_typ="laborparameter",
            entitaet_id=entitaet_id,
            aktion="deaktivieren",
            aktualisierte_objekte=[_dependency("laborparameter", 1, "folge", "Parameter wurde deaktiviert.")],
            hinweise=["Der Parameter bleibt fuer Messwerte, Berichte und Planungen erhalten."],
        )

    if entitaet_typ == "parameter_umrechnungsregel":
        regel = db.get(ParameterUmrechnungsregel, entitaet_id)
        if regel is None:
            raise LookupError("Umrechnungsregel nicht gefunden.")
        regel.aktiv = False
        db.add(regel)
        db.commit()
        return schemas.LoeschAusfuehrungRead(
            entitaet_typ="parameter_umrechnungsregel",
            entitaet_id=entitaet_id,
            aktion="deaktivieren",
            aktualisierte_objekte=[
                _dependency("parameter_umrechnungsregel", 1, "folge", "Umrechnungsregel wurde deaktiviert.")
            ],
            hinweise=["Die Regel bleibt fuer bereits normierte Messwerte nachvollziehbar erhalten."],
        )

    raise ValueError("Diese Entitaet unterstuetzt aktuell keine Deaktivierung.")


def _execute_delete_person(db: Session, person_id: str) -> schemas.LoeschAusfuehrungRead:
    person = db.get(Person, person_id)
    if person is None:
        raise LookupError("Person nicht gefunden.")
    db.delete(person)
    db.commit()
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="person",
        entitaet_id=person_id,
        aktion="loeschen",
        geloeschte_objekte=[_dependency("person", 1, "folge", "Person wurde geloescht.")],
    )


def _execute_delete_befund(db: Session, befund_id: str) -> schemas.LoeschAusfuehrungRead:
    befund = db.get(Befund, befund_id)
    if befund is None:
        raise LookupError("Befund nicht gefunden.")

    messwerte = list(db.scalars(select(Messwert).where(Messwert.befund_id == befund_id)))
    result = _delete_befund_with_measurements(db, befund, messwerte)
    db.commit()
    return result


def _execute_delete_messwert(
    db: Session,
    messwert_id: str,
    *,
    leeren_befund_mitloeschen: bool,
) -> schemas.LoeschAusfuehrungRead:
    messwert = db.get(Messwert, messwert_id)
    if messwert is None:
        raise LookupError("Messwert nicht gefunden.")

    befund = db.get(Befund, messwert.befund_id)
    if befund is None:
        raise ValueError("Der zugehoerige Befund des Messwerts existiert nicht mehr.")

    remaining_count = _count(Messwert.id, db, Messwert.befund_id == befund.id)
    befund_would_be_empty = remaining_count == 1

    reference_count = _count(MesswertReferenz.id, db, MesswertReferenz.messwert_id == messwert.id)
    one_time_count = _reopen_one_time_plans_for_measurements(db, [messwert.id])

    for referenz in db.scalars(select(MesswertReferenz).where(MesswertReferenz.messwert_id == messwert.id)):
        db.delete(referenz)
    db.delete(messwert)
    db.flush()

    cyclic_count = _refresh_cyclic_plans_for_pairs(db, [(messwert.person_id, messwert.laborparameter_id)])
    deleted_objects = [
        _dependency("messwert", 1, "folge", "Messwert wurde geloescht."),
    ]
    if reference_count:
        deleted_objects.append(
            _dependency("messwert_referenz", reference_count, "kind", "Messwert-Referenzen wurden mitgeloescht.")
        )

    hinweise = []
    if befund_would_be_empty and leeren_befund_mitloeschen:
        db.delete(befund)
        db.flush()
        deleted_objects.append(
            _dependency("befund", 1, "folge", "Der danach leere Befund wurde mitgeloescht.")
        )
        hinweise.append("Das verknuepfte Dokument des Befunds bleibt unveraendert bestehen.")
    elif befund_would_be_empty:
        hinweise.append("Der Befund ist nun leer und bleibt bestehen, weil das Mitloeschen nicht angefordert wurde.")

    db.commit()
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="messwert",
        entitaet_id=messwert_id,
        aktion="loeschen",
        geloeschte_objekte=deleted_objects,
        aktualisierte_objekte=_build_updated_objects(cyclic_count, one_time_count),
        hinweise=hinweise,
    )


def _execute_delete_importvorgang(
    db: Session,
    importvorgang_id: str,
    *,
    dokument_entfernen: bool,
) -> schemas.LoeschAusfuehrungRead:
    importvorgang = db.get(Importvorgang, importvorgang_id)
    if importvorgang is None:
        raise LookupError("Importvorgang nicht gefunden.")

    dokument_id = importvorgang.dokument_id
    dokument = db.get(Dokument, dokument_id) if dokument_id and dokument_entfernen else None
    if dokument is not None:
        other_imports = (
            db.scalar(
                select(func.count(Importvorgang.id))
                .where(Importvorgang.dokument_id == dokument.id)
                .where(Importvorgang.id != importvorgang_id)
            )
            or 0
        )
        befund_refs = db.scalar(select(func.count(Befund.id)).where(Befund.dokument_id == dokument.id)) or 0
        if other_imports or befund_refs:
            raise ValueError("Das Dokument wird noch an anderer Stelle verwendet und kann nicht entfernt werden.")

    pruefpunkte = list(db.scalars(select(ImportPruefpunkt).where(ImportPruefpunkt.importvorgang_id == importvorgang_id)))
    pruefpunkte_count = len(pruefpunkte)
    for pruefpunkt in pruefpunkte:
        db.delete(pruefpunkt)
    db.delete(importvorgang)
    if dokument is not None:
        _delete_stored_document_file(dokument)
        db.delete(dokument)
    db.commit()
    geloeschte_objekte = [_dependency("importvorgang", 1, "folge", "Importvorgang wurde geloescht.")]
    if pruefpunkte_count:
        geloeschte_objekte.append(
            _dependency("import_pruefpunkt", pruefpunkte_count, "kind", "Import-Pruefpunkte wurden mitgeloescht.")
        )
    if dokument is not None:
        geloeschte_objekte.append(_dependency("dokument", 1, "folge", "Verknuepftes Dokument wurde mitgeloescht."))
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="importvorgang",
        entitaet_id=importvorgang_id,
        aktion="loeschen",
        geloeschte_objekte=geloeschte_objekte,
    )


def _execute_delete_einheit(db: Session, einheit_id: str) -> schemas.LoeschAusfuehrungRead:
    einheit = db.get(Einheit, einheit_id)
    if einheit is None:
        raise LookupError("Einheit nicht gefunden.")

    aliases = list(db.scalars(select(EinheitAlias).where(EinheitAlias.einheit_id == einheit_id)))
    alias_count = len(aliases)
    for alias in aliases:
        db.delete(alias)
    db.delete(einheit)
    db.commit()
    geloeschte_objekte = [_dependency("einheit", 1, "folge", "Einheit wurde geloescht.")]
    if alias_count:
        geloeschte_objekte.append(
            _dependency("einheit_alias", alias_count, "kind", "Einheiten-Aliase wurden mitgeloescht.")
        )
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="einheit",
        entitaet_id=einheit_id,
        aktion="loeschen",
        geloeschte_objekte=geloeschte_objekte,
    )


def _execute_delete_labor(db: Session, labor_id: str) -> schemas.LoeschAusfuehrungRead:
    labor = db.get(Labor, labor_id)
    if labor is None:
        raise LookupError("Labor nicht gefunden.")
    db.delete(labor)
    db.commit()
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="labor",
        entitaet_id=labor_id,
        aktion="loeschen",
        geloeschte_objekte=[_dependency("labor", 1, "folge", "Labor wurde geloescht.")],
    )


def _execute_delete_laborparameter(db: Session, parameter_id: str) -> schemas.LoeschAusfuehrungRead:
    parameter = db.get(Laborparameter, parameter_id)
    if parameter is None:
        raise LookupError("Parameter nicht gefunden.")

    alias_count = _delete_rows(
        db,
        select(LaborparameterAlias).where(LaborparameterAlias.laborparameter_id == parameter_id),
    )
    regel_count = _delete_rows(
        db,
        select(ParameterUmrechnungsregel).where(ParameterUmrechnungsregel.laborparameter_id == parameter_id),
    )
    gruppen_count = _delete_rows(
        db,
        select(GruppenParameter).where(GruppenParameter.laborparameter_id == parameter_id),
    )
    dubletten_ausschluss_count = _delete_rows(
        db,
        select(ParameterDublettenausschluss).where(
            or_(
                ParameterDublettenausschluss.erster_parameter_id == parameter_id,
                ParameterDublettenausschluss.zweiter_parameter_id == parameter_id,
            )
        ),
    )
    zielbereiche = list(db.scalars(select(Zielbereich).where(Zielbereich.laborparameter_id == parameter_id)))
    zielbereich_ids = [zielbereich.id for zielbereich in zielbereiche]
    override_count = _delete_rows_for_ids(
        db,
        select(ZielbereichPersonOverride),
        ZielbereichPersonOverride.zielbereich_id,
        zielbereich_ids,
    )
    zielbereich_count = len(zielbereiche)
    for zielbereich in zielbereiche:
        db.delete(zielbereich)
    db.delete(parameter)
    db.commit()

    geloeschte_objekte = [_dependency("laborparameter", 1, "folge", "Parameter wurde geloescht.")]
    if alias_count:
        geloeschte_objekte.append(_dependency("laborparameter_alias", alias_count, "kind", "Parameter-Aliase wurden mitgeloescht."))
    if regel_count:
        geloeschte_objekte.append(
            _dependency("parameter_umrechnungsregel", regel_count, "kind", "Umrechnungsregeln wurden mitgeloescht.")
        )
    if gruppen_count:
        geloeschte_objekte.append(_dependency("gruppen_parameter", gruppen_count, "kind", "Gruppenzuordnungen wurden mitgeloescht."))
    if dubletten_ausschluss_count:
        geloeschte_objekte.append(
            _dependency(
                "parameter_dublettenausschluss",
                dubletten_ausschluss_count,
                "kind",
                "Unterdrueckte Dublettenpaare wurden mitgeloescht.",
            )
        )
    if zielbereich_count:
        geloeschte_objekte.append(_dependency("zielbereich", zielbereich_count, "kind", "Zielbereiche wurden mitgeloescht."))
    if override_count:
        geloeschte_objekte.append(
            _dependency(
                "zielbereich_person_override",
                override_count,
                "kind",
                "Personenspezifische Zielbereichs-Ueberschreibungen wurden mitgeloescht.",
            )
        )

    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="laborparameter",
        entitaet_id=parameter_id,
        aktion="loeschen",
        geloeschte_objekte=geloeschte_objekte,
    )


def _execute_delete_parameter_gruppe(db: Session, gruppe_id: str) -> schemas.LoeschAusfuehrungRead:
    gruppe = db.get(ParameterGruppe, gruppe_id)
    if gruppe is None:
        raise LookupError("Gruppe nicht gefunden.")
    assignment_count = _delete_rows(
        db,
        select(GruppenParameter).where(GruppenParameter.parameter_gruppe_id == gruppe_id),
    )
    db.delete(gruppe)
    db.commit()
    geloeschte_objekte = [_dependency("parameter_gruppe", 1, "folge", "Gruppe wurde geloescht.")]
    if assignment_count:
        geloeschte_objekte.append(
            _dependency("gruppen_parameter", assignment_count, "kind", "Gruppenzuordnungen wurden mitgeloescht.")
        )
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="parameter_gruppe",
        entitaet_id=gruppe_id,
        aktion="loeschen",
        geloeschte_objekte=geloeschte_objekte,
    )


def _execute_delete_zielbereich(db: Session, zielbereich_id: str) -> schemas.LoeschAusfuehrungRead:
    zielbereich = db.get(Zielbereich, zielbereich_id)
    if zielbereich is None:
        raise LookupError("Zielbereich nicht gefunden.")
    override_count = _delete_rows(
        db,
        select(ZielbereichPersonOverride).where(ZielbereichPersonOverride.zielbereich_id == zielbereich_id),
    )
    db.delete(zielbereich)
    db.commit()
    geloeschte_objekte = [_dependency("zielbereich", 1, "folge", "Zielbereich wurde geloescht.")]
    if override_count:
        geloeschte_objekte.append(
            _dependency(
                "zielbereich_person_override",
                override_count,
                "kind",
                "Personenspezifische Ueberschreibungen wurden mitgeloescht.",
            )
        )
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="zielbereich",
        entitaet_id=zielbereich_id,
        aktion="loeschen",
        geloeschte_objekte=geloeschte_objekte,
    )


def _execute_delete_parameter_umrechnungsregel(db: Session, regel_id: str) -> schemas.LoeschAusfuehrungRead:
    regel = db.get(ParameterUmrechnungsregel, regel_id)
    if regel is None:
        raise LookupError("Umrechnungsregel nicht gefunden.")
    db.delete(regel)
    db.commit()
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="parameter_umrechnungsregel",
        entitaet_id=regel_id,
        aktion="loeschen",
        geloeschte_objekte=[
            _dependency("parameter_umrechnungsregel", 1, "folge", "Umrechnungsregel wurde geloescht.")
        ],
    )


def _execute_delete_planung_zyklisch(db: Session, planung_id: str) -> schemas.LoeschAusfuehrungRead:
    planung = db.get(PlanungZyklisch, planung_id)
    if planung is None:
        raise LookupError("Zyklische Planung nicht gefunden.")
    db.delete(planung)
    db.commit()
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="planung_zyklisch",
        entitaet_id=planung_id,
        aktion="loeschen",
        geloeschte_objekte=[_dependency("planung_zyklisch", 1, "folge", "Zyklische Planung wurde geloescht.")],
    )


def _execute_delete_planung_einmalig(db: Session, planung_id: str) -> schemas.LoeschAusfuehrungRead:
    planung = db.get(PlanungEinmalig, planung_id)
    if planung is None:
        raise LookupError("Einmalige Vormerkung nicht gefunden.")
    db.delete(planung)
    db.commit()
    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="planung_einmalig",
        entitaet_id=planung_id,
        aktion="loeschen",
        geloeschte_objekte=[_dependency("planung_einmalig", 1, "folge", "Einmalige Vormerkung wurde geloescht.")],
    )


def _delete_befund_with_measurements(
    db: Session,
    befund: Befund,
    messwerte: list[Messwert],
) -> schemas.LoeschAusfuehrungRead:
    messwert_ids = [messwert.id for messwert in messwerte]
    reference_count = _count_for_ids(MesswertReferenz.id, db, MesswertReferenz.messwert_id, messwert_ids)
    one_time_count = _reopen_one_time_plans_for_measurements(db, messwert_ids)
    affected_pairs = sorted({(messwert.person_id, messwert.laborparameter_id) for messwert in messwerte})

    for referenz in db.scalars(select(MesswertReferenz).where(MesswertReferenz.messwert_id.in_(messwert_ids))):
        db.delete(referenz)
    for messwert in messwerte:
        db.delete(messwert)
    db.flush()

    cyclic_count = _refresh_cyclic_plans_for_pairs(db, affected_pairs)
    db.delete(befund)
    db.flush()

    geloeschte_objekte = [_dependency("befund", 1, "folge", "Befund wurde geloescht.")]
    if messwerte:
        geloeschte_objekte.append(
            _dependency("messwert", len(messwerte), "kind", "Messwerte wurden mitgeloescht.")
        )
    if reference_count:
        geloeschte_objekte.append(
            _dependency("messwert_referenz", reference_count, "kind", "Messwert-Referenzen wurden mitgeloescht.")
        )

    hinweise = []
    if befund.dokument_id:
        dokument = db.get(Dokument, befund.dokument_id)
        if dokument is not None:
            hinweise.append(
                f"Das verknuepfte Dokument '{dokument.dateiname}' bleibt unveraendert bestehen."
            )

    return schemas.LoeschAusfuehrungRead(
        entitaet_typ="befund",
        entitaet_id=befund.id,
        aktion="loeschen",
        geloeschte_objekte=geloeschte_objekte,
        aktualisierte_objekte=_build_updated_objects(cyclic_count, one_time_count),
        hinweise=hinweise,
    )


def _count(column, db: Session, *conditions) -> int:
    stmt = select(func.count(column))
    for condition in conditions:
        stmt = stmt.where(condition)
    return int(db.scalar(stmt) or 0)


def _count_for_ids(column, db: Session, foreign_key_column, ids: list[str]) -> int:
    if not ids:
        return 0
    return int(db.scalar(select(func.count(column)).where(foreign_key_column.in_(ids))) or 0)


def _delete_stored_document_file(dokument: Dokument) -> None:
    if not dokument.pfad_relativ:
        return

    root = get_documents_root()
    file_path = (root / dokument.pfad_relativ).resolve()
    try:
        file_path.relative_to(root.resolve())
    except ValueError as exc:
        raise ValueError("Der relative Dokumentpfad liegt ausserhalb der konfigurierten Dokumentablage.") from exc

    if file_path.exists() and file_path.is_file():
        file_path.unlink()
        _remove_empty_parent_directories(file_path.parent, root)


def _remove_empty_parent_directories(path: Path, stop_at: Path) -> None:
    stop_at = stop_at.resolve()
    current = path.resolve()
    while current != stop_at and stop_at in current.parents:
        try:
            current.rmdir()
        except OSError:
            break
        current = current.parent


def _count_overrides_for_parameter(db: Session, parameter_id: str) -> int:
    zielbereich_ids = list(db.scalars(select(Zielbereich.id).where(Zielbereich.laborparameter_id == parameter_id)))
    return _count_for_ids(
        ZielbereichPersonOverride.id,
        db,
        ZielbereichPersonOverride.zielbereich_id,
        zielbereich_ids,
    )


def _dependency(
    objekt_typ: str,
    anzahl: int,
    kategorie: schemas.AbhaengigkeitKategorie,
    beschreibung: str | None = None,
) -> schemas.LoeschAbhaengigkeitRead:
    return schemas.LoeschAbhaengigkeitRead(
        objekt_typ=objekt_typ,
        anzahl=anzahl,
        kategorie=kategorie,
        beschreibung=beschreibung,
    )


def _build_updated_objects(cyclic_count: int, one_time_count: int) -> list[schemas.LoeschAbhaengigkeitRead]:
    updated: list[schemas.LoeschAbhaengigkeitRead] = []
    if cyclic_count:
        updated.append(
            _dependency("planung_zyklisch", cyclic_count, "folge", "Zyklische Planungen wurden neu berechnet.")
        )
    if one_time_count:
        updated.append(
            _dependency("planung_einmalig", one_time_count, "folge", "Einmalige Planungen wurden wieder geoeffnet.")
        )
    return updated


def _delete_rows(db: Session, stmt) -> int:
    rows = list(db.scalars(stmt))
    for row in rows:
        db.delete(row)
    db.flush()
    return len(rows)


def _delete_rows_for_ids(db: Session, base_stmt, foreign_key_column, ids: list[str]) -> int:
    if not ids:
        return 0
    return _delete_rows(db, base_stmt.where(foreign_key_column.in_(ids)))


def _reopen_one_time_plans_for_measurements(db: Session, messwert_ids: list[str]) -> int:
    if not messwert_ids:
        return 0
    updated = 0
    stmt = select(PlanungEinmalig).where(PlanungEinmalig.erledigt_durch_messwert_id.in_(messwert_ids))
    for planung in db.scalars(stmt):
        planung.erledigt_durch_messwert_id = None
        if planung.status == "erledigt":
            planung.status = "offen"
        db.add(planung)
        updated += 1
    db.flush()
    return updated


def _refresh_cyclic_plans_for_pairs(db: Session, pairs: list[tuple[str, str]]) -> int:
    if not pairs:
        return 0
    updated = 0
    for person_id, laborparameter_id in pairs:
        stmt = select(PlanungZyklisch).where(PlanungZyklisch.person_id == person_id).where(
            PlanungZyklisch.laborparameter_id == laborparameter_id
        )
        latest = _find_latest_measurement(db, person_id, laborparameter_id)
        for planung in db.scalars(stmt):
            planung.letzte_relevante_messung_id = latest.messwert_id if latest else None
            basisdatum = planung.startdatum
            if latest and latest.datum > basisdatum:
                basisdatum = latest.datum
            next_due = _add_interval(basisdatum, planung.intervall_wert, planung.intervall_typ)
            if planung.enddatum and next_due and next_due > planung.enddatum:
                next_due = None
            planung.naechste_faelligkeit = next_due
            db.add(planung)
            updated += 1
    db.flush()
    return updated


def _find_latest_measurement(db: Session, person_id: str, laborparameter_id: str) -> LetzteMessungInfo | None:
    stmt = (
        select(Messwert, Befund.entnahmedatum, Befund.befunddatum)
        .join(Befund, Messwert.befund_id == Befund.id)
        .where(Messwert.person_id == person_id)
        .where(Messwert.laborparameter_id == laborparameter_id)
        .order_by(Messwert.erstellt_am.desc())
    )
    beste: LetzteMessungInfo | None = None
    for messwert, entnahmedatum, befunddatum in db.execute(stmt):
        effektives_datum = entnahmedatum or befunddatum or messwert.erstellt_am.date()
        if beste is None or effektives_datum > beste.datum:
            beste = LetzteMessungInfo(messwert_id=messwert.id, datum=effektives_datum)
    return beste


def _add_interval(basisdatum: date, intervall_wert: int, intervall_typ: str) -> date | None:
    if intervall_typ == "tage":
        return basisdatum + timedelta(days=intervall_wert)
    if intervall_typ == "wochen":
        return basisdatum + timedelta(weeks=intervall_wert)
    if intervall_typ == "monate":
        return _add_months(basisdatum, intervall_wert)
    if intervall_typ == "jahre":
        return _add_years(basisdatum, intervall_wert)
    return None


def _add_months(basisdatum: date, monate: int) -> date:
    zielmonat = basisdatum.month - 1 + monate
    jahr = basisdatum.year + zielmonat // 12
    monat = zielmonat % 12 + 1
    tag = min(basisdatum.day, monthrange(jahr, monat)[1])
    return date(jahr, monat, tag)


def _add_years(basisdatum: date, jahre: int) -> date:
    jahr = basisdatum.year + jahre
    tag = min(basisdatum.day, monthrange(jahr, basisdatum.month)[1])
    return date(jahr, basisdatum.month, tag)


def _befund_label(befund: Befund) -> str:
    if befund.entnahmedatum:
        return f"Befund vom {befund.entnahmedatum.isoformat()}"
    if befund.befunddatum:
        return f"Befund vom {befund.befunddatum.isoformat()}"
    return f"Befund {befund.id}"


_PRUEF_HANDLERS: dict[str, PruefHandler] = {
    "person": _pruefe_person,
    "befund": _pruefe_befund,
    "messwert": _pruefe_messwert,
    "importvorgang": _pruefe_importvorgang,
    "einheit": _pruefe_einheit,
    "labor": _pruefe_labor,
    "laborparameter": _pruefe_laborparameter,
    "parameter_gruppe": _pruefe_parameter_gruppe,
    "zielbereich": _pruefe_zielbereich,
    "parameter_umrechnungsregel": _pruefe_parameter_umrechnungsregel,
    "planung_zyklisch": _pruefe_planung_zyklisch,
    "planung_einmalig": _pruefe_planung_einmalig,
}


_DELETE_HANDLERS: dict[str, DeleteHandler] = {
    "person": lambda db, entitaet_id, payload: _execute_delete_person(db, entitaet_id),
    "befund": lambda db, entitaet_id, payload: _execute_delete_befund(db, entitaet_id),
    "messwert": lambda db, entitaet_id, payload: _execute_delete_messwert(
        db,
        entitaet_id,
        leeren_befund_mitloeschen=payload.leeren_befund_mitloeschen,
    ),
    "importvorgang": lambda db, entitaet_id, payload: _execute_delete_importvorgang(
        db,
        entitaet_id,
        dokument_entfernen=payload.dokument_entfernen,
    ),
    "einheit": lambda db, entitaet_id, payload: _execute_delete_einheit(db, entitaet_id),
    "labor": lambda db, entitaet_id, payload: _execute_delete_labor(db, entitaet_id),
    "laborparameter": lambda db, entitaet_id, payload: _execute_delete_laborparameter(db, entitaet_id),
    "parameter_gruppe": lambda db, entitaet_id, payload: _execute_delete_parameter_gruppe(db, entitaet_id),
    "zielbereich": lambda db, entitaet_id, payload: _execute_delete_zielbereich(db, entitaet_id),
    "parameter_umrechnungsregel": lambda db, entitaet_id, payload: _execute_delete_parameter_umrechnungsregel(db, entitaet_id),
    "planung_zyklisch": lambda db, entitaet_id, payload: _execute_delete_planung_zyklisch(db, entitaet_id),
    "planung_einmalig": lambda db, entitaet_id, payload: _execute_delete_planung_einmalig(db, entitaet_id),
}
