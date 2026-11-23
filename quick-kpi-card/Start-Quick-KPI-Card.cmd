@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Quick-KPI-Card.ps1"
if errorlevel 1 (
    echo.
    pause
)
