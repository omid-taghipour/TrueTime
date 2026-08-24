<#
.SYNOPSIS
  Package the built Tauri app as an unsigned MSIX for Microsoft Store submission.

.DESCRIPTION
  Tauri does not emit MSIX, so this stages the release binary + Store logos with a
  generated AppxManifest.xml and packs it via the Windows SDK makeappx.exe.

  The output is UNSIGNED on purpose: upload it to Partner Center and the Store signs
  it during certification. (To test-install locally you must self-sign it first — see
  the README/notes; this script does not sign.)

  Identity values come from Partner Center > Product management > Product identity and
  must match exactly. Pass them as parameters or via env vars so they stay out of git.

.EXAMPLE
  $env:MSIX_IDENTITY_NAME = '12345YourName.TrueTime'
  $env:MSIX_PUBLISHER = 'CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX'
  $env:MSIX_PUBLISHER_DISPLAY_NAME = 'Your Name'
  ./scripts/build-msix.ps1 -Build
#>
[CmdletBinding()]
param(
  [string]$IdentityName = $env:MSIX_IDENTITY_NAME,
  [string]$Publisher = $env:MSIX_PUBLISHER,
  [string]$PublisherDisplayName = $env:MSIX_PUBLISHER_DISPLAY_NAME,
  [string]$OutFile,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent

foreach ($p in 'IdentityName', 'Publisher', 'PublisherDisplayName') {
  if ([string]::IsNullOrWhiteSpace((Get-Variable $p).Value)) {
    throw "Missing $p. Pass -$p or set MSIX_$(($p -creplace '([a-z])([A-Z])','$1_$2').ToUpper())."
  }
}
if ($Publisher -notmatch '^CN=') { throw "Publisher must be a distinguished name, e.g. 'CN=...'. Got: $Publisher" }

# Version: tauri.conf.json holds x.y.z; MSIX requires 4 parts with a 0 revision.
$conf = Get-Content (Join-Path $repoRoot 'src-tauri/tauri.conf.json') -Raw | ConvertFrom-Json
$parts = @($conf.version -split '\.') + @('0', '0', '0', '0')
$msixVersion = ($parts[0..3] -join '.') -replace '(\d+\.\d+\.\d+)\.\d+', '$1.0'

$exe = Join-Path $repoRoot 'src-tauri/target/release/truetime.exe'
if ($Build) {
  Push-Location (Join-Path $repoRoot 'src-tauri')
  try { npx --no-install tauri build } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "tauri build failed with exit code $LASTEXITCODE" }
}
if (-not (Test-Path $exe)) { throw "Release binary not found: $exe. Run with -Build, or 'npm install; npx tauri build' first." }

# ponytail: pick the newest SDK by name sort — fine for the 10.0.* dirs, revisit if a non-numeric kit appears.
$makeappx = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\makeappx.exe' -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending | Select-Object -First 1
if (-not $makeappx) { throw 'makeappx.exe not found. Install the Windows 10/11 SDK.' }

# Stage: exe + Assets + manifest in a clean scratch dir.
$stage = Join-Path $repoRoot 'src-tauri/target/msix-staging'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $stage 'Assets') -Force | Out-Null
Copy-Item $exe (Join-Path $stage 'truetime.exe')
Get-ChildItem (Join-Path $repoRoot 'src-tauri/icons') -Filter '*Logo.png' |
  Copy-Item -Destination (Join-Path $stage 'Assets')

$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">

  <Identity Name="$IdentityName" Publisher="$Publisher" Version="$msixVersion" ProcessorArchitecture="x64" />

  <Properties>
    <DisplayName>TrueTime</DisplayName>
    <PublisherDisplayName>$PublisherDisplayName</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>

  <Resources><Resource Language="en-us" /></Resources>

  <Applications>
    <Application Id="TrueTime" Executable="truetime.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="TrueTime"
        Description="A minimal cross-platform stopwatch app"
        BackgroundColor="transparent"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png" />
    </Application>
  </Applications>

  <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
"@
Set-Content -Path (Join-Path $stage 'AppxManifest.xml') -Value $manifest -Encoding UTF8

if (-not $OutFile) { $OutFile = Join-Path $repoRoot "TrueTime-$msixVersion.msix" }
if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
& $makeappx.FullName pack /d $stage /p $OutFile
if ($LASTEXITCODE -ne 0) { throw "makeappx failed with exit code $LASTEXITCODE" }

Write-Host ""
Write-Host "Built (unsigned): $OutFile" -ForegroundColor Green
Write-Host "Upload to Partner Center as-is; the Store signs it during certification."
