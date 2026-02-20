/**
 * MIRA 0.2 | Небосвод - Time Windows Module
 * Анализ временных окон, рейтинг безопасности
 */

const TimeWindows = {
  // Конфигурация
  config: {
    windowDuration: 30, // минут
    minRating: 0.4, // минимальный рейтинг для полёта
    maxRating: 1.0
  },

  // Расчёт временных окон на 24 часа
  calculateWindows(weatherData, coordinates) {
    if (!weatherData || !weatherData.hourly) {
      return this.generateDemoWindows();
    }

    const hourly = weatherData.hourly;
    const windows = [];
    
    // Разбиение на 30-минутные окна
    for (let i = 0; i < hourly.time.length - 1; i++) {
      const startTime = hourly.time[i];
      const endTime = hourly.time[i + 1];
      
      // Извлечение параметров для окна
      const params = {
        time: startTime,
        temp: hourly.temperature_2m[i],
        humidity: hourly.relativehumidity_2m[i],
        windSpeed: hourly.windspeed_10m[i],
        windDir: hourly.winddirection_10m[i],
        precipitation: hourly.precipitation[i],
        visibility: hourly.visibility[i],
        cloudCover: hourly.cloudcover[i],
        dewpoint: hourly.dewpoint_2m ? hourly.dewpoint_2m[i] : null
      };

      // Расчёт рейтинга
      const rating = this.calculateWindowRating(params);
      const status = this.getWindowStatus(rating, params);

      windows.push({
        startTime,
        endTime,
        params,
        rating: parseFloat(rating.toFixed(2)),
        status,
        recommendation: this.getRecommendation(status, params)
      });
    }

    return windows;
  },

  // Расчёт рейтинга окна
  calculateWindowRating(params) {
    let rating = 1.0;

    // Ветер (максимум -0.3)
    if (params.windSpeed > 15) rating -= 0.3;
    else if (params.windSpeed > 10) rating -= 0.15;
    else if (params.windSpeed > 7) rating -= 0.05;

    // Видимость (максимум -0.3)
    const visibilityKm = params.visibility / 1000;
    if (visibilityKm < 3) rating -= 0.3;
    else if (visibilityKm < 5) rating -= 0.15;
    else if (visibilityKm < 8) rating -= 0.05;

    // Осадки (максимум -0.25)
    if (params.precipitation > 2.5) rating -= 0.25;
    else if (params.precipitation > 1.4) rating -= 0.15;
    else if (params.precipitation > 0.5) rating -= 0.05;

    // Обледенение (максимум -0.15)
    const icingRisk = this.calculateIcingRisk(params);
    if (icingRisk > 0.6) rating -= 0.15;
    else if (icingRisk > 0.3) rating -= 0.08;
    else if (icingRisk > 0.1) rating -= 0.03;

    // Туман (максимум -0.1)
    const fogProb = this.calculateFogProbability(params);
    if (fogProb > 0.7) rating -= 0.1;
    else if (fogProb > 0.5) rating -= 0.05;

    return Math.max(0, Math.min(1, rating));
  },

  // Определение статуса окна
  getWindowStatus(rating, params) {
    // Критические условия
    if (params.windSpeed > 15 || 
        params.visibility < 3000 || 
        params.precipitation > 2.5 ||
        this.calculateIcingRisk(params) > 0.6) {
      return 'forbidden';
    }

    // Умеренный риск
    if (rating < this.config.minRating ||
        params.windSpeed > 10 || 
        params.visibility < 5000 || 
        params.precipitation > 1.4) {
      return 'restricted';
    }

    return 'allowed';
  },

  // Рекомендации по окну
  getRecommendation(status, params) {
    const recommendations = [];

    if (status === 'forbidden') {
      recommendations.push('❌ Полёт запрещён');
      if (params.windSpeed > 15) recommendations.push('• Сильный ветер');
      if (params.visibility < 3000) recommendations.push('• Низкая видимость');
      if (params.precipitation > 2.5) recommendations.push('• Сильные осадки');
    } else if (status === 'restricted') {
      recommendations.push('⚠️ Полёт с ограничениями');
      if (params.windSpeed > 10) recommendations.push('• Умеренный ветер');
      if (params.visibility < 5000) recommendations.push('• Ограниченная видимость');
    } else {
      recommendations.push('✅ Полёт разрешён');
      recommendations.push('• Условия благоприятные');
    }

    return recommendations;
  },

  // Расчёт риска обледенения
  calculateIcingRisk(params) {
    if (!params.dewpoint) return 0;
    
    const tempFactor = Math.max(0, 1 - Math.abs(params.temp - 0) / 10);
    const humidityFactor = params.humidity / 100;
    const precipFactor = params.precipitation > 0.1 ? 1 : 0.3;
    
    return Math.max(0, Math.min(1, tempFactor * humidityFactor * precipFactor));
  },

  // Расчёт вероятности тумана
  calculateFogProbability(params) {
    if (!params.dewpoint || params.humidity <= 90 || params.windSpeed >= 5) {
      return 0;
    }
    return Math.max(0, 1 - (params.temp - params.dewpoint) / 2.0);
  },

  // Поиск оптимальных окон
  findBestWindows(windows, count = 3) {
    return windows
      .filter(w => w.status === 'allowed')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, count);
  },

  // Поиск всех допустимых окон
  findAllowedWindows(windows) {
    return windows.filter(w => w.status === 'allowed');
  },

  // Группировка окон по статусу
  groupByStatus(windows) {
    return {
      allowed: windows.filter(w => w.status === 'allowed'),
      restricted: windows.filter(w => w.status === 'restricted'),
      forbidden: windows.filter(w => w.status === 'forbidden')
    };
  },

  // Расчёт непрерывных периодов
  findContinuousPeriods(windows, minDuration = 60) {
    const periods = [];
    let currentPeriod = null;

    for (const window of windows) {
      if (window.status === 'allowed') {
        if (!currentPeriod) {
          currentPeriod = {
            start: window.startTime,
            end: window.endTime,
            windows: [window],
            avgRating: window.rating
          };
        } else {
          currentPeriod.end = window.endTime;
          currentPeriod.windows.push(window);
          currentPeriod.avgRating = (currentPeriod.avgRating + window.rating) / 2;
        }
      } else {
        if (currentPeriod && currentPeriod.windows.length * 30 >= minDuration) {
          periods.push(currentPeriod);
        }
        currentPeriod = null;
      }
    }

    // Последний период
    if (currentPeriod && currentPeriod.windows.length * 30 >= minDuration) {
      periods.push(currentPeriod);
    }

    return periods;
  },

  // Форматирование времени
  formatTime(isoString) {
    return isoString.slice(11, 16);
  },

  // Генерация демо-окон
  generateDemoWindows() {
    const windows = [];
    const now = new Date();

    for (let i = 0; i < 48; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const isoString = time.toISOString().slice(0, 16);
      
      // Имитация изменения условий
      const hour = time.getHours();
      let status = 'allowed';
      let rating = 0.8 + Math.random() * 0.2;

      if (hour < 6 || hour > 20) {
        status = 'restricted';
        rating = 0.5 + Math.random() * 0.3;
      }

      if (Math.random() < 0.1) {
        status = 'forbidden';
        rating = 0.2 + Math.random() * 0.3;
      }

      windows.push({
        startTime: isoString,
        endTime: new Date(time.getTime() + 30 * 60 * 1000).toISOString().slice(0, 16),
        rating: parseFloat(rating.toFixed(2)),
        status,
        params: {
          temp: -8 + Math.random() * 4,
          windSpeed: 5 + Math.random() * 5,
          precipitation: Math.random() < 0.2 ? Math.random() : 0
        },
        recommendation: status === 'allowed' ? ['✅ Полёт разрешён'] : ['⚠️ Ограничения']
      });
    }

    return windows;
  },

  // Анализ временной динамики
  analyzeTrend(windows) {
    if (windows.length < 2) return 'stable';

    const firstHalf = windows.slice(0, Math.floor(windows.length / 2));
    const secondHalf = windows.slice(Math.floor(windows.length / 2));

    const firstAvg = firstHalf.reduce((sum, w) => sum + w.rating, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, w) => sum + w.rating, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'worsening';
    return 'stable';
  },

  // Рекомендация лучшего времени для вылета
  recommendDepartureTime(windows) {
    const periods = this.findContinuousPeriods(windows, 60);
    
    if (periods.length === 0) {
      return {
        recommended: false,
        reason: 'Нет благоприятных окон',
        alternatives: this.findBestWindows(windows, 1)
      };
    }

    // Выбор периода с наивысшим рейтингом
    const bestPeriod = periods.reduce((best, current) => 
      current.avgRating > best.avgRating ? current : best
    );

    return {
      recommended: true,
      startTime: bestPeriod.start,
      endTime: bestPeriod.end,
      duration: bestPeriod.windows.length * 30,
      avgRating: parseFloat(bestPeriod.avgRating.toFixed(2)),
      reason: 'Наилучшие условия'
    };
  }
};
