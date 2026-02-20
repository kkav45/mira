# Скрипт настройки автоматической загрузки через Планировщик заданий
# Запускается от имени администратора

$projectRoot = "d:\! Погода\MIRA 0.2 (небосвод)"
$scriptPath = Join-Path $projectRoot "auto-push.ps1"
$taskName = "MIRA Auto-Push"

Write-Host "=== Настройка автоматической загрузки MIRA 0.2 ===" -ForegroundColor Cyan
Write-Host ""

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Требуются права администратора" -ForegroundColor Red
    Write-Host "Запустите скрипт от имени администратора" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Права администратора подтверждены" -ForegroundColor Green

# Удаление старой задачи (если есть)
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "⚠ Старая задача найдена, удаляю..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Создание триггера (каждые 5 минут)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)

# Создание действия
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $projectRoot

# Создание настроек
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -WakeToRun

# Создание задачи
Write-Host "`n📅 Создание задачи планировщика..." -ForegroundColor Cyan

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Автоматическая загрузка изменений MIRA 0.2 на GitHub каждые 5 минут" `
    | Out-Null

Write-Host "✓ Задача создана: $taskName" -ForegroundColor Green

# Запуск задачи
Start-ScheduledTask -TaskName $taskName
Write-Host "✓ Задача запущена" -ForegroundColor Green

Write-Host "`n=== Настройка завершена ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Параметры:" -ForegroundColor Cyan
Write-Host "  • Интервал: каждые 5 минут" -ForegroundColor Gray
Write-Host "  • Скрипт: $scriptPath" -ForegroundColor Gray
Write-Host "  • Лог: $($projectRoot)\.auto-push.log" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Управление:" -ForegroundColor Cyan
Write-Host "  • Открыть Планировщик: taskschd.msc" -ForegroundColor Gray
Write-Host "  • Найти задачу: $taskName" -ForegroundColor Gray
Write-Host ""
Write-Host "❌ Отключение:" -ForegroundColor Red
Write-Host "  Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor Gray
