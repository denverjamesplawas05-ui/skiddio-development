@echo off
cd /d "%~dp0"
start "Skiddio server" /min node server.js
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000
