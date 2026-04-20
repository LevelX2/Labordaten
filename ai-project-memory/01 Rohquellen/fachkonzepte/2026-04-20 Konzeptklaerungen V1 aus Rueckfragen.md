# Konzeptklärungen V1 aus Rückfragen

## Quelle
- Art: Nutzerrückmeldung im Chat
- Datum: 2026-04-20
- Status: Rohquelle

## Originalinhalt

Soll V1 als lokal im Browser laufende Anwendung starten dürfen, oder wollen Sie von Anfang an eine “echte” installierte Desktop-App?
Kann erst mal auch im Browser laufen.

Sollen in V1 nur numerische Messwerte unterstützt werden, oder müssen qualitative Befunde direkt mit ins Modell?
Auch qualitative, das wären dann Texte.

Wollen Sie Labor als eigenes Stammdatenobjekt mit Name und optionalen Details, oder reicht zunächst Freitext?
Nein würde Stammdaten daraus machen. Aber mit wenig zusätzlichen Daten. Erst mal nur Name und Adresse und Bemerkung.

Sollen Zielbereiche in V1 nur personenbezogen pro Parameter gelten, oder brauchen Sie direkt globale oder gruppenbezogene Zielbereiche?
Es sollen allgemeine Zielbereiche geben, die man bei Bedarf personenbezogen überschreiben kann.

Ist Ihnen ein nachvollziehbares Änderungsprotokoll wichtig, oder reicht vorerst “letzter Stand” ohne Historie von Korrekturen?
Benötige keine Histore.

Sollen Import-Rohdaten dauerhaft gespeichert werden, damit später prüfbar bleibt, was genau aus CSV, Excel oder KI kam?
Nur wenn es der original Laborbericht ist, dann kann er dazu abgelegt werden.
Wenn man aus einer ExcelTabelle Importiert oder textdatei, würde ich fragen, ob man es als Quelle ablegen will.

Soll die Wissensbasis in V1 nur angezeigt/geöffnet werden, oder möchten Sie sie aus der Anwendung heraus auch bearbeiten können?
Man soll die Daten bearbeiten können. Die Frage wäre, wenn ich hier mit Codex ein Dokument für den Import bearbeite, soll er die Daten aus CODEX anlegen können, evtl. ist es sinnvoll da eine genormte Schnittstelle dazu anzubieten und nicht direkt in die DB zu schreiben.

Ist für den lokalen Betrieb zusätzlich eine App-PIN oder Secret-Verschlüsselung gewünscht, oder reicht zunächst “lokal auf dem Gerät” als Sicherheitsmodell?
App Pin ist erst mal nicht notwendig.

Soll OneDrive nur als Sicherung/Synchronisation dienen, mit der Regel “nie gleichzeitig auf zwei Geräten öffnen”, oder erwarten Sie dafür mehr Schutzmechanismen?
Es soll nur verhindert werden, dass es synch Probleme auf der DB gibt, deshalb nur ein Benutzer auf der DB war der Hintergrund.

Welche drei Berichtstypen sind für Ihre echte V1 unverzichtbar, falls wir Berichte in Stufen liefern?
Wichtig als Bericht wäre ein Ausdruck dem man zum Arzt mitnehmen kann, der die ausgewählten Werte nach Filtern (Gruppen, Zeitraum, Person etc.) gut lesbar als Liste ausgibt und einen zweitzen der ausgewählte Werte im Verlauf auf der Zeitachse zeigt.

Sollen qualitative Werte im Verlaufsbericht als Textliste unter dem Diagramm reichen, oder wollen Sie dafür eigene Marker auf der Zeitachse?
Erkläre mir nochmal genau, was du unter qualitativen Werten verstehst.

Genau solche Befunde meine ich.

Soll die Wissensbearbeitung in V1 zunächst über Datei in Obsidian/Editor öffnen laufen, statt direkt mit eingebautem Markdown-Editor?
Reine Anzeige reicht erst mal. Das werde ich über KI einpfelgen lassen und dann spezielle Vorgehen definieren.

Sollen Dubletten nur als Warnung markiert werden, oder soll der Import bei starkem Verdacht blockieren?
Warnung und nach Bestätigung übernehmen.

Welche Felder müssen im Arztbericht sicher drin sein: Parameter, Datum, Wert, Einheit, Referenzbereich, Befundbemerkung, Messwertbemerkung, Labor?
Alle vorbelegt, ggf. per Checkbox oder ähnlichem ausschaltbar.

Wollen Sie bei Referenzbereichen in V1 schon alters- oder geschlechtsabhängige Varianten, oder zunächst nur einfache Bereiche plus Originaltext?
Die sollen grundsätzlich möglich sein, kommen ja vor.
