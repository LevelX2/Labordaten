#ifndef AppVersion
#define AppVersion "0.7.0"
#endif

#ifndef SourceDir
#define SourceDir "..\..\build\release\Labordaten"
#endif

#ifndef OutputDir
#define OutputDir "..\..\build\release\installer"
#endif

#define AppIconFile "..\..\apps\frontend\public\labordaten.ico"
#define WizardImageFilePath "assets\wizard-image.bmp"
#define WizardSmallImageFilePath "assets\wizard-small.png"
#define InfoBeforeFilePath "assets\installationshinweise.txt"

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
SetupIconFile={#AppIconFile}
WizardImageFile={#WizardImageFilePath}
WizardSmallImageFile={#WizardSmallImageFilePath}
InfoBeforeFile={#InfoBeforeFilePath}
VersionInfoCompany=Labordaten
VersionInfoDescription=Labordaten Setup
VersionInfoProductName=Labordaten
VersionInfoProductVersion={#AppVersion}

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Messages]
WelcomeLabel1=Willkommen bei Labordaten
WelcomeLabel2=Labordaten installiert eine lokale Anwendung für Laborwerte. Die Oberfläche läuft im Browser, verbindet sich aber nur mit einem lokalen Server auf diesem Computer. Datenbank, Dokumente und Einstellungen bleiben lokal gespeichert.

[Tasks]
Name: "desktopicon"; Description: "Desktop-Verknüpfung erstellen"; GroupDescription: "Zusätzliche Verknüpfungen:"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Labordaten"; Filename: "{app}\Labordaten.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Labordaten"; Filename: "{app}\Labordaten.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\Labordaten.exe"; Description: "Labordaten jetzt starten"; Flags: nowait postinstall skipifsilent

[Code]
var
  StartdatenPage: TInputOptionWizardPage;
  ExistingDatabase: Boolean;
  DeleteUserDataOnUninstall: Boolean;

function LabordatenDataDir(): String;
begin
  Result := ExpandConstant('{localappdata}\Labordaten');
end;

function PendingOptionsFile(): String;
begin
  Result := LabordatenDataDir() + '\pending-install-options.json';
end;

function ExistingDatabaseFound(): Boolean;
begin
  Result := FileExists(LabordatenDataDir() + '\labordaten.db');
end;

procedure InitializeWizard;
begin
  ExistingDatabase := ExistingDatabaseFound();
  StartdatenPage := CreateInputOptionPage(
    wpSelectTasks,
    'Startdaten auswählen',
    'Welche Daten soll Labordaten beim ersten Start vorbereiten?',
    'Die eigentliche Datenanlage erfolgt beim ersten Start in der Anwendung. Bestehende Personen, Messwerte, Befunde und Dokumente werden dabei nicht überschrieben. ' +
    'Optionale Zielwertpakete kannst Du später auch in der Anwendung nachladen.',
    False,
    False
  );

  if ExistingDatabase then begin
    StartdatenPage.Add('Fehlendes Grunddatenpaket ergänzen (Laborparameter, Gruppen, Aliase und Umrechnungsregeln)');
  end else begin
    StartdatenPage.Add('Empfohlen: Grunddatenpaket laden (Laborparameter, Gruppen, Aliase und Umrechnungsregeln)');
  end;
  StartdatenPage.Add('Optional: KSG-Optimalbereiche aus Nährstoff- und Hormontherapie laden');
  StartdatenPage.Add('Optional: Präventionswerte Lithium laden');
  StartdatenPage.Add('Nach dem ersten Start kurze Import-Hilfe anzeigen');

  StartdatenPage.Values[0] := True;
  StartdatenPage.Values[1] := False;
  StartdatenPage.Values[2] := False;
  StartdatenPage.Values[3] := True;
end;

procedure AddPackageJson(var Packages: String; PackageKey: String);
begin
  if Packages <> '' then begin
    Packages := Packages + ',' + #13#10;
  end;
  Packages := Packages +
    '    {' + #13#10 +
    '      "paket_schluessel": "' + PackageKey + '",' + #13#10 +
    '      "fehlende_parameter_anlegen": true,' + #13#10 +
    '      "fehlende_einheiten_anlegen": true,' + #13#10 +
    '      "prueffaelle_anlegen": false' + #13#10 +
    '    }';
end;

function JsonBool(Value: Boolean): String;
begin
  if Value then begin
    Result := 'true';
  end else begin
    Result := 'false';
  end;
end;

function LabordatenProcessRunning(): Boolean;
var
  ResultCode: Integer;
begin
  Exec(
    ExpandConstant('{cmd}'),
    '/C tasklist /FI "IMAGENAME eq Labordaten.exe" | find /I "Labordaten.exe" >NUL',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  );
  Result := ResultCode = 0;
end;

function ConfirmLabordatenClosedForUninstall(): Boolean;
var
  Answer: Integer;
begin
  Result := True;
  while LabordatenProcessRunning() do begin
    Answer := MsgBox(
      'Labordaten läuft noch.' + #13#10 + #13#10 +
      'Solange die Anwendung geöffnet ist, können Programmdateien oder lokale Daten gesperrt sein. ' +
      'Bitte schließe Labordaten vollständig. Falls das Fenster nicht mehr sichtbar ist, prüfe den Task-Manager auf "Labordaten.exe".' + #13#10 + #13#10 +
      'Klicke danach auf "Wiederholen".',
      mbError,
      MB_RETRYCANCEL
    );

    if Answer <> IDRETRY then begin
      Result := False;
      Exit;
    end;
  end;
end;

procedure DeleteUserDataDirWithRetry(DataDir: String);
var
  Answer: Integer;
begin
  while DirExists(DataDir) do begin
    if DelTree(DataDir, True, True, True) and not DirExists(DataDir) then begin
      Exit;
    end;

    Answer := MsgBox(
      'Der lokale Labordaten-Datenordner konnte nicht vollständig gelöscht werden.' + #13#10 + #13#10 +
      'Datenordner:' + #13#10 +
      DataDir + #13#10 + #13#10 +
      'Wahrscheinlich ist noch eine Datei geöffnet oder ein Labordaten-Prozess läuft noch im Hintergrund. ' +
      'Bitte schließe Labordaten vollständig oder beende "Labordaten.exe" im Task-Manager und klicke danach auf "Wiederholen".' + #13#10 + #13#10 +
      'Wenn Du abbrichst, bleibt der Datenordner erhalten.',
      mbError,
      MB_RETRYCANCEL
    );

    if Answer <> IDRETRY then begin
      MsgBox(
        'Die Deinstallation wurde beendet, aber der lokale Datenordner wurde nicht vollständig gelöscht.' + #13#10 + #13#10 +
        'Du kannst ihn später manuell löschen:' + #13#10 +
        DataDir,
        mbInformation,
        MB_OK
      );
      Exit;
    end;
  end;
end;

procedure WritePendingInstallOptions;
var
  Packages: String;
  Json: String;
  InstallationType: String;
begin
  if not (StartdatenPage.Values[0] or StartdatenPage.Values[1] or StartdatenPage.Values[2] or StartdatenPage.Values[3]) then begin
    Exit;
  end;

  Packages := '';
  if StartdatenPage.Values[1] then begin
    AddPackageJson(Packages, 'orfanos_boeckel_ksg_2026');
  end;
  if StartdatenPage.Values[2] then begin
    AddPackageJson(Packages, 'lithium_praevention_biovis_2026');
  end;

  if ExistingDatabase then begin
    InstallationType := 'update';
  end else begin
    InstallationType := 'neuinstallation';
  end;

  ForceDirectories(LabordatenDataDir());
  Json :=
    '{' + #13#10 +
    '  "version": 1,' + #13#10 +
    '  "quelle": "installer",' + #13#10 +
    '  "installationstyp": "' + InstallationType + '",' + #13#10 +
    '  "standarddaten_laden": ' + JsonBool(StartdatenPage.Values[0]) + ',' + #13#10 +
    '  "standarddaten_aktualisieren": false,' + #13#10 +
    '  "naechste_schritte_anzeigen": ' + JsonBool(StartdatenPage.Values[3]) + ',' + #13#10 +
    '  "zielwertpakete": [' + #13#10 +
    Packages + #13#10 +
    '  ]' + #13#10 +
    '}';
  SaveStringToFile(PendingOptionsFile(), Json, False);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    WritePendingInstallOptions();
  end;
end;

function InitializeUninstall(): Boolean;
var
  Answer: Integer;
  DataDir: String;
begin
  Result := True;
  DeleteUserDataOnUninstall := False;

  if not ConfirmLabordatenClosedForUninstall() then begin
    Result := False;
    Exit;
  end;

  DataDir := LabordatenDataDir();

  if not DirExists(DataDir) then begin
    Exit;
  end;

  Answer := MsgBox(
    'Labordaten speichert Daten getrennt von den Programmdateien.' + #13#10 + #13#10 +
    'Datenordner:' + #13#10 +
    DataDir + #13#10 + #13#10 +
    'Dort können Datenbank, Dokumente, Einstellungen und Backups liegen.' + #13#10 + #13#10 +
    'Ja: Daten behalten (empfohlen für spätere Neuinstallation oder Updates)' + #13#10 +
    'Nein: lokalen Datenordner endgültig löschen' + #13#10 +
    'Abbrechen: Deinstallation abbrechen' + #13#10 + #13#10 +
    'Möchtest Du die lokalen Labordaten behalten?',
    mbConfirmation,
    MB_YESNOCANCEL or MB_DEFBUTTON1
  );

  if Answer = IDCANCEL then begin
    Result := False;
  end else begin
    DeleteUserDataOnUninstall := Answer = IDNO;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
begin
  if (CurUninstallStep = usPostUninstall) and DeleteUserDataOnUninstall then begin
    DataDir := LabordatenDataDir();
    if DirExists(DataDir) then begin
      DeleteUserDataDirWithRetry(DataDir);
    end;
  end;
end;
