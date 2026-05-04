param(
    [string]$Version,
    [switch]$BuildInstaller,
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "apps\backend"
$frontendDir = Join-Path $repoRoot "apps\frontend"
$frontendDist = Join-Path $frontendDir "dist"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$releaseRoot = Join-Path $repoRoot "build\release"
$appReleaseDir = Join-Path $releaseRoot "Labordaten"
$pyinstallerRoot = Join-Path $repoRoot "build\pyinstaller"
$pyinstallerDist = Join-Path $pyinstallerRoot "dist"
$pyinstallerWork = Join-Path $pyinstallerRoot "work"
$pyinstallerSpec = Join-Path $pyinstallerRoot "spec"
$installerOutputDir = Join-Path $releaseRoot "installer"
$iconPath = Join-Path $frontendDir "public\labordaten.ico"
$innoScript = Join-Path $repoRoot "packaging\inno\Labordaten.iss"

function Get-FrontendVersion {
    $packageJsonPath = Join-Path $frontendDir "package.json"
    $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
    return [string]$packageJson.version
}

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Reset-Directory {
    param([string]$Path)
    $resolvedRepo = (Resolve-Path -LiteralPath $repoRoot).Path
    if (Test-Path -LiteralPath $Path) {
        $resolvedTarget = (Resolve-Path -LiteralPath $Path).Path
        if (-not $resolvedTarget.StartsWith($resolvedRepo, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Der Zielordner liegt nicht im Repository: $resolvedTarget"
        }
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Path | Out-Null
}

function Resolve-InnoCompiler {
    $command = Get-Command ISCC.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    return $null
}

if (-not $Version) {
    $Version = Get-FrontendVersion
}

if (-not (Test-Path -LiteralPath $backendPython)) {
    throw "Backend-Python wurde nicht gefunden. Bitte zuerst apps/backend/.venv einrichten."
}

if (-not $SkipFrontendBuild) {
    Push-Location $frontendDir
    try {
        if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
            npm.cmd ci
        }
        npm.cmd run build
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $frontendDist "index.html"))) {
    throw "Frontend-Produktionsbuild nicht gefunden: $frontendDist"
}

Push-Location $backendDir
try {
    & $backendPython -m pip show pyinstaller | Out-Null
    if ($LASTEXITCODE -ne 0) {
        & $backendPython -m pip install "pyinstaller>=6,<7"
    }
} finally {
    Pop-Location
}

Reset-Directory -Path $pyinstallerRoot
Ensure-Directory -Path $pyinstallerDist
Ensure-Directory -Path $pyinstallerWork
Ensure-Directory -Path $pyinstallerSpec
Reset-Directory -Path $releaseRoot

$addDataSeparator = ";"
$pyinstallerArgs = @(
    "-m", "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onedir",
    "--name", "Labordaten",
    "--paths", (Join-Path $backendDir "src"),
    "--collect-submodules", "labordaten_backend",
    "--collect-data", "labordaten_backend",
    "--distpath", $pyinstallerDist,
    "--workpath", $pyinstallerWork,
    "--specpath", $pyinstallerSpec,
    "--add-data", "${frontendDist}${addDataSeparator}frontend",
    "--add-data", "$(Join-Path $backendDir 'migrations')${addDataSeparator}migrations",
    "--add-data", "$(Join-Path $backendDir 'alembic.ini')${addDataSeparator}.",
    "--add-data", "$(Join-Path $repoRoot 'Labordaten-Wissen')${addDataSeparator}Labordaten-Wissen"
)

if (Test-Path -LiteralPath $iconPath) {
    $pyinstallerArgs += @("--icon", $iconPath)
}

$pyinstallerArgs += Join-Path $backendDir "src\labordaten_backend\launcher.py"
& $backendPython @pyinstallerArgs

$builtAppDir = Join-Path $pyinstallerDist "Labordaten"
if (-not (Test-Path -LiteralPath (Join-Path $builtAppDir "Labordaten.exe"))) {
    throw "PyInstaller-Ausgabe wurde nicht gefunden: $builtAppDir"
}

Copy-Item -LiteralPath $builtAppDir -Destination $appReleaseDir -Recurse
Copy-Item -LiteralPath (Join-Path $repoRoot "README.md") -Destination (Join-Path $appReleaseDir "README.md")
Copy-Item -LiteralPath (Join-Path $repoRoot "LICENSE") -Destination (Join-Path $appReleaseDir "LICENSE")

$zipPath = Join-Path $releaseRoot "Labordaten-$Version-portable.zip"
Compress-Archive -Path (Join-Path $appReleaseDir "*") -DestinationPath $zipPath -Force

if ($BuildInstaller) {
    $iscc = Resolve-InnoCompiler
    if (-not $iscc) {
        Write-Warning "Inno Setup Compiler (ISCC.exe) wurde nicht gefunden. Portable ZIP wurde trotzdem gebaut."
    } elseif (-not (Test-Path -LiteralPath $innoScript)) {
        Write-Warning "Inno-Setup-Skript wurde nicht gefunden: $innoScript"
    } else {
        Ensure-Directory -Path $installerOutputDir
        & $iscc "/DAppVersion=$Version" "/DSourceDir=$appReleaseDir" "/DOutputDir=$installerOutputDir" $innoScript
    }
}

Write-Host "Release-Ausgabe: $appReleaseDir"
Write-Host "Portable ZIP:    $zipPath"
if ($BuildInstaller -and (Test-Path -LiteralPath (Join-Path $installerOutputDir "Labordaten-Setup-$Version.exe"))) {
    Write-Host "Installer-Ausgabe: $installerOutputDir"
}
