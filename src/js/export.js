/**
 * MIRA 0.2 | Небосвод - PDF Export Module
 * Генерация PDF отчётов с помощью jsPDF
 */

const PDFExporter = {
  // Конфигурация
  config: {
    pageSize: 'a4',
    orientation: 'portrait',
    fonts: {
      normal: 'helvetica',
      bold: 'helvetica-bold',
      mono: 'courier'
    }
  },

  // Создание полного отчёта
  async generateFullReport(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(this.config.orientation, 'mm', this.config.pageSize);

    const margins = { left: 15, top: 15, right: 195 };
    let y = 20;

    // Титульный лист
    y = this.addTitlePage(doc, data, y);

    // Страница 2: Резюме
    doc.addPage();
    y = 20;
    y = this.addSummaryPage(doc, data, y);

    // Страница 3: Геометрия маршрута
    doc.addPage();
    y = 20;
    y = this.addRouteGeometry(doc, data, y);

    // Страница 4: Метеоанализ
    doc.addPage();
    y = 20;
    y = this.addWeatherAnalysis(doc, data, y);

    // Страница 5: Энергетический анализ
    doc.addPage();
    y = 20;
    y = this.addEnergyAnalysis(doc, data, y);

    // Страница 6: Рекомендации
    doc.addPage();
    y = 20;
    y = this.addRecommendations(doc, data, y);

    // Сохранение
    const filename = `MIRA-Report-${this.formatDateForFilename(new Date())}.pdf`;
    doc.save(filename);

    return doc;
  },

  // Создание краткого отчёта (1 страница)
  async generateShortReport(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'mm', 'a4');

    const margins = { left: 15, top: 15, right: 195 };
    let y = 15;

    // Заголовок
    doc.setFontSize(16);
    doc.setFont(this.config.fonts.bold);
    doc.text('АНАЛИЗ ПОГОДНЫХ УСЛОВИЙ', 105, y, { align: 'center' });
    y += 8;
    
    doc.setFontSize(12);
    doc.setFont(this.config.fonts.normal);
    doc.text(`для полета БВС ${this.formatDate(data.date)}`, 105, y, { align: 'center' });
    y += 15;

    // Разделительная линия
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;

    // Маршрут
    doc.setFont(this.config.fonts.bold);
    doc.text('МАРШРУТ:', 15, y);
    y += 6;
    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    doc.text(`Старт: ${data.coordinates.start.lat.toFixed(6)}°N, ${data.coordinates.start.lon.toFixed(6)}°E`, 15, y);
    y += 5;
    doc.text(`Длина: ${data.routeLength.toFixed(1)} км`, 15, y);
    y += 10;

    // Статус
    doc.setFont(this.config.fonts.bold);
    doc.setFontSize(14);
    const statusConfig = this.getStatusConfig(data.status);
    doc.setTextColor(statusConfig.r, statusConfig.g, statusConfig.b);
    doc.text(`СТАТУС: ${statusConfig.text}`, 15, y);
    doc.setTextColor(0, 0, 0);
    y += 10;

    // Рекомендуемое время
    doc.setFont(this.config.fonts.bold);
    doc.setFontSize(12);
    doc.text('РЕКОМЕНДУЕМОЕ ВРЕМЯ:', 15, y);
    doc.setFont(this.config.fonts.normal);
    doc.text(data.recommendedTime || '10:25 — 10:35', 95, y);
    y += 10;

    // Метеоусловия
    doc.setFont(this.config.fonts.bold);
    doc.text('МЕТЕОУСЛОВИЯ:', 15, y);
    y += 6;
    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    
    const weatherLines = [
      `Ветер: ${data.weather.wind10m} м/с с ${this.getWindDirection(data.weather.windDir10m)}`,
      `Температура: ${data.weather.temp}°C`,
      `Видимость: ${data.weather.visibility} км`,
      `Осадки: ${data.weather.precipitation} мм/ч`,
      `Риск обледенения: ${this.getIcingRiskText(data.weather.icing)}`
    ];

    weatherLines.forEach(line => {
      doc.text(line, 15, y);
      y += 5;
    });
    y += 5;

    // Энергетика
    doc.setFont(this.config.fonts.bold);
    doc.text('ЭНЕРГЕТИКА:', 15, y);
    y += 6;
    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    
    doc.text(`Расчетное время: ${data.flightTime} мин`, 15, y);
    y += 5;
    doc.text(`Потребление: ${data.energyConsumption} мАч`, 15, y);
    y += 5;
    doc.text(`Запас при посадке: ${data.batteryReserve} мАч (${data.batteryReservePercent}%)`, 15, y);
    y += 10;

    // Высота полёта
    doc.setFont(this.config.fonts.bold);
    doc.text('ВЫСОТА ПОЛЕТА:', 15, y);
    y += 6;
    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    doc.text(`Выход на маршрут: ${data.altitudes.climb} м`, 15, y);
    y += 5;
    doc.text(`Основной маршрут: ${data.altitudes.cruise} м`, 15, y);
    y += 5;
    doc.text(`Возврат: снижение до ${data.altitudes.descent} м`, 15, y);
    y += 10;

    // Критические точки
    doc.setFont(this.config.fonts.bold);
    doc.text('КРИТИЧЕСКИЕ ТОЧКИ:', 15, y);
    y += 6;
    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    doc.text(`Точка невозврата: ${data.pnr.distance} км от старта`, 15, y);
    y += 5;
    doc.text(`Макс. удаление: ${data.maxDistance} км`, 15, y);
    y += 10;

    // Ограничения
    doc.setFont(this.config.fonts.bold);
    doc.text('ОГРАНИЧЕНИЯ:', 15, y);
    y += 6;
    doc.setFont(this.config.fonts.normal);
    doc.setFontSize(10);
    
    const restrictions = [
      '❌ Запрещено летать при видимости <5 км',
      '❌ Запрещено летать при ветре >12 м/с на высоте',
      '❌ Посадка при напряжении <20.0 В'
    ];

    restrictions.forEach(line => {
      doc.text(line, 15, y);
      y += 5;
    });

    // Подвал
    y = 270;
    doc.setFontSize(9);
    doc.setFont(this.config.fonts.normal);
    doc.setTextColor(100, 100, 100);
    doc.text(`Подготовил: _________________ ДАТА: ${this.formatDate(new Date())}`, 15, y);
    doc.text('MIRA 0.2 | Небосвод - Система метеорологического обеспечения БВС', 105, y, { align: 'center' });

    // Сохранение
    const filename = `MIRA-Short-Report-${this.formatDateForFilename(new Date())}.pdf`;
    doc.save(filename);

    return doc;
  },

  // Титульный лист
  addTitlePage(doc, data, y) {
    // Логотип / Заголовок
    doc.setFontSize(22);
    doc.setFont(this.config.fonts.bold);
    doc.text('MIRA 0.2 | НЕБОСВОД', 105, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(14);
    doc.setFont(this.config.fonts.normal);
    doc.text('СИСТЕМА КОМПЛЕКСНОГО АНАЛИЗА', 105, y, { align: 'center' });
    doc.text('ПОГОДНЫХ УСЛОВИЙ ДЛЯ ПЛАНИРОВАНИЯ ПОЛЕТОВ БВС', 105, y + 6, { align: 'center' });
    y += 30;

    // Информация о миссии
    doc.setFontSize(12);
    doc.setFont(this.config.fonts.bold);
    doc.text('ИНФОРМАЦИЯ О МИССИИ', 105, y, { align: 'center' });
    y += 10;

    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    const missionInfo = [
      `Название: ${data.missionName || 'Миссия «Северный»'}`,
      `Дата: ${this.formatDate(data.date)}`,
      `Аэродром: ${data.aerodrome || '«Северный»'}`,
      `Координаты: ${data.coordinates.start.lat.toFixed(4)}°N, ${data.coordinates.start.lon.toFixed(4)}°E`
    ];

    missionInfo.forEach(line => {
      doc.text(line, 105, y, { align: 'center' });
      y += 7;
    });
    y += 15;

    // Статус полёта
    const statusConfig = this.getStatusConfig(data.status);
    doc.setFontSize(16);
    doc.setFont(this.config.fonts.bold);
    doc.setTextColor(statusConfig.r, statusConfig.g, statusConfig.b);
    doc.text(`СТАТУС: ${statusConfig.text}`, 105, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 20;

    // Время генерации
    doc.setFontSize(10);
    doc.setFont(this.config.fonts.normal);
    doc.setTextColor(150, 150, 150);
    doc.text(`Отчёт сгенерирован: ${new Date().toLocaleString('ru-RU')}`, 105, y, { align: 'center' });

    return y;
  },

  // Страница резюме
  addSummaryPage(doc, data, y) {
    doc.setFontSize(14);
    doc.setFont(this.config.fonts.bold);
    doc.text('РЕЗЮМЕ', 15, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(this.config.fonts.normal);
    
    const summary = data.summary || [
      'Полёт разрешён при соблюдении следующих условий:',
      '• Видимость не менее 5 км',
      '• Ветер на высоте не более 15 м/с',
      '• Отсутствие осадков интенсивнее 1.4 мм/ч',
      '• Минимальный запас энергии при посадке 25%'
    ];

    summary.forEach(line => {
      doc.text(line, 15, y);
      y += 6;
    });
    y += 10;

    // Ключевые параметры
    doc.setFont(this.config.fonts.bold);
    doc.text('КЛЮЧЕВЫЕ ПАРАМЕТРЫ:', 15, y);
    y += 8;

    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    
    const params = [
      `Ветер 10м: ${data.weather.wind10m} м/с`,
      `Ветер 500м: ${data.weather.wind500m} м/с`,
      `Температура: ${data.weather.temp}°C`,
      `Видимость: ${data.weather.visibility} км`,
      `Осадки: ${data.weather.precipitation} мм/ч`
    ];

    params.forEach(param => {
      doc.text(param, 20, y);
      y += 6;
    });

    return y;
  },

  // Геометрия маршрута
  addRouteGeometry(doc, data, y) {
    doc.setFontSize(14);
    doc.setFont(this.config.fonts.bold);
    doc.text('ГЕОМЕТРИЯ МАРШРУТА', 15, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(this.config.fonts.normal);

    const segments = data.segments || [];
    
    // Таблица сегментов
    const headers = ['№', 'Сегмент', 'Расст. (км)', 'Время (мин)', 'Энергия (мАч)', 'Риск'];
    const colWidths = [10, 50, 30, 30, 40, 25];
    
    // Заголовки
    doc.setFont(this.config.fonts.bold);
    headers.forEach((h, i) => {
      doc.text(h, 15 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y);
    });
    y += 8;

    // Данные
    doc.setFont(this.config.fonts.normal);
    segments.forEach((seg, row) => {
      const x = 15;
      doc.text(String(seg.id || row + 1), x, y);
      doc.text(seg.name || `Сегмент ${row + 1}`, x + 10, y);
      doc.text(String(seg.distance || 0), x + 60, y);
      doc.text(String(seg.time || 0), x + 90, y);
      doc.text(String(seg.energy || 0), x + 120, y);
      doc.text(this.getRiskText(seg.risk), x + 160, y);
      y += 6;
    });

    return y + 10;
  },

  // Метеоанализ
  addWeatherAnalysis(doc, data, y) {
    doc.setFontSize(14);
    doc.setFont(this.config.fonts.bold);
    doc.text('МЕТЕОАНАЛИЗ', 15, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(this.config.fonts.normal);

    // Вертикальные профили
    doc.setFont(this.config.fonts.bold);
    doc.text('Вертикальные профили (250-800 м):', 15, y);
    y += 8;

    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);

    const profiles = data.profiles || {
      wind: [5.2, 7.8, 9.2, 10.5, 12.1],
      temp: [-8.5, -7.8, -7.5, -7.1, -6.5],
      altitudes: [250, 400, 550, 650, 800]
    };

    doc.text('Высота (м) | Ветер (м/с) | Температура (°C)', 15, y);
    y += 6;
    doc.line(15, y, 100, y);
    y += 6;

    profiles.altitudes.forEach((alt, i) => {
      doc.text(
        `${alt} | ${profiles.wind[i]?.toFixed(1) || '--'} | ${profiles.temp[i]?.toFixed(1) || '--'}`,
        15, y
      );
      y += 5;
    });

    return y + 10;
  },

  // Энергетический анализ
  addEnergyAnalysis(doc, data, y) {
    doc.setFontSize(14);
    doc.setFont(this.config.fonts.bold);
    doc.text('ЭНЕРГЕТИЧЕСКИЙ АНАЛИЗ', 15, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(this.config.fonts.normal);

    const energyData = data.energy || {
      capacity: 25300,
      consumption: 177.3,
      minReserve: 6325,
      maxFlightTime: 107
    };

    const lines = [
      `Ёмкость батареи: ${energyData.capacity} мАч`,
      `Расход энергии: ${energyData.consumption} мАч/мин`,
      `Минимальный запас: ${energyData.minReserve} мАч (25%)`,
      `Макс. время полёта: ${energyData.maxFlightTime} мин`,
      `Точка невозврата: ${data.pnr?.distance || '24.3'} км`
    ];

    lines.forEach(line => {
      doc.text(line, 15, y);
      y += 6;
    });

    return y + 10;
  },

  // Рекомендации
  addRecommendations(doc, data, y) {
    doc.setFontSize(14);
    doc.setFont(this.config.fonts.bold);
    doc.text('РЕКОМЕНДАЦИИ', 15, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(this.config.fonts.normal);

    const recommendations = data.recommendations || [
      '1. Рекомендуемое время старта: 10:25 — 10:35 местного времени',
      '2. Высота выхода на маршрут: 500 м',
      '3. Крейсерская высота: 750 м (максимальная энергоэффективность)',
      '4. Контроль энергии на отметках: 27.8 км, 58 км, 75.3 км',
      '5. При ухудшении видимости менее 5 км — немедленная посадка',
      '6. Минимальное напряжение при посадке: 21.0 В (3.5 В/элемент)'
    ];

    recommendations.forEach(rec => {
      doc.text(rec, 15, y);
      y += 7;
    });

    y += 10;

    // Контакты экстренных служб
    doc.setFont(this.config.fonts.bold);
    doc.text('КОНТАКТЫ ЭКСТРЕННЫХ СЛУЖБ:', 15, y);
    y += 8;

    doc.setFont(this.config.fonts.normal);
    doc.setFont(this.config.fonts.mono);
    
    const contacts = [
      'Аварийная посадка: 112',
      'Пожарная служба: 101',
      'Полиция: 102',
      'МЧС: 101'
    ];

    contacts.forEach(contact => {
      doc.text(contact, 20, y);
      y += 5;
    });

    return y;
  },

  // Вспомогательные функции
  getStatusConfig(status) {
    const configs = {
      allowed: { text: '✅ РАЗРЕШЁН', r: 25, g: 135, b: 84 },
      restricted: { text: '⚠️ ОГРАНИЧЕН', r: 255, g: 193, b: 7 },
      forbidden: { text: '❌ ЗАПРЕЩЁН', r: 220, g: 53, b: 69 }
    };
    return configs[status] || configs.allowed;
  },

  getWindDirection(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  },

  getIcingRiskText(risk) {
    if (risk < 0.3) return 'Низкий';
    if (risk < 0.6) return 'Умеренный';
    return 'Высокий';
  },

  getRiskText(risk) {
    if (risk === 'low') return 'Низкий';
    if (risk === 'moderate') return 'Умеренный';
    if (risk === 'high') return 'Высокий';
    return risk;
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  formatDateForFilename(date) {
    const d = new Date(date);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
};
