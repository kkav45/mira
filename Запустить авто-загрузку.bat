@echo off
chcp 65001 >nul
title MIRA 0.2 | Авто-загрузка на GitHub

echo ============================================
echo   MIRA 0.2 | Авто-загрузка на GitHub
echo ============================================
echo.
echo Запуск мониторинга файлов...
echo.
echo Для остановки закройте это окно (Ctrl+C или крестик)
echo.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "auto-git-watch.ps1"

pause
