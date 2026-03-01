# 🔍 MULTI-ROUTE MODULE — ГЛУБОКИЙ АНАЛИЗ ЛОГИКИ

**Версия:** 0.3.0  
**Дата:** 1 марта 2026 г.

---

## 📊 АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────┐
│                    MIRA Multi-Route System                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │  MultiRoute     │     │  MultiRouteUI   │               │
│  │  Module         │◄───►│  Controller     │               │
│  │  (Данные)       │     │  (Интерфейс)    │               │
│  └────────┬────────┘     └────────┬────────┘               │
│           │                       │                        │
│           ▼                       ▼                        │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │  MultiRoute     │     │  MultiRoute     │               │
│  │  Energy         │     │  Map Module     │               │
│  │  Calculator     │     │  (Визуализация) │               │
│  └─────────────────┘     └─────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 ПОШАГОВАЯ ЛОГИКА РАБОТЫ

### Шаг 1: Инициализация

```javascript
// При загрузке страницы
MultiRouteModule.init();
MultiRouteUI.init();

// Результат:
// - takeoffPoints = []
// - routes = []
// - assignment = null
```

### Шаг 2: Добавление точки взлёта

```javascript
MultiRouteModule.addTakeoffPoint({
    lat: 55.75,
    lon: 37.61,
    name: 'База 1',
    priority: 1,
    voltage: 25.4,
    capacity: 39000,
    antenna: 60
});

// Результат:
// takeoffPoints = [
//   {
//     id: 'base-1234567890',
//     name: 'База 1',
//     lat: 55.75,
//     lon: 37.61,
//     battery: { voltage: 25.4, capacity: 39000, minVoltage: 19.8 },
//     antenna: 60
//   }
// ]
```

### Шаг 3: Загрузка маршрута

```javascript
// Пользователь загружает KML или создаёт маршрут
MultiRouteModule.addRoute({
    id: 'route-1',
    name: 'Маршрут 1',
    segments: [
        { id: 1, lat: 55.75, lon: 37.61, distance: 5 },
        { id: 2, lat: 55.76, lon: 37.62, distance: 5 },
        // ...
    ],
    totalDistance: 50
});

// Результат:
// routes = [
//   {
//     id: 'route-1',
//     name: 'Маршрут 1',
//     segments: [...],
//     totalDistance: 50,
//     status: 'pending',
//     entryPoint: null,
//     flightPlan: null,
//     assignedBase: null
//   }
// ]
```

### Шаг 4: Поиск точки входа

```javascript
// Для каждого маршрута находится ближайшая точка к базе
const entryPoint = MultiRouteModule.findNearestEntryPoint(
    route,
    takeoffPoint
);

// Логика:
// 1. Для каждого сегмента маршрута считается расстояние до базы
// 2. Выбирается сегмент с минимальным расстоянием
// 3. Этот сегмент становится точкой входа

// Результат:
// entryPoint = {
//     segmentId: 3,
//     lat: 55.77,
//     lon: 37.63,
//     distance: 2.5  // км от базы
// }
```

### Шаг 5: Расчёт плана полёта

```javascript
const flightPlan = MultiRouteModule.calculateFlightPlan(
    route,
    entryPoint,
    takeoffPoint
);

// Логика:
// 1. Левая сторона: от точки входа к началу маршрута
//    С3 → С2 → С1 (10 км)
//
// 2. Правая сторона: от точки входа к концу маршрута
//    С3 → С4 → С5 → ... → С10 (25 км)
//
// 3. Возврат в точку входа (0 км, уже там)

// Результат:
// flightPlan = {
//     entryPoint: { segmentId: 3, ... },
//     leftSide: {
//         direction: 'С3 → С1',
//         distance: 10,
//         energy: 85
//     },
//     rightSide: {
//         direction: 'С3 → С10',
//         distance: 25,
//         energy: 210
//     },
//     total: {
//         distance: 35,
//         energy: 295,
//         time: 42
//     }
// }
```

### Шаг 6: Проверка ограничений

```javascript
// 1. Проверка антенны (60 км)
const antennaCheck = MultiRouteModule.checkAntennaRange(
    route,
    takeoffPoint,
    60
);

// Логика:
// - Для каждого сегмента считается расстояние до базы
// - Если все ≤ 60 км → true
// - Иначе → false

// 2. Проверка энергии
const energyCheck = MultiRouteModule.checkEnergyBudget(
    route,
    battery,
    flightPlan
);

// Логика:
// - Доступная энергия = U_среднее × Ёмкость × 0.8
// - (25.4+19.8)/2 × 39 × 0.8 = 658 Вт·ч
// - Если flightPlan.total.energy ≤ 658 × 0.9 → true
```

### Шаг 7: Оптимизация распределения

```javascript
const assignment = MultiRouteModule.optimizeAssignment(weatherData);

// Логика:
// 1. Для каждой базы:
//    а) Анализ погоды (поиск благоприятного окна)
//    б) Поиск доступных маршрутов (antennaCheck + energyCheck)
//    в) Сортировка по приоритету (ближайшие сначала)
//
// 2. Глобальная оптимизация:
//    - Исключение дублирования маршрутов
//    - Один маршрут = одна база
//
// 3. Детальный расчёт энергии:
//    - Подход к первому маршруту
//    - Все маршруты с переходами
//    - Возврат на базу

// Результат:
// assignment = [
//   {
//     base: { ... },
//     routes: [route1, route2, ...],
//     totalDistance: 100,
//     totalEnergy: 760,
//     energyCalculation: {
//         stages: [...],
//         totalDistance: 100,
//         totalEnergy: 760,
//         reserve: 18,
//         status: 'allowed'
//     }
//   }
// ]
```

### Шаг 8: Визуализация на карте

```javascript
MultiRouteUI.displayAllData();

// Логика:
// 1. Очистка карты
// 2. Отображение точек взлёта (иконки 🚁)
// 3. Отображение зон антенн (круги 60 км)
// 4. Отображение маршрутов (цветные линии)
// 5. Приближение ко всем объектам
```

---

## 📊 ПОЛНЫЙ ПРИМЕР РАБОТЫ

### Входные данные:

```
Базы:
- База А: lat=55.75, lon=37.61, antenna=60 км

Маршруты:
- Маршрут 1: 10 сегментов × 5 км = 50 км
- Маршрут 2: 10 сегментов × 5 км = 50 км
- Маршрут 3: 10 сегментов × 5 км = 50 км
```

### Процесс оптимизации:

```
1. Поиск точек входа:
   - Маршрут 1: С3 (2.5 км от базы)
   - Маршрут 2: С2 (4.0 км от базы)
   - Маршрут 3: С4 (6.5 км от базы)

2. Проверка антенны:
   - Все сегменты ≤ 60 км → ✅

3. Расчёт энергии:
   - Маршрут 1: 295 Вт·ч
   - Маршрут 2: 310 Вт·ч
   - Маршрут 3: 285 Вт·ч

4. Переходы:
   - База → Маршрут 1: 18 Вт·ч
   - Маршрут 1 → Маршрут 2: 28 Вт·ч
   - Маршрут 2 → Маршрут 3: 20 Вт·ч
   - Маршрут 3 → База: 45 Вт·ч

5. Итого:
   - Дистанция: 163 км
   - Энергия: 1001 Вт·ч
   - Доступно: 658 Вт·ч
   - Резерв: -52% ❌

6. Решение:
   - Пропустить Маршрут 3
   - Итого: 113 км, 653 Вт·ч
   - Резерв: 1% ⚠️
```

---

## ⚠️ ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ

### 1. Повторная инициализация

**Проблема:**
```
✅ MultiRouteUI инициализирован
✅ MultiRouteUI инициализирован
✅ Добавлена точка взлёта: База 1
✅ Добавлена точка взлёта: База 1
```

**Причина:**
- `MultiRouteUI.init()` вызывается из `DashboardModule.init()`
- `DashboardModule.init()` вызывается несколько раз

**Решение:**
```javascript
init() {
    if (this.initialized) return;
    this.initialized = true;
    this.bindEvents();
}
```

### 2. Карта не инициализирована

**Проблема:**
```javascript
MultiRouteMapModule.displayTakeoffPoint(point);
// Ошибка: this.map is undefined
```

**Причина:**
- `MultiRouteMapModule.init(map)` не вызывается
- Нет ссылки на объект карты OpenLayers

**Решение:**
```javascript
// В app.js или map.js
if (typeof MultiRouteMapModule !== 'undefined') {
    MultiRouteMapModule.init(map);
}
```

### 3. Данные не отображаются

**Проблема:**
- Маршруты добавлены, но не видны на карте

**Причина:**
- `displayAllData()` не вызывается после добавления
- Вкладка не обновляется при переключении

**Решение:**
```javascript
// В afterRender() вкладки
afterRender() {
    if (typeof MultiRouteUI !== 'undefined') {
        setTimeout(() => MultiRouteUI.displayAllData(), 100);
    }
}
```

---

## 🔧 РЕКОМЕНДАЦИИ ПО ИСПОЛЬЗОВАНИЮ

### Правильный порядок действий:

```javascript
// 1. Инициализация (автоматически при загрузке)
MultiRouteModule.init();
MultiRouteUI.init();

// 2. Добавление базы
MultiRouteModule.addTakeoffPoint({
    lat: 55.75,
    lon: 37.61,
    name: 'База А'
});

// 3. Загрузка маршрута
MultiRouteModule.addRoute({
    id: 'route-1',
    name: 'Маршрут 1',
    segments: [...]
});

// 4. Визуализация
MultiRouteUI.displayAllData();

// 5. Оптимизация
const assignment = MultiRouteModule.optimizeAssignment(weatherData);

// 6. Проверка результата
console.log('Распределение:', assignment);
console.log('Статистика:', MultiRouteModule.getSummary());
```

---

## 📊 СТРУКТУРА ДАННЫХ

### Полный объект assignment:

```javascript
assignment = [{
    base: {
        id: 'base-1234567890',
        name: 'База А',
        lat: 55.75,
        lon: 37.61,
        battery: {
            voltage: 25.4,
            capacity: 39000,
            minVoltage: 19.8
        },
        antenna: 60,
        weatherWindow: {
            start: '10:00',
            end: '12:00',
            duration: 120,
            avgWind: 5,
            status: 'good'
        }
    },

    routes: [{
        id: 'route-1',
        name: 'Маршрут 1',
        segments: [...],
        entryPoint: {
            segmentId: 3,
            lat: 55.77,
            lon: 37.63,
            distance: 2.5
        },
        flightPlan: {
            leftSide: { distance: 10, energy: 85 },
            rightSide: { distance: 25, energy: 210 },
            total: { distance: 35, energy: 295, time: 42 }
        },
        status: 'full',
        assignedBase: 'base-1234567890'
    }],

    energyCalculation: {
        stages: [
            {
                type: 'approach',
                description: 'Точка взлёта → Маршрут 1',
                distance: 2.5,
                energy: 18
            },
            {
                type: 'route',
                routeId: 'route-1',
                distance: 35,
                energy: 295
            },
            {
                type: 'return',
                description: 'Маршрут 1 → Точка взлёта',
                distance: 2.5,
                energy: 18
            }
        ],
        totalDistance: 40,
        totalTime: 58,
        totalEnergy: 331,
        availableEnergy: 658,
        reserve: 50,
        status: 'allowed'
    }
}];
```

---

**Статус:** ✅ Анализ завершён  
**Следующий шаг:** Исправление выявленных проблем
