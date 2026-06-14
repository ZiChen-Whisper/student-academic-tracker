@echo off
chcp 65001 >nul
echo ============================================
echo   学业跟踪预警系统 - 数据库一键导入脚本
echo ============================================
echo.

:: 检查 mysql 命令是否可用
where mysql >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 mysql 命令，请确认 MySQL 已安装并添加到系统 PATH。
    echo.
    echo 常见解决方法：
    echo   1. 将 MySQL 的 bin 目录添加到系统环境变量 PATH
    echo      例如：C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo   2. 或者用完整路径运行本脚本
    echo.
    pause
    exit /b 1
)

:: 检查 SQL 文件是否存在
if not exist "%~dp0student_academic_tracker.sql" (
    echo [错误] 未找到数据库文件 student_academic_tracker.sql
    echo 请确认该文件与本脚本在同一目录下。
    echo.
    pause
    exit /b 1
)

echo [提示] 即将导入数据库 student_academic_tracker
echo [提示] 如果数据库已存在，旧数据将被覆盖！
echo.

:: 询问用户 MySQL 连接信息
set /p DB_USER="请输入 MySQL 用户名（默认 root）: "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS="请输入 MySQL 密码: "
if "%DB_PASS%"=="" (
    echo [警告] 密码为空，如果您的 MySQL 设置了密码，请重新运行并输入密码
)

echo.
echo [信息] 正在导入数据库，请稍候...
echo.

:: 执行导入
mysql -u %DB_USER% -p%DB_PASS% --default-character-set=utf8mb4 < "%~dp0student_academic_tracker.sql"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 数据库导入失败！请检查：
    echo   1. MySQL 服务是否正在运行
    echo   2. 用户名和密码是否正确
    echo   3. 是否有创建数据库的权限
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   数据库导入成功！
echo ============================================
echo.
echo 数据库名称: student_academic_tracker
echo.

:: 验证导入结果
echo [信息] 验证导入结果...
mysql -u %DB_USER% -p%DB_PASS% --default-character-set=utf8mb4 -e "USE student_academic_tracker; SELECT CONCAT('  学生表: ', COUNT(*), ' 条记录') FROM student UNION ALL SELECT CONCAT('  成绩表: ', COUNT(*), ' 条记录') FROM exam_score UNION ALL SELECT CONCAT('  风险预警表: ', COUNT(*), ' 条记录') FROM risk_alert;"

echo.
pause
