# EnergyModule — Модуль энергоэффективности БВС

**Версия:** 1.0
**Дата:** 26 февраля 2026 г.
**Файлы:** `js/energy-model.js`, `js/energy-charts.js`

---

## 📋 Назначение

Модуль `EnergyModule` отвечает за:
- Расчёт энергопотребления БВС на маршруте
- Учёт ветра (встречный/попутный/боковой) по сегментам
- Учёт температуры, давления, влажности, плотности воздуха
- Расчёт энергии для маршрута ТАМ-ОБРАТНО
- Генерация рекомендаций по оптимизации энергии
- Визуализация энергобаланса

---

## 🔋 Профиль БВС по умолчанию

```javascript
{
    type: 'fixed-wing',           // fixed-wing | multirotor
    batteryCapacity: 39000,       // мА·ч (39 А·ч)
    batteryVoltage: 25.4,         // В (6S LiPo, полный заряд)
    cutoffVoltage: 16.8,          // В (отсечка, 2.8В/ячейку)
    cruiseSpeed: 69,              // км/ч (крейсерская)
    maxFlightTime: 210,           // мин (3.5 часа)
    basePower: 120,               // Вт (бортовые системы)
    dragCoefficient: 0.185,       // коэффициент сопротивления
    weight: 8500,                 // г (8.5 кг)
    wingSpan: 2100,               // мм (2.1 м)
    batteryCycles: 0,             // циклов заряда
    minReserve: 0.25              // минимальный резерв (25%)
}
```

---

## 🧮 Основные формулы

### 1. Доступная энергия батареи

```javascript
E_доступная = U_среднее × Ёмкость × DoD × degradationFactor

где:
U_среднее = (U_полное + U_отсечки) / 2 = (25.4 + 16.8) / 2 = 21.1 В
DoD = 0.8 (80% глубина разряда)
degradationFactor = 1 - (cycles × 0.002) (деградация от циклов)
```

**Пример:**
```
E = 21.1 × 39 × 0.8 × 1.0 = 658 Вт·ч
```

---

### 2. Ветровые компоненты

```javascript
// Угол между ветром и маршрутом
θ = δ_ветра - α_маршрута

// Встречная/попутная составляющая
headwind = -V_w × cos(θ)
// Отрицательный = попутный, положительный = встречный

// Боковая составляющая
crosswind = V_w × sin(θ)
```

**Пример:**
```
Ветер: 10 м/с @ 270° (Западный)
Маршрут: 45° (СВ)

θ = 270 - 45 = 225°
headwind = -10 × cos(225°) = -10 × (-0.707) = +7.07 м/с (встречный)
crosswind = 10 × sin(225°) = 10 × (-0.707) = -7.07 м/с (слева)
```

---

### 3. Путевая скорость

```javascript
V_ground = V_cruise + headwind × 3.6

где:
V_cruise = 69 км/ч (крейсерская)
headwind в м/с, умножаем на 3.6 для перевода в км/ч
```

**Пример:**
```
V_ground = 69 + 7.07 × 3.6 = 69 + 25.4 = 94.4 км/ч (встречный ветер)
V_ground = 69 - 7.07 × 3.6 = 69 - 25.4 = 43.6 км/ч (попутный ветер)
```

---

### 4. Мощность

```javascript
P_total = P_base + P_aero + P_density + P_temp + P_precip + P_turb

где:
P_base = 120 Вт (бортовые системы)

P_aero = k_drag × (V_air)²
V_air = V_cruise + headwind × 3.6

P_density = P_aero × (ρ_0 / ρ - 1)
ρ = 1.225 × exp(-h / 8500) (плотность на высоте h)

P_temp = P_base / tempCorrection
tempCorrection = 1.0 при T ≥ 20°C
tempCorrection = 0.85 при T = 0°C
tempCorrection = 0.70 при T = -10°C

P_precip = P_total × precipPenalty
precipPenalty = 1.05 (дождь > 0.5 мм/ч)
precipPenalty = 1.15 (обледенение medium)
precipPenalty = 1.30 (обледенение high)

P_turb = P_total × turbPenalty
turbPenalty = 1.10 (gustFactor > 1.5)
turbPenalty = 1.05 (gustFactor > 1.2)
```

---

### 5. Энергия сегмента

```javascript
t_segment = distance_segment / V_ground  // часы
E_segment = P_total × t_segment  // Вт·ч
```

---

## 📊 Структура данных

### Результат расчёта

```javascript
{
    outbound: {
        direction: 'туда',
        bearing: 45,  // азимут маршрута
        segments: [
            {
                segmentId: 1,
                distance: 5,  // км
                bearing: 45,  // градусов
                altitude: 350,  // м
                wind: {
                    speed: 10,  // м/с
                    direction: 270,  // градусов
                    headwind: 7.07,  // м/с
                    crosswind: -7.07,  // м/с
                    isHeadwind: true,
                    isCrosswind: false
                },
                groundSpeed: 94.4,  // км/ч
                airSpeed: 94.4,  // км/ч
                power: 245,  // Вт
                time: 3.2,  // мин
                energy: 13.1,  // Вт·ч
                meteo: {
                    temp: 2.8,  // °C
                    pressure: 972,  // гПа
                    humidity: 62,  // %
                    density: 1.15,  // кг/м³
                    precip: 0,  // мм/ч
                    icingRisk: 'low'  // low|medium|high
                }
            },
            // ... ещё сегменты
        ],
        totalEnergy: 171.8,  // Вт·ч
        totalTime: 39,  // мин
        totalDistance: 30  // км
    },
    return: {
        direction: 'обратно',
        bearing: 225,  // азимут + 180°
        segments: [...],  // те же сегменты в обратном порядке
        totalEnergy: 85.7,
        totalTime: 19.5,
        totalDistance: 30
    },
    summary: {
        totalDistance: 60,  // км
        totalEnergy: 257.5,  // Вт·ч
        totalTime: 58.5,  // мин
        avgGroundSpeed: 61.5,  // км/ч
        energyReserve: 61,  // %
        canComplete: true,  // достаточно энергии
        hasReserve: true,  // есть резерв 25%
        status: {
            level: 'allowed',
            label: 'ПОЛЁТ РАЗРЕШЁН',
            color: '#38a169',
            icon: 'fa-battery-full',
            message: 'Достаточно энергии с запасом'
        }
    },
    battery: {
        total: 822,  // Вт·ч (полная)
        usable: 658,  // Вт·ч (80% DoD)
        withReserve: 493,  // Вт·ч (с резервом 25%)
        degradation: 1.0  // % текущей ёмкости
    },
    uavProfile: {...}  // профиль БВС
}
```

---

## 🔧 API модуля

### EnergyModule.getUAVProfile()

**Назначение:** Получить профиль БВС

**Возвращает:** object

**Пример:**
```javascript
const profile = EnergyModule.getUAVProfile();
console.log(profile.cruiseSpeed);  // 69 км/ч
```

---

### EnergyModule.saveUAVProfile(profile)

**Назначение:** Сохранить профиль БВС в localStorage

**Параметры:**
- `profile` (object) — профиль БВС

**Возвращает:** boolean

---

### EnergyModule.getAvailableEnergy(uavProfile)

**Назначение:** Получить доступную энергию с учётом деградации

**Параметры:**
- `uavProfile` (object, optional) — профиль БВС

**Возвращает:** object

**Пример:**
```javascript
const energy = EnergyModule.getAvailableEnergy();
console.log(energy.usable);  // 658 Вт·ч
console.log(energy.degradation);  // 1.0 (100%)
```

---

### EnergyModule.getWindComponents(windSpeed, windDir, routeBearing)

**Назначение:** Расчёт ветровых компонент

**Параметры:**
- `windSpeed` (number) — скорость ветра, м/с
- `windDir` (number) — направление ветра, градусов
- `routeBearing` (number) — азимут маршрута, градусов

**Возвращает:** object

**Пример:**
```javascript
const components = EnergyModule.getWindComponents(10, 270, 45);
console.log(components.headwind);  // +7.07 м/с (встречный)
console.log(components.crosswind);  // -7.07 м/с (слева)
console.log(components.isHeadwind);  // true
```

---

### EnergyModule.calculateRoundTripEnergy(route, forecast)

**Назначение:** Основной расчёт энергопотребления для маршрута туда-обратно

**Параметры:**
- `route` (object) — маршрут с сегментами
- `forecast` (object) — прогноз погоды

**Возвращает:** Promise<object>

**Пример:**
```javascript
const energyData = await EnergyModule.calculateRoundTripEnergy(
    RouteModule.currentRoute,
    WeatherModule.forecast
);

console.log(energyData.summary.totalEnergy);  // 257.5 Вт·ч
console.log(energyData.summary.energyReserve);  // 61%
console.log(energyData.summary.canComplete);  // true
```

---

### EnergyModule.generateRecommendations(energyData)

**Назначение:** Генерация рекомендаций по энергоэффективности

**Параметры:**
- `energyData` (object) — результат расчёта энергии

**Возвращает:** array

**Пример рекомендаций:**
```javascript
[
    {
        type: 'direction',
        level: 'info',
        title: 'Встречный ветер на пути "туда"',
        message: 'На пути "туда" расход на 50% больше. Рассмотрите вылет в обратном направлении.',
        icon: 'fa-wind'
    },
    {
        type: 'altitude',
        level: 'warning',
        title: 'Сильный ветер на крейсерской высоте',
        message: 'Рассмотрите полёт на другой высоте, где ветер слабее',
        icon: 'fa-arrow-up'
    },
    {
        type: 'temperature',
        level: 'warning',
        title: 'Низкая температура',
        message: 'Средняя температура -5°C. Ёмкость батареи снижена на 30%',
        icon: 'fa-thermometer-quarter'
    }
]
```

---

### EnergyModule.optimizeAltitude(route, forecast, altitudes)

**Назначение:** Оптимизация высоты для каждого сегмента

**Параметры:**
- `route` (object) — маршрут
- `forecast` (object) — прогноз
- `altitudes` (array) — варианты высот [250, 350, 450, 550]

**Возвращает:** array

**Пример:**
```javascript
const optimal = await EnergyModule.optimizeAltitude(
    RouteModule.currentRoute,
    WeatherModule.forecast,
    [250, 350, 450, 550]
);

optimal.forEach(seg => {
    console.log(`Сегмент ${seg.segment.id}: оптимальная высота ${seg.optimalAltitude}м`);
});
```

---

## 📈 Визуализация (EnergyChartsModule)

### createEnergyBalance(containerId, energyData)

**Назначение:** Pie chart баланса энергии

**Контейнер:** `#energyBalanceChart`

**Визуализация:**
- Потрачено (красный)
- Доступный резерв (зелёный)
- Обязательный резерв (оранжевый)

---

### createWindProfile(containerId, energyData)

**Назначение:** Профиль ветра вдоль маршрута

**Контейнер:** `#windProfileChart`

**Визуализация:**
- Встречный ветер (синяя линия)
- Боковой ветер (оранжевая пунктирная)
- Цветовая индикация (встречный/попутный)

---

### createGroundSpeedChart(containerId, energyData)

**Назначение:** Путевая скорость по сегментам

**Контейнер:** `#groundSpeedChart`

**Визуализация:**
- Туда (синяя сплошная)
- Обратно (красная пунктирная)
- Крейсерская (серая точка)

---

### createPowerChart(containerId, energyData)

**Назначение:** Мощность по сегментам

**Контейнер:** `#powerChart`

**Визуализация:**
- Столбчатая диаграмма
- Цвет по уровню риска (обледенение, ветер)

---

### create3DEnergyProfile(containerId, energyData)

**Назначение:** 3D профиль маршрута

**Контейнер:** `#energy3DChart`

**Визуализация:**
- X: Дистанция, км
- Y: Высота, м
- Z: Энергия, Вт·ч
- Цвет: Встречный ветер (красный-зелёный)

---

### renderEnergySummary(containerId, energyData)

**Назначение:** Сводная карточка энергоэффективности

**Контейнер:** `#energySummaryContainer`

**Структура:**
- Статус (цветной блок)
- 4 карточки: Дистанция, Время, Энергия, Резерв
- 2 блока: ТУДА / ОБРАТНО с деталями

---

## 🎯 Статусы энергоэффективности

| Статус | Условие | Цвет | Иконка |
|--------|---------|------|--------|
| **ПОЛЁТ РАЗРЕШЁН** | energyReserve ≥ 40% | 🟢 #38a169 | fa-battery-full |
| **СРЕДНИЙ РЕЗЕРВ** | 25% ≤ energyReserve < 40% | 🟡 #d69e2e | fa-battery-three-quarters |
| **МАЛЫЙ РЕЗЕРВ** | canComplete=true, hasReserve=false | 🟠 #ed8936 | fa-battery-half |
| **НЕДОСТАТОЧНО ЭНЕРГИИ** | canComplete=false | 🔴 #e53e3e | fa-battery-empty |

---

## 📊 Пример расчёта для маршрута 30 км

### Входные данные

```
Маршрут: A → B = 30 км (6 сегментов по 5 км)
Азимут "туда": 45° (СВ)
Азимут "обратно": 225° (ЮЗ)
Крейсерская высота: 350 м

Метео:
- Ветер: 8-11 м/с @ 270-295° (Западный)
- Температура: +1.8...+3.0°C
- Давление: 972 гПа
- Влажность: 58-70%
```

### Результат

```
┌─────────────────────────────────────────────────────────┐
│ МАРШРУТ: 30 км (ТАМ-ОБРАТНО)                            │
├─────────────────────────────────────────────────────────┤
│ НАПРАВЛЕНИЕ         │ ТАМ      │ ОБРАТНО   │ ВСЕГО     │
├─────────────────────┼──────────┼───────────┼───────────┤
│ Дистанция           │ 30 км    │ 30 км     │ 60 км     │
│ Время               │ 39 мин   │ 19.5 мин  │ 58.5 мин  │
│ Энергия             │ 171.8 Вт·ч│ 85.7 Вт·ч │ 257.5 Вт·ч│
│ Средняя скорость    │ 46.2 км/ч│ 92.3 км/ч │ 61.5 км/ч │
├─────────────────────┴──────────┴───────────┴───────────┤
│ БАТАРЕЯ: 658 Вт·ч (доступно)                           │
│ Потребление: 257.5 Вт·ч (39%)                          │
│ Остаток: 400.5 Вт·ч (61%) ✅                           │
│ С резервом 25%: 321.9 Вт·ч (49% остаток) ✅            │
├─────────────────────────────────────────────────────────┤
│ СТАТУС: ✅ ПОЛЁТ РАЗРЕШЁН                              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ Ограничения

### Точность модели

| Фактор | Погрешность |
|--------|-------------|
| Ветер | ±1.5 м/с |
| Температура | ±1°C |
| Давление | ±2 гПа |
| Плотность воздуха | ±3% |
| Мощность двигателя | ±5% |
| Ёмкость батареи | ±10% |

**Итоговая погрешность:** ±15%

### Рекомендации

1. Всегда иметь резерв ≥25%
2. Калибровать модель по фактическим полётам
3. Учитывать деградацию батареи
4. Мониторить температуру батареи в полёте

---

## 🔗 Интеграция

### Подключение в HTML

```html
<script src="js/energy-model.js"></script>
<script src="js/energy-charts.js"></script>
```

### Использование в wizard.js

```javascript
// Шаг 2, вкладка "Энергия"
async initEnergyAnalysis() {
    const energyData = await EnergyModule.calculateRoundTripEnergy(
        this.stepData.route,
        this.stepData.segmentAnalysis[0]?.analyzed
    );
    
    EnergyChartsModule.renderEnergySummary('energySummaryContainer', energyData);
    EnergyChartsModule.createEnergyBalance('energyBalanceChart', energyData);
    // ... другие графики
}
```

---

## 📝 Changelog

### Версия 1.0 (26.02.2026)

- ✅ Базовая модель энергопотребления
- ✅ Учёт ветра по сегментам и высотам
- ✅ Расчёт туда-обратно
- ✅ Визуализация (5 типов графиков)
- ✅ Генерация рекомендаций
- ✅ Интеграция в wizard (вкладка "Энергия")

---

**Версия документации:** 1.0
**Дата:** 26 февраля 2026 г.
**Модуль:** EnergyModule (js/energy-model.js, js/energy-charts.js)
