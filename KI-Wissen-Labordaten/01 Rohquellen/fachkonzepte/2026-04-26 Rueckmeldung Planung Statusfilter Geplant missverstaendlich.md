---
typ: rohquelle
datum: 2026-04-26
quelle: nutzerfeedback
status: ausgewertet
tags:
  - planung
  - ui
  - status
---

# Rückmeldung Planung Statusfilter Geplant missverständlich

## Ausgangshinweis
Im Statusfilter der vorhandenen Planungen ist die Bezeichnung `Geplant` missverständlich, weil sowohl zyklische als auch einmalige Planungen geplant sein können. Der Begriff erklärt nicht klar, dass es sich bei zyklischen Planungen um einen Fälligkeitszustand handelt.

## Abgeleitete Anforderung
- Der kombinierte Filter für vorhandene Planungen soll sichtbar machen, dass er bei zyklischen Einträgen Fälligkeiten und bei Einmalvormerkungen Statuswerte filtert.
- Der berechnete zyklische Fälligkeitsstatus `geplant` soll in der Oberfläche nicht als `Geplant`, sondern als `Noch nicht fällig` erscheinen.
