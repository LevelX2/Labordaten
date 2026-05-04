#ifndef AppVersion
#define AppVersion "0.2.0"
#endif

#ifndef SourceDir
#define SourceDir "..\..\build\release\Labordaten"
#endif

#ifndef OutputDir
#define OutputDir "..\..\build\release\installer"
#endif

[Setup]
AppId={{F6BC38D3-4182-4F7E-9F7B-0B6525D78B52}
AppName=Labordaten
AppVersion={#AppVersion}
AppPublisher=Labordaten
DefaultDirName={localappdata}\Programs\Labordaten
DefaultGroupName=Labordaten
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename=Labordaten-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\Labordaten.exe

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
Name: "desktopicon"; Description: "Desktop-Verknüpfung erstellen"; GroupDescription: "Zusätzliche Verknüpfungen:"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Labordaten"; Filename: "{app}\Labordaten.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Labordaten"; Filename: "{app}\Labordaten.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\Labordaten.exe"; Description: "Labordaten jetzt starten"; Flags: nowait postinstall skipifsilent
