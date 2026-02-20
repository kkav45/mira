/**
 * MIRA 0.2 | Небосвод - API Module
 * Работа с внешними API и данными
 */

const WeatherAPI = {
  // Конфигурация
  config: {
    openMeteoUrl: 'https://api.open-meteo.com/v1/forecast',
    openTopoUrl: 'https://api.opentopodata.org/v1/srtm90m',
    sunriseSunsetUrl: 'https://api.sunrise-sunset.org/json'
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
        'rain',
        'snowfall',
        'weathercode',
        'visibility',
        'cloudcover_low',
        'cloudcover',
        'cape',
        'freezing_level_height',
        'shortwave_radiation'
      ].join(','),
      start_hour: startTime,
      end_hour: endTime,
      timezone: 'auto'
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
  async fetchMeteoData(lat, lon, startTime, endTime) {
    const params = this.getMeteoParams(lat, lon, startTime, endTime);
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.config.openMeteoUrl}?${queryString}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ошибка получения метеоданных:', error);
      throw error;
    }
  },

  // Запрос высоты местности
  async fetchElevation(lat, lon) {
    const url = `${this.config.openTopoUrl}?locations=${lat},${lon}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.results[0]?.elevation || 0;
    } catch (error) {
      console.error('Ошибка получения высоты:', error);
      return 0;
    }
  },

  // Запрос времени восхода/заката
  async fetchSunTimes(lat, lon, date) {
    const url = `${this.config.sunriseSunsetUrl}?lat=${lat}&lng=${lon}&date=${date}&formatted=0`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        sunrise: data.results.sunrise,
        sunset: data.results.sunset
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
    return valueLower + (valueUpper - valueLower) * ratio;
  },

  // Интерполяция направления ветра (с учётом перехода 360°→0°)
  interpolateWindDirection(dirLower, dirUpper, ratio) {
    let diff = dirUpper - dirLower;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let result = dirLower + diff * ratio;
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;
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

/**
 * Генерация демонстрационных данных (для прототипа)
 */
const MockDataGenerator = {
  generateHourlyData(hours = 48) {
    const data = {
      time: [],
      temperature_2m: [],
      relativehumidity_2m: [],
      windspeed_10m: [],
      winddirection_10m: [],
      precipitation: [],
      visibility: [],
      cloudcover: [],
      weathercode: []
    };

    const now = new Date();
    let temp = -8;
    let wind = 5;

    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      data.time.push(time.toISOString().slice(0, 16));

      // Имитация изменения параметров
      temp += (Math.random() - 0.5) * 2;
      wind += (Math.random() - 0.5) * 2;
      wind = Math.max(2, Math.min(15, wind));

      data.temperature_2m.push(parseFloat(temp.toFixed(1)));
      data.relativehumidity_2m.push(Math.floor(60 + Math.random() * 30));
      data.windspeed_10m.push(parseFloat(wind.toFixed(1)));
      data.winddirection_10m.push(Math.floor(200 + Math.random() * 80));
      data.precipitation.push(parseFloat((Math.random() * 0.5).toFixed(1)));
      data.visibility.push(Math.floor(8 + Math.random() * 7));
      data.cloudcover.push(Math.floor(20 + Math.random() * 40));
      data.weathercode.push(Math.random() > 0.8 ? 3 : 1);
    }

    return data;
  },

  generateFlightWindows() {
    const windows = [];
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const startTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      
      const status = Math.random() > 0.3 ? 'allowed' : (Math.random() > 0.5 ? 'restricted' : 'forbidden');
      
      windows.push({
        startTime: startTime.toISOString().slice(0, 16),
        endTime: endTime.toISOString().slice(0, 16),
        status: status,
        rating: parseFloat((0.5 + Math.random() * 0.5).toFixed(2))
      });
    }

    return windows;
  },

  generateRouteSegments() {
    return [
      { id: 1, name: 'Взлёт - КП1', distance: 12.4, time: 12, energy: 2140, wind: 5.2, temp: -8, risk: 'low' },
      { id: 2, name: 'КП1 - КП2', distance: 18.7, time: 18, energy: 3200, wind: 7.8, temp: -9, risk: 'moderate' },
      { id: 3, name: 'КП2 - Конец', distance: 15.2, time: 15, energy: 2680, wind: 6.1, temp: -7, risk: 'low' }
    ];
  }
};
