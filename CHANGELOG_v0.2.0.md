# MIRA v0.2.0 — Комплексное обновление метеомодели

## 📋 Обзор изменений

**Дата:** 5 марта 2026 г.  
**Версия:** 0.2.0 (major update)  
**Статус:** Готово к тестированию

---

## 🎯 Реализованные этапы

| Этап | Задачи | Статус | Файлы |
|------|--------|--------|-------|
| 1 | Вертикальное профилирование (7 высот), плотность воздуха | ✅ | `vertical-profile.js` |
| 2 | Логарифмический/степенной профиль ветра, эффект Экмана | ✅ | `vertical-profile.js` |
| 3 | Адаптивная интерполяция, K_rel, индикация качества | ✅ | `interpolator.js` |
| 4 | Верификация (MAE/RMSE), калибровка по телеметрии | ✅ | `verification.js` |
| 5 | JSON-экспорт, расширенные индексы (CAPE, LI, Ri) | ✅ | `atmospheric-indices.js` |
| 6 | Тестирование, документирование | ✅ | Этот документ |

---

## 📦 Новые модули

### 1. `vertical-profile.js` — Вертикальное профилирование

**Назначение:** Расчёт метеопараметров на 7 стандартных высотах (0-650м)

**Основные функции:**
- `buildVerticalProfile(surfaceData, options)` — построение полного профиля
- `calculateTemperature()` — температура с градиентом 0.65°C/100м
- `calculatePressure()` — барометрическая формула
- `calculateAirDensity()` — плотность воздуха (уравнение состояния)
- `calculateDensityAltitude()` — плотностная высота
- `calculateWindLogarithmic()` — логарифмический профиль (0-100м)
- `calculateWindPowerLaw()` — степенной профиль (>100м)
- `calculateWindDirectionEkman()` — эффект Экмана (поворот ветра)
- `calculateIcingRisk()` — риск обледенения
- `calculateRichardsonNumber()` — число Ричардсона
- `analyzeProfile()` — анализ и рекомендации

**Целевые высоты:**
```javascript
[0, 100, 250, 350, 450, 550, 650] // метры
```

**Пример использования:**
```javascript
const surfaceData = {
    temp2m: 15,
    dewpoint2m: 10,
    pressure: 1013,
    wind10m: 5,
    windDir10m: 270,
    humidity: 70
};

const profile = VerticalProfileModule.buildVerticalProfile(surfaceData);
// profile[0] → высота 0м
// profile[1] → высота 100м
// ...
// profile[6] → высота 650м
```

---

### 2. `interpolator.js` v2.0 — Адаптивная интерполяция

**Назначение:** Интерполяция METAR данных с адаптивной стратегией

**Новые функции:**
- `calculateKrel(N, avgDistance)` — коэффициент достоверности
- `getInterpolationMode(N)` — режим интерполяции
- `getAdaptiveAlpha(N)` — коэффициент смешивания с моделью
- `estimateQualityExtended()` — расширенная оценка качества

**Режимы работы:**

| Режим | Станций (N) | α (alpha) | Описание |
|-------|-------------|-----------|----------|
| Полная интерполяция | ≥ 3 | 0.75 | IDW + модель |
| Ограниченная экстраполяция | 1-2 | 0.4 | Перенос с градиентом |
| Глобальное моделирование | 0 | 0.0 | Только модель |

**Формула K_rel:**
```javascript
K_rel = (N / N_opt) * exp(-avgDistance / D_scale)

где:
  N_opt = 3 (оптимальное количество)
  D_scale = 250 км (масштабный коэффициент)
```

**Пример:**
```javascript
const result = MeteoInterpolator.interpolate(
    point,      // {lat, lon, elevation}
    airports,   // массив аэропортов
    metarData,  // данные METAR
    {
        globalData: { temp, wind, pressure } // данные модели
    }
);

console.log(result.K_rel);      // 0.82
console.log(result.mode);       // 'full'
console.log(result.alpha);      // 0.75
console.log(result.quality);    // { score: 85, level: 'high' }
```

---

### 3. `verification.js` — Верификация и калибровка

**Назначение:** Сравнение с фактическими данными, калибровка по телеметрии

**Основные функции:**
- `addObservation(observation, modelData)` — сохранение наблюдения
- `calculateMAE()` — средняя абсолютная ошибка
- `calculateRMSE()` — среднеквадратичная ошибка
- `calculateMAPE()` — средняя процентная ошибка
- `verifyParameter()` — верификация параметра
- `correctProfileWithTelemetry()` — калибровка профиля
- `compareSources()` — сравнение 3 источников

**Метрики:**
```javascript
MAE = (1/n) * Σ|Y_model - Y_fact|
RMSE = √[(1/n) * Σ(Y_model - Y_fact)²]
MAPE = (1/n) * Σ|(Y_model - Y_fact) / Y_fact| * 100%
```

**Калибровка профиля:**
```javascript
Z_corrected(h) = Z_model(h) + k * (Z_sensor(h_ref) - Z_model(h_ref)) * decay

где:
  decay = exp(-|h - h_ref| / 200)
  k = 0.5 (коэффициент коррекции)
```

**Пример:**
```javascript
// Добавление наблюдения
VerificationModule.addObservation(
    { temp: 14.5, wind: 6.2, location: {lat, lon} },
    { temp: 15.0, wind: 5.8 }
);

// Верификация
const metrics = VerificationModule.verifyParameter('temp');
console.log(metrics.mae);   // 0.5
console.log(metrics.rmse);  // 0.7

// Калибровка профиля
const corrected = VerificationModule.correctProfileWithTelemetry(
    modelProfile,
    { altitude: 300, temp: 12.5, wind: 7.0 },
    0.5
);
```

---

### 4. `atmospheric-indices.js` — Расширенные индексы

**Назначение:** Расчёт авиационных индексов и JSON-экспорт

**Индексы:**
- **CAPE** (Convective Available Potential Energy) — энергия конвекции
- **LI** (Lifted Index) — индекс подъёма
- **K-индекс** — грозовая активность
- **Число Ричардсона (Ri)** — стабильность слоя
- **EDR** (Eddy Dissipation Rate) — турбулентность
- **Индекс обледенения** — риск образования льда

**Интерпретация:**

| Индекс | Значение | Интерпретация |
|--------|----------|---------------|
| CAPE | > 2500 Дж/кг | Высокая конвекция ⚠️ |
| CAPE | 1000-2500 Дж/кг | Умеренная конвекция |
| LI | < -4 | Неустойчивая атмосфера ⚠️ |
| LI | 0 to -4 | Слабая неустойчивость |
| K | > 30 | Высокая вероятность гроз ⚠️ |
| Ri | < 0.25 | Турбулентность ⚠️ |
| EDR | > 0.3 | Сильная турбулентность ⚠️ |

**JSON-экспорт (полный формат):**
```javascript
const jsonData = AtmosphericIndicesModule.exportToJSON(
    location,      // {lat, lon, alt}
    surfaceData,   // поверхностные данные
    verticalProfile, // профиль 7 высот
    indices,       // индексы
    hazards,       // опасные явления
    metadata       // метаданные
);

AtmosphericIndicesModule.downloadJSON(jsonData, 'metar-data.json');
```

**Структура JSON:**
```json
{
  "location": {"lat": 55.75, "lon": 37.62, "alt_msl": 150},
  "timestamp_utc": "2026-03-05T12:00:00Z",
  "surface": {
    "temperature_c": 12.3,
    "wind_dir_deg": 245,
    "wind_speed_ms": 4.2,
    "pressure_hpa": 1013
  },
  "vertical_profile": [
    {"alt_m": 0, "temp_c": 12.3, "wind_ms": 4.2, "density_kgm3": 1.225, "icing_risk": "low"},
    {"alt_m": 100, "temp_c": 11.7, "wind_ms": 5.1, "density_kgm3": 1.213, "icing_risk": "low"},
    ...
  ],
  "hazards": [...],
  "indices": {
    "cape_jkg": 450,
    "li_c": -1.2,
    "k_index": 25,
    "richardson_min": 0.35,
    "edr": 0.18
  },
  "metadata": {
    "data_sources": ["METAR", "Open-Meteo"],
    "confidence": 0.89,
    "K_rel": 0.82
  }
}
```

---

## 🔄 Обновлённые модули

### `weather.js` v2.0

**Изменения:**
- ✅ Интеграция с `VerticalProfileModule`
- ✅ Поддержка 7 высот в `getVerticalProfile()`
- ✅ Новые функции: `calculateVerticalRiskScore()`, `getVerticalRiskFactors()`
- ✅ Улучшенная интерполяция для высот

### `index.html`

**Добавлены скрипты:**
```html
<script src="js/vertical-profile.js?v=20260305"></script>
<script src="js/verification.js?v=20260305"></script>
<script src="js/atmospheric-indices.js?v=20260305"></script>
<script src="js/interpolator.js?v=20260305"></script>
```

---

## 📊 Сводная таблица изменений

| Компонент | Было | Стало | Улучшение |
|-----------|------|-------|-----------|
| **Высоты профиля** | 4 (250-550м) | 7 (0-650м) | +75% охват |
| **Расчёт ветра** | Линейный | Лог + степень | Физически корректно |
| **Поворот ветра** | ❌ | ✅ (Экман) | +10-15° на высоте |
| **Плотность воздуха** | ❌ | ✅ | Критично для БВС |
| **Интерполяция** | IDW | Адаптивная | K_rel оценка |
| **Смешивание** | ❌ | ✅ (α коэффициент) | Модель + METAR |
| **Верификация** | ❌ | ✅ (MAE/RMSE) | Метрики точности |
| **Калибровка** | ❌ | ✅ (телеметрия) | Адаптация |
| **Индексы** | 2 | 7 | +5 новых |
| **Экспорт** | PDF | PDF + JSON | Полный формат |

---

## 🧪 План тестирования

### 1. Функциональное тестирование

| Тест | Ожидаемый результат | Статус |
|------|---------------------|--------|
| Вертикальный профиль (7 высот) | 7 уровней с данными | ⏳ |
| Плотность воздуха | 1.225 кг/м³ на 0м | ⏳ |
| Логарифмический ветер | Рост 0-100м | ⏳ |
| Эффект Экмана | Поворот 5-15° | ⏳ |
| K_rel расчёт | 0-1 для разных N | ⏳ |
| MAE/RMSE | Корректные метрики | ⏳ |
| Калибровка профиля | Затухание поправки | ⏳ |
| CAPE/LI | Реалистичные значения | ⏳ |
| JSON-экспорт | Валидная структура | ⏳ |

### 2. Интеграционное тестирование

- [ ] Загрузка всех модулей в браузере
- [ ] Совместимость с существующим кодом
- [ ] Работа METAR/TAF вкладки
- [ ] Экспорт данных

### 3. Нагрузочное тестирование

- [ ] Производительность при 12 аэропортах
- [ ] Кэширование данных
- [ ] Время расчёта профиля < 100мс

---

## 📝 Примеры использования

### Пример 1: Построение вертикального профиля

```javascript
// Данные с поверхности
const surfaceData = {
    temp2m: 18,
    dewpoint2m: 12,
    pressure: 1015,
    wind10m: 6,
    windDir10m: 250,
    humidity: 65,
    precip: 0,
    cloudCover: 40
};

// Построение профиля
const profile = VerticalProfileModule.buildVerticalProfile(surfaceData);

// Анализ
const analysis = VerticalProfileModule.analyzeProfile(profile);

console.log('Профиль:');
profile.forEach(level => {
    console.log(`${level.altitude}м: T=${level.temp}°C, V=${level.wind}м/с, ρ=${level.density}кг/м³`);
});

console.log('Рекомендации:', analysis.recommendations);
```

### Пример 2: Адаптивная интерполяция

```javascript
// Точка запроса
const point = { lat: 55.75, lon: 37.62, elevation: 150 };

// Данные METAR
const metarData = {
    'UUEE': { temp: 17, windSpeed: 5, windDir: 240, qnh: 1013 },
    'UUDD': { temp: 18, windSpeed: 6, windDir: 250, qnh: 1014 },
    'UUWW': { temp: 17.5, windSpeed: 5.5, windDir: 245, qnh: 1013 }
};

// Данные модели (Open-Meteo)
const globalData = {
    temp: 16.5,
    windSpeed: 5.8,
    windDir: 248,
    pressure: 1014
};

// Интерполяция
const result = MeteoInterpolator.interpolate(
    point,
    airports,
    metarData,
    { globalData }
);

console.log(`Режим: ${result.mode}, α=${result.alpha}, K_rel=${result.K_rel}`);
console.log(`Температура: ${result.interpolated.temp}°C`);
console.log(`Качество: ${result.quality.description.title}`);
```

### Пример 3: Верификация

```javascript
// Добавление наблюдений
VerificationModule.addObservation(
    {
        timestamp: '2026-03-05T12:00:00Z',
        location: { lat: 55.75, lon: 37.62 },
        temp: 17.5,
        wind: 5.8
    },
    {
        temp: 18.0,
        wind: 6.0
    }
);

// Верификация температуры
const tempMetrics = VerificationModule.verifyParameter('temp');
console.log(`MAE: ${tempMetrics.metrics.mae}°C`);
console.log(`RMSE: ${tempMetrics.metrics.rmse}°C`);

// Калибровка профиля
const correctedProfile = VerificationModule.correctProfileWithTelemetry(
    modelProfile,
    { altitude: 300, temp: 16.5, wind: 7.2 },
    0.5
);
```

### Пример 4: Расчёт индексов

```javascript
// Расчёт всех индексов
const indices = AtmosphericIndicesModule.calculateAllIndices(
    profile,
    surfaceData
);

console.log(`CAPE: ${indices.CAPE} Дж/кг`);
console.log(`LI: ${indices.LI}°C`);
console.log(`K-индекс: ${indices.K_index}`);
console.log(`Ричардсон: ${indices.Richardson_min}`);
console.log(`EDR: ${indices.EDR} м²/с³`);

// Интерпретация
indices.interpretation.forEach(item => {
    console.log(`${item.type}: ${item.text}`);
});
```

### Пример 5: JSON-экспорт

```javascript
// Полные данные
const jsonData = AtmosphericIndicesModule.exportToJSON(
    { lat: 55.75, lon: 37.62, alt: 150 },
    { temp: 18, wind: 6, pressure: 1015 },
    profile,
    indices,
    hazards,
    {
        sources: ['METAR', 'Open-Meteo'],
        confidence: 0.89,
        K_rel: 0.82
    }
);

// Скачивание
AtmosphericIndicesModule.downloadJSON(
    jsonData,
    `metar-data-${new Date().toISOString().slice(0,19)}.json`
);
```

---

## ⚠️ Известные ограничения

1. **CAPE/LI** — упрощённый расчёт (требуется полный профиль до 500 гПа)
2. **K-индекс** — требует данных на уровнях 850/700/500 гПа
3. **Эффект Экмана** — фиксированный коэффициент β=10°
4. **Плотность** — не учитывает влажность (можно улучшить)

---

## 🔜 Будущие улучшения

- [ ] Интеграция с OpenStreetMap для типа поверхности
- [ ] Полный расчёт CAPE/CIN с поиском LFC/EL
- [ ] Машинное обучение для калибровки
- [ ] Визуализация профилей в дашборде
- [ ] Автоматическая загрузка METAR при открытии вкладки

---

## 📚 Ссылки на документацию

- [МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md](./МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md) — полная спецификация
- [METAR-TAF ВКЛАДКА.md](./METAR-TAF ВКЛАДКА.md) — руководство по вкладке
- [СТО БВС-УСЛ-004-2026](./СТО БВС-УСЛ-004-2026 (адаптированный для MIRA).md) — стандарт

---

## ✅ Чеклист готовности

- [x] Все 6 этапов реализованы
- [x] Новые модули созданы
- [x] Существующие модули обновлены
- [x] Скрипты добавлены в index.html
- [x] Документация написана
- [ ] Тесты пройдены
- [ ] Пользователи протестировали

---

**Разработано:** 5 марта 2026 г.  
**Версия:** 0.2.0  
**Статус:** Готово к тестированию 🚀
