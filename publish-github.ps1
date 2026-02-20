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

# Добавление всех файлов
Write-Host "`n📦 Добавление файлов..." -ForegroundColor Cyan
git add .

# Проверка изменений
$status = git status --porcelain
if (-not $status) {
    Write-Host "✓ Изменений нет" -ForegroundColor Yellow
} else {
    # Коммит
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $message = "Update: $timestamp"
    
    Write-Host "💾 Коммит: $message" -ForegroundColor Cyan
    git commit -m $message
}

# Проверка наличия удалённого репозитория
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "`n⚠ Удалённый репозиторий не настроен" -ForegroundColor Yellow
    Write-Host "Введите URL вашего репозитория GitHub:" -ForegroundColor Cyan
    Write-Host "Пример: https://github.com/username/mira-weather.git" -ForegroundColor Gray
    $repoUrl = Read-Host "URL репозитория"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✓ Удалённый репозиторий добавлен" -ForegroundColor Green
    }
}

# Push
Write-Host "`n🚀 Отправка на GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Успешно опубликовано на GitHub!" -ForegroundColor Green
    
    # Получение URL репозитория
    $repoUrl = git remote get-url origin
    $repoName = ($repoUrl -split '/')[-1] -replace '\.git$', ''
    $username = ($repoUrl -split '/')[-2]
    
    Write-Host "`n📬 Ваш репозиторий:" -ForegroundColor Cyan
    Write-Host "https://github.com/$username/$repoName" -ForegroundColor Blue
} else {
    Write-Host "`n❌ Ошибка при отправке" -ForegroundColor Red
    Write-Host "Возможные причины:" -ForegroundColor Yellow
    Write-Host "  • Не настроен SSH ключ или токен" -ForegroundColor Gray
    Write-Host "  • Нет доступа к репозиторию" -ForegroundColor Gray
    Write-Host "  • Конфликты слияния" -ForegroundColor Gray
}

Write-Host "`n=== Готово ===" -ForegroundColor Cyan
