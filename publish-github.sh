#!/bin/bash
# Скрипт автоматической публикации на GitHub
# Для Linux/macOS

echo "=== MIRA 0.2 | Публикация на GitHub ==="

# Проверка наличия Git
if ! command -v git &> /dev/null; then
    echo "❌ Git не найден. Установите Git"
    exit 1
fi
echo "✓ Git найден"

# Переход в директорию проекта
cd "$(dirname "$0")"

# Проверка наличия .git
if [ ! -d ".git" ]; then
    echo "⚠ Репозиторий Git не инициализирован"
    echo "Инициализация..."
    git init
    git branch -M main
    
    # Создание .gitignore
    cat > .gitignore << EOF
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
EOF
    
    echo "✓ .gitignore создан"
fi

# Добавление всех файлов
echo -e "\n📦 Добавление файлов..."
git add .

# Проверка изменений
if [ -z "$(git status --porcelain)" ]; then
    echo "✓ Изменений нет"
else
    # Коммит
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "💾 Коммит: $timestamp"
    git commit -m "Update: $timestamp"
fi

# Проверка наличия удалённого репозитория
if ! git remote get-url origin &> /dev/null; then
    echo -e "\n⚠ Удалённый репозиторий не настроен"
    echo "Введите URL вашего репозитория GitHub:"
    echo "Пример: https://github.com/username/mira-weather.git"
    read -p "URL репозитория: " repoUrl
    
    if [ -n "$repoUrl" ]; then
        git remote add origin "$repoUrl"
        echo "✓ Удалённый репозиторий добавлен"
    fi
fi

# Push
echo -e "\n🚀 Отправка на GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo -e "\n✅ Успешно опубликовано на GitHub!"
    
    repoUrl=$(git remote get-url origin)
    echo -e "\n📬 Ваш репозиторий:"
    echo "$repoUrl"
else
    echo -e "\n❌ Ошибка при отправке"
    echo "Возможные причины:"
    echo "  • Не настроен SSH ключ или токен"
    echo "  • Нет доступа к репозиторию"
    echo "  • Конфликты слияния"
fi

echo -e "\n=== Готово ==="
