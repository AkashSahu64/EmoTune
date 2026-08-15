# One-time fix: enable Docker Desktop's WSL2 backend on this machine.
# Run via:  npm run fix:wsl  (it will self-elevate -> click "Yes" on the UAC prompt)

$ErrorActionPreference = 'Continue'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host 'Requesting administrator privileges (UAC split-second)...'
    Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
    exit 0
}

Write-Host '=== Emotune Docker/WSL2 fix ===' -ForegroundColor Cyan

Write-Host '[1/4] Enabling Windows Subsystem for Linux feature...'
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Host

Write-Host '[2/4] Enabling Virtual Machine Platform feature (needed for WSL2)...'
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Host

Write-Host '[3/4] Setting WSL2 as default...'
wsl.exe --set-default-version 2 2>&1 | Out-Host

Write-Host '[4/4] Installing Ubuntu distribution (first-time download may take a few minutes)...'
wsl.exe --install -d Ubuntu 2>&1 | Out-Host

Write-Host ''
Write-Host '=== BOOTCAMP ===' -ForegroundColor Yellow
Write-Host 'WSL2 setup done as far as it can go from here.'
Write-Host '1. REBOOT the PC (required once for the new features to activate).'
Write-Host '2. After reboot, open a normal terminal in the project and run:  npm run deps'
Write-Host '   - It will start Docker Desktop and bring up the Redis container automatically.'
Write-Host '3. (Optional first time) When Ubuntu finishes installing it asks for a UNIX username'
Write-Host '   and password - create any (e.g. user/pass). Docker only needs the distro to exist.'
Write-Host ''
Write-Host 'If wsl --install printed "already installed", continue the reboot step anyway.'
Read-Host -Prompt 'Press Enter to close this window'