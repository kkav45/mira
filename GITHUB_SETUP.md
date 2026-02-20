# 📤 Инструкция по публикации на GitHub

## Быстрый старт

### Способ 1: Автоматический скрипт (рекомендуется)

#### Windows (PowerShell)
```powershell
# Кликните правой кнопкой на publish-github.ps1 → "Выполнить с PowerShell"
# Или в командной строке:
.\publish-github.ps1
```

#### Windows (CMD)
```cmd
publish-github.bat
```

#### Linux/macOS
```bash
chmod +x publish-github.sh
./publish-github.sh
```

---

### Способ 2: Вручную через Git CLI

#### 1. Инициализация репозитория

```bash
cd "d:\! Погода\MIRA 0.2 (небосвод)"
git init
git branch -M main
```

#### 2. Создание .gitignore

Файл `.gitignore` уже создан в корне проекта.

#### 3. Первый коммит

```bash
git add .
git commit -m "Initial commit: MIRA 0.2"
```

#### 4. Создание репозитория на GitHub

1. Откройте https://github.com/new
2. Введите имя: `mira-weather` (или другое)
3. Выберите **Private** или **Public**
4. **Не нажимайте** "Initialize this repository with a README"
5. Нажмите **Create repository**

#### 5. Привязка удалённого репозитория

```bash
# Замените username на ваш логин GitHub
git remote add origin https://github.com/username/mira-weather.git
```

#### 6. Отправка на GitHub

```bash
git push -u origin main
```

---

### Способ 3: GitHub Desktop (для новичков)

1. Скачайте: https://desktop.github.com/
2. Установите и войдите в аккаунт GitHub
3. **File → Add Local Repository**
4. Выберите папку проекта: `d:\! Погода\MIRA 0.2 (небосвод)`
5. Нажмите **Commit to main**
6. Нажмите **Publish repository**
7. Введите имя и нажмите **Publish**

---

## 🔐 Настройка аутентификации

### Вариант A: HTTPS с токеном (рекомендуется)

1. Откройте https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Дайте имя: `MIRA Project`
4. Выберите права: **repo** (полный доступ)
5. Нажмите **Generate token**
6. **Скопируйте токен** (показывается один раз!)
7. При push введите:
   - Username: ваш логин GitHub
   - Password: вставьте токен

### Вариант B: SSH ключ

```bash
# Генерация SSH ключа
ssh-keygen -t ed25519 -C "your@email.com"

# Добавление ключа в GitHub
# 1. Откройте C:\Users\YourName\.ssh\id_ed25519.pub
# 2. Скопируйте содержимое
# 3. https://github.com/settings/keys → New SSH key
# 4. Вставьте ключ и сохраните

# Проверка
ssh -T git@github.com
```

---

## 🔄 Обновление проекта

Для публикации изменений:

```bash
# Автоматически
.\publish-github.ps1

# Или вручную
git add .
git commit -m "Описание изменений"
git push
```

---

## 📦 GitHub Pages (хостинг сайта)

Чтобы приложение было доступно по URL:

### 1. Включение GitHub Pages

1. Откройте репозиторий на GitHub
2. **Settings → Pages**
3. **Source**: Deploy from a branch
4. **Branch**: main → `/src` folder
5. Нажмите **Save**

### 2. Доступ к сайту

Через 1-2 минуты сайт будет доступен:
```
https://username.github.io/mira-weather/
```

### 3. Автоматическая публикация

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./src
```

---

## 🛠️ Полезные команды Git

```bash
# Проверка статуса
git status

# История коммитов
git log --oneline

# Отмена изменений (до коммита)
git checkout -- файл

# Ветви
git branch -a

# Обновление из удалённого репозитория
git pull origin main
```

---

## ❓ Решение проблем

### Ошибка: "remote: Repository not found"
- Проверьте URL репозитория
- Убедитесь, что репозиторий существует

### Ошибка: "Permission denied"
- Проверьте токен/SSH ключ
- Убедитесь, что у вас есть доступ к репозиторию

### Ошибка: "failed to push some refs"
```bash
# Синхронизация с удалённым репозиторием
git pull origin main --rebase
git push
```

### Конфликты слияния
```bash
# Отмена слияния
git merge --abort

# Или разрешение конфликтов вручную
# Затем:
git add .
git commit -m "Resolve conflicts"
git push
```

---

## 📊 Статистика проекта

Для просмотра статистики:

```bash
# Размер репозитория
git count-objects -vH

# Количество коммитов
git rev-list --count HEAD

# Авторы
git shortlog -sn
```

---

## 🔗 Ссылки

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com/)
- [GitHub Pages](https://pages.github.com/)
- [GitHub Actions](https://github.com/features/actions)

---

**Версия:** 1.0  
**Дата:** Февраль 2026
