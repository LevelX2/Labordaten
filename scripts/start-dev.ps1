param(
    [switch]$RunMigrations,
    [switch]$OpenFrontend,
    [int]$InitialDelaySeconds = 2,
    [int]$FrontendTimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "apps\backend"
$frontendDir = Join-Path $repoRoot "apps\frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"

function Resolve-PreferredPowerShell {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pwsh) {
        return @{
            Path = $pwsh.Source
            DisplayName = "PowerShell 7"
        }
    }

    $windowsPowerShell = Get-Command powershell.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($windowsPowerShell) {
        Write-Warning "PowerShell 7 wurde nicht gefunden. Es wird auf Windows PowerShell 5.1 zurückgefallen."
        return @{
            Path = $windowsPowerShell.Source
            DisplayName = "Windows PowerShell 5.1"
        }
    }

    throw "Es wurde weder pwsh noch powershell.exe gefunden."
}

if (-not (Test-Path -LiteralPath $backendDir)) {
    throw "Backend-Ordner nicht gefunden: $backendDir"
}

if (-not (Test-Path -LiteralPath $frontendDir)) {
    throw "Frontend-Ordner nicht gefunden: $frontendDir"
}

if (-not (Test-Path -LiteralPath $backendPython)) {
    throw "Python aus der virtuellen Umgebung nicht gefunden. Bitte zuerst das Backend einmalig einrichten."
}

$nodeModulesDir = Join-Path $frontendDir "node_modules"
if (-not (Test-Path -LiteralPath $nodeModulesDir)) {
    Write-Warning "Im Frontend wurde noch kein node_modules-Ordner gefunden. Falls der Start fehlschlägt, bitte zuerst in apps/frontend einmal npm install ausführen."
}

$backendParts = @(
    "Set-Location -LiteralPath '$backendDir'"
)

if ($RunMigrations) {
    $backendParts += "& '$backendPython' -m alembic upgrade head"
}

$backendParts += "& '$backendPython' -m uvicorn labordaten_backend.main:app --reload --app-dir src"
$backendCommand = $backendParts -join "; "

$frontendCommand = "Set-Location -LiteralPath '$frontendDir'; npm.cmd run dev"
$frontendUrl = "http://localhost:5173"
$powerShell = Resolve-PreferredPowerShell

Start-Process -FilePath $powerShell.Path -ArgumentList @(
    "-NoLogo",
    "-NoProfile",
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $backendCommand
)

Start-Process -FilePath $powerShell.Path -ArgumentList @(
    "-NoLogo",
    "-NoProfile",
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $frontendCommand
)

Write-Host "Backend und Frontend wurden in zwei neuen $($powerShell.DisplayName)-Fenstern gestartet."
if ($RunMigrations) {
    Write-Host "Vor dem Backend-Start werden zusätzlich Alembic-Migrationen ausgeführt."
}
Write-Host "Frontend: $frontendUrl"
Write-Host "Backend:  http://127.0.0.1:8000"

if ($OpenFrontend) {
    if ($InitialDelaySeconds -gt 0) {
        Start-Sleep -Seconds $InitialDelaySeconds
    }

    $deadline = (Get-Date).AddSeconds($FrontendTimeoutSeconds)
    $frontendReady = $false

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -Method Get -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                $frontendReady = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds 700
            continue
        }
    }

    Start-Process $frontendUrl

    if ($frontendReady) {
        Write-Host "Das Frontend wurde im Browser geöffnet."
    } else {
        Write-Warning "Das Frontend wurde im Browser geöffnet, bevor eine Antwort bestätigt werden konnte."
    }
}
