@echo off
rem Double-click to open the MOBCO website on this PC (fully interactive, runs locally - nothing is uploaded).
rem Starts a tiny local web server in this folder and opens it in your default browser. Close this window to stop.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
pause
