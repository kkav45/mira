# 📄 MIRA — Руководство по экспорту в PDF

**Версия:** 1.0  
**Дата:** 26 февраля 2026 г.

---

## 📋 СОДЕРЖАНИЕ

1. [Обзор](#обзор)
2. [Краткий анализ (1-2 страницы)](#краткий-анализ)
3. [Подробный отчёт (10-20 страниц)](#подробный-отчёт)
4. [Настройка экспорта](#настройка-экспорта)
5. [API экспорта](#api-экспорта)

---

## 📊 ОБЗОР

MIRA поддерживает два формата экспорта в PDF:

| Формат | Страниц | Содержимое | Использование |
|--------|---------|------------|---------------|
| **Краткий** | 1-2 | Сводка, топ проблем, рекомендации | Быстрый обзор |
| **Подробный** | 10-20 | Полный анализ, графики, таблицы | Официальный отчёт |

---

## 📄 КРАТКИЙ АНАЛИЗ

### Структура документа

```
Страница 1:
├── Заголовок (MIRA)
├── Дата и время формирования
├── Маршрут (название, координаты)
├── Сводка маршрута
│   ├── Расстояние: X км
│   ├── Время полёта: X мин
│   └── Общий риск: Низкий/Средний/Высокий
├── Топ-5 проблем
└── Топ-5 рекомендаций

Страница 2 (если есть):
├── Карта рисков (таблица)
├── Временные окна
└── Подпись
```

### Пример кода для генерации

```javascript
// Краткий отчёт
const shortReport = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 40],
    content: [
        // Заголовок
        {
            text: 'MIRA',
            style: 'mainTitle',
            alignment: 'center',
            margin: [0, 0, 0, 10]
        },
        {
            text: 'Краткий анализ маршрута',
            style: 'subtitle',
            alignment: 'center',
            margin: [0, 0, 0, 20]
        },
        
        // Сводка
        {
            text: 'Сводка маршрута',
            style: 'sectionTitle',
            margin: [0, 0, 0, 10]
        },
        {
            columns: [
                {
                    width: '*',
                    text: 'Расстояние: 125 км',
                    style: 'stat'
                },
                {
                    width: '*',
                    text: 'Время: 45 мин',
                    style: 'stat'
                },
                {
                    width: '*',
                    text: 'Риск: Низкий 🟢',
                    style: 'stat'
                }
            ],
            margin: [0, 0, 0, 20]
        },
        
        // Проблемы
        {
            text: 'Ключевые проблемы',
            style: 'sectionTitle',
            margin: [0, 0, 0, 10]
        },
        {
            ul: [
                { text: 'Ветер >10 м/с на высоте 500м', color: '#e53e3e' },
                { text: 'Обледенение в слое 0°C', color: '#ed8936' },
                { text: 'Видимость <5 км', color: '#ed8936' }
            ],
            margin: [0, 0, 0, 20]
        },
        
        // Рекомендации
        {
            text: 'Рекомендации',
            style: 'sectionTitle',
            margin: [0, 0, 0, 10]
        },
        {
            ol: [
                'Выбрать высоту 300м для избежания турбулентности',
                'Избегать участка маршрута над горами',
                'Иметь запасной аэродром'
            ],
            margin: [0, 0, 0, 20]
        }
    ],
    styles: {
        mainTitle: { fontSize: 24, bold: true, color: '#667eea' },
        subtitle: { fontSize: 14, color: '#718096' },
        sectionTitle: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
        stat: { fontSize: 12, bold: true }
    }
};

pdfMake.createPdf(shortReport).download('MIRA-Short-Report.pdf');
```

---

## 📑 ПОДРОБНЫЙ ОТЧЁТ

### Структура документа

```
Страница 1: Титульная
├── Логотип MIRA
├── Название отчёта
├── Дата формирования
├── Маршрут
└── Автор/организация

Страница 2: Оглавление
├── 1. Сводка маршрута
├── 2. Карта рисков
├── 3. Детали по сегментам
├── 4. Рекомендации
├── 5. Приложения
└── Глоссарий

Страница 3-4: Сводка маршрута
├── Общая информация
├── Статистика
├── Сводная таблица рисков
└── Временные окна

Страница 5-7: Карта рисков
├── Таблица сегментов
├── Графики рисков
└── Тепловая карта

Страница 8-12: Детали по сегментам
├── Сегмент 1
│   ├── Параметры
│   ├── Риски
│   └── Рекомендации
├── Сегмент 2
└── ...

Страница 13-15: Рекомендации
├── Критические
├── Важные
└── Дополнительные

Страница 16-20: Приложения
├── Исходные данные
├── Методология
└── Глоссарий
```

### Пример кода для генерации

```javascript
// Подробный отчёт
const fullReport = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 40],
    pageBreakBefore: (currentNode, followingNodes) => {
        // Разрыв страницы перед заголовками секций
        return currentNode.style === 'sectionTitle' && 
               followingNodes.length > 5;
    },
    content: [
        // Титульная страница
        {
            stack: [
                {
                    text: 'MIRA',
                    style: 'coverTitle',
                    alignment: 'center',
                    margin: [0, 100, 0, 20]
                },
                {
                    text: 'Отчёт о метеоусловиях\nи анализе рисков',
                    style: 'coverSubtitle',
                    alignment: 'center',
                    margin: [0, 0, 0, 50]
                },
                {
                    text: `Маршрут: ${routeName}`,
                    style: 'coverInfo',
                    alignment: 'center'
                },
                {
                    text: `Дата: ${formatDate(new Date())}`,
                    style: 'coverInfo',
                    alignment: 'center'
                }
            ],
            pageBreak: 'after'
        },
        
        // Оглавление
        {
            text: 'Содержание',
            style: 'tocTitle',
            margin: [0, 0, 0, 20]
        },
        {
            toc: {
                titleStyle: { fontSize: 14, bold: true },
                itemStyle: { margin: [0, 5, 0, 5] }
            },
            pageBreak: 'after'
        },
        
        // 1. Сводка маршрута
        {
            text: '1. Сводка маршрута',
            style: 'sectionTitle',
            tocItem: true,
            id: 'summary'
        },
        // ... контент секции
        
        // 2. Карта рисков
        {
            text: '2. Карта рисков',
            style: 'sectionTitle',
            tocItem: true,
            id: 'riskMap'
        },
        // ... контент секции
        
        // и т.д.
    ],
    styles: {
        coverTitle: {
            fontSize: 48,
            bold: true,
            color: '#667eea',
            font: 'Roboto'
        },
        coverSubtitle: {
            fontSize: 20,
            color: '#718096',
            font: 'Roboto'
        },
        coverInfo: {
            fontSize: 14,
            color: '#4a5568',
            margin: [0, 5, 0, 5]
        },
        tocTitle: {
            fontSize: 20,
            bold: true,
            color: '#2d3748',
            margin: [0, 0, 0, 20]
        },
        sectionTitle: {
            fontSize: 18,
            bold: true,
            color: '#2d3748',
            margin: [0, 20, 0, 10],
            pageBreak: 'before'
        }
    },
    footer: (currentPage, pageCount) => {
        return {
            columns: [
                { text: `Страница ${currentPage} из ${pageCount}`, fontSize: 10 },
                { text: 'MIRA - Метеоанализ полётов', fontSize: 10, alignment: 'right' }
            ],
            margin: [40, 20, 40, 20]
        };
    }
};

pdfMake.createPdf(fullReport).download('MIRA-Full-Report.pdf');
```

---

## ⚙️ НАСТРОЙКА ЭКСПОРТА

### Подключение библиотек

```html
<head>
    <!-- pdfmake -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/vfs_fonts.js"></script>
    
    <!-- SheetJS для Excel -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
</head>
```

### Конфигурация экспорта

```javascript
// js/pdf-export-config.js
export const PDFExportConfig = {
    // Форматы
    formats: {
        SHORT: 'short',
        FULL: 'full'
    },
    
    // Настройки по умолчанию
    defaults: {
        format: 'full',
        includeCharts: true,
        includeMaps: false, // Карты как изображения
        includeRawData: false,
        language: 'ru'
    },
    
    // Размеры страниц
    pageSizes: {
        A4: 'A4',
        LETTER: 'letter'
    },
    
    // Ориентация
    orientations: {
        PORTRAIT: 'portrait',
        LANDSCAPE: 'landscape'
    },
    
    // Стили
    styles: {
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        successColor: '#38a169',
        warningColor: '#ed8936',
        dangerColor: '#e53e3e'
    }
};
```

---

## 🔧 API ЭКСПОРТА

### Методы

#### `generateReport(data, options)`

Генерация отчёта

**Параметры:**
- `data` (object) - Данные отчёта
- `options` (object) - Опции генерации

**Пример:**
```javascript
const report = await PdfExportModule.generateReport(
    {
        route: { name: 'Москва-Казань', distance: 125 },
        segments: [...],
        analysis: {...}
    },
    {
        format: 'full',
        includeCharts: true
    }
);
```

#### `exportToPDF(docDefinition, filename)`

Экспорт в PDF

**Параметры:**
- `docDefinition` (object) - Определение документа pdfmake
- `filename` (string) - Имя файла

**Пример:**
```javascript
PdfExportModule.exportToPDF(docDefinition, 'MIRA-Report.pdf');
```

#### `exportToCSV(tableId, filename)`

Экспорт таблицы в CSV

**Параметры:**
- `tableId` (string) - ID таблицы
- `filename` (string) - Имя файла

**Пример:**
```javascript
PdfExportModule.exportToCSV('detailedTable', 'data.csv');
```

#### `exportToExcel(tableId, filename)`

Экспорт таблицы в Excel

**Параметры:**
- `tableId` (string) - ID таблицы
- `filename` (string) - Имя файла

**Пример:**
```javascript
PdfExportModule.exportToExcel('detailedTable', 'data.xlsx');
```

---

## 📊 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Быстрый экспорт

```javascript
// Кнопка в интерфейсе
<button onclick="exportReport('short')">
    <i class="fas fa-file-pdf"></i> Краткий отчёт
</button>

<button onclick="exportReport('full')">
    <i class="fas fa-file-pdf"></i> Подробный отчёт
</button>

// Обработчик
function exportReport(type) {
    const data = collectReportData();
    
    if (type === 'short') {
        PdfExportModule.generateShortReport(data);
    } else {
        PdfExportModule.generateFullReport(data);
    }
}
```

### Экспорт с графиками

```javascript
async function exportWithCharts() {
    // 1. Собираем данные
    const data = collectReportData();
    
    // 2. Рендерим графики в изображения
    const charts = await renderChartsToImages();
    
    // 3. Добавляем в отчёт
    const docDefinition = {
        content: [
            // ... контент
            ...charts.map(chart => ({
                image: chart.dataUrl,
                width: 400,
                margin: [0, 10, 0, 20]
            }))
        ]
    };
    
    // 4. Экспортируем
    pdfMake.createPdf(docDefinition).download('MIRA-with-Charts.pdf');
}
```

---

## 🎨 КАСТОМИЗАЦИЯ

### Изменение стилей

```javascript
const customStyles = {
    header: {
        fontSize: 18,
        bold: true,
        color: '#667eea',
        margin: [0, 0, 0, 10]
    },
    
    subheader: {
        fontSize: 14,
        bold: true,
        color: '#764ba2',
        margin: [0, 10, 0, 5]
    },
    
    quote: {
        italics: true,
        margin: [20, 10, 20, 10],
        color: '#718096'
    }
};
```

### Добавление логотипа

```javascript
const docDefinition = {
    content: [
        {
            image: 'data:image/png;base64,...', // Base64 логотип
            width: 150,
            margin: [0, 0, 0, 20]
        },
        // ... остальной контент
    ]
};
```

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- [pdfmake документация](http://pdfmake.org/)
- [SheetJS документация](https://docs.sheetjs.com/)
- [Примеры pdfmake](https://github.com/bpampuch/pdfmake/tree/master/examples)

---

*Документация создана: 26 февраля 2026 г.*
