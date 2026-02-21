/**
 * MIRA 0.2 | Небосвод - API Module
 * Работа с внешними API и данными
 */

const WeatherAPI = {
  // Конфигурация
  config: {
    openMeteoUrl: 'https://api.open-meteo.com/v1/forecast',
    openTopoUrl: 'https://api.opentopodata.org/v1/srtm90m',
    sunriseSunsetUrl: 'https://api.sunrise-sunset.org/json',
    maxRetries: 3,
    retryDelay: 1000 // мс
  },

  // Задержка перед следующей попыткой
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Fetch с retry logic
  async fetchWithRetry(url, options = {}, retries = this.config.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
            ...options.headers
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        console.warn(`Попытка ${attempt} не удалась, повтор через ${this.config.retryDelay}мс...`);
        await this.delay(this.config.retryDelay * attempt); // экспоненциальная задержка
      }
    }
  },

  // Параметры запроса к Open-Meteo
  getMeteoParams(lat, lon, startTime, endTime) {
    return {
      latitude: lat,
      longitude: lon,
      hourly: [
        'temperature_2m',
        'relativehumidity_2m',
        'dewpoint_2m',
        'windspeed_10m',
        'winddirection_10m',
        'surface_pressure',
        'precipitation',
        'precipitation_probability',
        'weathercode',
        'visibility',
        'cloudcover'
      ].join(','),
      start_hour: startTime,
      end_hour: endTime,
      timezone: 'auto',
      forecast_days: 1
    };
  },

  // Запрос метеоданных для маршрута (несколько точек)
  async fetchMeteoDataForRoute(coordinates, startTime, endTime) {
    const promises = coordinates.map(coord =>
      this.fetchMeteoData(coord.lat, coord.lon, startTime, endTime)
    );

    try {
      const results = await Promise.all(promises);
      return results.map((data, index) => ({
        ...data,
        pointName: coordinates[index].name,
        lat: coordinates[index].lat,
        lon: coordinates[index].lon
      }));
    } catch (error) {
      console.error('Ошибка получения данных для маршрута:', error);
      throw error;
    }
  },

  // Запрос метеоданных
  async fetchMeteoData(lat, lon, date) {
    const params = {
      latitude: lat,
      longitude: lon,
      hourly: [
        'temperature_2m',
        'relativehumidity_2m',
        'dewpoint_2m',
        'windspeed_10m',
        'winddirection_10m',
        'surface_pressure',
        'precipitation',
        'precipitation_probability',
        'weathercode',
        'visibility',
        'cloudcover'
      ].join(','),
      timezone: 'auto',
      forecast_days: 7
    };

    const queryString = new URLSearchParams(params).toString();
    const url = `${this.config.openMeteoUrl}?${queryString}`;

    try {
      const data = await this.fetchWithRetry(url);
      return data;
    } catch (error) {
      console.error('Ошибка получения метеоданных:', error);
      throw error;
    }
  },

  // Запрос высоты местности
  async fetchElevation(lat, lon) {
    // OpenTopoData API блокирует CORS-прокси, возвращаем значение по умолчанию
    // В будущей версии можно использовать серверный прокси
    console.log('Высота местности: используется значение по умолчанию (0 м)');
    return 0;
  },

  // Запрос времени восхода/заката
  async fetchSunTimes(lat, lon, date) {
    const url = `${this.config.sunriseSunsetUrl}?lat=${lat}&lng=${lon}&date=${date}&formatted=0`;

    try {
      const data = await this.fetchWithRetry(url);
      return {
        sunrise: data.results?.sunrise,
        sunset: data.results?.sunset
      };
    } catch (error) {
      console.error('Ошибка получения времени восхода/заката:', error);
      return null;
    }
  },

  // Загрузка данных миссии из JSON
  async loadMissionData() {
    // Сначала пробуем встроенные данные (для работы без CORS)
    if (window.MISSION_DATA) {
      return window.MISSION_DATA;
    }
    
    // Если нет, пробуем загрузить из файла
    try {
      const response = await fetch('data/coordinates.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Не удалось загрузить coordinates.json, используем демо-данные');
      return null;
    }
  },

  // Расчёт временного диапазона (восход - 30 мин до заката + 30 мин)
  calculateTimeRange(sunrise, sunset) {
    const start = new Date(sunrise);
    start.setMinutes(start.getMinutes() - 30);
    
    const end = new Date(sunset);
    end.setMinutes(end.getMinutes() + 30);
    
    return {
      start: start.toISOString().slice(0, 13),
      end: end.toISOString().slice(0, 13),
      startHour: start.getHours(),
      endHour: end.getHours() + 1
    };
  }
};

/**
 * Расчётные методы
 */
const WeatherCalculations = {
  // Линейная интерполяция между уровнями
  interpolate(valueLower, valueUpper, ratio) {
    // Защита от некорректных данных
    if (valueLower === undefined || valueUpper === undefined || ratio === undefined) {
      return null;
    }
    if (valueLower === null || valueUpper === null) {
      return null;
    }
    return valueLower + (valueUpper - valueLower) * ratio;
  },

  // Интерполяция направления ветра (с учётом перехода 360°→0°)
  interpolateWindDirection(dirLower, dirUpper, ratio) {
    // Защита от некорректных данных
    if (dirLower === undefined || dirUpper === undefined || ratio === undefined) {
      return null;
    }
    if (dirLower === null || dirUpper === null) {
      return null;
    }

    // Нормализация углов к диапазону [0, 360)
    dirLower = ((dirLower % 360) + 360) % 360;
    dirUpper = ((dirUpper % 360) + 360) % 360;

    // Расчёт кратчайшего пути с учётом перехода через 0°
    let diff = dirUpper - dirLower;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    let result = dirLower + diff * ratio;

    // Нормализация результата
    result = ((result % 360) + 360) % 360;

    return result;
  },

  // Интерполяция метеопараметров на целевую высоту
  interpolateToAltitude(data, targetAltitude, surfaceElevation) {
    const targetPressureLevel = surfaceElevation + targetAltitude;
    
    // Уровни давления (гПа) и их примерные высоты
    const pressureLevels = [
      { level: 975, height: 300 },
      { level: 950, height: 550 },
      { level: 925, height: 800 },
      { level: 900, height: 1050 }
    ];

    // Находим ближайшие уровни
    let lower, upper;
    for (let i = 0; i < pressureLevels.length - 1; i++) {
      if (pressureLevels[i].height <= targetPressureLevel && 
          pressureLevels[i + 1].height >= targetPressureLevel) {
        lower = pressureLevels[i];
        upper = pressureLevels[i + 1];
        break;
      }
    }

    if (!lower || !upper) return null;

    const ratio = (targetPressureLevel - lower.height) / (upper.height - lower.height);

    return {
      temperature: this.interpolate(data[`temperature_${lower.level}hPa`], data[`temperature_${upper.level}hPa`], ratio),
      windspeed: this.interpolate(data[`windspeed_${lower.level}hPa`], data[`windspeed_${upper.level}hPa`], ratio),
      winddirection: this.interpolateWindDirection(
        data[`winddirection_${lower.level}hPa`],
        data[`winddirection_${upper.level}hPa`],
        ratio
      ),
      humidity: this.interpolate(data[`relativehumidity_${lower.level}hPa`], data[`relativehumidity_${upper.level}hPa`], ratio)
    };
  },

  // Расчёт индекса риска обледенения (из спецификации)
  calculateIcingRisk(temp, humidity, precipitation) {
    const tempFactor = Math.max(0, 1 - Math.abs(temp - 0) / 10);
    const humidityFactor = humidity / 100;
    const precipFactor = precipitation > 0.1 ? 1 : 0.3;
    return Math.max(0, Math.min(1, tempFactor * humidityFactor * precipFactor));
  },

  // Расчёт высоты нижней границы облаков (из спецификации)
  calculateCloudBase(temp, dewpoint) {
    return 125 * (temp - dewpoint);
  },

  // Вероятность тумана (из спецификации)
  calculateFogProbability(temp, dewpoint, humidity, windSpeed) {
    if (humidity <= 90 || windSpeed >= 5) return 0;
    return Math.max(0, 1 - (temp - dewpoint) / 2.0);
  },

  // Индекс турбулентности (из спецификации)
  calculateTurbulenceIndex(windShear, tempGradient, heightDiff) {
    return Math.abs(windShear / (heightDiff / 100)) * Math.abs(tempGradient / heightDiff);
  },

  // Энергетический коэффициент (из спецификации)
  calculateEnergyCoefficient(headwind, tailwind, crosswind) {
    return 1.0 + 0.12 * (headwind / 5) - 0.08 * (tailwind / 5) + 0.05 * (crosswind / 5);
  },

  // Расчёт расстояния между точками (формула гаверсинуса)
  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Расчёт путевой скорости с учётом ветра
  calculateGroundSpeed(airspeed, windSpeed, windDirection, aircraftHeading) {
    const windAngle = (windDirection - aircraftHeading) * Math.PI / 180;
    const headwind = windSpeed * Math.cos(windAngle);
    const crosswind = windSpeed * Math.sin(windAngle);
    
    // Путевая скорость
    const groundSpeed = Math.sqrt(
      Math.pow(airspeed, 2) + Math.pow(windSpeed, 2) + 
      2 * airspeed * windSpeed * Math.cos(windAngle)
    );
    
    return { groundSpeed, headwind, crosswind };
  },

  // Расчёт времени прохождения сегмента
  calculateSegmentTime(distance, groundSpeed) {
    return (distance / groundSpeed) * 60; // минуты
  },

  // Расчёт энергопотребления на сегменте
  calculateSegmentEnergy(timeMinutes, consumptionRate = 177.3, energyCoefficient = 1.0) {
    return timeMinutes * consumptionRate * energyCoefficient;
  },

  // Расчёт точки невозврата (PNR)
  calculatePNR(batteryCapacity, minReservePercent = 25, consumptionRate = 177.3, groundSpeedOut, groundSpeedBack) {
    const minReserve = batteryCapacity * minReservePercent / 100;
    const availableEnergy = batteryCapacity - minReserve;
    
    // Время до PNR (мин)
    const timeToPNR = availableEnergy / (consumptionRate * (1 + groundSpeedBack / groundSpeedOut));
    
    // Расстояние до PNR (км)
    const distanceToPNR = (timeToPNR * groundSpeedOut) / 60;
    
    return {
      distance: distanceToPNR.toFixed(1),
      time: Math.round(timeToPNR),
      minReserve: Math.round(minReserve)
    };
  },

  // Классификация риска по порогам
  classifyRisk(value, thresholds) {
    if (value < thresholds.low) return 'low';
    if (value < thresholds.high) return 'moderate';
    return 'high';
  },

  // Комплексная оценка безопасности полёта
  assessFlightSafety(conditions) {
    const { wind, visibility, precipitation, temp, dewpoint, humidity, icing } = conditions;
    const scores = {
      wind: wind > 15 ? 0 : (wind > 10 ? 1 : 2),
      visibility: visibility > 5 ? 2 : (visibility > 3 ? 1 : 0),
      precipitation: precipitation > 2.5 ? 0 : (precipitation > 1.4 ? 1 : 2),
      icing: icing > 0.6 ? 0 : (icing > 0.3 ? 1 : 2)
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const maxScore = 8;
    const rating = totalScore / maxScore;

    return {
      rating: rating.toFixed(2),
      status: rating > 0.7 ? 'allowed' : (rating > 0.4 ? 'restricted' : 'forbidden'),
      scores
    };
  },

  // Статус полёта по критериям из спецификации
  getFlightStatus(conditions) {
    const { wind, visibility, precipitation, icing, fog } = conditions;
    
    // Критические условия (красная зона)
    if (wind > 15 || visibility < 3 || precipitation > 2.5 || icing > 0.6) {
      return 'forbidden';
    }
    
    // Умеренный риск (жёлтая зона)
    if (wind > 10 || visibility < 5 || precipitation > 1.4 || icing > 0.3 || fog > 0.7) {
      return 'restricted';
    }
    
    // Зелёная зона
    return 'allowed';
  },

  // Расчёт компонентов ветра относительно курса БВС
  calculateWindComponents(windSpeed, windDirection, aircraftHeading) {
    const windAngleRad = (windDirection - aircraftHeading) * Math.PI / 180;
    
    const headwind = windSpeed * Math.cos(windAngleRad);
    const crosswind = windSpeed * Math.sin(windAngleRad);
    
    return {
      headwind: headwind > 0 ? headwind : 0,
      tailwind: headwind < 0 ? -headwind : 0,
      crosswind: Math.abs(crosswind)
    };
  }
};
