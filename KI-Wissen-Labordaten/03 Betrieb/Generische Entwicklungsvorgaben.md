---
typ: betrieb
status: aktiv
letzte_aktualisierung: 2026-04-25
quellen:
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
  - ../../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-25 Rueckmeldung UI-Leitlinien fuer arbeitsorientierte Weboberflaechen.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Automatische interne Parameterschluessel.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-21 Rueckmeldung Alias-Vorschlaege und Berichtseinheiten.md
  - ../../01 Rohquellen/fachkonzepte/2026-04-22 Rueckmeldung Loeschlogik und Deaktivierungsregeln.md
  - ../../02 Wissen/Begriffe und Konzepte/Ist-Stand Einheiten, Normeinheiten und Umrechnung.md
  - ../../02 Wissen/Begriffe und Konzepte/Ist-Stand Loeschlogik und Deaktivierungsregeln.md
  - ../../apps/frontend/src/app/layout/AppLayout.tsx
  - ../../apps/frontend/src/shared/components/SelectionChecklist.tsx
  - ../../apps/frontend/src/shared/components/DateRangeFilterFields.tsx
  - ../../apps/frontend/src/styles.css
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
- Formulierungen sollen sich am produktiven Einsatz der Anwendung orientieren und nicht an Entwicklungsstand, Scaffold-Status oder Einführungslogik.
- Kleine Vorspann-Labels über der Hauptüberschrift sind nur sinnvoll, wenn sie einen zusätzlichen fachlichen Informationswert liefern; reine Stimmungs- oder Orientierungswörter ohne Mehrwert können entfallen.

## Shell und Zeichencodierung unter Windows
## Arbeitswege und Entscheidungsführung in Weboberflächen
- Eine Oberfläche soll zuerst die gedankliche Aufgabe des Anwenders und seine Arbeitswege abbilden, nicht die technische Architektur der Anwendung.
- Wenn ein Nutzer zwischen unterschiedlichen Wegen wählen muss, sollen diese Wege als klar getrennte Einstiege erscheinen; ein gemeinsamer Prüf- oder Bearbeitungsschritt danach gehört in einen eigenen Arbeitsbereich.
- Das Starten neuer Vorgänge und das Weiterbearbeiten offener Vorgänge sollen sichtbar getrennt sein, damit laufende Arbeit nicht zwischen Eingabe, Prüfung und Historie untergeht.
- Tabs, Segmente und Bereichsnamen sollen ohne interne Fachsprache, Nummern oder technische Platzhalter verständlich sein; technische Begriffe sind nur sinnvoll, wenn sie dem Nutzer bei einer echten Entscheidung helfen.
- Sehr lange Seiten sind ein Warnsignal. Wenn ein Bereich so wächst, dass der Nutzer ständig scrollen muss, um den nächsten relevanten Abschnitt zu finden, soll die Oberfläche Inhalte trennen, in klar abgegrenzte Arbeitsbereiche aufteilen oder über sinnvolle Einklappmechaniken verdichten.
- Einklappbare Bereiche sollen in vergleichbaren Oberflächen nach einem einheitlichen Muster funktionieren statt pro Seite anders. Die Anwendung soll nicht jedes Mal neu erklären müssen, was offen, geschlossen oder als Nächstes relevant ist.
- Offen sichtbar bleiben sollen der aktuell relevante Arbeitsschritt, Pflichtangaben, aktive Entscheidungen und primäre Aktionen.
- Eher eingeklappt gehören lange Erklärungen, technische Details, erledigte Abschnitte, selten benötigte Zusatzangaben, Rohdaten und andere Inhalte, die im aktuellen Arbeitsschritt nicht im Vordergrund stehen.
- Kurze Orientierungstexte gehören direkt an den Anfang eines Bereichs; längere Erklärungen sollen in einen klar erkennbaren, eher einklappbaren Hilfebereich, damit sie die eigentliche Arbeit nicht verdrängen.
- Der nächste sinnvolle Schritt und die wichtigste Aktion eines Abschnitts müssen ohne Suchen erkennbar sein; offene Arbeit soll zusätzlich über Badges oder kurze Hinweise sichtbar bleiben.
- Primäre Aktionen sollen pro Schritt klar hervorgehoben sein; Nebenaktionen wie Historie, Detailansicht oder technische Zusatzinformationen gehören optisch zurückhaltender gestaltet.
- Historie dient Nachvollziehbarkeit und Verwaltung, nicht dem aktiven Arbeiten im Hauptfluss; sie soll daher als eigener Bereich oder eigener Tab erscheinen.
- Formulare sollen nur die Felder zeigen, die im aktuellen Schritt fachlich wirklich gebraucht werden; spätere Entscheidungen oder optionale Kontextangaben gehören nicht unnötig in frühere Eingabeschritte.
- Auswahl- und Zuordnungsstellen müssen alle fachlich nötigen Handlungswege direkt anbieten, einschließlich bewusster Neuanlage, wenn diese fachlich zulässig ist; eine UI soll nicht zu falschen Zuordnungen drängen, nur weil der alternative Weg fehlt.
- Hinweise, Entscheidungen und Warnungen sollen sauber getrennt werden. Warnungen sind für echten Risikogehalt gedacht; erwartbare Neuanlagen oder normale Prüfschritte sind meist Hinweise oder Entscheidungen.
- Technische IDs sollen nur sichtbar sein, wenn sie für Support, Debugging oder eindeutige Referenzierung einen echten Nutzen haben.
- Wenn eine Oberfläche mit externen Werkzeugen oder KI-Chats zusammenarbeitet, muss sie knapp erklären, was im aktuellen Schritt erzeugt wird, wo es verwendet wird, was zurückkommt, wo das Ergebnis eingefügt wird und wie es danach weitergeht.
- Kopierpfade brauchen robuste Bedienbarkeit: Ein Copy-Button soll zuverlässig funktionieren, und bei Browsergrenzen muss der Text dennoch leicht manuell markierbar bleiben.
- Dialoge und Rückfragen sollen direkte, handlungsorientierte Entscheidungen formulieren statt abstrakte oder unnötig technische Umschreibungen zu verwenden.

- Für lokale Textarbeit, Repo-Inspektion und Skriptstarts unter Windows sollte nach Möglichkeit PowerShell 7 (`pwsh`) statt Windows PowerShell 5.1 verwendet werden.
- Der Grund ist nicht nur Komfort, sondern die konsistentere UTF-8-Verarbeitung bei Markdown-, JSON-, TypeScript-, CSS- und ähnlichen Textdateien.
- Wenn Skripte oder Einmalbefehle Textdateien lesen oder schreiben, sollte die Zeichencodierung zusätzlich an kritischen Stellen explizit angegeben werden, statt auf implizite Standardwerte des aufrufenden Prozesses zu vertrauen.
- Repo- und Workspace-Konfigurationen dürfen den gewünschten Standard festlegen, ersetzen aber keine bewusste Prüfung der tatsächlich verwendeten Shell, wenn Symptome wie Mojibake, unerwartete Diffs oder fehlgeschlagene Patch-Matches auftreten.

## Diagnosehinweise im lokalen Dev-Betrieb
- Wenn Frontend und Backend bewusst im laufenden Dev-Modus betrieben werden, sollte ein fehlender Reload, veralteter Build oder nötiger Neustart ausdrücklich nicht als Standardursache angenommen werden.
- Im normalen Entwicklungsalltag ist zuerst davon auszugehen, dass Codeaenderungen bereits im laufenden Dev-Betrieb wirksam sind.
- Solche Hinweise sind eher als spätere Sicherheitsmaßnahme sinnvoll, wenn die fachliche oder technische Analyse sonst nicht weiterführt oder konkrete Symptome auf einen hängenden Prozess, Caching oder einen tatsächlich veralteten Stand deuten.
- Für Rückmeldungen im Projektalltag ist es hilfreicher, zunächst Datenlage, Codepfad, Filterzustand, API-Antwort oder konkrete Laufzeitlogik zu prüfen als reflexhaft ein manuelles Neuladen zu empfehlen.
- Diese Leitlinie gilt nicht nur fuer dieses eine Repository, sondern generell fuer vergleichbare lokale Entwicklungsumgebungen mit Reload- oder Hot-Reload-Betrieb.

## Lokale Laufzeitartefakte und Analyseausgaben
- Lokale Laufzeitartefakte wie Datenbankdateien, Laufzeit-Einstellungen, Sperrdateien und dokumentbezogene Ablagen sollen nicht versioniert werden.
- Dasselbe gilt fuer temporaere Extraktions-, Vorschau-, Scan-, Inventar- und Analyseartefakte wie `tmp_*`-Ordner, JSONL-Inventare oder ad-hoc erzeugte Seitenbilder.
- Versioniert werden nur echte Quellartefakte, bewusst gepflegte Rohquellen und dauerhafte Wissensseiten; reproduzierbare Zwischenstaende aus lokalen Arbeitslaeufen gehoeren in `.gitignore`.
- Bei dateibasierten Fachobjekten ist vor dem Loeschen zu pruefen, ob die aktuelle Laufzeitdatenbank noch auf diese Dateien verweist.
- Relative Default-Pfade fuer Laufzeitdaten sollten projektweit an einen klaren kanonischen Startkontext gebunden werden, damit nicht unbeabsichtigt mehrere lokale Artefaktinseln entstehen.

## Stammdatenseiten als Arbeitsbereich
- Vergleichbare Stammdatenseiten sollten als klarer Arbeitsbereich aufgebaut sein und nicht als lose Sammlung gleichrangiger Karten oder Formulare.
- Links steht bevorzugt eine filterbare Liste der vorhandenen Datensätze der führenden Tabelle.
- Rechts steht der Detailbereich des aktuell ausgewählten Datensatzes.
- Direkt unter dem Detailkopf liegen die kontextbezogenen Werkzeuge als kompakte Leiste; das jeweilige Werkzeug soll nur bei Bedarf geöffnet werden.
- Die Standardansicht zeigt die wichtigsten fachlichen Informationen, während technische oder selten benötigte Angaben in eine Expertenansicht gehören.
- Zugeordnete oder abhängige Daten sollen unterhalb des Detailbereichs in einem eigenen Abschnitt stehen.
- Wenn solche abhängigen Daten tabellarisch oder breit werden, ist für arbeitsorientierte Oberflächen eine gestapelte und einklappbare Darstellung oft besser als mehrere nebeneinanderliegende Karten.
- Werkzeuge zum Bearbeiten und Bereiche zum Anzeigen vorhandener Zuordnungen sollen nicht dieselbe Aktion doppelt an mehreren Stellen anbieten.

## Einklappbare Bereiche und grosse Filterbloecke
- Groessere Filterbloecke und vergleichbare Zusatzbereiche sollten dieselbe Auf- und Zuklapplogik wie andere einklappbare Arbeitsbereiche der Anwendung verwenden.
- Alles, was fachlich zu einem einklappbaren Block gehoert, soll gemeinsam ein- und ausgeklappt werden.
- Zugehoerige Aktionen wie `Alle auswaehlen`, `Alle abwaehlen` oder vergleichbare Bereichsaktionen duerfen im eingeklappten Zustand nicht als losgeloeste Reste sichtbar bleiben.
- Kleine, kompakte Eingaben wie einzelne Datumsfelder brauchen diese Einklapplogik in der Regel nicht.

## Grosse Mehrfachauswahllisten in Filtern
- Wenn eine einklappbare Mehrfachauswahlliste viele Eintraege enthalten kann, sollte sie innerhalb des aufgeklappten Bereichs eine lokale Suche anbieten.
- Die Suche darf nur die sichtbare Liste filtern, nicht still die bereits ausgewaehlten Werte loeschen oder die fachliche Filterauswahl zuruecksetzen.
- Fuer lange Listen ist zusaetzlich eine Ansicht `nur ausgewaehlte` sinnvoll, damit bereits getroffene Auswahlen schnell kontrolliert und angepasst werden koennen.
- Bereichsaktionen wie `Alle auswaehlen` und `Alle abwaehlen` sollen sich bei aktiver lokaler Suche oder `nur ausgewaehlte` auf die aktuell sichtbare Teilmenge beziehen, nicht blind auf die Gesamtliste.
- Solche Such- und Sichtfilter gehoeren in gemeinsame Auswahlkomponenten, damit das Verhalten ueber vergleichbare Filterseiten hinweg gleich bleibt.

## Datumsbereiche in Filtern
- Vergleichbare Filterbereiche mit `Datum von` und `Datum bis` sollen als ein gemeinsames, wiederverwendbares UI-Muster umgesetzt werden statt als pro Seite abweichende Einzellösung.
- Jedes Datumsfeld soll als kompakter eigener Block mit klarer Beschriftung erscheinen; die beiden Blöcke stehen linksbündig nebeneinander und ziehen nicht unnötig auf volle Zeilenbreite.
- Die Schrittaktionen `-1 J` und `+1 J` gehören direkt an das jeweilige Datumsfeld, damit Zeiträume schnell verschoben werden können, ohne dass getrennte Zusatzzeilen oder lose Button-Reihen entstehen.
- Wenn die verfügbare Breite nicht mehr reicht, sollen ganze Datumsblöcke umbrechen; einzelne Teilstücke eines Blocks dürfen nicht unruhig auseinanderfallen.
- Für vergleichbare Seiten soll dieselbe gemeinsame Frontend-Komponente verwendet werden, damit Optik, Verhalten, Tastaturfokus und spätere Detailanpassungen projektweit konsistent bleiben.

## Kompakte Listensortierung in Arbeitsseiten
- Auf arbeitsorientierten Seiten mit linker Auswahlliste und rechtem Detailbereich sollte die Sortierung als kompakte Zusatzsteuerung in oder nahe der Liste erscheinen statt als dauerhaft breite Werkzeugleiste.
- Sichtbar bleiben sollte in der Grundansicht vor allem eine kurze Zusammenfassung der aktiven Sortierung; die eigentliche Konfiguration wird erst bei Bedarf aufgeklappt oder geöffnet.
- Wenn mehrstufige Sortierung sinnvoll ist, sollten wenige klare Standardsortierungen angeboten und zusätzlich maximal einige explizite Sortierebenen konfigurierbar sein, statt eine offene oder überladene Regeloberfläche zu zeigen.
- Sortierfelder sollen sich auf fachlich sinnvolle und für den Nutzer erkennbare Felder beschränken; technische Felder oder seltene Expertenkriterien gehören nur in bewusst vertiefte Ansichten.
- Dasselbe Sortiermuster sollte über vergleichbare Listenbereiche hinweg technologisch und visuell möglichst gleich funktionieren, etwa über gemeinsame Search-Params, wiederverwendbare Komponenten und serverseitig passende Mehrfachsortierung.

## Stammdatenpflege
- Technische Schlüssel für neue Stammdatensätze sollten nach Möglichkeit automatisch aus fachlich sichtbaren Namen erzeugt werden, statt standardmäßig manuell eingegeben zu werden.
- Das reduziert Tippfehler, inkonsistente Benennungen und vermeidbare Dubletten.
- Bei Namensgleichheit sollte die technische Eindeutigkeit automatisch durch Suffixe oder eine vergleichbare Fortsetzungslogik gesichert werden.

## Start- und Übersichtsseiten
- Startseiten in arbeitsorientierten Fachsystemen sollten vor allem den nächsten sinnvollen Arbeitsschritt sichtbar machen und nicht primär die technische Implementierung erklären.
- Prominent geeignet sind Live-Informationen wie Datenbestand, offene Prüf- oder Importlagen, Betriebszustände und direkte Anschlussaktionen in die wichtigsten Arbeitsbereiche.
- Reine Stack- oder Scaffold-Angaben sind höchstens für Entwicklungs- oder Diagnosetexte sinnvoll, aber selten der wichtigste Inhalt einer produktiven Startseite.
- Eine visuelle Aufwertung durch ruhige, hochwertige Bildmotive oder ein kleines Markenbild ist sinnvoll, wenn sie die Orientierung unterstützt und die arbeitsrelevanten Kennzahlen, Warnlagen und Anschlussaktionen weiterhin den inhaltlichen Fokus behalten.
- Versionsnummern oder vergleichbare technische Metadaten sollten dezent im Branding, in der Shell oder in Einstellungen platziert werden statt als dominanter Hauptinhalt einer Start- oder Übersichtsseite.
- Persistente Shell-Bereiche wie eine linke Navigation sollten keine erläuternden Beschreibungstexte tragen, wenn Markenname, Navigationsstruktur und Nutzungskontext die Orientierung bereits ausreichend leisten.

## Shell-Navigation und Arbeitsfläche
- In arbeitsorientierten Desktop-Oberflächen sollte eine persistente linke Hauptnavigation bei Bedarf in einen schmalen Rail-Zustand einklappbar sein, wenn breite Listen, Tabellen, Formulare oder Diagramme den eigentlichen Arbeitsfokus bilden.
- Der Umschalter für diesen Modus muss im eingeklappten Zustand weiterhin klar sichtbar bleiben, damit der gewonnene Platz nicht mit schlechterer Orientierung bezahlt wird.
- Auch im Schmalmodus soll die Navigation noch schnell zuordenbar bleiben, zum Beispiel über kurze Labels, erkennbare aktive Ziele oder direkte Tooltips.
- Wenn kein fachlicher Grund für ein Zurücksetzen besteht, sollte der gewählte Shell-Zustand pro Gerät oder Browser lokal gemerkt werden.

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

## Löschlogik und Deaktivierung
- Löschentscheidungen für vergleichbare Fachobjekte sollten zentral pro Entitätstyp geprüft werden, statt jede Seite mit eigener Sonderlogik auszustatten.
- Die UI sollte zuerst eine Löschprüfung anzeigen und die eigentliche Ausführung erst in einem zweiten Schritt anstoßen.
- Historische Anker, Provenienzträger und zentrale Stammdatensätze sollten bevorzugt deaktiviert statt hart gelöscht werden.
- Harte Löschung ist vor allem für unkritische Pflegekinder oder klar eigentumsgebundene Kaskadenobjekte geeignet.
- Folgeeffekte auf abhängige Ableitungen, Statusfelder oder Cache-Verweise müssen Teil derselben Transaktion wie die Löschung sein.
- Nutzungsprüfungen dürfen sich nicht nur auf Fremdschlüssel verlassen, wenn fachliche Verwendungen bewusst in denormalisierten Feldern gespeichert werden.
- Physische Dateien und Datenbankdatensätze sollen getrennt behandelt werden; ein Fachobjekt darf nicht still nebenbei die Quelle auf Platte mitvernichten.
- Löschlogik braucht eigene Regressionstests mit Positiv- und Negativpaaren, weil Fehler in diesem Bereich besonders teuer und unangenehm sind.
