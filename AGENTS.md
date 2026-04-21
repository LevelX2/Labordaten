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
- Wenn du bei einer Änderung eine Regel oder Anforderung erkennst, prüfe, ob sie generisch für vergleichbare Funktionen oder Systeme ist oder nur den Einzelfall betrifft.
- Generische Regeln und wiederverwendbare Entwicklungsvorgaben sammle in `ai-project-memory/03 Betrieb/Generische Entwicklungsvorgaben.md`.
- Spezifische Erkenntnisse für nur einen Fachfall, eine Seite oder einen einzelnen Ablauf gehören stattdessen in die fachlich passende Wissensseite und nicht in die generischen Entwicklungsvorgaben.

## Sprachregeln

- Sichtbare UI-Texte sollen echtes Deutsch mit Umlauten und `ß` verwenden.
- Der Benutzer soll im Chat und in direkt formulierten Anwendungstexten grundsätzlich mit `Du` angesprochen werden, sofern kein abweichender Wunsch geäußert wurde.
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

Vor Änderungen an Wissensseiten der Wissensbasis soll die Einordnung im Chat kurz transparent gemacht werden, außer bei rein mechanischer Folgepflege oder klar naheliegenden Aktualisierungen an bereits etablierten Zielseiten.

Bei klaren, gut zuordenbaren Fällen darf die Wissenspflege direkt erfolgen. Dabei soll trotzdem kurz sichtbar werden:

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

Eine ausdrückliche Zustimmung vor der Änderung ist besonders dann wichtig, wenn:

- die Zuordnung zur Zielseite nicht offensichtlich ist
- neue Seiten angelegt werden sollen, deren Nutzen oder Abgrenzung nicht klar ist
- die Erkenntnis weitreichende fachliche oder strukturelle Folgen haben kann
- Unsicherheit besteht, ob etwas generisch oder projektspezifisch dokumentiert werden sollte

Wenn die Einordnung dagegen klar ist und der Nutzer nicht widersprochen hat, kann die Wissenspflege direkt durchgeführt werden.

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

## Abschluss-Kommandos

Wenn der Nutzer sinngemäß `Abschluss`, `abschließen`, `Thread abschließen`, `Dialog beenden` oder `Thread beenden` schreibt, löst das eine Abschlussprüfung aus.

Dabei gilt:

1. Prüfen, ob noch fachliche, technische oder organisatorische Punkte offen sind, die geklärt werden sollten.
2. Prüfen, ob neue belastbare Erkenntnisse noch in die Wissensbasis zurückgeführt werden sollten.
3. Falls noch offene Klärpunkte oder sinnvolle Wissenspflege bestehen, diese dem Nutzer kompakt und konkret als Vorschlag nennen.
4. Danach aktiv fragen, ob der aktuelle Stand committed werden soll, sofern für diesen Stand noch kein Commit erfolgt ist.

Wenn der Nutzer sinngemäß `Abschluss mit Commit` schreibt, gilt zusätzlich:

1. Dieselbe Abschlussprüfung wird durchgeführt.
2. Offene letzte Punkte sollen nach Möglichkeit direkt abgearbeitet werden, sofern sie im aktuellen Rahmen sinnvoll lösbar sind.
3. Danach soll automatisch ein Commit erstellt werden, sobald der Stand konsistent ist und keine ungeklärten Rückfragen mehr offen sind.
4. Wenn im Verlauf des Dialogs mehrere klar trennbare Funktionalitäten umgesetzt wurden, sollen Commits nach Möglichkeit sinnvoll aufgeteilt werden, statt alles in einen Sammel-Commit zu legen.

Wenn nach der Abschlussprüfung noch relevante Unsicherheiten, Konflikte oder bewusste Entscheidungsfragen offen sind, soll der Agent nicht blind committen, sondern diese kurz benennen und auf den ausstehenden Klärbedarf hinweisen.
