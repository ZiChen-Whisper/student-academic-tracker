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

echo [INFO] Starting backend...
start "Backend" cmd /k "cd /d %~dp0backend && python app.py"

echo [INFO] Waiting for backend to be ready...
powershell -Command "for ($i=0; $i -lt 30; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5000); if ($c.Connected) { $c.Close(); exit 0 } } catch {} Start-Sleep 1 }; exit 1"
if %errorlevel% neq 0 (
    echo [WARN] Backend may not be ready. Check the Backend window for errors.
)

echo [INFO] Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [INFO] Waiting for frontend to be ready...
powershell -Command "for ($i=0; $i -lt 15; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5173); if ($c.Connected) { $c.Close(); exit 0 } } catch {} Start-Sleep 1 }; exit 1"

echo [INFO] Opening browser...
start "" "http://localhost:5173"
