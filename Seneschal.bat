@echo off
title Seneschal — PF2E GM Assistant
cd /d "%~dp0"

:: If already running, just open the browser
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel% == 0 (
    echo Seneschal is already running. Opening browser...
    start "" "http://localhost:5173"
    exit /b 0
)

echo Starting Seneschal PF2E GM Assistant...
echo.
echo Close this window to stop the server.
echo.

:: Open browser 3 seconds after server starts
start /b cmd /c "timeout /t 3 /nobreak >nul 2>&1 & start http://localhost:5173"

npm run dev
