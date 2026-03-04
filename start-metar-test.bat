@echo off
chcp 65001 >nul
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   MIRA - METAR/TAF Тестовый сервер                        ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Проверка наличия Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js не найден!
    echo.
    echo Установите Node.js: https://nodejs.org/
    echo.
    echo Или используйте альтернативный способ:
    echo   npx http-server -p 8080 --cors
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js найден
echo.
echo 🚀 Запуск сервера...
echo.

REM Запуск сервера
node "%~dp0server.js"

pause
