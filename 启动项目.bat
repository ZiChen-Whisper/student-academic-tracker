@echo off
chcp 65001 >nul

where npm >nul 2>nul
if %errorlevel% neq 0 (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)

start "Backend-Flask" cmd /k "cd /d %~dp0backend && python app.py"

start "Frontend-Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

ping 127.0.0.1 -n 6 >nul

start "" "http://localhost:5173"
