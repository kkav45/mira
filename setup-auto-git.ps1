# Настройка автоматической загрузки на GitHub
# Запускается от имени администратора

$taskName = "MIRA Auto-Git-Push"
$projectRoot = "d:\! Погода\MIRA 0.2 (небосвод)"
$scriptPath = Join-Path $projectRoot "auto-git-watch.ps1"
$logPath = Join-Path $projectRoot ".auto-git-watch.log"

Write-Host "=== Настройка авто-загрузки на GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Требуются права администратора" -ForegroundColor Red
    Write-Host "Запустите скрипт от имени администратора" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PowerShell: Правой кнопкой → Запуск от имени администратора" -ForegroundColor Gray
    exit 1
}

Write-Host "✓ Права администратора подтверждены" -ForegroundColor Green

# Проверка Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git не найден" -ForegroundColor Red
    Write-Host "Установите Git: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Git найден" -ForegroundColor Green

# Проверка репозитория
Set-Location $projectRoot
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "❌ Удалённый репозиторий не настроен" -ForegroundColor Red
    Write-Host "Выполните: git remote add origin <URL>" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Репозиторий: $remote" -ForegroundColor Green

# Удаление старой задачи
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "`n⚠ Найдена старая задача, удаляю..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "✓ Старая задача удалена" -ForegroundColor Green
}

# Создание триггера (при запуске компьютера)
$triggerLogon = New-ScheduledTaskTrigger -AtLogon

# Дополнительный триггер (каждые 5 минут, если скрипт не запущен)
$triggerInterval = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)

# Создание действия
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" `
    -WorkingDirectory $projectRoot

# Создание настроек
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -WakeToRun `
    -AllowHardTerminate `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

# Создание задачи
Write-Host "`n📅 Создание задачи планировщика..." -ForegroundColor Cyan

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $triggerLogon `
    -Action $action `
    -Settings $settings `
    -Description "Автоматическая загрузка изменений на GitHub при изменении файлов (MIRA 0.2)" `
    -RunLevel Highest `
    | Out-Null

Write-Host "✓ Задача создана: $taskName" -ForegroundColor Green

# Запуск задачи
Start-ScheduledTask -TaskName $taskName
Write-Host "✓ Задача запущена" -ForegroundColor Green

# Создание файла лога
if (-not (Test-Path $logPath)) {
    New-Item -Path $logPath -ItemType File -Force | Out-Null
    Write-Log "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Лог создан" -Path $logPath
}

Write-Host "`n=== Настройка завершена ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Параметры:" -ForegroundColor Cyan
Write-Host "  • Запуск: При входе в систему" -ForegroundColor Gray
Write-Host "  • Скрипт: $scriptPath" -ForegroundColor Gray
Write-Host "  • Лог: $logPath" -ForegroundColor Gray
Write-Host "  • Репозиторий: $remote" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Управление:" -ForegroundColor Cyan
Write-Host "  • Открыть Планировщик: taskschd.msc" -ForegroundColor Gray
Write-Host "  • Найти задачу: $taskName" -ForegroundColor Gray
Write-Host "  • Просмотр логов: Get-Content $logPath -Tail 50" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Тестирование:" -ForegroundColor Cyan
Write-Host "  1. Измените любой файл в проекте" -ForegroundColor Gray
Write-Host "  2. Через 5 секунд проверьте лог" -ForegroundColor Gray
Write-Host "  3. Проверьте GitHub: https://github.com/kkav45/mira/commits" -ForegroundColor Gray
Write-Host ""
Write-Host "❌ Отключение:" -ForegroundColor Red
Write-Host "  Unregister-ScheduledTask -TaskName `"$taskName`" -Confirm:`$false" -ForegroundColor Gray
Write-Host ""

# Предложение проверить статус
$check = Read-Host "Проверить статус задачи? (Y/N)"
if ($check -eq 'Y' -or $check -eq 'y') {
    Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State, LastRunTime, NextRunTime | Format-List
}
