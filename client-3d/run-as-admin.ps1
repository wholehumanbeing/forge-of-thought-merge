# Run as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script requires administrator privileges. Attempting to restart with admin rights..."
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "Running with administrator privileges..."
Write-Host "Stopping any Node.js processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Cleaning Vite cache..."
$tempDir = [System.IO.Path]::Combine($env:TEMP, "vite-client-3d-cache")
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Cleaning npm cache..."
npm cache clean --force

Write-Host "Starting Vite dev server..."
Set-Location -Path $PSScriptRoot
npm run dev

Write-Host "Press any key to exit..."
[void][System.Console]::ReadKey($true) 