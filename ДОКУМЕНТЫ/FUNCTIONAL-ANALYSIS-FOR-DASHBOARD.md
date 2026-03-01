# MIRA — Полный функциональный анализ для проектирования дашборда

**Версия проекта:** 0.1.5.0  
**Дата анализа:** 26 февраля 2026 г.  
**Цель:** Проектирование нового дашборда

---

## 📊 СОДЕРЖАНИЕ

1. [Общая статистика](#общая-статистика)
2. [Модули и функции](#модули-и-функции)
3. [Расчёты и формулы](#расчёты-и-формулы)
4. [Графики и визуализация](#графики-и-визуализация)
5. [Таблицы и данные](#таблицы-и-данные)
6. [Пользовательские сценарии](#пользовательские-сценарии)
7. [Состояния и статусы](#состояния-и-статусы)
8. [Требования к дашборду](#требования-к-дашборду)

---

## 📈 Общая статистика

### Количество модулей
- **9 основных модулей**
- **67+ функций**
- **15+ расчётов**
- **7 типов графиков**
- **10+ таблиц**

### Файловая структура
```
js/
├── app.js              (23 КБ)  — 45 функций
├── weather.js          (18 КБ)  — 23 функции
├── route.js            (12 КБ)  — 18 функций
├── wizard.js           (45 КБ)  — 67 функций
├── pilot.js            (22 КБ)  — 28 функций
├── pilot-observations.js (15 КБ) — 12 функций
├── charts.js           (25 КБ)  — 11 функций
├── map.js              (28 КБ)  — 35 функций
├── pdf-export-2page.js (32 КБ)  — 24 функции
├── storage.js          (8 КБ)   — 18 функций
└── utils.js            (10 КБ)  — 22 функции
```

---

## 🔧 Модули и функции

### 1. AppModule (app.js) — Ядро приложения

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 1.1 | `init(options)` | Инициализация приложения | options.isDesktop | void |
| 1.2 | `initModules()` | Инициализация модулей | — | void |
| 1.3 | `initMap()` | Инициализация карты | — | void |
| 1.4 | `initUI()` | Настройка UI | — | void |
| 1.5 | `loadSavedData()` | Загрузка данных | — | void |
| 1.6 | `bindEvents()` | Привязка событий | — | void |
| 1.7 | `onStepChange(step)` | Смена шага мастера | step: number | void |
| 1.8 | `togglePanel()` | Показать/скрыть панель | — | void |
| 1.9 | `getCurrentLocation()` | Геолокация | — | Promise |
| 1.10 | `switchTab(tabName)` | Переключение вкладки | tabName: string | void |
| 1.11 | `updateWeatherUI(data)` | Обновление UI погоды | data: object | void |
| 1.12 | `updateFlightStatus(risk)` | Статус полёта | risk: string | void |
| 1.13 | `displayRecommendations(recs)` | Рекомендации | recs: array | void |
| 1.14 | `initCharts(data)` | Инициализация графиков | data: object | void |
| 1.15 | `updateCharts(data)` | Обновление графиков | data: object | void |
| 1.16 | `exportReport()` | Экспорт отчёта | — | void |
| 1.17 | `openSettings()` | Открыть настройки | — | void |
| 1.18 | `saveSettings()` | Сохранить настройки | settings: object | boolean |
| 1.19 | `toggleRouteMode()` | Режим маршрута | — | boolean |
| 1.20 | `toggleRiskZones()` | Зоны риска | — | boolean |

---

### 2. WeatherModule (weather.js) — Метеоданные

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 2.1 | `getForecast(lat, lon, date)` | Получение прогноза | lat, lon, date | Promise |
| 2.2 | `getForecastForSegments(segments, date)` | Прогноз для сегментов | segments, date | Promise |
| 2.3 | `getSegmentCenter(segment)` | Центр сегмента | segment: array | object |
| 2.4 | `analyzeForecast(forecast)` | Анализ прогноза | forecast: object | object |
| 2.5 | `calculateRiskScore(hour, thresholds)` | Расчёт риска | hour, thresholds | number |
| 2.6 | `getRiskLevel(score)` | Уровень риска | score: number | string |
| 2.7 | `calculateIcingRisk(temp, humidity)` | Риск обледенения | temp, humidity | string |
| 2.8 | `calculateTurbulenceRisk(wind, gust)` | Риск турбулентности | wind, gust | string |
| 2.9 | `generateSummary(hourly, thresholds)` | Сводка данных | hourly, thresholds | object |
| 2.10 | `findFlightWindows(hourly, thresholds)` | Поиск окон | hourly, thresholds | array |
| 2.11 | `getOverallRisk(hourly)` | Общий риск | hourly: array | string |
| 2.12 | `buildQueryString(params)` | Query string | params: object | string |
| 2.13 | `interpolateForAltitude(data, altitude)` | Интерполяция высоты | data, altitude | object |
| 2.14 | `prepareChartData(analyzed)` | Данные для графиков | analyzed: object | object |
| 2.15 | `generateRecommendations(data, pilot)` | Рекомендации | data, pilot | array |
| 2.16 | `applyPilotCorrection(analyzed, pilot)` | Коррекция пилота | analyzed, pilot | object |
| 2.17 | `clearCache()` | Очистка кэша | — | void |

---

### 3. RouteModule (route.js) — Маршруты

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 3.1 | `createRoute(points, name)` | Создание маршрута | points, name | object |
| 3.2 | `calculateRouteDistance(points)` | Дистанция | points: array | number |
| 3.3 | `estimateFlightTime(points, speed)` | Время полёта | points, speed | number |
| 3.4 | `createSegments(route)` | Разбиение на сегменты | route: object | array |
| 3.5 | `getSegmentCenter(points)` | Центр сегмента | points: array | object |
| 3.6 | `analyzeSegments(date)` | Анализ сегментов | date: string | Promise |
| 3.7 | `calculateSegmentRiskScore(analyzed)` | Риск сегмента | analyzed: object | number |
| 3.8 | `getSegmentData(index)` | Данные сегмента | index: number | object |
| 3.9 | `saveRoute(route)` | Сохранение маршрута | route: object | boolean |
| 3.10 | `getSavedRoutes()` | Список маршрутов | — | array |
| 3.11 | `loadRoute(id)` | Загрузка маршрута | id: string | object |
| 3.12 | `deleteRoute(id)` | Удаление маршрута | id: string | boolean |
| 3.13 | `importKML(file)` | Импорт KML | file: File | Promise |
| 3.14 | `exportToKML(route)` | Экспорт KML | route: object | void |
| 3.15 | `clear()` | Очистка маршрута | — | void |
| 3.16 | `getRouteSummary()` | Сводка маршрута | — | object |
| 3.17 | `setSegmentLength(length)` | Длина сегмента | length: number | void |

---

### 4. PilotModule (pilot.js) — Данные пилота

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 4.1 | `init()` | Инициализация | — | void |
| 4.2 | `openModal()` | Открыть модальное окно | — | void |
| 4.3 | `closeModal()` | Закрыть модальное окно | — | void |
| 4.4 | `hasWeatherData()` | Есть данные погоды | — | boolean |
| 4.5 | `fillFormFromData()` | Заполнить форму | — | void |
| 4.6 | `collectFormData()` | Сбор данных формы | — | object |
| 4.7 | `applyCorrection()` | Применение коррекции | — | void |
| 4.8 | `getCurrentAnalysis()` | Текущий анализ | — | object |
| 4.9 | `displayComparison(forecast, corrected, pilot)` | Сравнение | forecast, corrected, pilot | void |
| 4.10 | `displayDecision(pilot, corrected)` | Решение | pilot, corrected | void |
| 4.11 | `clearData()` | Очистка данных | — | void |
| 4.12 | `toggleSelectPointMode()` | Выбор точки на карте | — | void |
| 4.13 | `onPointSelected(lat, lon)` | Точка выбрана | lat, lon | void |
| 4.14 | `fillCoordsFromLocation()` | Геолокация | — | void |
| 4.15 | `parseFloat(value)` | Парсинг числа | value: any | number |
| 4.16 | `disableSelectPointMode()` | Отключить выбор точки | — | void |
| 4.17 | `getData()` | Получить данные | — | object |
| 4.18 | `getCorrectedAnalysis()` | Скорректированный анализ | — | object |

---

### 5. PilotObservationsModule (pilot-observations.js) — Наблюдения

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 5.1 | `add(observation)` | Добавить наблюдение | observation: object | object |
| 5.2 | `remove(index)` | Удалить наблюдение | index: number | void |
| 5.3 | `clear()` | Очистить наблюдения | — | void |
| 5.4 | `getAll()` | Все наблюдения | — | array |
| 5.5 | `save()` | Сохранить в localStorage | — | void |
| 5.6 | `load()` | Загрузить из localStorage | — | array |
| 5.7 | `applyCorrection(analyzed)` | Коррекция по наблюдениям | analyzed: object | object |
| 5.8 | `calculateIcingRisk(temp, humidity, thresholds)` | Обледенение | temp, humidity, thresholds | string |
| 5.9 | `calculateTurbulenceRisk(wind, gust)` | Турбулентность | wind, gust | string |
| 5.10 | `recalculateSummary(hourly, thresholds)` | Пересчёт сводки | hourly, thresholds | object |
| 5.11 | `findFlightWindows(hourly, thresholds)` | Окна полёта | hourly, thresholds | array |
| 5.12 | `getOverallRisk(hourly)` | Общий риск | hourly: array | string |
| 5.13 | `export()` | Экспорт в JSON | — | string |
| 5.14 | `import(jsonString)` | Импорт из JSON | jsonString: string | boolean |

---

### 6. ChartsModule (charts.js) — Графики

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 6.1 | `createTimeSeriesChart(containerId, data)` | Временной ряд | containerId, data | void |
| 6.2 | `createVerticalWindProfile(containerId, windData)` | Профиль ветра | containerId, windData | void |
| 6.3 | `createTemperatureProfile(containerId, tempData)` | Профиль температуры | containerId, tempData | void |
| 6.4 | `createWindRose(containerId, windData)` | Роза ветров | containerId, windData | void |
| 6.5 | `createTurbulenceChart(containerId, data)` | Турбулентность | containerId, data | void |
| 6.6 | `createCeilingChart(containerId, data)` | Высота облаков | containerId, data | void |
| 6.7 | `createFlightWindowsCalendar(containerId, windows)` | Тепловая карта | containerId, windows | void |
| 6.8 | `createComparisonChart(containerId, forecast, actual)` | Сравнение | containerId, forecast, actual | void |
| 6.9 | `createRouteProfileChart(containerId, segments, risks)` | Профиль маршрута | containerId, segments, risks | void |
| 6.10 | `resizeAllCharts()` | Resize всех графиков | — | void |
| 6.11 | `clearChart(containerId)` | Очистка графика | containerId: string | void |
| 6.12 | `exportChartToImage(containerId, filename)` | Экспорт графика | containerId, filename | void |

---

### 7. MapModule (map.js) — Карта

| № | Функция | Назначение | Параметры | Возвращает |
|---|---------|------------|-----------|------------|
| 7.1 | `init(targetElement)` | Инициализация карты | targetElement: string | object |
| 7.2 | `createPopup()` | Создание popup | — | void |
| 7.3 | `handleMapClick(evt)` | Клик по карте | evt: object | void |
| 7.4 | `handleMapDoubleClick(evt)` | Двойной клик | evt: object | void |
| 7.5 | `showPopup(coordinate, content)` | Показать popup | coordinate, content | void |
| 7.6 | `routeStyle(feature)` | Стиль маршрута | feature: object | object |
| 7.7 | `kmlStyle(feature)` | Стиль KML | feature: object | object |
| 7.8 | `riskZoneStyle(feature)` | Стиль зон риска | feature: object | object |
| 7.9 | `segmentStyle(feature)` | Стиль сегментов | feature: object | object |
| 7.10 | `toggleRouteMode()` | Режим маршрута | — | boolean |
| 7.11 | `addRoutePoint(lat, lon)` | Добавить точку | lat, lon | void |
| 7.12 | `clearRoute()` | Очистка маршрута | — | void |
| 7.13 | `loadKML(file)` | Загрузка KML | file: File | Promise |
| 7.14 | `extractPointsFromKML(kmlText)` | Точки из KML | kmlText: string | array |
| 7.15 | `splitRouteIntoSegments(points, length)` | Разбиение на сегменты | points, length | array |
| 7.16 | `displaySegments(segments, risks)` | Отображение сегментов | segments, risks | void |
| 7.17 | `displayRiskZones(zones)` | Зоны риска | zones: array | void |
| 7.18 | `toggleRiskZones()` | Вкл/выкл зоны риска | — | boolean |
| 7.19 | `changeBaseLayer(layerName)` | Смена слоя | layerName: string | void |
| 7.20 | `centerOnPoint(lat, lon, zoom)` | Центрирование | lat, lon, zoom | void |
| 7.21 | `fitToRoute()` | Масштаб по маршруту | — | void |
| 7.22 | `enableSelectPointMode(callback)` | Режим выбора точки | callback: function | void |
| 7.23 | `disableSelectPointMode()` | Отключить выбор точки | — | void |
| 7.24 | `addMarker(lat, lon, options)` | Добавить маркер | lat, lon, options | object |
| 7.25 | `clearMarkers()` | Очистка маркеров | — | void |
| 7.26 | `getCurrentRoute()` | Текущий маршрут | — | object |
| 7.27 | `setRoute(route)` | Установить маршрут | route: object | void |

---

### 8. WizardModule (wizard.js) — Мастер

**67 функций** (полный список в документации)

### 9. PdfExportModule (pdf-export-2page.js) — PDF экспорт

**24 функции** для генерации PDF-отчётов

### 10. StorageModule (storage.js) — Хранилище

**18 функций** для работы с localStorage

### 11. UtilsModule (utils.js) — Утилиты

**22 функции** вспомогательных функций

---

## 🧮 Расчёты и формулы

### 1. Расчёт расстояния (Haversine)

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли, км
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLon/2);
    const c = 2 × atan2(√a, √(1-a));
    return R × c;
}
```

**Использование:** RouteModule, UtilsModule

---

### 2. Расчёт азимута (направления)

```javascript
function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = sin(Δlon) × cos(lat2);
    const x = cos(lat1) × sin(lat2) - sin(lat1) × cos(lat2) × cos(Δlon);
    const bearing = atan2(y, x);
    return (bearing + 360) % 360;
}
```

**Использование:** MapModule, RouteModule

---

### 3. Risk Score (общий риск)

```javascript
function calculateRiskScore(hour, thresholds) {
    let score = 0;
    
    // Ветер (макс. +2)
    if (hour.wind10m > thresholds.windGround) score += 2;
    else if (hour.wind10m > thresholds.windGround * 0.8) score += 1;
    
    // Видимость (макс. +2)
    if (hour.visibility < thresholds.visibility) score += 2;
    else if (hour.visibility < thresholds.visibility * 1.5) score += 1;
    
    // Осадки (макс. +2)
    if (hour.precip > thresholds.precip) score += 2;
    else if (hour.precip > 0.5) score += 1;
    
    // Обледенение (макс. +2)
    if (hour.icingRisk === 'high') score += 2;
    else if (hour.icingRisk === 'medium') score += 1;
    
    return score; // 0-8
}
```

**Использование:** WeatherModule

---

### 4. Риск обледенения

```javascript
function calculateIcingRisk(temp, humidity) {
    if (temp <= 5 && temp >= -10 && humidity > 80) {
        if (temp <= 0 && temp >= -5) return 'high';
        return 'medium';
    }
    return 'low';
}
```

**Использование:** WeatherModule, PilotObservationsModule

---

### 5. Риск турбулентности

```javascript
function calculateTurbulenceRisk(windSpeed, windGust) {
    const gustFactor = windSpeed > 0 ? windGust / windSpeed : 1;
    
    if (gustFactor > 1.5 || windSpeed > 15) return 'high';
    if (gustFactor > 1.2 || windSpeed > 10) return 'medium';
    return 'low';
}
```

**Использование:** WeatherModule, PilotObservationsModule

---

### 6. Интерполяция для высоты

```javascript
function interpolateForAltitude(data, altitude) {
    const tempLapse = -6.5 / 1000;  // °C/м
    const tempAdjustment = tempLapse * altitude;
    
    const windFactor = 1 + (altitude / 500) * 0.15;  // +15% на 500м
    
    return {
        temp: data.temp2m + tempAdjustment,
        wind: data.wind10m * windFactor,
        humidity: Math.max(0, data.humidity - altitude / 100),
        pressure: data.pressure * Math.exp(-altitude / 8500)
    };
}
```

**Использование:** WeatherModule

---

### 7. Экспоненциальное затухание (коррекция)

```javascript
weight = Math.exp(-i / 24)
```

| Время | i (час) | weight | Доля коррекции |
|-------|---------|--------|----------------|
| 0 ч | 0 | 1.000 | 100% |
| 6 ч | 6 | 0.779 | 78% |
| 12 ч | 12 | 0.606 | 61% |
| 24 ч | 24 | 0.368 | 37% |
| 48 ч | 48 | 0.135 | 14% |

**Использование:** PilotModule, PilotObservationsModule

---

### 8. Коррекция прогноза

```javascript
// Ветер
corrected.wind10m = hour.wind10m * (1 + (windBias - 1) * weight)

// Температура
corrected.temp2m = hour.temp2m + (tempOffset * weight)

// Видимость (переопределение)
corrected.visibility = visibilityOverride || hour.visibility
```

**Использование:** PilotModule, PilotObservationsModule

---

### 9. Поиск благоприятных окон

```javascript
function findFlightWindows(hourly, thresholds, minDuration = 2) {
    const windows = [];
    let currentWindow = null;
    
    for (let i = 0; i < hourly.length; i++) {
        const isGood = hourly[i].riskScore < 2;
        
        if (isGood) {
            if (!currentWindow) {
                currentWindow = { start, end, hours: [] };
            }
            currentWindow.hours.push(hourly[i]);
        } else {
            if (currentWindow && currentWindow.hours.length >= minDuration) {
                windows.push(currentWindow);
            }
            currentWindow = null;
        }
    }
    
    return windows;
}
```

**Использование:** WeatherModule, PilotObservationsModule

---

### 10. Общий риск маршрута

```javascript
function getOverallRisk(hourly) {
    const highRiskCount = hourly.filter(h => h.risk === 'high').length;
    const mediumRiskCount = hourly.filter(h => h.risk === 'medium').length;
    
    if (highRiskCount > hourly.length * 0.3) return 'high';
    if (mediumRiskCount > hourly.length * 0.5) return 'medium';
    return 'low';
}
```

**Использование:** WeatherModule, PilotObservationsModule

---

### 11. Время полёта

```javascript
function estimateFlightTime(points, speedKmh = 50) {
    const distance = calculateRouteDistance(points);
    return Math.round(distance / speedKmh * 60);  // минуты
}
```

**Использование:** RouteModule

---

### 12. Промежуточная точка

```javascript
function getIntermediatePoint(lat1, lon1, lat2, lon2, fraction) {
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const λ1 = toRad(lon1), λ2 = toRad(lon2);
    
    const A = sin((1-fraction) × angularDistance);
    const B = sin(fraction × angularDistance);
    const C = sin(angularDistance);
    
    const x = (A × cos(φ1) × cos(λ1) + B × cos(φ2) × cos(λ2)) / C;
    const y = (A × cos(φ1) × sin(λ1) + B × cos(φ2) × sin(λ2)) / C;
    const z = (A × sin(φ1) + B × sin(φ2)) / C;
    
    const φ3 = atan2(z, √(x² + y²));
    const λ3 = atan2(y, x);
    
    return { lat: toDeg(φ3), lon: toDeg(λ3) };
}
```

**Использование:** UtilsModule, MapModule

---

### 13. Конвертация направления ветра

```javascript
function windDirectionToCardinal(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}
```

**Использование:** UtilsModule, ChartsModule

---

### 14. Барометрическая формула

```javascript
P(h) = P₀ × e^(-h / 8500)
```

**Использование:** WeatherModule (интерполяция давления)

---

### 15. Взвешенная коррекция (multi-point)

```javascript
// Для множественных наблюдений
const weightedBias = observations.reduce((sum, obs) => {
    const timeWeight = Math.exp(-diffHours / 12);
    return sum + (obs.windSpeed / forecast - 1) × timeWeight;
}, 0) / totalWeight;
```

**Использование:** PilotObservationsModule

---

## 📊 Графики и визуализация

### 1. Time Series Chart — Временной ряд

**Библиотека:** Plotly.js  
**Контейнер:** `#timeSeriesChart`

**Данные:**
```javascript
{
    times: ["10:00", "11:00", "12:00", ...],  // 24-48 точек
    temperature: [5.2, 5.8, 6.1, ...],        // °C
    wind10m: [6.5, 7.2, 7.8, ...],            // м/с
    precip: [0.0, 0.0, 0.2, ...]              // мм
}
```

**Визуализация:**
- Температура — линия (красная)
- Ветер — линия (синяя)
- Осадки — столбцы (голубые)

**Оси:**
- X: Время (часы)
- Y левая: Температура (°C)
- Y правая: Ветер (м/с), Осадки (мм)

---

### 2. Vertical Wind Profile — Профиль ветра по высотам

**Библиотека:** Plotly.js  
**Контейнер:** `#verticalWindChart`

**Данные:**
```javascript
{
    heights: [10, 100, 250, 350, 450, 550],  // м
    windSpeeds: [5, 7, 10, 12, 14, 16]       // м/с
}
```

**Визуализация:**
- Линия с заполнением (синяя)
- Маркеры на высотах

**Оси:**
- X: Ветер (м/с)
- Y: Высота (м)

---

### 3. Temperature Profile — Профиль температуры

**Библиотека:** Plotly.js  
**Контейнер:** `#temperatureProfileChart`

**Данные:**
```javascript
{
    heights: [10, 100, 250, 350, 450, 550],  // м
    temps: [20, 19, 17, 15, 13, 11]          // °C
}
```

**Визуализация:**
- Линия с маркерами (красная)

**Оси:**
- X: Температура (°C)
- Y: Высота (м)

---

### 4. Wind Rose — Роза ветров

**Библиотека:** Plotly.js (polar)  
**Контейнер:** `#windRoseChart`

**Данные:**
```javascript
{
    directions: ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'],
    angles: [0, 45, 90, 135, 180, 225, 270, 315],
    avgWind: [5, 7, 6, 8, 7, 6, 5, 6]  // м/с
}
```

**Визуализация:**
- Бары по секторам
- Цветовое кодирование (зелёный/оранжевый/красный)

---

### 5. Turbulence Index — Индекс турбулентности

**Библиотека:** Plotly.js  
**Контейнер:** `#turbulenceChart`

**Данные:**
```javascript
{
    times: ["10:00", "11:00", ...],
    turbulence: [25, 30, 45, 60, 55, ...]  // %
}
```

**Визуализация:**
- Линия с заполнением (оранжевая)
- Пороговые линии (50% — средняя, 75% — высокая)

**Оси:**
- X: Время
- Y: Турбулентность (%)

---

### 6. Ceiling Chart — Высота нижней границы облаков

**Библиотека:** Plotly.js  
**Контейнер:** `#ceilingChart`

**Данные:**
```javascript
{
    times: ["10:00", "11:00", ...],
    ceiling: [1500, 1200, 800, 600, ...]  // м
}
```

**Визуализация:**
- Линия с заполнением (фиолетовая)
- Пороговая линия (300 м — минимум)

**Оси:**
- X: Время
- Y: Высота (м)

---

### 7. Flight Windows Calendar — Тепловая карта окон

**Библиотека:** Plotly.js (heatmap)  
**Контейнер:** `#flightWindowsChart`

**Данные:**
```javascript
{
    x: ["0:00", "1:00", ..., "23:00"],  // 24 часа
    y: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    z: [
        [0, 0, 1, 1, 1, 0, 0, ...],  // Пн
        [0, 1, 1, 1, 0, 0, 0, ...],  // Вт
        ...
    ]  // 0=low, 1=medium, 2=high risk
}
```

**Визуализация:**
- Тепловая карта
- Цвета: зелёный (low), оранжевый (medium), красный (high)

---

### 8. Comparison Chart — Сравнение прогноз/факт

**Библиотека:** Plotly.js  
**Контейнер:** `#comparisonChart`

**Данные:**
```javascript
{
    times: [...],
    forecast: { temperature: [...], wind: [...] },
    actual: { temperature: [...], wind: [...] }
}
```

**Визуализация:**
- Прогноз — пунктирная линия (синяя)
- Факт — сплошная линия (красная)

---

### 9. Route Profile — Профиль маршрута с рисками

**Библиотека:** Plotly.js  
**Контейнер:** `#routeProfileChart`

**Данные:**
```javascript
{
    distances: [0, 10, 20, 30, 40, 50],  // км
    risks: [1, 1, 2, 2, 3, 2]            // 1=low, 2=medium, 3=high
}
```

**Визуализация:**
- Ступенчатая линия
- Цветовое кодирование точек

**Оси:**
- X: Дистанция (км)
- Y: Уровень риска

---

## 📋 Таблицы и данные

### 1. Таблица почасовых данных (Detailed Table)

**Контейнер:** `#detailedTable`  
**Вкладка:** Детали

**Структура:**
```
┌──────┬────────┬─────────┬──────────┬────────────┬───────────┬────────┐
│ Время│ Статус │ Высоты  │ Ветер    │ Осадки     │ Темп.     │ Риск   │
├──────┼────────┼─────────┼──────────┼────────────┼───────────┼────────┤
│ 10:00│ 🟢     │ 250-550м│ 6.2 м/с  │ 0.0 мм/ч   │ +5.2°C    │ Low    │
│ 11:00│ 🟢     │ 250-550м│ 6.8 м/с  │ 0.0 мм/ч   │ +5.8°C    │ Low    │
│ 12:00│ 🟠     │ 250-550м│ 8.5 м/с  │ 0.2 мм/ч   │ +6.1°C    │ Medium │
└──────┴────────┴─────────┴──────────┴────────────┴───────────┴────────┘
```

**Данные:** `WeatherModule.analyzeForecast().hourly`

---

### 2. Таблица сравнения прогноз/факт

**Контейнер:** `#pilotComparisonTable`  
**Модальное окно:** Сидя на земле

**Структура:**
```
┌──────────────┬──────────┬──────────┬─────────────────┐
│ Параметр     │ Прогноз  │ Факт     │ Δ (дельта)      │
├──────────────┼──────────┼──────────┼─────────────────┤
│ Ветер (м/с)  │ 8.0      │ 11.0     │ +38%            │
│ Направление  │ 245°     │ 260°     │ —               │
│ Температура  │ +5.0°C   │ +3.0°C   │ -2.0°C          │
│ Влажность    │ 70%      │ 85%      │ +15%            │
│ Видимость    │ 8.5 км   │ 5.0 км   │ —               │
│ Туман        │ Нет      │ Да       │ ⚠️ Не спрогн.   │
│ Осадки       │ Нет      │ Да       │ ⚠️ Не спрогн.   │
└──────────────┴──────────┴──────────┴─────────────────┘
```

**Данные:** `PilotModule.displayComparison()`

---

### 3. Таблица сегментов маршрута

**Контейнер:** PDF отчёт, вкладка Отчёт  
**Данные:** `RouteModule.segmentAnalysis`

**Структура:**
```
┌─────────┬────────┬─────────┬──────────┬───────────┬────────────┬──────┐
│ Сегмент │ Дист.  │ Высота  │ Ветер    │ Темп.     │ Давление   │ Риск │
├─────────┼────────┼─────────┼──────────┼───────────┼────────────┼──────┤
│ 1       │ 7.5 км │ 250 м   │ 3 м/с    │ -8°C      │ 738 мм     │ НИЗ  │
│         │        │ 350 м   │ 3 м/с    │ -8°C      │ 729 мм     │ СР   │
│         │        │ 450 м   │ 4 м/с    │ -9°C      │ 720 мм     │ СР   │
│         │        │ 550 м   │ 4 м/с    │ -10°C     │ 712 мм     │ НИЗ  │
├─────────┼────────┴─────────┴──────────┴───────────┴────────────┴──────┤
│ 2       │ 8.2 км │ ...                                                │
└─────────┴─────────────────────────────────────────────────────────────┘
```

---

### 4. Таблица благоприятных окон

**Контейнер:** `#flightWindowsTable`, PDF отчёт  
**Данные:** `WeatherModule.findFlightWindows()`

**Структура:**
```
┌────┬────────┬──────────┬──────────────┬─────────────┐
│ №  │ Начало │ Окончание│ Длительность │ Сред. риск  │
├────┼────────┼──────────┼──────────────┼─────────────┤
│ 1  │ 10:00  │ 14:00    │ 4 ч          │ Low         │
│ 2  │ 18:00  │ 21:00    │ 3 ч          │ Low         │
└────┴────────┴──────────┴──────────────┴─────────────┘
```

---

### 5. Таблица сохранённых маршрутов

**Контейнер:** Шаг 1 мастера  
**Данные:** `Storage.getSavedRoutes()`

**Структура:**
```
┌──────────────────┬───────────┬────────┬────────────┬──────────┐
│ Название         │ Дистанция │ Точек  │ Дата       │ Действия │
├──────────────────┼───────────┼────────┼────────────┼──────────┤
│ Маршрут 26.02    │ 52.9 км   │ 6      │ 26.02.2026 │ [⬇] [🗑] │
│ Маршрут 25.02    │ 38.4 км   │ 4      │ 25.02.2026 │ [⬇] [🗑] │
└──────────────────┴───────────┴────────┴────────────┴──────────┘
```

---

### 6. Таблица настроек порогов

**Контейнер:** Модальное окно настроек  
**Данные:** `Storage.getThresholds()`

**Структура:**
```
┌──────────────────┬──────────┬─────────┬──────────┐
│ Параметр         │ Значение │ Ед. изм │ Мин/Макс │
├──────────────────┼──────────┼─────────┼──────────┤
│ Ветер (земля)    │ 10       │ м/с     │ 0-50     │
│ Ветер (высота)   │ 15       │ м/с     │ 0-50     │
│ Видимость        │ 2        │ км      │ 0.1-10   │
│ Осадки           │ 1.4      │ мм/ч    │ 0-10     │
│ Темп. мин        │ -10      │ °C      │ -40-+50  │
│ Темп. макс       │ 35       │ °C      │ -40-+50  │
│ Облака (база)    │ 300      │ м       │ 0-5000   │
│ Влажность        │ 80       │ %       │ 0-100    │
└──────────────────┴──────────┴─────────┴──────────┘
```

---

### 7. Таблица наблюдений пилота

**Контейнер:** PilotObservationsModule UI  
**Данные:** `PilotObservationsModule.getAll()`

**Структура:**
```
┌────┬──────────┬──────────┬────────┬─────────┬──────────┬────────┬──────────┐
│ №  │ Время    │ Широта   │ Долгота│ Ветер   │ Темп.    │ Влажн. │ Флаги    │
├────┼──────────┼──────────┼────────┼─────────┼──────────┼────────┼──────────┤
│ 1  │ 10:30    │ 55.7558  │ 37.6173│ 11 м/с  │ +3.0°C   │ 85%    │ 🌫️🌧️     │
│ 2  │ 11:00    │ 55.7600  │ 37.6200│ 10 м/с  │ +3.5°C   │ 82%    │ —        │
└────┴──────────┴──────────┴────────┴─────────┴──────────┴────────┴──────────┘
```

---

### 8. Параметры на главной панели

**Контейнер:** `#mainContent .params-grid`  
**Данные:** `WeatherModule.analyzeForecast().hourly[0]`

**Структура:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Ветер 10м│ Ветер 500м│ Видимость│ Темп.    │ Осадки   │ Обледен. │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ 6.2 м/с  │ 12.1 м/с │ >5 км    │ +5°C     │ 0.0 мм/ч │ НИЗ      │
│ OK       │ OK       │ OK       │ OK       │ OK       │ OK       │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

### 9. Сводка маршрута

**Контейнер:** PDF отчёт (стр. 1), UI статуса  
**Данные:** `RouteModule.getRouteSummary()`

**Структура:**
```
┌──────────────┬────────────┬─────────────┬──────────────┐
│ Дистанция    │ Время      │ Сегментов   │ Общий риск   │
├──────────────┼────────────┼─────────────┼──────────────┤
│ 52.9 км      │ 32 мин     │ 6           │ НИЗКИЙ       │
└──────────────┴────────────┴─────────────┴──────────────┘
```

---

### 10. Детализация по сегментам (4 высоты)

**Контейнер:** PDF отчёт (стр. 2+)  
**Данные:** `WeatherModule.interpolateForAltitude()`

**Структура для каждого сегмента:**
```
Сегмент 1 — 7.5 км
┌────────┬─────────┬──────────┬───────────┬────────────┬─────────┐
│ Высота │ Ветер   │ Темп.    │ Давление  │ Влажность  │ Риск    │
├────────┼─────────┼──────────┼───────────┼────────────┼─────────┤
│ 250 м  │ 3 м/с   │ -8°C     │ 738 мм    │ 86%        │ НИЗ     │
│ 350 м  │ 3 м/с   │ -8°C     │ 729 мм    │ 84%        │ СР      │
│ 450 м  │ 4 м/с   │ -9°C     │ 720 мм    │ 82%        │ СР      │
│ 550 м  │ 4 м/с   │ -10°C    │ 712 мм    │ 80%        │ НИЗ     │
└────────┴─────────┴──────────┴───────────┴────────────┴─────────┘
Факторы риска: Риск обледенения • Снижение видимости
```

---

## 🎯 Пользовательские сценарии

### Сценарий 1: Быстрый анализ точки

```
1. Пользователь открывает MIRA
2. Нажимает "Моё местоположение" (геолокация)
3. Нажимает "Анализ"
4. Получает:
   - Прогноз на 24-48 часов
   - Статус полёта (🟢/🟠/🔴)
   - 6 параметров с бейджами
   - Рекомендации
   - Временные окна
5. Может экспортировать PDF
```

**Задействованные функции:** 15+  
**Время выполнения:** ~2-3 секунды

---

### Сценарий 2: Анализ маршрута

```
1. Пользователь нажимает "🛤️" (режим маршрута)
2. Кликает по карте — добавляет точки A, B, C...
3. Нажимает "🔍" (анализ маршрута)
4. Система:
   - Разбивает на сегменты (10 км)
   - Запрашивает прогноз для каждого
   - Анализирует риски
   - Отображает на карте (цвет сегментов)
5. Пользователь видит:
   - Сводку маршрута
   - Рекомендации по сегментам
   - Графики
   - Детальную таблицу
6. Экспорт PDF (2+ страницы)
```

**Задействованные функции:** 30+  
**Время выполнения:** ~5-10 секунд (зависит от длины маршрута)

---

### Сценарий 3: Коррекция по фактическим данным

```
1. Пользователь нажимает "🚩 Сидя на земле"
2. Вводит данные с датчиков:
   - Ветер: 11 м/с (прогноз 8 м/с)
   - Температура: +3°C (прогноз +5°C)
   - Влажность: 85% (прогноз 70%)
   - Туман: да
3. Нажимает "Применить коррекцию"
4. Система:
   - Рассчитывает коэффициенты
   - Применяет с затуханием
   - Пересчитывает риски
   - Обновляет рекомендации
5. Пользователь видит:
   - Сравнение прогноз/факт
   - Скорректированный статус
   - Макс. допустимую высоту
```

**Задействованные функции:** 20+  
**Время выполнения:** ~1-2 секунды

---

### Сценарий 4: Множественные наблюдения (advanced)

```
1. Пользователь вводит несколько наблюдений:
   - Наблюдение 1: 10:30, точка A
   - Наблюдение 2: 11:00, точка B
   - Наблюдение 3: 11:30, точка C
2. Система:
   - Сохраняет наблюдения
   - Применяет взвешенную коррекцию
   - Учитывает временное затухание
   - Пересчитывает все риски
3. Результат:
   - Более точный прогноз
   - Учёт пространственных различий
```

**Задействованные функции:** 14+  
**Время выполнения:** ~2-3 секунды

---

### Сценарий 5: Экспорт отчёта

```
1. Пользователь нажимает "📄"
2. Система генерирует PDF:
   - Страница 1: Заголовок, сводка, рекомендации, окна
   - Страница 2+: Детализация по сегментам (4 высоты)
3. Автоматическое скачивание файла
```

**Задействованные функции:** 24+  
**Время выполнения:** ~3-5 секунд

---

## 🎨 Состояния и статусы

### Статусы полёта

| Статус | Класс CSS | Цвет | Условия |
|--------|-----------|------|---------|
| **ПОЛЁТ РАЗРЕШЁН** | `status-allowed` | 🟢 #38a169 | riskCount = 0 |
| **ПОЛЁТ С ОГРАНИЧЕНИЯМИ** | `status-restricted` | 🟠 #ed8936 | riskCount = 1 |
| **ПОЛЁТ ЗАПРЕЩЁН** | `status-forbidden` | 🔴 #e53e3e | riskCount ≥ 2 |

---

### Уровни риска

| Уровень | Score | Цвет | CSS класс |
|---------|-------|------|-----------|
| **Low** | 0-1 | 🟢 #38a169 | `badge-ok` |
| **Medium** | 2-4 | 🟠 #ed8936 | `badge-warn` |
| **High** | 5+ | 🔴 #e53e3e | `badge-danger` |

---

### Типы рекомендаций

| Тип | Иконка | Цвет | Описание |
|-----|--------|------|----------|
| **success** | ✅ fa-check-circle | 🟢 | Благоприятные условия |
| **warning** | ⚡ fa-exclamation-triangle | 🟠 | Предупреждение |
| **critical** | ❌ fa-times-circle | 🔴 | Критично |
| **info** | ℹ️ fa-info-circle | 🔵 | Информация |

---

### Состояния загрузки

| Состояние | Индикатор | Описание |
|-----------|-----------|----------|
| **Idle** | — | Ожидание действия |
| **Loading** | Спиннер | Загрузка данных |
| **Processing** | Прогресс бар | Обработка данных |
| **Success** | ✅ Галочка | Успешное завершение |
| **Error** | ❌ Крестик | Ошибка |

---

## 📋 Требования к дашборду

### 1. Макет (Layout)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Логотип | Дата/Время | Профиль | Настройки        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐  ┌─────────────────────────────────────┐   │
│  │            │  │                                     │   │
│  │  SIDEBAR   │  │           MAIN CONTENT              │   │
│  │            │  │                                     │   │
│  │  • Обзор   │  │  ┌─────────────────────────────┐   │   │
│  │  • Карта   │  │  │  КАРТА (OpenLayers)         │   │   │
│  │  • График  │  │  │                             │   │   │
│  │  • Таблица │  │  └─────────────────────────────┘   │   │
│  │  • Отчёты  │  │                                     │   │
│  │            │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │   │
│  │            │  │  │Пар- │ │Пар- │ │Пар- │ │Пар- │   │   │
│  │            │  │  │ам.1 │ │ам.2 │ │ам.3 │ │ам.4 │   │   │
│  │            │  │  └─────┘ └─────┘ └─────┘ └─────┘   │   │
│  └────────────┘  └─────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ FOOTER: Статус | Версия | Контакты                         │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Компоненты дашборда

#### A. Верхняя панель (Header)

| Элемент | Назначение | Данные |
|---------|------------|--------|
| Логотип MIRA | Бренд | — |
| Дата/Время | Текущее время | `new Date()` |
| Индикатор связи | Статус API | Online/Offline |
| Профиль пользователя | Имя, настройки | localStorage |
| Настройки | Модальное окно | Storage.getThresholds() |
| Уведомления | Toast сообщения | App.showToast() |

---

#### B. Боковая панель (Sidebar)

| Раздел | Подразделы | Иконка |
|--------|------------|--------|
| **Обзор** | Главная, Статус | fa-home |
| **Карта** | Маршруты, Зоны риска | fa-map |
| **Анализ** | Графики, Таблицы | fa-chart-bar |
| **Пилот** | Ввод данных, Наблюдения | fa-flag |
| **Отчёты** | PDF, Экспорт | fa-file-pdf |
| **Настройки** | Пороги, Маршруты | fa-cog |

---

#### C. Основная область (Main Content)

**Виджеты:**

| Виджет | Размер | Данные | Обновление |
|--------|--------|--------|------------|
| **Статус полёта** | 1×1 | Risk level | По запросу |
| **Параметры (4 карточки)** | 1×1 каждый | Weather data | По запросу |
| **Карта** | 2×2 | OpenLayers | Real-time |
| **Временной ряд** | 2×1 | Plotly | По запросу |
| **Роза ветров** | 1×1 | Plotly | По запросу |
| **Турбулентность** | 1×1 | Plotly | По запросу |
| **Окна полёта** | 1×1 | Flight windows | По запросу |
| **Рекомендации** | 1×2 | Recommendations | По запросу |
| **Последние маршруты** | 1×1 | Saved routes | При загрузке |

---

### 3. Интерактивность

#### События пользователя

| Событие | Действие | Обратная связь |
|---------|----------|----------------|
| Клик по карте | Добавить точку | Маркер + popup |
| Двойной клик | Закрыть popup | Popup исчезает |
| Перетаскивание | Перемещение карты | Плавное движение |
| Колёсико мыши | Масштаб | Zoom in/out |
| Клик по кнопке | Выполнение действия | Toast + спиннер |
| Ввод данных | Валидация | Подсветка ошибок |

---

#### Автоматические обновления

| Данные | Частота | Триггер |
|--------|---------|---------|
| Геолокация | По запросу | Клик по кнопке |
| Метеоданные | 30 минут | Таймер / вручную |
| Статус полёта | После анализа | Изменение данных |
| Графики | После анализа | Новые данные |

---

### 4. Адаптивность

#### Брейкпоинты

| Устройство | Ширина | Layout |
|------------|--------|--------|
| Desktop | >1024px | 3 колонки |
| Tablet | 768-1024px | 2 колонки |
| Mobile | <768px | 1 колонка |

---

#### Мобильная версия

```
┌─────────────────────────┐
│ HEADER (свёрнутый)     │
├─────────────────────────┤
│                         │
│    КАРТА (full screen) │
│                         │
├─────────────────────────┤
│ BOTTOM SHEET (swipe up)│
│  • Параметры           │
│  • Статус              │
│  • Рекомендации        │
└─────────────────────────┘
```

---

### 5. Производительность

#### Целевые метрики

| Метрика | Цель | Текущее |
|---------|------|---------|
| First Contentful Paint | <1.5 с | ~1 с |
| Time to Interactive | <3 с | ~2 с |
| Total Blocking Time | <200 мс | ~150 мс |
| Cumulative Layout Shift | <0.1 | ~0.05 |

---

#### Оптимизации

- **Кэширование:** 30 минут для метеоданных
- **Ленивая загрузка:** Графики при переключении вкладок
- **Debouncing:** 250 мс для resize событий
- **Memoization:** Пересчёт только изменённых данных

---

### 6. Доступность (A11y)

#### Требования WCAG 2.1 AA

- ✅ Контрастность текста ≥ 4.5:1
- ✅ Поддержка клавиатуры (Tab, Enter, Escape)
- ✅ ARIA-атрибуты для кнопок и форм
- ✅ Альтернативный текст для иконок
- ✅ Фокус-индикаторы для всех интерактивных элементов

---

### 7. Безопасность

#### Меры защиты

| Угроза | Мера защиты |
|--------|-------------|
| XSS | Санитизация пользовательского ввода |
| CSRF | Проверка origin запросов |
| Данные геолокации | Только с разрешения пользователя |
| localStorage | Шифрование чувствительных данных |

---

## 📊 Сводная таблица функций для дашборда

### Must Have (критичные)

| № | Функция | Модуль | Приоритет |
|---|---------|--------|-----------|
| 1 | Получение прогноза | WeatherModule | P0 |
| 2 | Анализ рисков | WeatherModule | P0 |
| 3 | Отображение карты | MapModule | P0 |
| 4 | Построение маршрута | RouteModule | P0 |
| 5 | Статус полёта | AppModule | P0 |
| 6 | Рекомендации | WeatherModule | P0 |
| 7 | Временные окна | WeatherModule | P0 |
| 8 | Экспорт PDF | PdfExportModule | P0 |

---

### Should Have (важные)

| № | Функция | Модуль | Приоритет |
|---|---------|--------|-----------|
| 9 | Коррекция по пилоту | PilotModule | P1 |
| 10 | Графики (7 типов) | ChartsModule | P1 |
| 11 | Таблица деталей | WizardModule | P1 |
| 12 | Сохранение маршрутов | StorageModule | P1 |
| 13 | KML импорт/экспорт | MapModule | P1 |
| 14 | Зоны риска на карте | MapModule | P1 |

---

### Nice to Have (дополнительные)

| № | Функция | Модуль | Приоритет |
|---|---------|--------|-----------|
| 15 | Множественные наблюдения | PilotObservationsModule | P2 |
| 16 | Взвешенная коррекция | PilotObservationsModule | P2 |
| 17 | Тепловая карта окон | ChartsModule | P2 |
| 18 | Сравнение прогноз/факт | ChartsModule | P2 |
| 19 | Настройки порогов | StorageModule | P2 |
| 20 | История наблюдений | PilotObservationsModule | P2 |

---

## 🎯 Рекомендации для проектирования дашборда

### 1. Архитектура

- **Микромодули:** Разделить на независимые виджеты
- **State Management:** Redux/Vuex для глобального состояния
- **Компоненты:** React/Vue для переиспользования

### 2. UI/UX

- **Единая цветовая схема:** Зелёный/Оранжевый/Красный для рисков
- **Консистентность:** Одинаковые стили для карточек
- **Прогрессивное раскрытие:** От простого к сложному

### 3. Производительность

- **Code splitting:** Разделение на чанки
- **Virtual scrolling:** Для больших таблиц
- **Web Workers:** Для тяжёлых расчётов

### 4. Тестирование

- **Unit тесты:** Для расчётов (риски, интерполяция)
- **Integration тесты:** Для сценариев (маршрут, коррекция)
- **E2E тесты:** Полные пользовательские сценарии

---

**Версия анализа:** 1.0  
**Дата:** 26 февраля 2026 г.  
**Для:** Проектирование нового дашборда MIRA
