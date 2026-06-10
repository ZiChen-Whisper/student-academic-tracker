@echo off

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [INFO] Checking if port 5000 is already in use...
powershell -Command "try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5000); if ($c.Connected) { $c.Close(); exit 1 } } catch { exit 0 }" >nul 2>nul
if %errorlevel% equ 1 (
    echo [WARN] Port 5000 is already in use. A backend instance may already be running.
    echo [WARN] Please close the existing Backend window first, then re-run this script.
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting backend...
cd /d "%~dp0backend"
chcp 65001 >nul
set PYTHONUNBUFFERED=1
python -u app.py
