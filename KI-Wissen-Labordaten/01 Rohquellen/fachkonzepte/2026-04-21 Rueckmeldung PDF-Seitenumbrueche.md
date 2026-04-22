# Rückmeldung PDF-Seitenumbrüche

## Quelle
- Nutzerhinweis vom 2026-04-21 zur PDF-Gestaltung der Verlaufsberichte

## Kernaussagen
- Im PDF-Verlaufsbericht soll ein Wertebereich nicht mitten am Seitenende beginnen, wenn er auf der aktuellen Seite nicht mehr sinnvoll Platz hat.
- Wenn ein kompletter Wertebereich wegen vieler Messpunkte insgesamt nicht auf eine Seite passt, braucht es trotzdem eine lesbare Fortsetzungslogik.
- Die untere Tabelle kann mit wachsender Anzahl an Werten sehr lang werden; dafür soll eine sinnvolle Strategie festgelegt werden.

## Implizite Anforderungen
- Seitenumbrüche sollen die fachliche Lesbarkeit vor reine Flächennutzung stellen.
- Ein neuer Wertebereich soll möglichst geschlossen starten.
- Lange Datentabellen dürfen mehrseitig weiterlaufen, sollen dabei aber nicht unstrukturiert wirken.
