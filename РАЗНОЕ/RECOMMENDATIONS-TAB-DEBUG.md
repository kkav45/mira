# 🔧 Диагностика: Вкладка "Рекомендации" не работает

**Дата:** 26 февраля 2026 г.
**Версия:** 0.1.6.3
**Проблема:** На шаге 3 в визуализации не работает вкладка "Рекомендации"

---

## 🐛 Симптом

При клике на вкладку "💡 Рекомендации":
- Вкладка не переключается
- Контент не отображается
- Нет ошибок в консоли

---

## 🔍 Диагностика

### Добавлено логирование:

**Файл:** `js/wizard.js`

**1. Логирование в `renderVizRecommendations()`:**
```javascript
console.log('💡 renderVizRecommendations вызван');
console.log('📊 Источники:', sources);
console.log('📊 Анализ:', analyzed);
```

**2. Логирование в `renderVizContent()`:**
```javascript
console.log('🎨 renderVizContent вызван, currentVizTab:', this.currentVizTab);
console.log('📊 Рендер таблицы');
console.log('📈 Рендер графиков');
console.log('📊 Рендер анализа рисков');
console.log('💡 Рендер рекомендаций');
console.log('📋 Рендер деталей');
```

**3. Проверка данных:**
```javascript
if (!sources || !sources.openMeteo) {
    console.error('❌ Нет данных источников для рекомендаций');
    return `<div>Нет данных...</div>`;
}
```

---

## 📋 Инструкция по тестированию

### Шаг 1: Открыть консоль

1. Открыть `desktop.html` в браузере
2. Нажать `F12` → Консоль (Console)
3. Очистить консоль

### Шаг 2: Построить маршрут

1. Нажать кнопку "🛤️ Построить маршрут"
2. Кликнуть на карте (точка A)
3. Кликнуть ещё раз (точка B)
4. Нажать "🔍 Анализ"

### Шаг 3: Перейти на шаг 3

1. Ввести данные пилота
2. Нажать "Применить коррекцию"
3. Открылась вкладка "📋 Таблица"

**В консоли должно быть:**
```
🔧 Применение коррекции...
💾 originalAnalysis сохранён для PDF
📊 pilotData установлено из наблюдения
✅ Коррекция применена
🎨 renderVizContent вызван, currentVizTab: table
📊 Рендер таблицы
```

### Шаг 4: Кликнуть "💡 Рекомендации"

**В консоли должно быть:**
```
👆 Переключение визуализации: recommendations
🎨 renderVizContent вызван, currentVizTab: recommendations
💡 Рендер рекомендаций
💡 renderVizRecommendations вызван
📊 Источники: {...}
📊 Анализ: {...}
```

---

## 🔍 Возможные проблемы и решения

### Проблема 1: `step3VizContent не найден!`

**Лог:**
```
❌ step3VizContent не найден!
```

**Причина:** Элемент `#step3VizContent` не существует в DOM

**Решение:**
1. Проверить что `renderStep3ResultsTab()` вызывается
2. Проверить что HTML рендерится корректно
3. Убедиться что `step3VizContent` есть в HTML

**Проверка:**
```javascript
// В консоли браузера:
document.getElementById('step3VizContent')
// Должен вернуть: <div id="step3VizContent">...</div>
```

---

### Проблема 2: `Нет данных источников`

**Лог:**
```
❌ Нет данных источников для рекомендаций
```

**Причина:** `getSourcesData()` возвращает `null` или пустой объект

**Решение:**
1. Проверить что `stepData.correctedAnalysis` существует
2. Проверить что `stepData.segmentAnalysis` не пустой
3. Проверить что применена коррекция пилота

**Проверка:**
```javascript
// В консоли браузера:
const data = WizardModule.getData();
console.log('correctedAnalysis:', data.correctedAnalysis);
console.log('segmentAnalysis:', data.segmentAnalysis);
console.log('pilotData:', data.pilotData);
```

---

### Проблема 3: `currentVizTab не переключается`

**Лог:**
```
👆 Переключение визуализации: recommendations
🎨 renderVizContent вызван, currentVizTab: table  // ❌ Должно быть 'recommendations'
```

**Причина:** `switchVizTab()` не обновляет `currentVizTab`

**Решение:**
1. Проверить что `switchVizTab()` вызывается
2. Проверить что `onclick` атрибут работает
3. Проверить что нет ошибок JavaScript

**Проверка:**
```javascript
// В консоли браузера:
console.log('currentVizTab до:', WizardModule.currentVizTab);
WizardModule.switchVizTab('recommendations');
console.log('currentVizTab после:', WizardModule.currentVizTab);
```

---

### Проблема 4: Вкладка не подсвечивается

**Лог:**
```
🎨 renderVizContent вызван, currentVizTab: recommendations
💡 Рендер рекомендаций
// Но вкладка серая, не активная
```

**Причина:** `dataset.viz` не совпадает с `currentVizTab`

**Решение:**
1. Проверить что `data-viz="recommendations"` есть у вкладки
2. Проверить что `querySelectorAll('.viz-tab')` находит вкладки
3. Проверить что стили применяются

**Проверка:**
```javascript
// В консоли браузера:
const tabs = document.querySelectorAll('.viz-tab');
tabs.forEach(tab => {
    console.log('Tab:', tab.textContent.trim(), 'data-viz:', tab.dataset.viz);
});
```

---

### Проблема 5: `renderVizRecommendations` возвращает пустоту

**Лог:**
```
💡 renderVizRecommendations вызван
📊 Источники: {...}
📊 Анализ: {...}
// Но контент пустой
```

**Причина:** Функция возвращает пустую строку или undefined

**Решение:**
1. Проверить что функция возвращает строку
2. Проверить что template literals корректны
3. Добавить `console.log` перед `return`

**Проверка:**
```javascript
// В консоли браузера:
const result = WizardModule.renderVizRecommendations();
console.log('Результат:', result);
console.log('Длина:', result?.length);
```

---

## 📊 Ожидаемые логи

### Успешный сценарий:

```
🔧 Применение коррекции...
💾 originalAnalysis сохранён для PDF
📊 pilotData установлено из наблюдения
✅ Коррекция применена
🎨 renderVizContent вызван, currentVizTab: table
📊 Рендер таблицы

// Клик по "Рекомендации"
👆 Переключение визуализации: recommendations
🎨 renderVizContent вызван, currentVizTab: recommendations
💡 Рендер рекомендаций
💡 renderVizRecommendations вызван
📊 Источники: {openMeteo: {...}, metNo: {...}, pilot: {...}, corrected: {...}}
📊 Анализ: {hourly: [...], summary: {...}}
```

---

## ✅ Чек-лист проверки

- [ ] `step3VizContent` существует
- [ ] `getSourcesData()` возвращает данные
- [ ] `currentVizTab` переключается
- [ ] `renderVizRecommendations()` вызывается
- [ ] Функция возвращает строку (не undefined)
- [ ] Вкладка подсвечивается (градиент)
- [ ] Контент отображается

---

## 🚀 Следующие шаги

После диагностики:

1. **Если проблема найдена** — исправить
2. **Если логи не помогают** — добавить больше отладки
3. **Если всё работает** — убрать логи (оставить только ошибки)

---

**Статус:** 🔍 Диагностика
**Готовность:** 50%
**Следующий шаг:** Тестирование с логами
