/**
 * MIRA 0.2 | Небосвод - Report Data Preparation
 * Подготовка данных для PDF отчётов
 */

const ReportDataPrep = {
  // Подготовка данных для отчёта
  prepareReportData() {
    const missionData = App.state.missionData || window.MISSION_DATA;
    const weatherData = App.state.weatherData;
    const location = App.state.currentLocation;

    // Расчёт маршрута
    const routePoints = missionData?.coordinates?.route || [];
    const routeReport = routePoints.length > 0 
      ? RouteCalculator.generateRouteReport(routePoints, weatherData?.weather || {})
      : null;

    // Временные окна
    const windows = TimeWindows.calculateWindows(weatherData);
    const departure = TimeWindows.recommendDepartureTime(windows);

    // Формирование полного объекта данных
    return {
      missionName: missionData?.mission?.name || 'Миссия',
      date: missionData?.mission?.date || new Date().toISOString(),
      aerodrome: missionData?.mission?.aerodrome?.name || 'Неизвестный',
      coordinates: missionData?.coordinates || { start: location || { lat: 55.30, lon: 66.60 } },
      status: this.getCurrentFlightStatus(),
      weather: this.getCurrentWeatherData(weatherData),
      segments: routeReport?.segments || [],
      pnr: routeReport?.pnr || { distance: '24.3', time: 18, minReserve: 6325 },
      flightTime: routeReport?.feasibility?.totalTime || 45,
      energyConsumption: routeReport?.feasibility?.totalEnergy || 8020,
      batteryReserve: routeReport?.pnr?.minReserve || 6325,
      batteryReservePercent: 25,
      altitudes: { climb: 500, cruise: 750, descent: 500 },
      maxDistance: '35.2',
      recommendedTime: departure.recommended 
        ? `${TimeWindows.formatTime(departure.startTime)} — ${TimeWindows.formatTime(departure.endTime)}`
        : 'Нет благоприятных окон',
      routeLength: routeReport?.summary?.totalDistance || 46.3,
      summary: this.generateSummary(windows, weatherData),
      profiles: this.extractProfiles(weatherData),
      energy: {
        capacity: 25300,
        consumption: 177.3,
        minReserve: 6325,
        maxFlightTime: 107
      },
      recommendations: this.generateRecommendations(departure, weatherData),
      timeWindows: {
        allowed: windows.filter(w => w.status === 'allowed').length,
        restricted: windows.filter(w => w.status === 'restricted').length,
        forbidden: windows.filter(w => w.status === 'forbidden').length,
        trend: TimeWindows.analyzeTrend(windows)
      }
    };
  },

  // Получение текущего статуса полёта
  getCurrentFlightStatus() {
    const badge = document.getElementById('flight-status');
    if (badge?.classList.contains('status-vfr')) return 'allowed';
    if (badge?.classList.contains('status-mvfr')) return 'restricted';
    return 'forbidden';
  },

  // Получение текущих метео данных
  getCurrentWeatherData(weatherData) {
    if (weatherData && weatherData.hourly) {
      const hourly = weatherData.hourly;
      const idx = 0;
      return {
        wind10m: (hourly.windspeed_10m?.[idx] || 6.2).toFixed(1),
        windDir10m: hourly.winddirection_10m?.[idx] || 240,
        temp: (hourly.temperature_2m?.[idx] || -8).toFixed(0),
        humidity: hourly.relativehumidity_2m?.[idx] || 70,
        visibility: (hourly.visibility?.[idx] || 10000) / 1000,
        precipitation: (hourly.precipitation?.[idx] || 0).toFixed(1),
        cloudCover: hourly.cloudcover?.[idx] || 30,
        icing: TimeWindows.calculateIcingRisk({
          temp: hourly.temperature_2m?.[idx] || -8,
          humidity: hourly.relativehumidity_2m?.[idx] || 70,
          precipitation: hourly.precipitation?.[idx] || 0,
          dewpoint: hourly.dewpoint_2m?.[idx] || -12
        })
      };
    }

    // Значения по умолчанию
    return {
      wind10m: '0.0',
      windDir10m: 0,
      temp: '0',
      humidity: 0,
      visibility: 0,
      precipitation: '0.0',
      cloudCover: 0,
      icing: 0
    };
  },

  // Генерация резюме
  generateSummary(windows, weatherData) {
    const allowed = windows.filter(w => w.status === 'allowed').length;
    const total = windows.length;
    const percentage = Math.round((allowed / total) * 100);

    const summary = [
      `Процент благоприятных окон: ${percentage}%`,
      'Полёт разрешён при соблюдении условий:',
      '• Видимость не менее 5 км',
      '• Ветер на высоте не более 15 м/с',
      '• Отсутствие осадков интенсивнее 1.4 мм/ч',
      '• Минимальный запас энергии при посадке 25%'
    ];

    if (percentage < 30) {
      summary.unshift('⚠️ Мало благоприятных окон - рассмотрите альтернативное время');
    }

    return summary;
  },

  // Извлечение профилей
  extractProfiles(weatherData) {
    if (weatherData && weatherData.hourly) {
      return {
        wind: weatherData.hourly.windspeed_10m?.slice(0, 24) || [],
        temp: weatherData.hourly.temperature_2m?.slice(0, 24) || [],
        altitudes: [250, 400, 550, 650, 800],
        time: weatherData.hourly.time?.slice(0, 24).map(t => t.slice(11, 16)) || []
      };
    }

    // Пустые профили
    return {
      wind: [],
      temp: [],
      altitudes: [250, 400, 550, 650, 800],
      time: []
    };
  },

  // Генерация рекомендаций
  generateRecommendations(departure, weatherData) {
    const recommendations = [];

    if (departure.recommended) {
      recommendations.push(
        `1. Рекомендуемое время старта: ${TimeWindows.formatTime(departure.startTime)} — ${TimeWindows.formatTime(departure.endTime)}`,
        `2. Длительность благоприятного окна: ${departure.duration} мин`,
        `3. Рейтинг условий: ${departure.avgRating}`
      );
    } else {
      recommendations.push(
        '1. Нет благоприятных окон на ближайшие 24 часа',
        '2. Рассмотрите перенос полёта',
        '3. Мониторьте прогноз'
      );
    }

    recommendations.push(
      '4. Высота выхода на маршрут: 500 м',
      '5. Крейсерская высота: 750 м (максимальная энергоэффективность)',
      '6. Контроль энергии на отметках: 27.8 км, 58 км, 75.3 км',
      '7. При ухудшении видимости менее 5 км — немедленная посадка',
      '8. Минимальное напряжение при посадке: 21.0 В (3.5 В/элемент)'
    );

    return recommendations;
  },

  // Генерация краткого отчёта
  async generateQuickReport() {
    const data = this.prepareReportData();
    return await PDFExporter.generateShortReport(data);
  },

  // Генерация полного отчёта
  async generateFullReport() {
    const data = this.prepareReportData();
    return await PDFExporter.generateFullReport(data);
  }
};
