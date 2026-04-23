# Projekt Agent Instructions

## Projektbezogene Wissensbasis

Für dieses Repository existiert eine projektbezogene KI-Wissensbasis im Ordner:

`KI-Wissen-Labordaten/`

Bei neuen Threads, neuen Aufgaben und Projektfragen ist diese Wissensbasis primär zu verwenden.

## Pflicht-Einstieg für neue Threads

Zu Beginn projektbezogener Arbeit zuerst diese Dateien lesen:

1. `KI-Wissen-Labordaten/00 Projektstart.md`
2. `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Index.md`
3. `KI-Wissen-Labordaten/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
4. `KI-Wissen-Labordaten/00 Steuerung/Regeldatei KI-Wissenspflege.md`

## Arbeitsmodus

- Arbeite `wiki-first`.
- Beantworte Projektfragen zuerst aus dem vorhandenen Wissensbestand.
- Ziehe Rohquellen, Repository-Dateien oder Webquellen nur dann nach, wenn die Wissensbasis Lücken hat, veraltet ist oder verifiziert werden muss.
- Wenn neue belastbare Erkenntnisse entstehen, die einen erkennbaren dauerhaften Wert haben, führe sie in die Wissensbasis zurück.
- Wenn du bei einer Änderung eine Regel oder Anforderung erkennst, prüfe, ob sie generisch für vergleichbare Funktionen oder Systeme ist oder nur den Einzelfall betrifft.
- Generische Regeln und wiederverwendbare Entwicklungsvorgaben sammle in `KI-Wissen-Labordaten/03 Betrieb/Generische Entwicklungsvorgaben.md`.
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

- Einstieg: `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Index.md`
- Workflow: `KI-Wissen-Labordaten/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
- Log: `KI-Wissen-Labordaten/03 Betrieb/Log.md`
- Qualitätsprüfung: `KI-Wissen-Labordaten/03 Betrieb/Qualitaetspruefung.md`

## Einordnung von Status und Log

- `KI-Wissen-Labordaten/02 Wissen/00 Uebersichten/Aktueller Projektstatus.md` ist eine verdichtete Zustandsübersicht und kein Änderungsprotokoll.
- Diese Seite soll den aktuellen Stand als Snapshot zeigen, zum Beispiel gegliedert in `Umgesetzt`, `Teilweise umgesetzt`, `Offen` und `Wichtige Grenzen`.
- Einzelne Schritte, Entscheidungen, Verifikationen und zeitliche Abfolgen gehören nicht als Erzählung in diese Statusseite, sondern in `KI-Wissen-Labordaten/03 Betrieb/Log.md`.
- `KI-Wissen-Labordaten/03 Betrieb/Log.md` bleibt chronologisch und append-only und beantwortet primär, was wann passiert ist.
- Wenn sich Statusseite und Log inhaltlich überschneiden, ist die Statusseite zu verdichten statt das Log auszudünnen.

## Finito-Sequenz

Wenn der Nutzer `Finito` schreibt, führt der Agent die Abschlusssequenz für den aktuellen Thread aus.

Dabei gilt:

1. Der Agent teilt die Änderungen in sinnvolle Commit-Blöcke auf. Nicht direkt zusammenhängende Änderungen sollen in getrennten Commits mit jeweils eigener passender Commit-Message landen.
2. Der Agent committet alle Teile, zu denen keine offenen Fragen mehr bestehen und die fachlich wie technisch konsistent abgeschlossen sind.
3. Nötige Anpassungen am KI-Wissen werden nach den sonstigen Wissensregeln nachgezogen, dokumentiert und ebenfalls committed.
4. Verbleibende offene Fragen, Konflikte oder bewusste Entscheidungsbedarfe werden danach kompakt benannt.

Zusätzlich gilt:

- Teile, die noch von offenen Fragen abhängen, sollen nicht vorschnell committed werden.
- Uncommittete Änderungen, die erkennbar nicht zu diesem Thread gehören, sind kein automatischer Blocker und können am Ende kurz als Hinweis genannt werden.
- Wenn nach der Finito-Sequenz keine relevanten offenen Punkte mehr für diesen Thread übrig sind, gilt der Thread als abgeschlossen und archivierungsreif.
