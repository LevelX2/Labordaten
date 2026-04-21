# Projekt Agent Instructions

## Projektbezogene Wissensbasis

Für dieses Repository existiert eine projektbezogene KI-Wissensbasis im Ordner:

`ai-project-memory/`

Bei neuen Threads, neuen Aufgaben und Projektfragen ist diese Wissensbasis primär zu verwenden.

## Pflicht-Einstieg für neue Threads

Zu Beginn projektbezogener Arbeit zuerst diese Dateien lesen:

1. `ai-project-memory/00 Projektstart.md`
2. `ai-project-memory/02 Wissen/00 Uebersichten/Index.md`
3. `ai-project-memory/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
4. `ai-project-memory/00 Steuerung/Regeldatei KI-Wissenspflege.md`

## Arbeitsmodus

- Arbeite `wiki-first`.
- Beantworte Projektfragen zuerst aus dem vorhandenen Wissensbestand.
- Ziehe Rohquellen, Repository-Dateien oder Webquellen nur dann nach, wenn die Wissensbasis Lücken hat, veraltet ist oder verifiziert werden muss.
- Wenn neue belastbare Erkenntnisse entstehen, die einen erkennbaren dauerhaften Wert haben, führe sie in die Wissensbasis zurück.
- Wenn du bei einer Änderung eine Anforderung erkennst, die grundsätzlich für vergleichbare Systeme oder Systembestandteile auch nützlich und sinnvoll wäre, sammele diese Anforderung in der Datei `ai-project-memory/03 Betrieb/erkenntnisse-fuer-naechstes-projekt.md`.

## Sprachregeln

- Sichtbare UI-Texte sollen echtes Deutsch mit Umlauten und `ß` verwenden.
- In Fließtexten, Beschreibungen und Überschriften der Wissensbasis sollen echte Umlaute verwendet werden:
  `ä` statt `ae`, `ö` statt `oe`, `ü` statt `ue`, `Ä` statt `Ae`, `Ö` statt `Oe`, `Ü` statt `Ue`, `ß` statt `ss`, sofern es sich um normales Deutsch handelt.
- Ausnahmen:
  Dateinamen, Pfade, Code-Symbole, IDs, technische Bezeichner, Markdown-Links auf bestehende Dateien und originale Quellzitate bleiben in ihrer technischen oder originalen Schreibweise.

## Wissenspflege bei neuen Quellen

Wenn neue Projektquellen hinzukommen:

1. als Rohquelle in die Wissensbasis aufnehmen
2. vollständig lesen oder vollständig auswerten
3. betroffene Wissensseiten aktualisieren oder neu anlegen
4. Index aktualisieren
5. Log aktualisieren

## Freigabe vor Wissenspflege

Bevor du Änderungen an Wissensseiten der Wissensbasis vornimmst, außer an `ai-project-memory/03 Betrieb/Log.md` und `ai-project-memory/02 Wissen/00 Uebersichten/Index.md`, stelle im Chat kurz voran:

1. welche Erkenntnis du aufnehmen oder ändern willst
2. warum diese Erkenntnis aus deiner Sicht dauerhaft nützlich oder wiederverwendbar ist
3. welche Wissensseite betroffen wäre oder neu angelegt werden soll

Die Punkte 2 und 3 dürfen nicht nur stichwortartig beantwortet werden. Sie sind jeweils kurz, aber konkret zu begründen, damit der Nutzer die Einschätzung prüfen und bei Bedarf ablehnen oder diese Regel anpassen kann.

Für diese Vorab-Ankündigung verwende im Chat dieses sichtbare Format:

1. `Erkenntnis`
2. `Dauerhafter Nutzen`
3. `Vorgeschlagene Wissensseite`
4. `Warum diese Seite`
5. `Abgrenzung zu Alternativen`
6. `Bitte um Freigabe`

Dabei gilt:

- Unter `Dauerhafter Nutzen` erkläre konkret, warum die Erkenntnis nicht nur für den Einzelfall gilt, sondern auch später wiederverwendbar oder entscheidungsrelevant sein könnte.
- Unter `Warum diese Seite` erkläre, warum genau diese Wissensseite fachlich oder strukturell der richtige Ort ist.
- Unter `Abgrenzung zu Alternativen` nenne kurz mögliche andere Zielseiten oder nur den Log-Eintrag und warum diese aus deiner Sicht weniger passend sind, falls die Zuordnung nicht offensichtlich ist.
- Die Begründungen müssen so klar sein, dass der Nutzer nicht nur über den Inhalt, sondern auch über deine Begründung und Einordnung bewusst entscheiden kann.

Warte danach auf Zustimmung des Nutzers, bevor du diese Wissensseiten änderst.

Ausnahmen:

- Wenn der Nutzer die Wissenspflege für diesen konkreten Punkt ausdrücklich verlangt hat.
- Wenn es sich nur um rein mechanische Folgepflege bereits bestätigter Wissensänderungen handelt.

## Wichtige Betriebsregeln

- Rohquellen bleiben unverändert.
- Widersprüche zwischen neuen Quellen und bestehendem Wissen sichtbar machen, nicht stillschweigend überschreiben.
- Zwischen dokumentiertem Projektstand und aktuellem Workspace-Stand unterscheiden, wenn offene lokale Änderungen vorliegen.
- Wiederverwendbare Antworten, Entscheidungen, Analysen oder Risikoerklärungen nicht nur im Chat belassen, sondern als Wissensseiten oder Aktualisierungen zurückführen.

## Wichtige Wissensbasis-Dateien

- Einstieg: `ai-project-memory/02 Wissen/00 Uebersichten/Index.md`
- Workflow: `ai-project-memory/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
- Log: `ai-project-memory/03 Betrieb/Log.md`
- Qualitätsprüfung: `ai-project-memory/03 Betrieb/Qualitaetspruefung.md`
