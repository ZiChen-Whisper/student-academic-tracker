@echo off

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found. Please install Node.js 18+
    pause
    exit /b 1
)

if not exist "%~dp0frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    pushd "%~dp0frontend"
    npm install
    popd
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
start "Backend" /d "%~dp0backend" cmd /k "chcp 65001 >nul && set PYTHONUNBUFFERED=1 && python -u app.py"

echo [INFO] Waiting for backend to be ready...
powershell -Command "for ($i=0; $i -lt 30; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5000); if ($c.Connected) { $c.Close(); exit 0 } } catch {} Start-Sleep 1 }; exit 1"
if %errorlevel% neq 0 (
    echo [WARN] Backend may not be ready. Check the Backend window for errors.
)

echo [INFO] Starting frontend...
start "Frontend" /d "%~dp0frontend" cmd /k "npm run dev"

echo [INFO] Waiting for frontend to be ready...
powershell -Command "for ($i=0; $i -lt 15; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5173); if ($c.Connected) { $c.Close(); exit 0 } } catch {} Start-Sleep 1 }; exit 1"

echo [INFO] Opening browser...
start "" "http://localhost:5173"
