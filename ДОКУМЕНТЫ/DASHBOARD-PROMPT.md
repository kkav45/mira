# ТЕХНИЧЕСКОЕ ЗАДАНИЕ: ДАШБОРД MIRA v0.2.0

**Версия документа:** 1.0  
**Дата:** 1 марта 2026 г.  
**Проект:** MIRA — Система метеорологического обеспечения полётов БВС  
**Текущая версия проекта:** 0.1.4.4

---

## 🎯 НАЗНАЧЕНИЕ

Создать полнофункциональный дашборд для системы метеорологического обеспечения полётов БВС (беспилотных воздушных судов). Дашборд должен объединять все расчётные данные и предоставлять пилоту комплексную информацию для принятия решений.

---

## 📊 СТРУКТУРА ДАШБОРДА

### 1. ОБЩИЕ ТРЕБОВАНИЯ

**Расположение:**
- Кнопка вызова: левое меню карты, под переключателем слоёв
- Дашборд: модальное окно на весь экран (fixed, z-index: 9999)

**Состояния кнопки:**
- `disabled` (серая): нет данных
- `active` (синяя, пульсация): есть данные

**Навигация:**
- 6 вкладок с иконками Font Awesome
- Переключение без перезагрузки (dynamic rendering)
- Закрытие: кнопка "✕", "← Назад", клавиша Esc

---

### 2. ВКЛАДКИ ДАШБОРДА

#### Вкладка 1: МЕТЕОПРОГНОЗ 🌤️

**Данные:**
- Временной ряд 24-48 часов (Open-Meteo API)
- Параметры: ветер (10м, 100м, 250-550м), температура, осадки, влажность, видимость, давление, обледенение, турбулентность

**Визуализация:**
1. **Time Series Chart** — временной ряд (3 оси: температура, ветер, осадки)
2. **Vertical Wind Profile** — профиль ветра по высотам (10м → 550м)
3. **Wind Rose** — роза ветров (8 направлений, средние скорости)
4. **Turbulence Index** — индекс турбулентности (%)
5. **Ceiling Chart** — высота нижней границы облаков (м)
6. **Flight Windows Calendar** — тепловая карта благоприятных окон

**Таблицы:**
- Сводная таблица по сегментам маршрута
- Почасовые данные с уровнями риска

**Рекомендации:**
- Автоматически генерируемые выводы на основе пороговых значений
- Цветовая индикация статусов (🟢 НИЗКИЙ, 🟡 СРЕДНИЙ, 🔴 ВЫСОКИЙ)

**API:**
```javascript
WeatherModule.getForecast(lat, lon, date)
WeatherModule.analyzeForecast(forecast)
WeatherModule.findFlightWindows(hourly, thresholds)
```

---

#### Вкладка 2: СИДЯ НА ЗЕМЛЕ 🚩

**Назначение:** Коррекция прогноза по фактическим данным с точки старта

**Данные:**
- Наблюдения пилота (localStorage: `mira_pilot_observations`)
- Тип: `ground` (до взлёта)
- Параметры: ветер, направление, температура, влажность, видимость, облачность, туман, осадки, снег

**Визуализация:**
1. **Сравнение прогноз/факт** — 2 линии на графике
2. **Карточки наблюдений** — хронология (время, параметры)
3. **Таблица отклонений** — Δ% по каждому параметру

**Функции:**
- Добавление неограниченного количества наблюдений
- Привязка к координатам (геолокация или выбор на карте)
- Автоматический пересчёт рекомендаций
- Экспоненциальное затухание коррекции (weight = e^(-i/12))

**API:**
```javascript
PilotObservationsModule.addGround(data)
PilotObservationsModule.getByType('ground')
PilotObservationsModule.applyCorrection(analyzed)
```

---

#### Вкладка 3: В ПОЛЁТЕ ✈️

**Назначение:** Мониторинг фактических условий во время полёта

**Данные:**
- Наблюдения пилота (тип: `flight`)
- Временные метки (timestamp)
- Параметры: как "Сидя на земле" + высота полёта

**Визуализация:**
1. **Timeline** — хронология наблюдений (карточки)
2. **Динамика параметров** — график отклонений от прогноза
3. **Кумулятивный анализ** — накопленная ошибка прогноза

**Функции:**
- Ввод данных в любой момент полёта
- Автоматическое сохранение в localStorage
- Пересчёт энергобаланса по факту
- Предупреждения при критических отклонениях

**API:**
```javascript
PilotObservationsModule.addFlight(data)
PilotObservationsModule.getByType('flight')
PilotObservationsModule.getTimeline()
PilotObservationsModule.getCumulativeAnalysis()
```

---

#### Вкладка 4: СЕГМЕНТЫ 🗺️

**Назначение:** Детализация по сегментам маршрута

**Данные:**
- Маршрут (точки A, B, C...)
- Сегменты (разбиение по 5-10 км)
- Метеоданные на центр каждого сегмента
- Уровни риска по сегментам

**Визуализация:**
1. **Выбор сегмента** — кнопки с номерами (1, 2, 3...)
2. **Детальная карточка** — координаты, дистанция, метео, риск
3. **Профиль маршрута** — график рисков по дистанции
4. **Сводная таблица** — все сегменты в одной таблице

**Страницы:**
- Стр. 1: Основное (координаты, метео, риск)
- Стр. 2: Графики (ветер, температура по высотам)
- Стр. 3: Энергия (расход на сегменте)

**API:**
```javascript
RouteModule.createSegments(route)
RouteModule.analyzeSegments(date)
RouteModule.getSegmentData(index)
```

---

#### Вкладка 5: ЭНЕРГИЯ 🔋

**Назначение:** Расчёт энергопотребления и баланса

**Данные:**
- Профиль БВС (batteryCapacity, voltage, cruiseSpeed, weight...)
- Метеоданные (ветер, температура, давление)
- Маршрут (сегменты, дистанции)

**Расчёты:**
- Доступная энергия: E = U_среднее × Ёмкость × DoD × degradation
- Ветровые компоненты: headwind = -V_w × cos(θ)
- Путевая скорость: V_ground = V_cruise + headwind
- Расход энергии: E_сегмент = P × t / V_ground
- Баланс "Туда / Обратно"

**Визуализация:**
1. **Баланс энергии** — график "Туда / Обратно" (остаток %)
2. **Доступная энергия** — карточки (полная, с деградацией, с учётом T°)
3. **Расход по сегментам** — столбчатая диаграмма
4. **Влияние ветра** — встречный/попутный/боковой

**Рекомендации:**
- Максимальная дальность полёта
- Необходимый резерв (%)
- Оптимизация маршрута по ветру

**API:**
```javascript
EnergyModule.calculateEnergy(route, weather, profile)
EnergyModule.getSegmentEnergy(segment)
EnergyModule.getBalance()
```

---

#### Вкладка 6: ОТЧЁТ 📄

**Назначение:** Формирование PDF-отчёта

**Разделы (checkbox):**
- ☑️ Метеопрогноз (Open-Meteo)
- ☑️ Таблица по сегментам
- ☑️ Наблюдения "Сидя на земле"
- ☑️ Наблюдения "В полёте"
- ☑️ Энергорасчёт
- ☑️ Графики Plotly (изображения)

**Формирование:**
1. Отметить нужные разделы
2. Нажать "📋 Сформировать отчёт"
3. Нажать "💾 Скачать PDF"

**Структура PDF:**
- Стр. 1: Анализ и рекомендации (статус, параметры, окна)
- Стр. 2: С учётом корректировки (пилотные данные)

**API:**
```javascript
PdfExportModule.generatePDF(options)
PdfExportModule.addMeteoSection()
PdfExportModule.addSegmentsTable()
PdfExportModule.addCharts()
```

---

## 🎨 ВИЗУАЛЬНЫЕ ТРЕБОВАНИЯ

### Цветовая схема

```css
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--background: #f7fafc;
--text: #1a202c;
--success: #48bb78;
--warning: #ed8936;
--danger: #f56565;
```

### Уровни риска

| Цвет | Значение | Описание |
|------|----------|----------|
| 🟢 #48bb78 | НИЗКИЙ | Полёт разрешён |
| 🟡 #ed8936 | СРЕДНИЙ | Полёт с ограничениями |
| 🔴 #f56565 | ВЫСОКИЙ | Полёт запрещён |

### Состояния вкладок

- **Активная**: подчёркивание синим, полный цвет
- **Доступна**: полный цвет, клик переключает
- **Недоступна**: полупрозрачная (opacity: 0.5), серый цвет

---

## 🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### Зависимости

```html
<!-- Plotly.js -->
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>

<!-- OpenLayers -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@v9.2.4/ol.css">
<script src="https://cdn.jsdelivr.net/npm/ol@v9.2.4/dist/ol.js"></script>

<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<!-- pdfMake -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/pdfmake.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/vfs_fonts.js"></script>
```

### Хранение данных

```javascript
localStorage: {
    "mira_pilot_observations": {
        "observations": [...]
    },
    "miraFullscreen": "false",
    "mira_route": {...}
}
```

### Структура данных дашборда

```javascript
DashboardModule.data = {
    meteo: {
        forecast: {...},
        analyzed: {...},
        sunData: {...},
        flightTimeWindow: [...]
    },
    segments: [],
    segmentAnalysis: [],
    ground: [],      // наблюдения "Сидя на земле"
    flight: [],      // наблюдения "В полёте"
    energy: null,
    route: null
};
```

---

## 📋 ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

### Активация кнопки

```javascript
updateButtonState() {
    const hasMeteoData = this.data.meteo !== null;
    const hasGroundData = this.data.ground.length > 0;
    const hasFlightData = this.data.flight.length > 0;
    const hasSegments = this.data.segments.length > 0;
    
    button.disabled = !(hasMeteoData || hasGroundData || 
                        hasFlightData || hasSegments);
}
```

### Доступность вкладок

```javascript
isTabAvailable(tabName) {
    switch (tabName) {
        case 'meteo':
            return this.data.meteo !== null || 
                   this.data.segments.length > 0;
        case 'ground':
            return this.data.ground.length > 0;
        case 'flight':
            return this.data.flight.length > 0;
        case 'segments':
            return this.data.segments.length > 0;
        case 'energy':
            return this.data.energy !== null;
        case 'report':
            return true;  // всегда доступна
    }
}
```

### Последовательность работы

```
1. Загрузка страницы → DashboardModule.init()
2. Загрузка маршрута → WizardModule.step1
3. Нажатие "Анализ" → WeatherModule.getForecast()
4. Получение данных → DashboardModule.loadData()
5. Активация кнопки → DashboardModule.updateButtonState()
6. Клик по кнопке → DashboardModule.toggle()
7. Рендер вкладки → DashboardModule.switchTab('meteo')
8. Построение графиков → Plotly.newPlot()
```

---

## ⚠️ ОГРАНИЧЕНИЯ

1. **Вкладки "Сидя на земле" и "В полёте"** неактивны без данных
2. **Энергорасчёт** требует выполнения анализа маршрута
3. **Отчёт PDF** включает только разделы с данными
4. **Графики Plotly** требуют подключения CDN
5. **Геолокация** работает только по разрешению пользователя

---

## 🎯 СЦЕНАРИИ ИСПОЛЬЗОВАНИЯ

### Сценарий 1: Предполётная подготовка

1. Открыть дашборд → Вкладка "Метеопрогноз"
2. Изучить временной ряд, рекомендации
3. Ввести данные "Сидя на земле"
4. Проверить вкладку "Сидя на земле" → Сравнение прогноз/факт
5. Сформировать отчёт PDF

### Сценарий 2: Мониторинг в полёте

1. Вводить данные "В полёте" через равные промежутки
2. Открыть дашборд → Вкладка "В полёте"
3. Следить за хронологией и отклонениями
4. При ухудшении → скорректировать маршрут

### Сценарий 3: Постполётный анализ

1. Открыть дашборд → Вкладка "Отчёт"
2. Отметить все разделы
3. Сформировать полный PDF-отчёт
4. Сохранить для архива

---

## 📁 СТРУКТУРА ФАЙЛОВ

```
MIRA/
├── desktop.html                 # Основная разметка дашборда
├── css/
│   └── desktop-dashboard.css    # Стили дашборда
├── js/
│   ├── dashboard.js             # DashboardModule
│   ├── dashboard-tabs.js        # Рендер вкладок
│   ├── weather.js               # WeatherModule
│   ├── energy-model.js          # EnergyModule
│   ├── energy-charts.js         # Графики энергии
│   ├── pilot-observations.js    # PilotObservationsModule
│   ├── pdf-export-2page.js      # PdfExportModule
│   └── wizard.js                # WizardModule
└── docs/
    ├── DASHBOARD-USER-GUIDE.md  # Руководство пользователя
    └── ENERGY-MODULE-DOCUMENTATION.md  # Документация энергии
```

---

## ✅ ЧЕК-ЛИСТ ПРИЁМКИ

- [ ] Кнопка "ДАШБОРД" отображается в левом меню карты
- [ ] Кнопка активируется после получения метеоданных
- [ ] Все 6 вкладок переключаются без перезагрузки
- [ ] Графики Plotly строятся корректно
- [ ] Наблюдения сохраняются в localStorage
- [ ] PDF-отчёт формируется со всеми разделами
- [ ] Закрытие работает (кнопка, Esc)
- [ ] Адаптивность под разные разрешения экрана

---

## 🔗 ССЫЛКИ

| Ресурс | URL |
|--------|-----|
| Open-Meteo API | https://open-meteo.com/ |
| Plotly.js Docs | https://plotly.com/javascript/ |
| OpenLayers | https://openlayers.org/ |
| pdfMake | http://pdfmake.org/ |
| Font Awesome | https://fontawesome.com/ |

---

## 📝 ПРИЛОЖЕНИЕ: ФОРМУЛЫ РАСЧЁТА

### 1. Расчёт расстояния (Haversine)

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радиус Земли, км
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
```

### 2. Доступная энергия батареи

```javascript
E_доступная = U_среднее × Ёмкость × DoD × degradationFactor

где:
  U_среднее = (U_полное + U_отсечки) / 2
  DoD = 0.8 (80% глубина разряда)
  degradationFactor = 1 - (cycles × 0.002)
```

### 3. Ветровые компоненты

```javascript
// Угол между ветром и маршрутом
θ = δ_ветра - α_маршрута

// Встречная/попутная составляющая
headwind = -V_w × cos(θ)

// Боковая составляющая
crosswind = V_w × sin(θ)
```

### 4. Экспоненциальное затухание (коррекция)

```javascript
weight = Math.exp(-i / 12)

где i — количество часов от момента наблюдения
```

---

**Документ создан:** 1 марта 2026 г.  
**Проект:** MIRA v0.1.4.4  
**Статус:** ✅ Готов к использованию
