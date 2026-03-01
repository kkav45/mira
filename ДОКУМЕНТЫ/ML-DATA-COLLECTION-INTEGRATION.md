# ✅ Интеграция сбора фактических данных от пилотов

**Дата:** 26 февраля 2026 г.
**Версия:** 0.1.10.1
**Статус:** ✅ Реализовано

---

## 📊 Архитектура сбора данных

### Поток данных:

```
1. Пилот вводит фактические данные (шаг 3)
   ↓
2. PilotObservationsModule.add()
   ↓
3. saveForML() автоматически вызывается
   ↓
4. Сравнение forecast vs actual
   ↓
5. MLAccuracyModule.addObservation()
   ↓
6. Расчёт точности по параметрам
   ↓
7. Обновление UI точности
```

---

## 🔧 Реализация

### 1. PilotObservationsModule

**Файл:** `js/pilot-observations.js`

**Изменения:**
- `add()` — автоматический вызов `saveForML()`
- `saveForML()` — новая функция (~70 строк)

**Логика:**
```javascript
add(observation) {
    // ... сохранение наблюдения
    this.saveForML(observation); // 🤖 Автоматически!
}

async saveForML(observation) {
    // Получаем прогноз
    const forecast = WizardModule.stepData.segmentAnalysis[0].analyzed.hourly[0];
    
    // 🌬️ Ветер
    MLAccuracyModule.addObservation(
        'open-meteo',
        'wind',
        forecast.wind10m,      // Прогноз
        observation.windSpeed, // Факт
        lat,
        lon
    );
    
    // 🌡️ Температура
    // 💧 Влажность
    // ... аналогично
}
```

---

### 2. MLAccuracyModule

**Файл:** `js/ml-accuracy.js`

**Изменения:**
- `addObservation(source, parameter, forecast, actual, lat, lon)` — обновлена
- `getAccuracy(source, days, lat, lon, parameter)` — поддержка параметров
- `getOverallAccuracy(source)` — сводная точность
- `updateAccuracyCache(source, parameter)` — кэш по параметрам

**Нормализация точности:**

| Параметр | Формула | 100% | 0% |
|----------|---------|------|-----|
| **Ветер** | `1 - error/5` | 0 м/с | 5+ м/с |
| **Температура** | `1 - error/10` | 0°C | 10+°C |
| **Влажность** | `1 - error/30` | 0% | 30+% |

---

### 3. Визуализация (WizardModule)

**Файл:** `js/wizard.js`

**Функция:** `renderVizStats()`

**Визуализация:**
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Точность прогнозов (ML)                                 │
├──────────────────────────┬──────────────────────────────────┤
│  open meteo             │  met no                          │
│  🟢 85%                 │  ⚪ —                             │
│  42 наблюдения          │  Нет данных                      │
│  🌬️85% 🌡️82% 💧88%     │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 📁 Изменённые файлы

| Файл | Изменено | Добавлено |
|------|----------|-----------|
| `js/pilot-observations.js` | ~10 строк | ~70 строк |
| `js/ml-accuracy.js` | ~50 строк | ~100 строк |
| `js/wizard.js` | ~30 строк | ~40 строк |
| **Всего** | **~90 строк** | **~210 строк** |

---

## 🎨 Примеры использования

### 1. Пилот вводит данные

```javascript
// Шаг 3: Пилот → Ввод данных
const observation = {
    windSpeed: 10.5,
    windDir: 180,
    temp: 5.0,
    humidity: 75,
    visibility: 8,
    coords: {lat: 55.75, lon: 37.62}
};

// Автоматически вызывается:
PilotObservationsModule.add(observation);
// ↓
// saveForML()
// ↓
// MLAccuracyModule.addObservation('open-meteo', 'wind', 8.2, 10.5, 55.75, 37.62)
// MLAccuracyModule.addObservation('open-meteo', 'temp', 5.0, 5.0, 55.75, 37.62)
// MLAccuracyModule.addObservation('open-meteo', 'humidity', 65, 75, 55.75, 37.62)
```

---

### 2. Расчёт точности

```javascript
// После 10 наблюдений:
const accuracy = MLAccuracyModule.getAccuracy('open-meteo', 30, null, null, 'wind');

console.log(accuracy);
// {
//   source: 'open-meteo',
//   parameter: 'wind',
//   accuracy: 0.82,        // 82%
//   avgError: 1.23,        // 1.23 м/с
//   count: 10,
//   minError: 0.2,
//   maxError: 3.1
// }
```

---

### 3. Сводная точность

```javascript
const overall = MLAccuracyModule.getOverallAccuracy('open-meteo', 30);

console.log(overall);
// {
//   source: 'open-meteo',
//   accuracy: 0.78,        // 78% (среднее)
//   count: 30,             // 10+10+10 наблюдений
//   byParameter: {
//     wind: {accuracy: 0.82, count: 10},
//     temp: {accuracy: 0.75, count: 10},
//     humidity: {accuracy: 0.77, count: 10}
//   }
// }
```

---

## 🧪 Тестирование

### Предусловия:
1. Открыть `index.html`
2. Построить маршрут → Анализ
3. Перейти на шаг 3 (Пилот)
4. Открыть консоль (F12)

---

### Тест 1: Добавление наблюдения

**Шаги:**
1. Ввести данные:
   - Ветер: 10.5 м/с
   - Температура: +5.0°C
   - Влажность: 75%
2. Нажать "Применить коррекцию"

**Ожидаемый результат в консоли:**
```
✅ Наблюдение добавлено: {id: ..., windSpeed: 10.5, ...}
🤖 ML: Сравнение прогноза с фактом... {lat: 55.75, lon: 37.62}
📊 Наблюдение добавлено: {source: 'open-meteo', parameter: 'wind', ...}
📊 Наблюдение добавлено: {source: 'open-meteo', parameter: 'temp', ...}
📊 Наблюдение добавлено: {source: 'open-meteo', parameter: 'humidity', ...}
✅ ML: Данные сохранены
```

---

### Тест 2: Проверка точности

**Шаги:**
1. Ввести 10+ наблюдений
2. Открыть вкладку "📊 Статист."
3. Найти блок "🤖 Точность прогнозов (ML)"

**Ожидаемый результат:**
```
┌──────────────────┬──────────────────┐
│  open meteo      │  met no          │
│  🟢 82%          │  ⚪ —             │
│  30 наблюдений   │  Нет данных      │
│  🌬️82% 🌡️75% 💧77% │                  │
└──────────────────┴──────────────────┘
```

---

### Тест 3: Проверка через консоль

```javascript
// 1. Добавить наблюдение
MLAccuracyModule.addObservation(
    'open-meteo',
    'wind',
    8.2,  // Прогноз
    10.5, // Факт
    55.75,
    37.62
);

// 2. Получить точность
const acc = MLAccuracyModule.getAccuracy('open-meteo', 30, null, null, 'wind');
console.log('Точность ветра:', acc.accuracy * 100 + '%');

// 3. Получить сводную точность
const overall = MLAccuracyModule.getOverallAccuracy('open-meteo', 30);
console.log('Сводная точность:', overall.accuracy * 100 + '%');
```

---

## 📊 Примеры данных

### После 1 наблюдения:

```
open-meteo:
├─ Точность: 50% ⚪ (нет статистики)
├─ Наблюдений: 1
└─ Ошибка: 2.3 м/с
```

### После 10 наблюдений:

```
open-meteo:
├─ Точность: 78% 🟢
├─ Наблюдений: 30 (10×3 параметра)
├─ Ветер: 82% (10 наблюдений, ошибка 1.23 м/с)
├─ Температура: 75% (10 наблюдений, ошибка 1.5°C)
└─ Влажность: 77% (10 наблюдений, ошибка 7%)
```

### После 100 наблюдений:

```
open-meteo:
├─ Точность: 85% 🟢
├─ Наблюдений: 300
├─ Ветер: 87% (100 наблюдений, ошибка 0.95 м/с)
├─ Температура: 82% (100 наблюдений, ошибка 1.2°C)
└─ Влажность: 86% (100 наблюдений, ошибка 5%)
```

---

## ⚠️ Ограничения

1. **Нужен прогноз** — без анализа маршрута данные не сохранятся
2. **Локальное хранение** — данные не синхронизируются
3. **Один источник** — пока только Open-Meteo
4. **Нет истории** — при очистке кэша данные теряются

---

## 🚀 Следующие улучшения

### Приоритет 1: Экспорт/импорт данных (4-6 часов)

**Идея:** Сохранение данных в файл

```javascript
// Экспорт
function exportMLData() {
    const data = {
        history: MLAccuracyModule.history,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-data-${new Date().toISOString()}.json`;
    a.click();
}
```

---

### Приоритет 2: Синхронизация (15-20 часов)

**Идея:** Общая база точности

```javascript
// Отправка данных на сервер
async function syncMLData() {
    const history = MLAccuracyModule.history;
    const response = await fetch('/api/ml/sync', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({history})
    });
    
    const result = await response.json();
    console.log('Синхронизация:', result);
}
```

---

### Приоритет 3: Учёт сезона (10-15 часов)

**Идея:** Точность по сезонам

```javascript
getSeasonalAccuracy(source, season) {
    const seasonMonths = {
        'winter': [12, 1, 2],
        'spring': [3, 4, 5],
        'summer': [6, 7, 8],
        'autumn': [9, 10, 11]
    };
    
    const seasonalHistory = this.history.filter(obs => {
        const month = new Date(obs.date).getMonth();
        return seasonMonths[season].includes(month);
    });
    
    return this.calculateAccuracy(seasonalHistory);
}
```

---

## ✅ Чек-лист готовности

- [x] PilotObservationsModule.saveForML()
- [x] MLAccuracyModule.addObservation() с параметрами
- [x] MLAccuracyModule.getAccuracy() с параметрами
- [x] MLAccuracyModule.getOverallAccuracy()
- [x] Визуализация точности по параметрам
- [x] Автоматический сбор при вводе пилотом
- [ ] Экспорт/импорт данных
- [ ] Синхронизация
- [ ] Сезонная точность

---

**Статус:** ✅ Реализовано
**Готовность:** 90%
**Следующий шаг:** Экспорт/импорт данных ML (4-6 часов)
