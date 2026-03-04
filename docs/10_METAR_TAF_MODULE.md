# METAR/TAF Module — Получение авиационных метеоданных

## 📋 Назначение

Модуль `MetarTafModule` отвечает за получение и парсинг авиационных метеорологических данных:
- **METAR** — фактическая погода на аэродроме
- **TAF** — аэродромный прогноз на 24-30 часов

**Файл:** `js/metar-taf.js`

---

## 🔌 Источники данных

### 1. NOAA Aviation Weather API (основной)

**URL:** `https://aviationweather.gov/api`

**Особенности:**
- ✅ Бесплатно, без ключа
- ✅ Глобальное покрытие
- ❌ Требует CORS-прокси для браузерных запросов

**Используемые прокси:**
- `https://api.allorigins.win/raw?url=`
- `https://corsproxy.io/?`
- `https://thingproxy.freeboard.io/fetch/`

### 2. CheckWX API (альтернативный)

**URL:** `https://api.checkwx.com/`

**Особенности:**
- ✅ CORS поддержан из коробки
- ✅ Удобный JSON формат
- ❌ 50 запросов/день бесплатно
- ❌ Требуется API ключ

**Получение ключа:** https://www.checkwx.com/api

---

## 📡 Функции модуля

### getMetar(icao)

**Назначение:** Получение METAR для аэропорта

**Параметры:**
- `icao` (string) — ICAO код аэропорта (4 символа)

**Возвращает:** `Promise<Object>` — распарсенные METAR данные

**Пример:**
```javascript
const metar = await MetarTafModule.getMetar('UUDD');
console.log(metar);
```

**Структура результата:**
```javascript
{
    raw: "METAR UUDD 261200Z 26008MPS 9999 FEW020 05/01 Q1015",
    icao: "UUDD",
    time: { day: 26, hour: 12, minute: 0, utc: true },
    wind: {
        speed: 8,           // м/с
        direction: 260,     // градусы
        gust: null,         // м/с
        variable: false
    },
    visibility: {
        meters: 10000,
        km: 10
    },
    clouds: [
        {
            coverage: "FEW",
            baseFeet: 2000,
            baseMeters: 610
        }
    ],
    temperature: 5,         // °C
    dewpoint: 1,            // °C
    pressure: {
        hpa: 1015,
        mmHg: 761
    },
    weather: [],            // погодные явления
    flightCategory: "VFR",  // VFR/MVFR/IFR/LIFR
    remarks: null
}
```

---

### getTaf(icao)

**Назначение:** Получение TAF для аэропорта

**Параметры:**
- `icao` (string) — ICAO код аэропорта

**Возвращает:** `Promise<Object>` — распарсенные TAF данные

**Пример:**
```javascript
const taf = await MetarTafModule.getTaf('UUDD');
console.log(taf);
```

**Структура результата:**
```javascript
{
    raw: "TAF UUDD 261100Z 2612/2712 ...",
    icao: "UUDD",
    issueTime: { day: 26, hour: 11, minute: 0, utc: true },
    validTime: {
        from: { day: 26, hour: 12, utc: true },
        to: { day: 27, hour: 12, utc: true }
    },
    forecast: [
        {
            type: "BASE",
            time: { from: null, to: null },
            wind: { speed: 8, direction: 260, gust: null },
            visibility: { km: 10 },
            weather: [],
            clouds: [{ coverage: "FEW", baseMeters: 610 }],
            probability: null
        },
        // ... другие периоды
    ]
}
```

---

### findNearbyAirports(lat, lon, radiusKm)

**Назначение:** Поиск ближайших аэропортов с METAR/TAF

**Параметры:**
- `lat` (number) — широта
- `lon` (number) — долгота
- `radiusKm` (number) — радиус поиска, км

**Возвращает:** `Promise<Array>` — массив аэропортов

**Пример:**
```javascript
const airports = await MetarTafModule.findNearbyAirports(55.7558, 37.6173, 100);
console.log(airports);
// [{ icao: 'UUDD', name: 'Домодедово', distance: 45.2 }, ...]
```

---

### parseMetar(raw)

**Назначение:** Парсинг сырого METAR кода

**Параметры:**
- `raw` (string) — сырой METAR код

**Возвращает:** `Object` — распарсенные данные

**Пример METAR кода:**
```
METAR UUDD 261200Z 26008MPS 9999 FEW020 05/01 Q1015 NOSIG
```

**Расшифровка:**
- `UUDD` — аэропорт Домодедово
- `261200Z` — 26-е число, 12:00 UTC
- `26008MPS` — ветер 260°, 8 м/с
- `9999` — видимость 10+ км
- `FEW020` — мало облаков на 2000 футах
- `05/01` — температура +5°C, точка росы +1°C
- `Q1015` — давление 1015 гПа

---

### parseTaf(raw)

**Назначение:** Парсинг сырого TAF кода

**Параметры:**
- `raw` (string) — сырой TAF код

**Возвращает:** `Object` — распарсенные данные

**Пример TAF кода:**
```
TAF UUDD 261100Z 2612/2712 26008MPS 9999 FEW020
TEMPO 2614/2618 4000 -RA BKN010
BECMG 2620/2622 30012MPS
```

**Расшифровка периодов:**
- `BASE` — базовый прогноз
- `FM` (FROM) — с указанного времени
- `TEMPO` — временные улучшения/ухудшения
- `BECMG` (BECOMING) — постепенное изменение
- `PROB30/40` — вероятность 30%/40%

---

## 🎯 Категории полётов

Модуль автоматически рассчитывает категорию полётов:

| Категория | Условия | Индикация |
|-----------|---------|-----------|
| **VFR** | Видимость ≥ 8 км, потолок ≥ 3000 футов | 🟢 |
| **MVFR** | Видимость 5-8 км, потолок 1000-3000 футов | 🟡 |
| **IFR** | Видимость 1.6-5 км, потолок 500-1000 футов | 🟠 |
| **LIFR** | Видимость < 1.6 км, потолок < 500 футов | 🔴 |

---

## 📊 Примеры использования

### Пример 1: Получение METAR для аэропорта

```javascript
try {
    const metar = await MetarTafModule.getMetar('UUDD');
    
    console.log(`Аэропорт: ${metar.icao}`);
    console.log(`Ветер: ${metar.wind.speed} м/с, ${metar.wind.direction}°`);
    console.log(`Видимость: ${metar.visibility.km} км`);
    console.log(`Температура: ${metar.temperature}°C`);
    console.log(`Категория: ${metar.flightCategory}`);
} catch (error) {
    console.error('Ошибка:', error.message);
}
```

### Пример 2: Поиск ближайших аэропортов

```javascript
const lat = 55.7558;  // Москва
const lon = 37.6173;

const airports = await MetarTafModule.findNearbyAirports(lat, lon, 100);

for (const airport of airports) {
    console.log(`${airport.icao} — ${airport.name} (${airport.distance} км)`);
    
    // Получаем METAR для каждого
    const metar = await MetarTafModule.getMetar(airport.icao);
    console.log(`  Ветер: ${metar.wind.speed} м/с`);
}
```

### Пример 3: Использование с CheckWX API

```javascript
// Установка API ключа
MetarTafModule.CHECKWX_API_KEY = 'your-api-key-here';

// Теперь запросы идут через CheckWX (без CORS проблем)
const metar = await MetarTafModule.getMetar('UUDD');
```

### Пример 4: Кэширование данных

```javascript
// Данные кэшируются автоматически:
// METAR — 15 минут
// TAF — 30 минут

// Принудительная очистка кэша
MetarTafModule.clearCache();

// Загрузка из кэша
MetarTafModule.loadCache();
```

---

## 🔧 Интеграция с MIRA

### 1. Подключение модуля

```html
<script src="js/metar-taf.js"></script>
```

### 2. Получение данных для маршрута

```javascript
// Для каждой точки маршрута
const routePoints = [
    { lat: 55.7558, lon: 37.6173 },
    { lat: 59.9343, lon: 30.3351 }
];

for (const point of routePoints) {
    const airports = await MetarTafModule.findNearbyAirports(point.lat, point.lon, 50);
    
    if (airports.length > 0) {
        const metar = await MetarTafModule.getMetar(airports[0].icao);
        const taf = await MetarTafModule.getTaf(airports[0].icao);
        
        // Используем для анализа
        console.log(metar, taf);
    }
}
```

### 3. Коррекция прогноза по METAR

```javascript
// Получаем фактические данные из METAR
const metar = await MetarTafModule.getMetar('UUDD');

// Сравниваем с прогнозом Open-Meteo
const openMeteoForecast = await WeatherModule.getForecast(lat, lon);

// Расходимости > 20% — применяем коррекцию
const windDiff = Math.abs(metar.wind.speed - openMeteoForecast.hourly.wind10m[0]) / openMeteoForecast.hourly.wind10m[0];

if (windDiff > 0.2) {
    console.log('⚠️ Расхождение > 20%, применяем коррекцию');
    // Применяем коррекцию через PilotObservationsModule
}
```

---

## 🛠️ Тестирование

### Запуск тестовой страницы

**Способ 1: Через Node.js сервер**
```bash
# Запуск BAT файла (Windows)
start-metar-test.bat

# Или вручную
node server.js
```

**Способ 2: Через npx**
```bash
npx http-server -p 8080 --cors
```

**Способ 3: Прямой доступ**
Открыть `test-metar-taf.html` в браузере (требуется CORS Unblock расширение)

### Тестовые ICAO коды

| Город | Аэропорт | ICAO |
|-------|----------|------|
| Москва | Домодедово | `UUDD` |
| Москва | Шереметьево | `UUEE` |
| Москва | Внуково | `UUWW` |
| Санкт-Петербург | Пулково | `ULLI` |
| Сочи | Адлер | `URSS` |
| Краснодар | Пашковский | `URKK` |

---

## ⚠️ Ограничения

### CORS

NOAA API не поддерживает CORS запросы из браузера. Решения:

1. **Использовать CORS-прокси** (реализовано в модуле)
2. **Запустить локальный сервер** (рекомендуется)
3. **Использовать CheckWX API** с ключом
4. **Расширение CORS Unblock** для браузера

### Покрытие

- **Россия:** Не все аэродромы имеют METAR/TAF
- **Частота обновления:** METAR — каждые 30-60 мин, TAF — каждые 6 часов
- **Дальность:** METAR действителен в радиусе ~5 км от аэродрома

---

## 📝 Changelog

### Версия 1.0

- ✅ Получение METAR через NOAA API
- ✅ Получение TAF через NOAA API
- ✅ Парсинг METAR/TAF кодов
- ✅ Расчёт категории полётов (VFR/MVFR/IFR/LIFR)
- ✅ Поиск ближайших аэропортов
- ✅ Кэширование данных
- ✅ CORS-прокси поддержка
- ✅ CheckWX API интеграция
- ✅ Тестовая страница

---

**Версия модуля:** 1.0  
**Дата:** 4 марта 2026 г.  
**Источник:** NOAA Aviation Weather API
