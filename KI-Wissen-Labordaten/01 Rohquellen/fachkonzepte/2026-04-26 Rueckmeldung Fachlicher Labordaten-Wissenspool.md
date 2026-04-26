# 2026-04-26 Rückmeldung Fachlicher Labordaten-Wissenspool

## Quelle
Nutzer-Rückmeldung im Arbeitschat am 2026-04-26.

## Kernaussage
Die Anwendung soll nicht die projektbezogene KI-Wissensbasis als fachlichen Wissenspool verwenden.

Es sind zwei Bereiche zu unterscheiden:

- `KI-Wissen-Labordaten/`: Projektdokumentation für Entwicklung, Agentenarbeit, Entscheidungen, Logs, Rohkonzepte und Umsetzungsstand.
- `Labordaten-Wissen/`: fachlicher Informationspool für die Anwendung, mit Markdown-Seiten zu Laborparametern, KSG-Systematik, Testkombinationen, Zielbereichen, Gesundheitswerten und eigenen fachlichen Notizen.

## Anforderungen
- Die in der Anwendung sichtbare Wissensbasis soll auf den fachlichen Labordaten-Informationspool zeigen.
- Die fachliche Wissensbasis soll unabhängig von der Entwicklungsdokumentation sein.
- Beim Anlegen eines neuen Parameters soll automatisch eine Markdown-Seite im fachlichen Informationspool angelegt und mit dem Parameter verknüpft werden.
- Der Beschreibungstext des Parameters soll als Ausgangstext in diese Markdown-Seite übernommen werden.
- Die Seite soll später manuell mit Definitionen, Webfunden, eigenen Überlegungen, KSG-Einordnung, Messkombinationen und weiteren fachlichen Informationen erweitert werden können.
