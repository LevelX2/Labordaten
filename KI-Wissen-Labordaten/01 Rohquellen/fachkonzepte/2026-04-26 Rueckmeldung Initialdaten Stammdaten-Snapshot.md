---
typ: rohquelle
status: ausgewertet
datum: 2026-04-26
quelle: Nutzerfeedback im Chat
tags:
  - initialdaten
  - stammdaten
  - auslieferung
  - einstellungen
---

# Rückmeldung Initialdaten Stammdaten-Snapshot

## Anlass
Für eine bereitgestellte oder heruntergeladene Anwendung soll es eine Möglichkeit geben, leere Installationen mit sinnvollen Grunddaten zu initialisieren.

## Kernaussagen
- Wenn die Anwendung beim Start oder anhand der Datenbank erkennt, dass noch keine sinnvollen Grunddaten vorhanden sind, soll optional gefragt werden, ob Vorgaben übernommen werden sollen.
- Zu diesen Vorgaben gehören mindestens Laborparameter, Parametergruppen und der aktuelle sinnvolle Wissensstand aus der Datenbank.
- Aliase, Einheiten, Umrechnungsregeln und vergleichbare Stammdaten gehören fachlich ebenfalls in die Initialladung.
- In den Einstellungen soll später eine Möglichkeit vorgesehen werden, diese Vorgaben erneut zu initialisieren oder nachzuladen.
- Das Initialskript soll aus den aktuell bestehenden Grunddaten erzeugt werden und künftig aktualisierbar bleiben, wenn sich der gewünschte Grunddatenbestand ändert.
- Verknüpfungen auf Laborwissen-Seiten sind Teil des Grunddatenbestands, auch wenn die Option offen bleibt, ob Nutzer diese Wissensseiten bei bewusst eigener Parametersammlung löschen oder ausblenden können sollen.

## Offene Punkte aus der Rückmeldung
- UX-Entscheidung für den Erststart-Dialog ist noch offen.
- Eine Einstellungsaktion zum erneuten Laden oder Aktualisieren der Vorgaben ist noch offen.
- Eine bewusste Lösch- oder Ausblendefunktion für parameterbezogene Markdown-Wissensseiten ist noch offen.
