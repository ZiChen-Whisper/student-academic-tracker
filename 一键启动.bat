@echo off
chcp 65001 >nul
echo ============================================
echo   学业跟踪预警系统 - 一键启动脚本
echo ============================================
echo.

:: ============ 第一步：检查环境 ============

echo [1/5] 检查运行环境...

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请安装 Python 3.10+
    echo 下载地址: https://www.python.org/downloads/
    echo 安装时请勾选 "Add Python to PATH"
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 npm，请安装 Node.js 18+
    echo 下载地址: https://nodejs.org/ （选择 LTS 版本）
    pause
    exit /b 1
)

echo   ✓ Python 和 Node.js 已就绪

:: ============ 第二步：检查数据库连接配置 ============

echo.
echo [2/5] 检查数据库配置...

if not exist "%~dp0backend\.env" (
    echo [提示] 未找到 backend\.env 配置文件，正在从模板创建...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo.
    echo [重要] 请先编辑 backend\.env 文件，填写你的 MySQL 密码！
    echo.
    echo   需要修改的项：
    echo     DB_PASSWORD=你的MySQL密码
    echo.
    echo   如果你还没有导入数据库，请先运行 database\导入数据库.bat
    echo.
    pause
    exit /b 1
)

echo   ✓ 配置文件已就绪

:: ============ 第三步：安装依赖 ============

echo.
echo [3/5] 检查依赖安装...

:: 安装 Python 依赖
if not exist "%~dp0backend\__pycache__" (
    echo [信息] 安装 Python 依赖（首次运行）...
    pip install -r "%~dp0backend\requirements.txt" -i https://pypi.tuna.tsinghua.edu.cn/simple
    if %errorlevel% neq 0 (
        echo [错误] Python 依赖安装失败，尝试使用默认源...
        pip install -r "%~dp0backend\requirements.txt"
    )
) else (
    echo   ✓ Python 依赖已安装
)

:: 安装前端依赖
if not exist "%~dp0frontend\node_modules" (
    echo [信息] 安装前端依赖（首次运行）...
    pushd "%~dp0frontend"
    npm install
    popd
) else (
    echo   ✓ 前端依赖已安装
)

:: ============ 第四步：检查端口 ============

echo.
echo [4/5] 检查端口占用...

powershell -Command "try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5000); if ($c.Connected) { $c.Close(); exit 1 } } catch { exit 0 }" >nul 2>nul
if %errorlevel% equ 1 (
    echo [警告] 端口 5000 已被占用，后端可能已在运行中。
    echo   如果需要重启，请先关闭已有的后端进程。
    echo.
    choice /C YN /M "是否继续启动（可能启动失败）"
    if %errorlevel% equ 2 exit /b 0
) else (
    echo   ✓ 端口 5000 可用
)

:: ============ 第五步：启动服务 ============

echo.
echo [5/5] 启动服务...

echo [信息] 启动后端...
start "Backend - 学业跟踪预警系统" /d "%~dp0backend" cmd /k "chcp 65001 >nul && set PYTHONUNBUFFERED=1 && python -u app.py"

echo [信息] 等待后端就绪...
powershell -Command "for ($i=0; $i -lt 30; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5000); if ($c.Connected) { $c.Close(); exit 0 } } catch {} Start-Sleep 1 }; exit 1"
if %errorlevel% neq 0 (
    echo [警告] 后端可能未就绪，请检查后端窗口是否有报错。
    echo   常见原因：数据库未启动、密码错误、数据库未导入
) else (
    echo   ✓ 后端已就绪
)

echo [信息] 启动前端...
start "Frontend - 学业跟踪预警系统" /d "%~dp0frontend" cmd /k "npm run dev"

echo [信息] 等待前端就绪...
powershell -Command "for ($i=0; $i -lt 15; $i++) { try { $c = New-Object System.Net.Sockets.TcpClient('localhost', 5173); if ($c.Connected) { $c.Close(); exit 0 } } catch {} Start-Sleep 1 }; exit 1"

echo.
echo ============================================
echo   启动完成！
echo ============================================
echo.
echo   前端地址: http://localhost:5173
echo   后端地址: http://localhost:5000
echo.
echo   关闭此窗口不会停止服务
echo   如需停止，请关闭对应的 Backend/Frontend 窗口
echo.

echo [信息] 正在打开浏览器...
start "" "http://localhost:5173"
