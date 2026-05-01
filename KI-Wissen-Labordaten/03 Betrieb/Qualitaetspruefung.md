# Qualitätsprüfung

## Zweck
Diese Seite sammelt Health-Checks, Lint-Hinweise und offene Strukturprobleme der Wissensbasis.

## Aktueller Stand
- Stand 2026-05-01: Integritätsprüfung des Projekts durchgeführt.
- Git-Arbeitsbaum war sauber auf dem Arbeitsbranch `codex/ab-2026-05-01`.
- `git diff --check` lief ohne Befund.
- `git fsck --no-progress` meldete nur dangling blobs und trees, aber keine blockierenden Repositoryfehler.
- Backend-Tests liefen erfolgreich: 125 Tests bestanden.
- Frontend-Tests liefen erfolgreich: 24 Tests bestanden.
- Frontend-Produktionsbuild lief erfolgreich.
- Die aktive SQLite-Datenbank `apps/backend/labordaten.db` bestand `pragma integrity_check` mit `ok`; `pragma foreign_key_check` meldete 0 Befunde.
- Die Backend-Defaults passen zum dokumentierten lokalen Betriebsmodell: `sqlite:///./labordaten.db`, `./documents`, `./labordaten.runtime.json` und `../../Labordaten-Wissen`.
- Wertvolle lokale Daten sind nicht versioniert und werden durch die Backup-Strategie erfasst. Der letzte geprüfte Snapshot `labordaten-20260501-201402.zip` im OneDrive-Backupziel enthielt Datenbank, Dokumentablage, `AGENTS.local.md` und externe Rohquellen.
- Ein schneller Secret-Scan fand keine konkreten offengelegten Geheimnisse; Treffer betrafen dokumentierte Begriffe oder Codebezeichner wie `API-Key-Nutzung`, `token` oder `secret`.

## Offene Prüfhinweise

- Die lokalen Kurzzeitsicherungen `apps/backend/labordaten.pre-*.db` wurden bewusst nicht manuell aufgeräumt. Es soll beobachtet werden, ob die erste geplante Sicherung die dokumentierte Rotation korrekt ausführt.
- Der projektspezifische Skill `labordaten-import-vorbereitung` ist lokal installiert; die führende Quelle wurde nach `mein-wissen/07 Codex/skills/labordaten-import-vorbereitung/` übernommen. Bei künftigen Änderungen sollen führende Quelle und lokale Installation synchron gehalten werden.
