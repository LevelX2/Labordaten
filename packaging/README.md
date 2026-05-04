# Packaging

Dieser Ordner enthält die ersten Release-Bausteine für eine lokale Windows-Auslieferung von Labordaten.

## Zielbild

- Das Frontend wird als Produktionsbuild erzeugt.
- Das Backend wird mit PyInstaller als lokale Anwendung gebündelt.
- Nutzerdaten liegen außerhalb des Installationsordners unter `%LOCALAPPDATA%\Labordaten`.
- Der Installer kopiert nur Programmdateien und legt Verknüpfungen an.
- Datenbank, Dokumente, Einstellungen und lokales Laborwissen bleiben bei Updates erhalten.
- Bei der Deinstallation fragt der Uninstaller, ob die lokalen Nutzdaten behalten oder bewusst gelöscht werden sollen.

## Release bauen

```pwsh
pwsh -File .\scripts\build-release.ps1
```

Mit Installer, falls Inno Setup installiert ist:

```pwsh
pwsh -File .\scripts\build-release.ps1 -BuildInstaller
```

Die portable Testausgabe entsteht unter `build/release/Labordaten`. Eine portable ZIP wird nur bei Bedarf mit `-BuildPortableZip` erzeugt.
