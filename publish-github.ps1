# Скрипт автоматической публикации на GitHub
# Для Windows (PowerShell)

Write-Host "=== MIRA 0.2 | Публикация на GitHub ===" -ForegroundColor Cyan

# Проверка наличия Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git не найден. Установите Git: https://git-scm.com/" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Git найден" -ForegroundColor Green

# Переход в директорию проекта
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Проверка наличия .git
if (-not (Test-Path ".git")) {
    Write-Host "⚠ Репозиторий Git не инициализирован"
    Write-Host "Инициализация..." -ForegroundColor Yellow
    git init
    git branch -M main
    
    # Создание .gitignore
    @"
# Игнорируемые файлы
node_modules/
.DS_Store
Thumbs.db
*.log
.vscode/
.idea/

# Временные файлы
*.tmp
*.bak
`$RECYCLE.BIN/
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    
    Write-Host "✓ .gitignore создан" -ForegroundColor Green
}

# Проверка наличия удалённого репозитория
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "`n⚠ Удалённый репозиторий не настроен" -ForegroundColor Yellow
    Write-Host "Введите URL вашего репозитория GitHub:" -ForegroundColor Cyan
    Write-Host "Пример: https://github.com/kkav45/mira.git" -ForegroundColor Gray
    $repoUrl = Read-Host "URL репозитория"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✓ Удалённый репозиторий добавлен: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "❌ URL не введён. Завершение." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Удалённый репозиторий: $remote" -ForegroundColor Green
}

# Добавление всех файлов
Write-Host "`n📦 Добавление файлов..." -ForegroundColor Cyan
git add .

# Проверка изменений
$status = git status --porcelain
if (-not $status) {
    Write-Host "✓ Изменений нет (всё актуально)" -ForegroundColor Yellow
} else {
    # Коммит
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $message = "Auto-update: $timestamp"
    
    Write-Host "💾 Коммит: $message" -ForegroundColor Cyan
    git commit -m $message
    
    # Push
    Write-Host "`n🚀 Отправка на GitHub..." -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Успешно опубликовано на GitHub!" -ForegroundColor Green
        Write-Host "`n📬 Репозиторий:" -ForegroundColor Cyan
        Write-Host "$remote" -ForegroundColor Blue
    } else {
        Write-Host "`n❌ Ошибка при отправке" -ForegroundColor Red
        Write-Host "Проверьте токен доступа в Windows Credentials Manager" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Готово ===" -ForegroundColor Cyan
