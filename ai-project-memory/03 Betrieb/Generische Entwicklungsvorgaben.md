---
typ: betrieb
status: aktiv
letzte_aktualisierung: 2026-04-22
quellen:
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
  - ../../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Automatische interne Parameterschluessel.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Alias-Vorschlaege und Berichtseinheiten.md
  - ../../02 Wissen/Begriffe und Konzepte/Ist-Stand Einheiten, Normeinheiten und Umrechnung.md
tags:
  - betrieb
  - vorgaben
  - entwicklungsregeln
  - wiederverwendung
---

# Generische Entwicklungsvorgaben

## Zweck
Diese Seite sammelt generische Regeln und wiederverwendbare Entwicklungsvorgaben für das aktuelle Projekt `Labordaten`.

Sie dient nicht dazu, jeden Einzelfall festzuhalten, sondern übertragbare Leitplanken zu sammeln:
- für neue Funktionen innerhalb dieses Projekts
- für spätere Überarbeitungen bestehender Bereiche
- als Ausgangsbasis für ähnliche künftige Projekte, wenn dort bewusst geprüft wird, welche Regeln übernommen, angepasst oder verworfen werden sollen

## Einordnung neuer Erkenntnisse
- Neue Erkenntnisse sollen nicht nur auf den konkreten Einzelfall beschrieben werden, sondern darauf geprüft werden, ob sie eine allgemeinere Regel für vergleichbare UI-, Modellierungs- oder Prozessfragen ausdrücken.
- Generisch ist eine Erkenntnis dann, wenn sie auch bei anderen fachlichen Seiten, ähnlichen Stammdatenobjekten, weiteren Formularen oder vergleichbaren Systembestandteilen sinnvoll wäre.
- Spezifisch ist eine Erkenntnis dann, wenn sie im Wesentlichen nur für einen einzelnen Sonderfall, eine konkrete Fachentscheidung oder einen eng begrenzten Ablauf gilt.
- Generische Regeln gehören auf diese Seite.
- Spezifische Regeln gehören in die jeweils fachlich passende Wissensseite, damit die generischen Entwicklungsvorgaben schlank und wiederverwendbar bleiben.

## UI-Texte und Seitenköpfe
- Der Einleitungstext im Seitenkopf soll aus Anwendersicht formuliert sein.
- Er soll knapp erklären, was man auf der Seite grundsätzlich tun kann und wofür die Seite fachlich dient.
- Entwickler-Narrative, Änderungsbeschreibungen oder Formulierungen wie `die Seite ist jetzt ...` sind dort zu vermeiden.
- Der Text soll auch für Nutzer sinnvoll sein, die die Anwendung nur gelegentlich verwenden.

## Stammdatenpflege
- Technische Schlüssel für neue Stammdatensätze sollten nach Möglichkeit automatisch aus fachlich sichtbaren Namen erzeugt werden, statt standardmäßig manuell eingegeben zu werden.
- Das reduziert Tippfehler, inkonsistente Benennungen und vermeidbare Dubletten.
- Bei Namensgleichheit sollte die technische Eindeutigkeit automatisch durch Suffixe oder eine vergleichbare Fortsetzungslogik gesichert werden.

## Start- und Übersichtsseiten
- Startseiten in arbeitsorientierten Fachsystemen sollten vor allem den nächsten sinnvollen Arbeitsschritt sichtbar machen und nicht primär die technische Implementierung erklären.
- Prominent geeignet sind Live-Informationen wie Datenbestand, offene Prüf- oder Importlagen, Betriebszustände und direkte Anschlussaktionen in die wichtigsten Arbeitsbereiche.
- Reine Stack- oder Scaffold-Angaben sind höchstens für Entwicklungs- oder Diagnosetexte sinnvoll, aber selten der wichtigste Inhalt einer produktiven Startseite.

## Datenmodell und feste Ausprägungen
- Beim Festlegen des Datenmodells sollte früh geprüft werden, welche Felder semantisch zu eng für Freitext sind und stattdessen feste Ausprägungen, Enums oder Lookup-Werte brauchen.
- Besonders wichtig ist das bei Feldern, die später für Filter, Referenzlogik, Statussteuerung, Importfreigabe oder Berichte verwendet werden.
- Das spart nachträgliche UI-Umbauten, Datenbereinigung und widersprüchliche API-Werte.
- Das konkrete Beispiel `geschlecht_code` zeigt das gut: Ob zwei oder drei Werte fachlich passend sind, ist die zweite Frage; dass Freitext dafür meist ungeeignet ist, hätte schon auf Modellebene klarer entschieden werden sollen.
- Typische Kandidaten für diese Prüfung sind Herkunfts- und Statusfelder, Werttypen und Operatoren, Referenztypen, Umrechnungsregeltypen, Bereichs- oder Kategoriefelder und andere Codes, die fachlich verglichen oder ausgewertet werden.
- Dabei sollte bewusst zwischen drei Feldgruppen unterschieden werden: feste Codes ohne Benutzererweiterung, pflegbare Fachkataloge mit eigener Stammdatenpflege und echtem Freitext.
- Für die mittlere Gruppe ist Freitext meist ebenfalls ungeeignet; dort ist ein eigenes Katalogobjekt oft die bessere Lösung.
- Ein guter Kandidat dafür sind wiederkehrende personbezogene Basisdatentypen wie `Gewicht` oder `Größe`: nicht als freier Eintragstyp pro Datensatz, sondern als pflegbarer Katalog wie `BasisdatenTyp`.

## Frontend-Backend-Vertragstests
- Wenn ein System technologisch so aufgebaut ist, dass Frontend und Backend getrennt Eingaben formen, validieren oder über API-Payloads koppeln, sollten dafür früh eigene Vertragstests vorgesehen werden.
- Backend-Tests allein reichen in solchen Zuschnitten nicht aus, weil sie nicht nachweisen, dass das Frontend weiterhin genau die Werte und Feldkombinationen erzeugt, die das Backend akzeptiert.
- Sinnvoll sind dafür schlanke Tests auf drei Ebenen: Backend-Validierung für feste Codes und Regeln, Frontend-nahe Payload- oder Formularlogik und einige API- oder Integrationspfade für die kritischsten Eingaben.
- Besonders wichtig ist das bei festen Ausprägungen, optionalen `null`-Feldern, typabhängigen Feldkombinationen und ähnlichen Stellen, an denen Frontend und Backend leicht unbemerkt auseinanderlaufen können.
- Der zusätzliche Testaufwand lohnt sich vor allem dann, wenn Änderungen an UI, Serialisierung oder API-Schemas sonst erst im laufenden Gebrauch auffallen würden.

## Formulare und Lesefelder
- Nicht bearbeitbare Felder müssen sich optisch klar von bearbeitbaren Feldern unterscheiden.
- Deaktivierte oder nur lesbare Eingaben sollen nicht denselben visuellen Eindruck erzeugen wie normale Schreibfelder.
- Sinnvoll sind dafür mindestens ein abweichender Hintergrund, gedämpfte Textfarbe und ein nicht interaktiver Cursor.
- Diese Regel gilt besonders in Pflegeoberflächen, in denen editierbare und nicht editierbare Informationen direkt nebeneinander stehen.

## Originaldaten und abgeleitete Vergleichsdaten
- Originaldaten und daraus abgeleitete oder normierte Vergleichsdaten sollten getrennt gespeichert oder zumindest logisch getrennt geführt werden.
- Originalwerte dienen Nachvollziehbarkeit, Herkunft und fachlicher Prüfbarkeit.
- Abgeleitete Werte dienen Vergleich, Filterung, Berichten, Visualisierung oder weitergehender Verarbeitung.
- Das Verwechseln beider Ebenen führt leicht dazu, dass spätere Fachentscheidungen nicht mehr nachvollziehbar oder nur mit Datenverlust korrigierbar sind.

## Ableitungsregeln und bevorzugte Zielwerte
- Wenn ein System Werte oder Darstellungen in eine bevorzugte Vergleichsform überführt, sollte diese Zielausprägung explizit gepflegt werden können.
- Sie sollte nicht nur implizit aus zufälligen Regeln, Datenreihenfolgen oder technischen Defaults entstehen.
- Automatische Ableitungen sollten nur erfolgen, wenn die Zielrichtung eindeutig ist.
- Wenn mehrere fachlich mögliche Ziele bestehen und keine ausdrückliche Priorität hinterlegt ist, sollte das System nicht raten.

## Konsistenz bei Regeländerungen
- Änderungen an zentralen Ableitungs-, Normierungs- oder Vergleichsregeln müssen bestehende abgeleitete Daten konsistent nachziehen.
- Es reicht nicht, nur die künftige Berechnung umzustellen, wenn bereits materialisierte Vergleichswerte vorhanden sind.
- Systeme mit gespeicherten Ableitungen sollten deshalb einen klaren Neuberechnungsmechanismus vorsehen.

## Begriffe, Alias und fachliche Transformationen
- Ein kanonischer Fachbegriff, seine alternativen Schreibweisen und eine fachliche Transformation zwischen verschiedenen Bedeutungen oder Einheiten sind getrennte Ebenen.
- Alias- oder Synonymlogik beschreibt dieselbe Sache in anderer Schreibweise.
- Transformationen oder Umrechnungen beschreiben eine fachliche Beziehung zwischen verschiedenen Darstellungen.
- Diese Ebenen sollten im Modell und in der UI nicht vermischt werden.
