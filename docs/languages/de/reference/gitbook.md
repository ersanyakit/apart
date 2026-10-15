# GitBook-Anbindung für die Dokumentationsverwaltung

Diese Seite ist für die Person, die den Leitfaden veröffentlicht. Die Empfangspersonen müssen diese Schritte nicht durchführen.

## Aufbewahrungsstruktur

- Die Repository-Wurzel `gitbook-docs.yaml` beschreibt die Website und übernimmt jede Sprache in ihr Dokumentationsverzeichnis. Sein Dateinamen beginnt nicht mit einem Punkt.
- Der türkische Inhalt bleibt in `docs/`. Übersetzte Ausgaben sind in `docs/languages/` in ihren Sprachcodes.
- Jedes Sprachverzeichnis hat seine eigene `.gitbook.yaml`, `README.md`, `SUMMARY.md` und `images/` Ordner.
- Die Namen der Themendateien sind in allen Ausgaben auf Englisch. Die Screenshots behalten die türkische Schnittstelle.

Die Konfiguration folgt der [offizielle Git-Sync-Dokumentation](https://gitbook.com/docs/docs-as-code/git-sync/content-configuration). Die Vorbereitung von Dateien verbindet oder veröffentlicht keine GitBook-Website.

## Verbinden Sie das Repository

1. Überprüfen Sie, ob alle Führungsdateien verpflichtet und an die GitHub-Niederlassung verschoben werden, die Sie verwenden möchten.
2. Öffnen Sie die Git Sync-Verbindung für die Dokumentationsseite in GitBook.
3. Wählen Sie das Repositorium und den Zweig. Verlassen Sie das Projektverzeichnis leer oder verwendet `./`. Die Konfiguration der Website befindet sich in der Wurzel des Repositoriums und zeichnet jede Sprache in ihren eigenen Ordner ab.
4. Für die erste Synchronisierung importieren Sie die vorhandenen GitHub-Inhalte in GitBook. Wenn Sie bereits Inhalte in GitBook haben, überprüfen Sie die gewählte Synchronisierungsrichtung.
5. Übersicht der Sprachveröffentlichungen, der Seitenordnung, Bilder und internen Links.
6. Stellen Sie die Veröffentlichungsadresse und die Zugriffs-Einstellungen in Ihrem Konto ein und veröffentlichen Sie dann, wenn Sie bereit sind.

## Fehlende Konfigurationsfehler

Wenn GitBook berichtet, dass `gitbook-docs.yaml` wenn es nicht auf dem Zweig existiert, prüfen Sie, ob die richtig benannte Datei an der Wurzel des ausgewählten Remote-Wechsels vorhanden ist. Eine lokale Akte allein reicht nicht aus. Keine von beiden . `.gitbook-docs.yaml` auch nicht `.gitbook.yaml` Ersetzt die Standortkonfiguration. Nachdem Sie die Datei gedrängt haben, versuchen Sie erneut mit demselben Zweig.

Setzen Sie das Projektverzeichnis nicht auf `docs` für diese Konfiguration. Jedes kartografierte Sprachverzeichnis verwendet `root: ./` in seiner `.gitbook.yaml` Die Akte. Behalten Sie die vorhandenen Spezialschlüssel nach der Synchronisierung stabil; verwenden Sie die Titelfelder zur Umbenennung.

## Übersetzungen beibehalten

Wenn sich eine Aktion oder ein Bildschirm ändert, aktualisieren Sie die entsprechende Seite in jeder Sprachversion. Listen Sie jede neue Seite einmal in dieser Ausgabe auf `SUMMARY.md`. Halten Sie Bilderverbindungen in Bezug auf die Karte und innerhalb des Sprachenorders, damit GitHub und GitBook sie lösen können.

Aktualisieren Sie Screenshots neben den Anweisungen. Behalten Sie README-Bearbeitungen im Repository, wenn Git Sync aktiviert ist. Nicht dokumentieren nicht verfügbare Funktionen oder nicht funktionierende Live-Demo-Adressen.
