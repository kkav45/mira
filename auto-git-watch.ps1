# Автоматическая загрузка на GitHub при изменении файлов
# Запускается через Планировщик заданий или вручную

$projectRoot = "d:\! Погода\MIRA 0.2 (небосвод)"
$watcherLog = Join-Path $projectRoot ".auto-git-watch.log"
$lastCommitFile = Join-Path $projectRoot ".last-commit-time"

function Write-Log {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Add-Content -Path $watcherLog -Value $logMessage
    Write-Host $logMessage
}

function Push-ToGitHub {
    Set-Location $projectRoot
    
    # Проверка наличия изменений
    $status = git status --porcelain
    
    if ($status) {
        Write-Log "📦 Обнаружены изменения"
        
        # Добавление всех файлов
        git add .
        
        # Создание коммита
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $message = "Auto-save: $timestamp"
        
        git commit -m $message
        if ($LASTEXITCODE -eq 0) {
            Write-Log "✅ Коммит создан: $message"
            
            # Отправка на GitHub
            git push origin main
            if ($LASTEXITCODE -eq 0) {
                Write-Log "🚀 Успешно отправлено на GitHub"
            } else {
                Write-Log "❌ Ошибка при push: $LASTEXITCODE"
            }
        } else {
            Write-Log "❌ Ошибка при коммите: $LASTEXITCODE"
        }
    } else {
        Write-Log "✓ Изменений нет"
    }
}

# Основная программа
Write-Log "=== Запуск авто-загрузки на GitHub ==="
Write-Log "Папка: $projectRoot"

try {
    # Создание FileSystemWatcher
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $projectRoot
    $watcher.Filter = "*.*"
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true
    $watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor 
                            [System.IO.NotifyFilters]::DirectoryName -bor 
                            [System.IO.NotifyFilters]::LastWrite -bor 
                            [System.IO.NotifyFilters]::Size
    
    # Исключаемые папки
    $excludeFolders = @(".git", "node_modules", "bin", "obj", ".vscode", ".vs")
    
    # Флаг для предотвращения множественных срабатываний
    $isPushing = $false
    $lastTriggerTime = Get-Date
    $debounceSeconds = 5
    
    # Обработчик события изменения
    $action = {
        $path = $Event.SourceEventArgs.FullPath
        $changeType = $Event.SourceEventArgs.ChangeType
        
        # Проверка на исключённые папки
        $skip = $false
        foreach ($folder in $excludeFolders) {
            if ($path -like "*\$folder\*") {
                $skip = $true
                break
            }
        }
        
        if ($skip) {
            return
        }
        
        # Debounce - защита от множественных срабатываний
        $currentTime = Get-Date
        $timeDiff = ($currentTime - $lastTriggerTime).TotalSeconds
        
        if ($timeDiff -lt $debounceSeconds -or $isPushing) {
            return
        }
        
        $lastTriggerTime = $currentTime
        $isPushing = $true
        
        Write-Log "📝 Изменение: $path ($changeType)"
        
        # Небольшая задержка для завершения записи файла
        Start-Sleep -Milliseconds 500
        
        # Выполнение push
        Push-ToGitHub
        
        $isPushing = $false
        
        # Пауза между обработками
        Start-Sleep -Seconds 2
    }
    
    # Регистрация обработчиков событий
    Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action -SourceIdentifier "FileCreated"
    Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action -SourceIdentifier "FileChanged"
    Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action -SourceIdentifier "FileDeleted"
    Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action -SourceIdentifier "FileRenamed"
    
    Write-Log "✅ Мониторинг запущен"
    Write-Log "📁 Отслеживаемые файлы: Все (кроме .git, node_modules)"
    Write-Log "⏱️ Задержка перед загрузкой: $debounceSeconds сек"
    Write-Log ""
    Write-Log "Ожидание изменений... (нажмите Ctrl+C для остановки)"
    
    # Бесконечный цикл ожидания
    while ($true) {
        Start-Sleep -Milliseconds 500
    }
    
} catch {
    Write-Log "❌ Ошибка: $_"
    Write-Log $_.ScriptStackTrace
} finally {
    # Очистка
    if ($watcher) {
        $watcher.EnableRaisingEvents = $false
        $watcher.Dispose()
    }
    Unregister-Event -SourceIdentifier "FileCreated" -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier "FileChanged" -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier "FileDeleted" -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier "FileRenamed" -ErrorAction SilentlyContinue
    
    Write-Log "=== Мониторинг остановлен ==="
}
