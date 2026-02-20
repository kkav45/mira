@echo off
chcp 65001 >nul
echo === MIRA 0.2 | Публикация на GitHub ===
echo.

REM Проверка наличия Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git не найден. Установите Git: https://git-scm.com/
    pause
    exit /b 1
)
echo ✓ Git найден
echo.

REM Переход в директорию проекта
cd /d "%~dp0"

REM Проверка наличия .git
if not exist ".git" (
    echo ⚠ Репозиторий Git не инициализирован
    echo Инициализация...
    git init
    git branch -M main
    
    REM Создание .gitignore
    (
        echo # Игнорируемые файлы
        echo node_modules/
        echo .DS_Store
        echo Thumbs.db
        echo *.log
        echo .vscode/
        echo .idea/
        echo.
        echo # Временные файлы
        echo *.tmp
        echo *.bak
    ) > .gitignore
    
    echo ✓ .gitignore создан
    echo.
)

REM Добавление всех файлов
echo 📦 Добавление файлов...
git add .

REM Проверка изменений
git status --porcelain | findstr . >nul 2>nul
if %errorlevel% neq 0 (
    echo ✓ Изменений нет
) else (
    REM Коммит
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime ^( ^)') do set "dt=%%a"
    set "YYYY=%dt:~0,4%"
    set "MM=%dt:~4,2%"
    set "DD=%dt:~6,2%"
    set "HH=%dt:~8,2%"
    set "Min=%dt:~10,2%"
    set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%"
    
    echo 💾 Коммит: %timestamp%
    git commit -m "Update: %timestamp%"
)

REM Проверка наличия удалённого репозитория
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ⚠ Удалённый репозиторий не настроен
    echo Введите URL вашего репозитория GitHub:
    echo Пример: https://github.com/username/mira-weather.git
    echo.
    set /p repoUrl="URL репозитория: "
    
    if not "!repoUrl!"=="" (
        git remote add origin !repoUrl!
        echo ✓ Удалённый репозиторий добавлен
    )
)

REM Push
echo.
echo 🚀 Отправка на GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ Успешно опубликовано на GitHub!
    
    for /f "delims=" %%i in ('git remote get-url origin') do set repoUrl=%%i
    
    echo.
    echo 📬 Ваш репозиторий:
    echo !repoUrl!
) else (
    echo.
    echo ❌ Ошибка при отправке
    echo Возможные причины:
    echo   • Не настроен SSH ключ или токен
    echo   • Нет доступа к репозиторию
    echo   • Конфликты слияния
)

echo.
echo === Готово ===
pause
