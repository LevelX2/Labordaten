# Rückmeldung UI-Leitlinien für arbeitsorientierte Weboberflächen

## Quelle
- Nutzerfeedback vom 2026-04-25 im laufenden Projektthread

## Rohinhalt
### Grundprinzip
Eine Oberfläche sollte zuerst die gedankliche Aufgabe des Anwenders abbilden, nicht die technische Architektur. Wenn es unterschiedliche Arbeitswege gibt, müssen diese als unterschiedliche Wege sichtbar sein. Wenn danach ein gemeinsamer Prüf- oder Bearbeitungsschritt kommt, sollte dieser als eigener Arbeitsbereich erscheinen.

### Allgemeine Regeln für Weboberflächen
- Arbeitswege klar trennen:
  Unterschiedliche Prozesse gehören nicht in eine lange gemischte Seite. Wenn der Anwender gedanklich zwischen Alternativen wählen muss, sollten diese Alternativen als Tabs, Segmente oder klare Startkarten dargestellt werden.
- Beispielregel:
  Tabs dürfen nicht nur technische Unterbereiche sein, sondern sollen für den Anwender erkennbare Arbeitsmodi oder Prozessschritte darstellen.
- Starten und Bearbeiten trennen:
  Eine Oberfläche sollte unterscheiden zwischen `neuen Vorgang beginnen` und `bestehenden/offenen Vorgang weiterbearbeiten`.
- Tabs verständlich benennen:
  Tab-Namen sollen ohne Nummern und ohne interne Begriffe funktionieren. Keine Labels wie `1 KI-Prompt`, wenn die Zahl keine echte Bedeutung hat. Besser: `KI-Prompt`, `KI-Ergebnis / JSON`, `Import prüfen`, `Historie`.
- Technische Begriffe vermeiden, wenn sie nicht helfen:
  Begriffe wie `Entwurf`, `History-ID`, `Prüfpunkt`, `Endpoint`, `Schemafehler` sind nur dann sinnvoll, wenn sie für den Anwender wirklich eine Entscheidung ermöglichen.
- Lange Seiten vermeiden:
  Wenn eine Seite stark wächst, ist das fast immer ein Signal, dass Inhalte getrennt oder einklappbar gemacht werden müssen. Eine Oberfläche sollte nicht verlangen, dass der Anwender ständig nach unten scrollt, um den nächsten relevanten Bereich zu finden.
- Einklappen nach Relevanz:
  Offen bleiben sollen der aktuell relevante Arbeitsschritt, Pflichtangaben, aktive Entscheidungen und primäre Aktionen. Eingeklappt werden sollen lange Erklärungen, technische Details, erledigte Abschnitte, selten benötigte Zusatzangaben und Rohdaten oder lange Prompttexte.
- Der nächste sinnvolle Schritt muss sichtbar sein:
  Eine Oberfläche darf den Anwender nicht suchen lassen, wie es weitergeht. Wenn ein Import geprüft wird, müssen die relevanten Aktionen wie `Import übernehmen`, `Import verwerfen` oder `JSON einfügen` dort sichtbar sein, wo der Anwender sie erwartet.
- Hilfetexte an die richtige Stelle:
  Kurze Orientierung gehört direkt an den Anfang eines Bereichs. Längere Erklärungen gehören in einen einklappbaren Hilfebereich wie `So funktioniert dieser Weg`. Hilfetext darf keine Formularfelder auseinanderziehen oder die eigentliche Arbeit verdrängen.
- Status sichtbar machen:
  Offene Arbeit sollte sichtbar sein, zum Beispiel mit einem Badge `Import prüfen 3`. Zusätzlich kann ein dezenter Hinweis in Startbereichen helfen: `3 offene Importe warten auf Prüfung`.
- Historie separat halten:
  Historie ist Verwaltung und Nachvollziehbarkeit, nicht Teil jedes aktiven Arbeitsbereichs. Sie sollte als eigener Tab oder eigener Bereich erscheinen und nicht permanent unter Formularen stehen.
- Auswahl muss vollständige Handlungsmöglichkeiten bieten:
  Wenn ein Dropdown zur Zuordnung dient, darf es nicht nur bestehende Optionen anbieten, wenn fachlich auch `neu anlegen` möglich ist. Sonst zwingt die UI zu falschen Zuordnungen.
- Warnungen sauber klassifizieren:
  Nicht alles, was Aufmerksamkeit braucht, ist eine Warnung. Eine vorgesehene Neuanlage ist eher eine Entscheidung oder ein Hinweis als eine Warnung. Warnungen sollten echten Risikogehalt haben.
- IDs nur anzeigen, wenn sie nützlich sind:
  Technische IDs stören häufig. Sie sollten nur sichtbar sein, wenn der Anwender sie braucht, etwa für Support, Debugging oder eindeutige Referenzierung.
- Copy-Flows müssen robust sein:
  Wenn eine Oberfläche einen Text zum Kopieren anbietet, muss der Copy-Button zuverlässig funktionieren. Falls der Browser das automatische Kopieren nicht erlaubt, sollte der Textbereich leicht manuell markierbar sein und nicht wie gesperrt wirken.
- Externe Werkzeugketten explizit erklären:
  Wenn ein Prozess außerhalb der Anwendung weitergeführt wird, zum Beispiel in einem KI-Chat, muss die Oberfläche klar sagen: Was wird hier erzeugt? Wo wird es verwendet? Was kommt zurück? Wo wird das Ergebnis eingefügt? Was passiert danach?
- Ein gemeinsamer Importweg ist oft besser als viele Spezialimporte:
  Statt CSV, Excel, PDF, Bild und JSON als getrennte technische Importlogiken zu pflegen, kann es sinnvoller sein, eine klare JSON-Schnittstelle als einzigen Eingang zu definieren und KI-Prompts nur als Hilfsmittel zur Erzeugung dieses JSON zu nutzen.
- Formulare nur mit nötigen Feldern belasten:
  Felder wie `Person`, `Dokumenthinweis` oder `Prompt-Hinweis` sollten nur dort stehen, wo sie fachlich wirklich gebraucht werden. Wenn die Person erst beim Import festgelegt wird, gehört sie nicht in die Prompt-Erzeugung.
- UI muss Fehlannahmen verhindern:
  Wenn ein KI-Ergebnis zu einer falschen Person gehört, muss die Anwendung das durch klare Prüfung, Auswahl und Anzeige möglichst sichtbar machen. Kritische Stammdaten wie Person, Datum und Labor gehören prominent in den Prüfschritt.
- Primäre und sekundäre Aktionen unterscheiden:
  Die wichtigste Aktion pro Schritt sollte klar hervorgehoben sein. Nebenaktionen wie `anzeigen`, `Details öffnen`, `technische Informationen` oder `Historie öffnen` sollten optisch zurückhaltender sein.
- Dialoge sollen echte Entscheidungen formulieren:
  Gute Dialogfrage: `Was soll mit dem Importversuch passieren?`
  Schlechter: `Wie soll mit diesem Importversuch umgegangen werden?`

### Kernregel als Zusammenfassung
Eine gute Weboberfläche führt nicht alle verfügbaren Funktionen gleichzeitig vor, sondern zeigt dem Anwender zur richtigen Zeit die richtige Entscheidung, mit verständlichen Begriffen, sichtbarem Status und einem klaren nächsten Schritt.
