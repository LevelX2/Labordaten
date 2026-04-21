# Erkenntnisse für nächstes Projekt

## Stammdatenpflege
- Technische Schlüssel für neue Stammdatensätze sollten nach Möglichkeit automatisch aus fachlich sichtbaren Namen erzeugt werden, statt standardmäßig manuell eingegeben zu werden.
- Das reduziert Tippfehler, inkonsistente Benennungen und vermeidbare Dubletten.
- Bei Namensgleichheit sollte die technische Eindeutigkeit automatisch durch Suffixe oder eine vergleichbare Fortsetzungslogik gesichert werden.

## Start- und Übersichtsseiten
- Startseiten in arbeitsorientierten Fachsystemen sollten vor allem den nächsten sinnvollen Arbeitsschritt sichtbar machen und nicht primär die technische Implementierung erklären.
- Prominent geeignet sind Live-Informationen wie Datenbestand, offene Prüf- oder Importlagen, Betriebszustände und direkte Anschlussaktionen in die wichtigsten Arbeitsbereiche.
- Reine Stack- oder Scaffold-Angaben sind höchstens für Entwicklungs- oder Diagnosetexte sinnvoll, aber selten der wichtigste Inhalt einer produktiven Startseite.

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
