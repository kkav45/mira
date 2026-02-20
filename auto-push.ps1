# Скрипт автоматической загрузки при изменении файлов
# Запускается через Планировщик заданий Windows

$projectRoot = "d:\! Погода\MIRA 0.2 (небосвод)"
$lastCommitFile = Join-Path $projectRoot ".last-commit"
$autoPushLog = Join-Path $projectRoot ".auto-push.log"

function Write-Log {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Add-Content -Path $autoPushLog -Value $logMessage
}

Set-Location $projectRoot

Write-Log "=== Проверка изменений ==="

# Проверка наличия изменений
$status = git status --porcelain

if (-not $status) {
    Write-Log "Изменений нет"
    exit 0
}

Write-Log "Обнаружены изменения"

# Добавление файлов
git add .

# Коммит
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$message = "Auto-save: $timestamp"

git commit -m $message
if ($LASTEXITCODE -eq 0) {
    Write-Log "✓ Коммит создан: $message"
    
    # Push
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Log "✅ Успешно отправлено на GitHub"
    } else {
        Write-Log "❌ Ошибка при push"
    }
} else {
    Write-Log "❌ Ошибка при коммите"
}

Write-Log "=== Завершено ==="
