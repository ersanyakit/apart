# Unterkünfte, Etagen, Zimmer und Apartments

Open Hotel Branch Profil und Fußboden- und Zimmerdefinitionen.

![Hotelzweig- und Einheitsdefinitionen](../images/property.png)

## Planen Sie die Struktur

Die Hierarchie ist Hotel → Hotelzweig / Zweig → Etagen und Einheiten. Eine Einheit kann eine Wohnung, ein Zimmer, ein Schlafzimmer oder ein Bett sein. Zimmer können zu einer Wohnung gehören, und Betten können zu einem Zimmer gehören. Die physische Etage und die Mutter-Einheit sind getrennte Beziehungen; Zimmer in einer mehrstöckigen Wohnung können auf verschiedenen Etagen liegen.

## Erstellen von Etagen und Einheiten

1. Wählen Sie den Hotelbereich aus und öffnen Sie die Definition von Boden und Raum.
2. Setzen Sie den Bodencode, zeigen Sie den Namen und die Reihenfolge. Verwenden Sie keinen Fußbodencode innerhalb derselben Hotelbranche.
3. Wählen Sie im Einheitsformular den Typ der Wohnung, des Zimmers oder des Schlafzimmers aus und geben Sie seinen Code ein.
4. Zuordnen Sie den entsprechenden Boden und gegebenenfalls eine Mutterstelle.
5. Füllen Sie die Auswahl des Mietmodus im Zimmerformular aus.
6. Fügen Sie tatsächliche Bettmöbel, Annehmlichkeiten und Bestandsinformationen hinzu.
7. Speichern und überprüfen Sie die Einheit in der Definitionsliste und die entsprechende Betriebsansicht.

## Mieten Sie ein Zimmer oder Einzelbetten?

| Auswahl | Ergebnis |
| --- | --- |
| Ganzzimmer | Das Zimmer ist die Reservierungseinheit; seine tatsächlichen Bettmöbel beschreiben das Zimmerlayout. |
| Einzelbetten | Verknüpfte Betten sind separat angeboten. |

Der Mietmodus des Zimmers gilt auch für später hinzugefügte Betten. Änderungen, die sich auf bestehende Reservierungen auswirken, können blockiert werden.

## Bearbeiten oder löschen Sie eine Definition

Bearbeiten Sie die Aufzeichnung, um die Aufgabe des Bodens und des Elternteils zu überprüfen. Sollte sich eine Strukturänderung auf bestätigte oder aktive Reservierungen auswirken, sollten sie zuerst angemessen verlegt werden oder die Stornierung für Reservierungsvorgänge, die nicht angemeldet wurden, in Betracht gezogen werden. Folgen Sie der Validierung der Anmeldung und nicht umgehen.

Für Massenaktionen überprüfen Sie jeden ausgewählten Einheitscode. Überprüfen Sie Filter und ausgewählte Zeilen, bevor Sie Änderungen an mehreren Einheiten anwenden.

Weiter mit [Betten und Schlafbett](beds.md) und [Annehmlichkeiten und Inventar](amenities.md).
