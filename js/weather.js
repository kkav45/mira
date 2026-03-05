/**
 * MIRA - Метеоданные (weather.js)
 * Open-Meteo API, MET Norway API, анализ, расчёт рисков
 */

const WeatherModule = {
    API_BASE: 'https://api.open-meteo.com/v1',
    METNO_API_BASE: 'https://api.met.no/weatherapi/locationforecast/2.0',
    
    /**
     * Идентификация приложения для MET Norway API
     * Требуется по условиям использования: https://api.met.no/documentation
     */
    APP_IDENTITY: {
        appName: 'MIRA',
        appVersion: '0.1.4.2',
        email: 'kkav45@ya.ru',
        userAgent: 'MIRA/0.1.4.2 (kkav45@ya.ru)'
    },
    
    cachedData: {},

    /**
     * Параметры для запроса
     */
    getForecastParams() {
        return {
            hourly: [
                'temperature_2m',
                'relative_humidity_2m',
                'dew_point_2m',
                'apparent_temperature',
                'precipitation_probability',
                'precipitation',
                'rain',
                'showers',
                'snowfall',
                'weather_code',
                'cloud_cover',
                'cloud_cover_low',
                'cloud_cover_mid',
                'cloud_cover_high',
                'pressure_msl',
                'surface_pressure',
                'wind_speed_10m',
                'wind_direction_10m',
                'wind_gusts_10m',
                'visibility',
                'evapotranspiration'
            ].join(','),
            daily: [
                'weather_code',
                'temperature_2m_max',
                'temperature_2m_min',
                'apparent_temperature_max',
                'apparent_temperature_min',
                'precipitation_sum',
                'precipitation_hours',
                'wind_speed_10m_max',
                'wind_gusts_10m_max',
                'wind_direction_10m_dominant',
                'sunrise',
                'sunset'
            ].join(','),
            current_weather: true,
            timezone: 'auto',
            forecast_days: 7
            // visibility_unit не поддерживается API - visibility всегда в метрах
        };
    },

    /**
     * Конвертация давления: гПа → мм рт. ст.
     * 1 гПа = 0.750062 мм рт. ст.
     */
    hPaToMmHg(hPa) {
        return Math.round(hPa * 0.750062);
    },

    /**
     * Получить исторические данные за месяц (НОВОЕ)
     */
    async getHistoricalMonth(lat, lon, year, month) {
        const cacheKey = `history_${lat.toFixed(2)}_${lon.toFixed(2)}_${year}_${month}`;
        
        // Проверка кэша (30 дней)
        const cached = Storage.getFromCache(cacheKey);
        if (cached) {
            console.log('📥 Исторические данные из кэша');
            return cached;
        }

        // Количество дней в месяце
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month-1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month-1).padStart(2, '0')}-${daysInMonth}`;

        const url = `${this.API_BASE}/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            // Кэшируем на 30 дней
            Storage.saveToCache(cacheKey, data, 30 * 24 * 60);
            
            return data;
        } catch (error) {
            console.error('Ошибка получения исторических данных:', error);
            return null;
        }
    },

    /**
     * Расчёт статистики за месяц (НОВОЕ)
     */
    calculateMonthlyStats(historicalData) {
        if (!historicalData || !historicalData.daily) return null;

        const daily = historicalData.daily;
        const days = daily.time?.length || 0;

        if (days === 0) return null;

        // Средняя температура
        const tempMax = daily.temperature_2m_max?.filter(t => t !== null) || [];
        const tempMin = daily.temperature_2m_min?.filter(t => t !== null) || [];
        const avgTempMax = tempMax.reduce((a, b) => a + b, 0) / tempMax.length;
        const avgTempMin = tempMin.reduce((a, b) => a + b, 0) / tempMin.length;
        const avgTemp = (avgTempMax + avgTempMin) / 2;

        // Средний ветер
        const wind = daily.wind_speed_10m_max?.filter(w => w !== null) || [];
        const avgWind = wind.reduce((a, b) => a + b, 0) / wind.length;
        const maxWind = Math.max(...wind);

        // Осадки
        const precip = daily.precipitation_sum?.filter(p => p !== null) || [];
        const totalPrecip = precip.reduce((a, b) => a + b, 0);
        const rainyDays = precip.filter(p => p > 0.5).length;

        // Благоприятные дни (температура >5°C, ветер <10 м/с, без осадков)
        const goodDays = daily.time.filter((_, i) => {
            const t = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
            const w = daily.wind_speed_10m_max[i];
            const p = daily.precipitation_sum[i];
            return t > 5 && w < 10 && p < 0.5;
        }).length;

        return {
            month: new Date(daily.time[0]).getMonth() + 1,
            year: new Date(daily.time[0]).getFullYear(),
            days: days,
            avgTemp: avgTemp,
            avgTempMax: avgTempMax,
            avgTempMin: avgTempMin,
            avgWind: avgWind,
            maxWind: maxWind,
            totalPrecip: totalPrecip,
            rainyDays: rainyDays,
            goodDays: goodDays,
            goodDaysPercent: Math.round(goodDays / days * 100)
        };
    },

    /**
     * Сравнение с климатической нормой (НОВОЕ)
     */
    compareWithNormal(stats, lat) {
        // Упрощённая климатическая норма (по широте)
        // Для Москвы (55°N): февраль -5°C, 6 м/с, 40мм
        const baseTemp = 5 - Math.abs(lat) * 0.3;
        const baseWind = 6;
        const basePrecip = 40;

        return {
            tempAnomaly: (stats.avgTemp - baseTemp).toFixed(1),
            tempNormal: baseTemp.toFixed(1),
            windAnomaly: (stats.avgWind - baseWind).toFixed(1),
            windNormal: baseWind,
            precipAnomaly: (stats.totalPrecip - basePrecip).toFixed(0),
            precipNormal: basePrecip,
            warmer: stats.avgTemp > baseTemp,
            windier: stats.avgWind > baseWind,
            wetter: stats.totalPrecip > basePrecip
        };
    },

    /**
     * Солнечные условия (НОВОЕ)
     */
    getSolarConditions(dailyData, index = 0) {
        if (!dailyData || !dailyData.daily) return null;

        const daily = dailyData.daily;
        const sunrise = daily.sunrise?.[index];
        const sunset = daily.sunset?.[index];

        // Расчёт продолжительности дня
        let dayLength = 0;
        if (sunrise && sunset) {
            const sunriseDate = new Date(sunrise);
            const sunsetDate = new Date(sunset);
            dayLength = Math.round((sunsetDate - sunriseDate) / 1000 / 60); // минут
        }

        // УФ-индекс (упрощённо по сезону)
        const month = new Date(daily.time[index]).getMonth() + 1;
        const uvIndex = month >= 5 && month <= 8 ? (month === 6 || month === 7 ? 6 : 5) : month >= 3 && month <= 10 ? 3 : 1;

        // Рабочее время: рассвет +30 мин, закат -30 мин
        let workStart = null, workEnd = null;
        if (sunrise && sunset) {
            const sunriseDate = new Date(sunrise);
            const sunsetDate = new Date(sunset);
            workStart = new Date(sunriseDate.getTime() + 30 * 60 * 1000); // +30 минут
            workEnd = new Date(sunsetDate.getTime() - 30 * 60 * 1000); // -30 минут
        }

        return {
            sunrise: sunrise ? new Date(sunrise).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : '—',
            sunset: sunset ? new Date(sunset).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : '—',
            workStartTime: workStart ? workStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : '—',
            workEndTime: workEnd ? workEnd.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : '—',
            dayLength: dayLength,
            dayLengthText: `${Math.floor(dayLength / 60)}ч ${dayLength % 60}мин`,
            uvIndex: uvIndex,
            uvRisk: uvIndex <= 2 ? 'low' : uvIndex <= 5 ? 'medium' : 'high'
        };
    },

    /**
     * Расчёт безопасных окон для дневного полёта
     * Рабочее время: от рассвета + 30 мин до заката - 30 мин
     */
    findSafeDaylightWindows(hourly, solar, thresholds) {
        if (!solar || !solar.sunrise || !solar.sunset) {
            return this.findFlightWindows(hourly, thresholds); // Обычные окна
        }

        // Парсим время рассвета и заката
        const sunriseTime = solar.sunrise.split(':');
        const sunsetTime = solar.sunset.split(':');
        const sunriseHour = parseInt(sunriseTime[0]);
        const sunriseMinute = parseInt(sunriseTime[1]) + 30; // +30 минут
        const sunsetHour = parseInt(sunsetTime[0]);
        const sunsetMinute = parseInt(sunsetTime[1]) - 30; // -30 минут

        // Нормализация времени
        const daylightStartHour = sunriseMinute >= 60 ? sunriseHour + 1 : sunriseHour;
        const daylightStartMinute = sunriseMinute >= 60 ? sunriseMinute - 60 : sunriseMinute;
        const daylightEndHour = sunsetMinute < 0 ? sunsetHour - 1 : sunsetHour;
        const daylightEndMinute = sunsetMinute < 0 ? sunsetMinute + 60 : sunsetMinute;

        Utils.log(`🌅 Дневное окно: ${daylightStartHour}:${String(daylightStartMinute).padStart(2, '0')} - ${daylightEndHour}:${String(daylightEndMinute).padStart(2, '0')}`);

        // Фильтрация почасовых данных по дневному времени
        const daylightHours = hourly.filter(h => {
            const hourTime = new Date(h.time);
            const hour = hourTime.getHours();
            const minute = hourTime.getMinutes();
            const timeInMinutes = hour * 60 + minute;
            const startInMinutes = daylightStartHour * 60 + daylightStartMinute;
            const endInMinutes = daylightEndHour * 60 + daylightEndMinute;

            return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
        });

        // Поиск безопасных окон в дневное время
        return this.findFlightWindows(daylightHours, thresholds, true);
    },

    /**
     * Получение прогноза погоды (ОБНОВЛЕНО с ML)
     */
    async getForecast(lat, lon, date = null) {
        const cacheKey = `forecast_${lat.toFixed(2)}_${lon.toFixed(2)}_${date || 'today'}`;

        // Проверяем кэш
        const cached = Storage.getFromCache(cacheKey);
        if (cached) {
            Utils.log('Данные получены из кэша');
            return cached;
        }

        const params = this.getForecastParams();

        // Если указана дата, используем её
        if (date) {
            // Форматируем дату в YYYY-MM-DD
            const dateObj = new Date(date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            params.start_date = dateStr;
            params.end_date = dateStr;
            delete params.forecast_days;
            
            Utils.log(`📅 Запрос метео на дату: ${dateStr}`);
        }

        const url = `${this.API_BASE}/forecast?latitude=${lat}&longitude=${lon}&${this.buildQueryString(params)}`;

        try {
            Utils.log(`Запрос метео: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            // Кэшируем на 30 минут
            Storage.saveToCache(cacheKey, data, 30);

            // 🤖 Сохраняем для ML (если есть фактические данные)
            if (typeof MLAccuracyModule !== 'undefined') {
                this.saveForML(data, lat, lon);
            }

            return data;
        } catch (error) {
            Utils.error('Ошибка получения прогноза', error);
            throw error;
        }
    },

    /**
     * Сохранение для ML (НОВОЕ)
     */
    async saveForML(forecastData, lat, lon) {
        // Получаем фактические данные (если есть в кэше за прошлый период)
        // Пока заглушка — в будущем будет сравнение с фактом
        console.log('🤖 ML: Данные сохранены для будущего анализа');
    },

    /**
     * Получить адаптивный прогноз (НОВОЕ)
     */
    async getAdaptiveForecast(lat, lon) {
        if (typeof MLAccuracyModule === 'undefined') {
            return this.getForecast(lat, lon);
        }

        // Получаем лучший источник
        const bestSource = MLAccuracyModule.getBestSource(lat, lon, 30);
        console.log('🏆 Лучший источник:', bestSource);

        // Получаем прогноз
        const forecast = await this.getForecast(lat, lon);

        // Применяем коррекцию если точность < 80%
        if (bestSource.accuracy < 0.8) {
            console.log('🔧 Применение адаптивной коррекции');
            // В будущем: коррекция на основе систематической ошибки
        }

        return {
            ...forecast,
            mlInfo: {
                bestSource: bestSource.source,
                accuracy: bestSource.accuracy,
                corrected: bestSource.accuracy < 0.8
            }
        };
    },

    /**
     * Получение прогноза для нескольких точек (сегментов)
     */
    async getForecastForSegments(segments, date = null) {
        const results = [];
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const centerPoint = this.getSegmentCenter(segment);
            
            try {
                const forecast = await this.getForecast(centerPoint.lat, centerPoint.lon, date);
                
                results.push({
                    segmentIndex: i,
                    coordinates: centerPoint,
                    forecast: forecast,
                    analyzed: this.analyzeForecast(forecast)
                });
                
                // Небольшая задержка между запросами
                if (i < segments.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                Utils.error(`Ошибка получения данных для сегмента ${i}`, error);
                results.push({
                    segmentIndex: i,
                    coordinates: centerPoint,
                    error: error.message
                });
            }
        }
        
        return results;
    },

    /**
     * Получение центральной точки сегмента
     */
    getSegmentCenter(segment) {
        if (segment.length === 0) return { lat: 0, lon: 0 };
        if (segment.length === 1) return segment[0];
        
        const midIndex = Math.floor(segment.length / 2);
        return segment[midIndex];
    },

    /**
     * Анализ прогноза
     */
    analyzeForecast(forecast) {
        if (!forecast || !forecast.hourly) return null;

        const hourly = forecast.hourly;
        const thresholds = Storage.getThresholds();
        const analyzed = [];

        for (let i = 0; i < hourly.time.length; i++) {
            const rawVis = hourly.visibility?.[i];
            const convertedVis = Math.round((rawVis || 10000) / 1000 * 10) / 10;
            
            const hour = {
                time: hourly.time[i],
                temp2m: Math.round((hourly.temperature_2m?.[i] || 0) * 10) / 10,    // °C (1 знак)
                humidity: Math.round((hourly.relative_humidity_2m?.[i] || 0) * 10) / 10, // % (1 знак)
                dewPoint: Math.round((hourly.dew_point_2m?.[i] || 0) * 10) / 10,   // °C (1 знак)
                wind10m: Math.round(((hourly.wind_speed_10m?.[i] || 0) / 3.6) * 10) / 10,  // м/с (1 знак) из км/ч
                windDir: Math.round(hourly.wind_direction_10m?.[i] || 0),          // ° (целое)
                windGust: Math.round(((hourly.wind_gusts_10m?.[i] || 0) / 3.6) * 10) / 10, // м/с (1 знак) из км/ч
                precip: Math.round((hourly.precipitation?.[i] || 0) * 10) / 10,    // мм (1 знак)
                rain: Math.round((hourly.rain?.[i] || 0) * 10) / 10,               // мм (1 знак)
                snow: Math.round((hourly.snowfall?.[i] || 0) * 10) / 10,           // мм (1 знак)
                cloudCover: Math.round(hourly.cloud_cover?.[i] || 0),              // % (целое)
                cloudCoverLow: Math.round(hourly.cloud_cover_low?.[i] || 0),       // % (целое)
                cloudCeiling: this.calculateCloudCeiling(hourly.cloud_cover_low?.[i] || 0, hourly.cloud_cover?.[i] || 0), // м
                pressure: this.hPaToMmHg(hourly.pressure_msl?.[i] || 0),           // мм рт. ст. (целое)
                visibility: convertedVis, // км (1 знак)
                weatherCode: hourly.weather_code?.[i] || 0
            };

            // Расчёт рисков
            hour.riskScore = this.calculateRiskScore(hour, thresholds);
            hour.risk = this.getRiskLevel(hour.riskScore);

            // Обледенение
            hour.icingRisk = this.calculateIcingRisk(hour.temp2m, hour.humidity);

            // Турбулентность (упрощённо)
            hour.turbulenceRisk = this.calculateTurbulenceRisk(hour.wind10m, hour.windGust);

            // ✅ Детализация рисков по категориям
            hour.riskBreakdown = this.calculateRiskBreakdown(hour, thresholds);

            analyzed.push(hour);
        }

        // ✅ Расчёт трендов для первого часа
        const trends = this.calculateTrends(analyzed, 0);

        // ✅ Вертикальный профиль
        const verticalProfile = this.getVerticalProfile({hourly: analyzed});

        // ✅ Солнечные условия
        const solar = this.getSolarConditions(forecast);

        return {
            hourly: analyzed,
            daily: forecast.daily,
            current: forecast.current_weather,
            summary: this.generateSummary(analyzed, thresholds, solar),
            trends: trends,
            verticalProfile: verticalProfile,
            solar: solar  // ✅ Добавляем солнечные условия
        };
    },

    /**
     * Расчёт общего риска (УНИФИЦИРОВАНО с scoring.js)
     * Использует те же формулы что и ScoringModule.calculateIntegralScore
     */
    calculateRiskScore(hour, thresholds) {
        // Расчёт по факторам (как в scoring.js)
        const windRatio = hour.wind10m / (thresholds.windGround || 10);
        let windScore = 0;
        if (windRatio > 1.2) windScore = 3;
        else if (windRatio > 1.0) windScore = 2.5;
        else if (windRatio > 0.8) windScore = 1.5;
        else if (windRatio > 0.6) windScore = 0.5;

        // Осадки
        let effectivePrecip = hour.precip;
        if (hour.snow > 0) effectivePrecip = hour.precip * 1.3;
        let precipScore = 0;
        if (thresholds.precip === 0 && hour.precip > 0) precipScore = 3;
        else if (effectivePrecip > 2) precipScore = 3;
        else if (effectivePrecip > 0.5) precipScore = 2;
        else if (effectivePrecip > 0.1) precipScore = 1;

        // Видимость
        const visRatio = hour.visibility / (thresholds.visibility || 2);
        let cloudPenalty = 0;
        if (hour.cloudCoverLow > 80) cloudPenalty = 0.5;
        else if (hour.cloudCover > 90) cloudPenalty = 0.3;
        let visibilityScore = 0;
        if (visRatio < 0.5) visibilityScore = Math.min(3, 3 + cloudPenalty);
        else if (visRatio < 1.0) visibilityScore = Math.min(3, 2 + cloudPenalty);
        else if (visRatio < 1.5) visibilityScore = Math.min(3, 1 + cloudPenalty);
        else visibilityScore = cloudPenalty;

        // Температура
        let tempScore = 0;
        if (hour.temp2m < thresholds.tempMin || hour.temp2m > thresholds.tempMax) tempScore = 3;
        else if (hour.temp2m < thresholds.tempMin + 5 || hour.temp2m > thresholds.tempMax - 5) tempScore = 1.5;

        // Обледенение
        let icingScore = 0;
        if (hour.icingRisk === 'high') icingScore = 3;
        else if (hour.icingRisk === 'medium') icingScore = 1.5;

        // Турбулентность
        let turbulenceScore = 0;
        if (hour.turbulenceRisk === 'high') turbulenceScore = 2.5;
        else if (hour.turbulenceRisk === 'medium') turbulenceScore = 1;

        // Взвешенная сумма (как в scoring.js)
        const baseScore = (
            windScore * 0.25 +
            precipScore * 0.20 +
            visibilityScore * 0.15 +
            tempScore * 0.15 +
            icingScore * 0.15 +
            turbulenceScore * 0.10
        );

        return baseScore;  // 0-3 балла (средневзвешенное)
    },

    /**
     * Детализация рисков по категориям (НОВОЕ + унификация)
     */
    calculateRiskBreakdown(hour, thresholds) {
        const breakdown = {
            wind: { score: 0, maxScore: 3, value: hour.wind10m, unit: 'м/с', trend: 'stable' },
            precip: { score: 0, maxScore: 3, value: hour.precip, unit: 'мм/ч', trend: 'stable' },
            visibility: { score: 0, maxScore: 3, value: hour.visibility, unit: 'км', trend: 'stable' },
            temp: { score: 0, maxScore: 3, value: hour.temp2m, unit: '°C', trend: 'stable' },
            icing: { score: 0, maxScore: 3, value: hour.icingRisk, unit: '', trend: 'stable' },
            turbulence: { score: 0, maxScore: 2.5, value: hour.turbulenceRisk, unit: '', trend: 'stable' },
            cloud: { score: 0, maxScore: 2, value: hour.cloudCover, unit: '%', trend: 'stable' },
            pressure: { score: 0, maxScore: 1.5, value: hour.pressure, unit: 'мм рт.ст.', trend: 'stable' }
        };

        // Ветер (0-3 балла) — унифицировано с scoring.js
        const windRatio = hour.wind10m / (thresholds.windGround || 10);
        if (windRatio > 1.2) {
            breakdown.wind.score = 3;
            breakdown.wind.status = 'critical';
        } else if (windRatio > 1.0) {
            breakdown.wind.score = 2.5;
            breakdown.wind.status = 'critical';
        } else if (windRatio > 0.8) {
            breakdown.wind.score = 1.5;
            breakdown.wind.status = 'warning';
        } else if (windRatio > 0.6) {
            breakdown.wind.score = 0.5;
            breakdown.wind.status = 'caution';
        } else {
            breakdown.wind.status = 'good';
        }

        // Осадки (0-3 балла) — унифицировано с scoring.js + снег
        let effectivePrecip = hour.precip;
        if (hour.snow > 0) effectivePrecip = hour.precip * 1.3;
        
        const extremeCodes = [95, 96, 97];
        if (extremeCodes.includes(hour.weatherCode)) {
            breakdown.precip.score = 3;
            breakdown.precip.status = 'critical';
        } else if (thresholds.precip === 0 && hour.precip > 0) {
            breakdown.precip.score = 3;
            breakdown.precip.status = 'critical';
        } else if (effectivePrecip > 2) {
            breakdown.precip.score = 3;
            breakdown.precip.status = 'critical';
        } else if (effectivePrecip > 0.5) {
            breakdown.precip.score = 2;
            breakdown.precip.status = 'warning';
        } else if (effectivePrecip > 0.1) {
            breakdown.precip.score = 1;
            breakdown.precip.status = 'caution';
        } else {
            breakdown.precip.status = 'good';
        }

        // Видимость (0-3 балла) — унифицировано с scoring.js + облачность
        const minVis = thresholds.visibility || 2;
        const visRatio = hour.visibility / minVis;
        let cloudPenalty = 0;
        if (hour.cloudCoverLow > 80) cloudPenalty = 0.5;
        else if (hour.cloudCover > 90) cloudPenalty = 0.3;
        
        if (visRatio < 0.5) {
            breakdown.visibility.score = Math.min(3, 3 + cloudPenalty);
            breakdown.visibility.status = 'critical';
        } else if (visRatio < 1.0) {
            breakdown.visibility.score = Math.min(3, 2 + cloudPenalty);
            breakdown.visibility.status = 'warning';
        } else if (visRatio < 1.5) {
            breakdown.visibility.score = Math.min(3, 1 + cloudPenalty);
            breakdown.visibility.status = 'caution';
        } else {
            breakdown.visibility.score = cloudPenalty > 0 ? cloudPenalty : 0;
            breakdown.visibility.status = cloudPenalty > 0 ? 'caution' : 'good';
        }

        // Температура (0-3 балла) — унифицировано с scoring.js
        if (hour.temp2m < thresholds.tempMin || hour.temp2m > thresholds.tempMax) {
            breakdown.temp.score = 3;
            breakdown.temp.status = 'critical';
        } else if (hour.temp2m < thresholds.tempMin + 5 || hour.temp2m > thresholds.tempMax - 5) {
            breakdown.temp.score = 1.5;
            breakdown.temp.status = 'warning';
        } else {
            breakdown.temp.status = 'good';
        }

        // Обледенение (0-3 балла)
        if (hour.icingRisk === 'high') {
            breakdown.icing.score = 3;
            breakdown.icing.status = 'critical';
        } else if (hour.icingRisk === 'medium') {
            breakdown.icing.score = 1.5;
            breakdown.icing.status = 'warning';
        } else {
            breakdown.icing.score = 0;
            breakdown.icing.status = 'good';
        }

        // Турбулентность (0-2.5 балла)
        if (hour.turbulenceRisk === 'high') {
            breakdown.turbulence.score = 2.5;
            breakdown.turbulence.status = 'critical';
        } else if (hour.turbulenceRisk === 'medium') {
            breakdown.turbulence.score = 1;
            breakdown.turbulence.status = 'warning';
        } else {
            breakdown.turbulence.score = 0;
            breakdown.turbulence.status = 'good';
        }

        // 🆕 Облачность (0-2 балла)
        let cloudScore = 0;
        if (hour.cloudCoverLow > 90) cloudScore += 1.5;
        else if (hour.cloudCoverLow > 70) cloudScore += 1.0;
        else if (hour.cloudCoverLow > 50) cloudScore += 0.5;
        if (hour.cloudCover > 95) cloudScore += 0.5;
        else if (hour.cloudCover > 80) cloudScore += 0.3;
        breakdown.cloud.score = Math.min(2, cloudScore);
        breakdown.cloud.status = cloudScore > 1.5 ? 'critical' : cloudScore > 0.5 ? 'warning' : cloudScore > 0 ? 'caution' : 'good';

        // 🆕 Давление (0-1.5 балла)
        const normalMin = 750, normalMax = 770;
        const criticalMin = 730, criticalMax = 790;
        if (hour.pressure < criticalMin || hour.pressure > criticalMax) {
            breakdown.pressure.score = 1.5;
            breakdown.pressure.status = 'critical';
        } else if (hour.pressure < normalMin || hour.pressure > normalMax) {
            breakdown.pressure.score = 0.8;
            breakdown.pressure.status = 'warning';
        } else {
            breakdown.pressure.status = 'good';
        }

        return breakdown;
    },

    /**
     * Расчёт трендов (НОВОЕ)
     */
    calculateTrends(hourly, currentIndex = 0) {
        if (!hourly || hourly.length < 2) return null;

        const current = hourly[currentIndex] || hourly[0];
        const next1 = hourly[currentIndex + 1] || hourly[hourly.length - 1];
        const next2 = hourly[currentIndex + 2] || hourly[hourly.length - 1];
        const next3 = hourly[currentIndex + 3] || hourly[hourly.length - 1];

        // Функция для определения вектора тренда
        const getTrendVector = (current, future) => {
            const diff = future - current;
            const percent = current !== 0 ? (diff / Math.abs(current) * 100) : 0;
            
            if (Math.abs(percent) < 5) return { direction: 'stable', percent: 0 };
            if (percent > 0) return { direction: 'increasing', percent: Math.round(percent) };
            return { direction: 'decreasing', percent: Math.round(Math.abs(percent)) };
        };

        // Ветер тренд
        const windTrend = getTrendVector(current.wind10m, next3.wind10m);
        
        // Температура тренд
        const tempTrend = getTrendVector(current.temp2m, next3.temp2m);
        
        // Влажность тренд
        const humidityTrend = getTrendVector(current.humidity, next3.humidity);
        
        // Видимость тренд
        const visibilityTrend = getTrendVector(current.visibility, next3.visibility);
        
        // Определение точек перелома (когда риск изменится)
        const breakpoints = [];
        for (let i = currentIndex + 1; i < Math.min(currentIndex + 12, hourly.length); i++) {
            const hour = hourly[i];
            const prevHour = hourly[i - 1];
            
            // Проверка изменения риска
            if (hour.riskScore !== prevHour.riskScore) {
                const time = new Date(hour.time);
                breakpoints.push({
                    time: time.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
                    from: prevHour.riskScore,
                    to: hour.riskScore,
                    reason: this.getRiskChangeReason(prevHour, hour)
                });
            }
            
            // Проверка достижения порогов
            if (hour.wind10m > 10 && prevHour.wind10m <= 10) {
                breakpoints.push({
                    time: new Date(hour.time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
                    event: 'Ветер превысит порог 10 м/с'
                });
            }
            if (hour.icingRisk === 'high' && prevHour.icingRisk !== 'high') {
                breakpoints.push({
                    time: new Date(hour.time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
                    event: 'Высокий риск обледенения'
                });
            }
        }

        return {
            wind: windTrend,
            temp: tempTrend,
            humidity: humidityTrend,
            visibility: visibilityTrend,
            breakpoints: breakpoints.slice(0, 5), // Максимум 5 точек перелома
            summary: this.getTrendSummary(windTrend, tempTrend, visibilityTrend)
        };
    },

    /**
     * Определение причины изменения риска (НОВОЕ)
     */
    getRiskChangeReason(prevHour, currHour) {
        const reasons = [];
        
        if (currHour.wind10m > prevHour.wind10m + 2) reasons.push('Ветер усиливается');
        if (currHour.wind10m < prevHour.wind10m - 2) reasons.push('Ветер ослабевает');
        if (currHour.visibility < prevHour.visibility - 2) reasons.push('Видимость ухудшается');
        if (currHour.precip > prevHour.precip + 0.5) reasons.push('Осадки усиливаются');
        if (currHour.icingRisk !== prevHour.icingRisk) reasons.push('Изменение обледенения');
        
        return reasons.length > 0 ? reasons.join(', ') : 'Изменение рисков';
    },

    /**
     * Сводка трендов (НОВОЕ)
     */
    getTrendSummary(windTrend, tempTrend, visibilityTrend) {
        const trends = [];
        
        if (windTrend.direction === 'increasing' && windTrend.percent > 20) {
            trends.push({type: 'warning', text: `Ветер усилится на ${windTrend.percent}%`});
        }
        if (windTrend.direction === 'decreasing' && windTrend.percent > 20) {
            trends.push({type: 'success', text: `Ветер ослабеет на ${windTrend.percent}%`});
        }
        if (tempTrend.direction === 'decreasing' && tempTrend.percent > 15) {
            trends.push({type: 'warning', text: `Температура понизится на ${tempTrend.percent}%`});
        }
        if (visibilityTrend.direction === 'decreasing' && visibilityTrend.percent > 20) {
            trends.push({type: 'warning', text: `Видимость ухудшится на ${visibilityTrend.percent}%`});
        }
        
        if (trends.length === 0) {
            trends.push({type: 'info', text: 'Значительных изменений не ожидается'});
        }
        
        return trends;
    },

    /**
     * Уровень риска (УНИФИЦИРОВАНО с scoring.js)
     * Конвертация средневзвешенного score (0-3) в уровень риска
     * Для корреляции с integral score (0-10): score * 3.33 ≈ integral
     */
    getRiskLevel(score) {
        // Конвертируем средневзвешенный score (0-3) в уровень как integral score (0-10)
        // integralScore ≈ baseScore * 3.33 (с учётом коэффициентов)
        // low: 0-2.5 → baseScore 0-0.75
        // medium: 2.5-5.5 → baseScore 0.75-1.65
        // high: 5.5-10 → baseScore > 1.65
        if (score >= 1.65) return 'high';
        if (score >= 0.75) return 'medium';
        return 'low';
    },

    /**
     * 🆕 Расчёт риска для вертикального профиля (для VerticalProfileModule)
     * @param {Object} p - Данные уровня профиля
     * @returns {number} Score 0-10
     */
    calculateVerticalRiskScore(p) {
        let score = 0;
        
        // Ветер (0-3 балла)
        if (p.wind > 15) score += 3;
        else if (p.wind > 12) score += 2;
        else if (p.wind > 10) score += 1;
        
        // Обледенение (0-3 балла)
        if (p.icingRisk === 'high') score += 3;
        else if (p.icingRisk === 'medium') score += 2;
        
        // Турбулентность (0-3 балла)
        if (p.turbulence === 'severe') score += 3;
        else if (p.turbulence === 'moderate') score += 2;
        
        // Температура (0-1 балл)
        if (p.temp < -15) score += 2;
        else if (p.temp < -10) score += 1;
        
        return Math.min(10, score);
    },

    /**
     * 🆕 Факторы риска для вертикального профиля
     * @param {Object} p - Данные уровня профиля
     * @returns {Array} Массив факторов
     */
    getVerticalRiskFactors(p) {
        const factors = [];
        
        if (p.wind > 10) factors.push('wind');
        if (p.icingRisk === 'high' || p.icingRisk === 'medium') factors.push('icing');
        if (p.turbulence === 'moderate' || p.turbulence === 'severe') factors.push('turbulence');
        if (p.temp < -10) factors.push('temp');
        
        return factors;
    },

    /**
     * 🆕 Расчёт нижней границы облаков (НГО) в метрах
     * @param {number} cloudCoverLow - Нижняя облачность (%)
     * @param {number} cloudCover - Общая облачность (%)
     * @returns {number|null} Высота в метрах или null (если ясно)
     */
    calculateCloudCeiling(cloudCoverLow, cloudCover) {
        // Если облачности нет — НГО не определена
        if (cloudCover < 30 && cloudCoverLow < 30) {
            return 3500; // Ясно, условно высокая граница
        }
        
        // Расчёт на основе нижней облачности
        if (cloudCoverLow > 80) {
            return 400; // Низкие облака
        } else if (cloudCoverLow > 50) {
            return 1500; // Средняя облачность
        } else if (cloudCoverLow > 30) {
            return 3000; // Высокая облачность
        }
        
        // Если нижняя облачность небольшая, смотрим на общую
        if (cloudCover > 90) {
            return 800;
        } else if (cloudCover > 70) {
            return 2000;
        }
        
        return 3500; // Преимущественно ясно
    },

    /**
     * Риск обледенения
     */
    calculateIcingRisk(temp, humidity) {
        const thresholds = Storage.getThresholds();
        
        if (temp <= 5 && temp >= -10 && humidity > thresholds.humidityIcing) {
            if (temp <= 0 && temp >= -5) return 'high';
            return 'medium';
        }
        return 'low';
    },

    /**
     * Риск турбулентности
     */
    calculateTurbulenceRisk(windSpeed, windGust) {
        const gustFactor = windSpeed > 0 ? windGust / windSpeed : 1;
        
        if (gustFactor > 1.5 || windSpeed > 15) return 'high';
        if (gustFactor > 1.2 || windSpeed > 10) return 'medium';
        return 'low';
    },

    /**
     * Генерация сводки
     */
    generateSummary(hourly, thresholds, solar = null) {
        const validHours = hourly.filter(h => h.riskScore < 3);

        // Если есть солнечные данные, используем дневные окна
        const flightWindows = solar
            ? this.findSafeDaylightWindows(hourly, solar, thresholds)
            : this.findFlightWindows(hourly, thresholds);

        const avgTemp = Math.round(hourly.reduce((sum, h) => sum + h.temp2m, 0) / hourly.length * 10) / 10;
        const avgWind = Math.round(hourly.reduce((sum, h) => sum + h.wind10m, 0) / hourly.length * 10) / 10;
        const maxWind = Math.round(Math.max(...hourly.map(h => h.wind10m)) * 10) / 10;
        const totalPrecip = Math.round(hourly.reduce((sum, h) => sum + h.precip, 0) * 10) / 10;

        // Генерация рекомендаций
        const recommendations = this.generateSummaryRecommendations(hourly, flightWindows, solar);

        return {
            validHoursCount: validHours.length,
            flightWindows: flightWindows,
            recommendations: recommendations,
            avgTemp: avgTemp,
            avgWind: avgWind,
            maxWind: maxWind,
            totalPrecip: totalPrecip,
            overallRisk: this.getOverallRisk(hourly),
            solar: solar,
            isDaylightFlight: !!solar
        };
    },

    /**
     * Генерация рекомендаций для сводки
     */
    generateSummaryRecommendations(hourly, flightWindows, solar) {
        const recommendations = [];

        // Рекомендации по окнам
        if (flightWindows.length > 0) {
            const bestWindow = flightWindows.reduce((best, w) => 
                w.risk === 'low' && w.duration > best.duration ? w : best, flightWindows[0]);
            
            recommendations.push({
                type: 'success',
                icon: 'fa-clock',
                text: `Лучшее время для полёта: ${bestWindow.start}–${bestWindow.end} (${bestWindow.duration} ч)`
            });

            if (solar) {
                recommendations.push({
                    type: 'info',
                    icon: 'fa-sun',
                    text: `Рабочее время (рассвет+30 до закат-30): ${solar.workStartTime} – ${solar.workEndTime} (продолжительность ${solar.dayLengthText})`
                });
            }
        } else {
            recommendations.push({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                text: 'Благоприятные окна не найдены. Рассмотрите другую дату.'
            });
        }

        // Рекомендации по ветру
        const avgWind = hourly.reduce((sum, h) => sum + h.wind10m, 0) / hourly.length;
        if (avgWind > 10) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-wind',
                text: `Сильный ветер: средний ${Math.round(avgWind)} м/с. Будьте осторожны.`
            });
        } else if (avgWind < 3) {
            recommendations.push({
                type: 'success',
                icon: 'fa-wind',
                text: `Спокойный ветер: средний ${Math.round(avgWind)} м/с. Отличные условия.`
            });
        }

        // Рекомендации по температуре
        const avgTemp = hourly.reduce((sum, h) => sum + h.temp2m, 0) / hourly.length;
        if (avgTemp < -5) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-snowflake',
                text: `Низкая температура: средняя ${Math.round(avgTemp)}°C. Риск обледенения.`
            });
        } else if (avgTemp > 30) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-sun',
                text: `Высокая температура: средняя ${Math.round(avgTemp)}°C. Снижение тяги.`
            });
        }

        // Рекомендации по осадкам
        const totalPrecip = hourly.reduce((sum, h) => sum + h.precip, 0);
        if (totalPrecip > 5) {
            recommendations.push({
                type: 'critical',
                icon: 'fa-cloud-rain',
                text: `Осадки: ${totalPrecip.toFixed(1)} мм. Полёт не рекомендуется.`
            });
        }

        return recommendations;
    },

    /**
     * Поиск благоприятных окон для полёта
     * @param {Array} hourly - Почасовые данные
     * @param {Object} thresholds - Пороги риска
     * @param {boolean} isDaylight - Дневное окно (рассвет+30 до закат-30)
     * @param {number} minDuration - Минимальная продолжительность (часы)
     */
    findFlightWindows(hourly, thresholds, isDaylight = false, minDuration = 2) {
        const windows = [];
        let currentWindow = null;

        for (let i = 0; i < hourly.length; i++) {
            const hour = hourly[i];
            const isGood = hour.riskScore < 2;

            if (isGood) {
                if (!currentWindow) {
                    currentWindow = {
                        start: hour.time,
                        end: hour.time,
                        hours: [hour],
                        isDaylight: isDaylight
                    };
                } else {
                    currentWindow.end = hour.time;
                    currentWindow.hours.push(hour);
                }
            } else {
                if (currentWindow && currentWindow.hours.length >= minDuration) {
                    windows.push(this.formatFlightWindow(currentWindow, isDaylight));
                }
                currentWindow = null;
            }
        }

        // Добавляем последний окно
        if (currentWindow && currentWindow.hours.length >= minDuration) {
            windows.push(this.formatFlightWindow(currentWindow, isDaylight));
        }

        return windows;
    },

    /**
     * Форматирование полётного окна
     */
    formatFlightWindow(window, isDaylight) {
        const start = new Date(window.start);
        const end = new Date(window.end);
        const duration = window.hours.length;

        // Средние параметры по окну
        const avgWind = Math.round(window.hours.reduce((sum, h) => sum + h.wind10m, 0) / window.hours.length * 10) / 10;
        const avgTemp = Math.round(window.hours.reduce((sum, h) => sum + h.temp2m, 0) / window.hours.length * 10) / 10;
        const avgRisk = window.hours.every(h => h.risk === 'low') ? 'low' : 'medium';

        return {
            start: start.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            end: end.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}),
            duration: duration,
            wind: avgWind,
            temp: avgTemp,
            risk: avgRisk,
            isDaylight: isDaylight,
            hours: window.hours
        };
    },

    /**
     * Общий риск
     */
    getOverallRisk(hourly) {
        const highRiskCount = hourly.filter(h => h.risk === 'high').length;
        const mediumRiskCount = hourly.filter(h => h.risk === 'medium').length;
        
        if (highRiskCount > hourly.length * 0.3) return 'high';
        if (mediumRiskCount > hourly.length * 0.5) return 'medium';
        return 'low';
    },

    /**
     * ПостроениеQueryString
     */
    buildQueryString(params) {
        return Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    },

    /**
     * Интерполяция данных для высот (ОБНОВЛЁННАЯ v2.0 - с использованием VerticalProfileModule)
     */
    interpolateForAltitude(data, altitude) {
        // Используем новый модуль вертикального профилирования
        if (typeof VerticalProfileModule !== 'undefined') {
            const surfaceData = {
                temp2m: data.temp2m || data.temperature || 0,
                dewpoint2m: data.dewPoint || data.dewpoint || (data.temp2m - 5),
                pressure: data.pressure || data.pressure_msl || 1013,
                wind10m: data.wind10m || data.wind || 0,
                windDir10m: data.windDir || data.wind_direction || 0,
                humidity: data.humidity || data.relative_humidity || 50,
                precip: data.precip || data.precipitation || 0,
                cloudCover: data.cloudCover || data.cloud_cover || 0
            };
            
            const profile = VerticalProfileModule.buildVerticalProfile(surfaceData, {
                altitudes: [altitude]
            });
            
            return profile[0];
        }
        
        // Старая реализация (fallback)
        const ALTITUDES = [250, 350, 450, 550];
        const tempLapse = -6.5 / 1000;
        const tempAdjustment = tempLapse * altitude;
        const windFactor = 1 + (altitude / 500) * 0.18;
        const humidityFactor = Math.max(0.5, 1 - (altitude / 2000));
        const pressureAdjustment = Math.exp(-altitude / 8500);
        const dewPointAdjustment = tempAdjustment * 0.8;

        return {
            altitude: altitude,
            temp: (data.temp2m || 0) + tempAdjustment,
            wind: (data.wind10m || 0) * windFactor,
            windDir: data.windDir || 0,
            humidity: Math.max(0, (data.humidity || 50) * humidityFactor),
            pressure: (data.pressure || 1013) * pressureAdjustment,
            dewPoint: (data.dewPoint || data.temp2m - 5) + dewPointAdjustment,
            windGust: (data.windGust || data.wind10m * 1.2) * windFactor,
            cloudCover: data.cloudCover || 0,
            isAboveClouds: altitude > 500 && (data.cloudCover || 0) > 80,
            isBelowClouds: altitude < 300 && (data.cloudCoverLow || 0) > 50
        };
    },

    /**
     * Вертикальный профиль для всех стандартных высот (ОБНОВЛЁННАЯ v2.0 - 7 высот)
     * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md раздел 4.1
     */
    getVerticalProfile(analyzedData) {
        if (!analyzedData || !analyzedData.hourly) return null;

        const currentHour = analyzedData.hourly[0];
        
        // 7 целевых высот для БВС (0-650м)
        const ALTITUDES = [0, 100, 250, 350, 450, 550, 650];

        // Используем VerticalProfileModule если доступен
        if (typeof VerticalProfileModule !== 'undefined') {
            const surfaceData = {
                temp2m: currentHour.temp2m || currentHour.temperature || 0,
                dewpoint2m: currentHour.dewPoint || currentHour.dewpoint || (currentHour.temp2m - 5),
                pressure: currentHour.pressure || currentHour.pressure_msl || 1013,
                wind10m: currentHour.wind10m || currentHour.wind || 0,
                windDir10m: currentHour.windDir || currentHour.wind_direction || 0,
                humidity: currentHour.humidity || currentHour.relative_humidity || 50,
                precip: currentHour.precip || currentHour.precipitation || 0,
                cloudCover: currentHour.cloudCover || currentHour.cloud_cover || 0
            };
            
            const profile = VerticalProfileModule.buildVerticalProfile(surfaceData);
            
            // Добавляем дополнительные поля для совместимости
            return profile.map(p => ({
                altitude: p.altitude,
                temp: p.temp,
                dewpoint: p.dewpoint,
                humidity: p.humidity,
                pressure: p.pressure,
                density: p.density,
                wind: p.wind,
                windDir: p.windDir,
                windGust: p.windGust,
                icingRisk: p.icingRisk,
                turbulenceRisk: p.turbulence === 'severe' ? 'high' : p.turbulence,
                riskScore: this.calculateVerticalRiskScore(p),
                riskLevel: this.getRiskLevel(this.calculateVerticalRiskScore(p)),
                riskFactors: this.getVerticalRiskFactors(p),
                optimal: p.icingRisk === 'low' && p.turbulence === 'low' && p.wind < 10,
                recommended: p.icingRisk === 'low' && p.turbulence !== 'severe' && p.wind < 15
            }));
        }

        // Старая реализация (fallback)
        const profile = ALTITUDES.map(altitude => {
            const interpolated = this.interpolateForAltitude(currentHour, altitude);

            // Расчёт рисков для высоты
            const icingRisk = this.calculateIcingRisk(interpolated.temp, interpolated.humidity);
            const turbulenceRisk = this.calculateTurbulenceRisk(interpolated.wind, interpolated.windGust);

            // Интегральный риск для высоты
            let riskScore = 0;
            let riskFactors = [];

            // Ветер
            if (interpolated.wind > 15) {
                riskScore += 3;
                riskFactors.push('wind');
            } else if (interpolated.wind > 12) {
                riskScore += 2;
                riskFactors.push('wind');
            } else if (interpolated.wind > 10) {
                riskScore += 1;
                riskFactors.push('wind');
            }

            // Обледенение
            if (icingRisk === 'high') {
                riskScore += 3;
                riskFactors.push('icing');
            } else if (icingRisk === 'medium') {
                riskScore += 2;
                riskFactors.push('icing');
            }

            // Турбулентность
            if (turbulenceRisk === 'high') {
                riskScore += 3;
                riskFactors.push('turbulence');
            } else if (turbulenceRisk === 'medium') {
                riskScore += 2;
                riskFactors.push('turbulence');
            }

            // Температура (экстремально низкая)
            if (interpolated.temp < -15) {
                riskScore += 2;
                riskFactors.push('temp');
            } else if (interpolated.temp < -10) {
                riskScore += 1;
                riskFactors.push('temp');
            }

            const riskLevel = this.getRiskLevel(riskScore);

            return {
                altitude: altitude,
                ...interpolated,
                icingRisk: icingRisk,
                turbulenceRisk: turbulenceRisk,
                riskScore: riskScore,
                riskLevel: riskLevel,
                riskFactors: riskFactors,
                optimal: riskScore === 0,
                recommended: riskScore <= 1
            };
        });
        
        // Поиск оптимальной высоты
        const optimalAltitude = profile.find(p => p.optimal) || profile.find(p => p.recommended);
        
        // Поиск опасной зоны
        const dangerZone = profile.filter(p => p.riskLevel === 'high');
        
        // Рекомендации
        const recommendations = [];
        
        if (optimalAltitude) {
            recommendations.push({
                type: 'success',
                text: `Оптимальная высота: ${optimalAltitude.altitude}м (риск ${optimalAltitude.riskScore})`
            });
        }
        
        if (dangerZone.length > 0) {
            const altitudes = dangerZone.map(p => `${p.altitude}м`).join(', ');
            recommendations.push({
                type: 'warning',
                text: `Избегать высоты: ${altitudes} (высокий риск)`
            });
        }
        
        // Проверка сдвига ветра
        const windShear = profile[3].wind - profile[0].wind;
        if (windShear > 8) {
            recommendations.push({
                type: 'warning',
                text: `⚠️ Сдвиг ветра: ${windShear.toFixed(1)} м/с (опасно для взлёта/посадки)`
            });
        }
        
        // Проверка инверсии температуры
        const tempInversion = profile[0].temp > profile[3].temp;
        if (tempInversion) {
            recommendations.push({
                type: 'info',
                text: 'ℹ️ Температурная инверсия (стабильная атмосфера)'
            });
        }
        
        return {
            profile: profile,
            optimalAltitude: optimalAltitude?.altitude || null,
            dangerZone: dangerZone.map(p => p.altitude),
            recommendations: recommendations,
            windShear: windShear,
            tempInversion: tempInversion
        };
    },

    /**
     * Данные для графиков
     */
    prepareChartData(analyzedData) {
        if (!analyzedData || !analyzedData.hourly) return null;

        const hourly = analyzedData.hourly;
        const times = hourly.map(h => {
            const date = new Date(h.time);
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        });

        return {
            times: times,
            temperature: hourly.map(h => h.temp2m),
            humidity: hourly.map(h => h.humidity),
            wind10m: hourly.map(h => h.wind10m),
            windDir: hourly.map(h => h.windDir),
            precip: hourly.map(h => h.precip),
            cloudCover: hourly.map(h => h.cloudCover),
            pressure: hourly.map(h => h.pressure),
            visibility: hourly.map(h => h.visibility),
            riskScore: hourly.map(h => h.riskScore)
        };
    },

    /**
     * Рекомендации на основе анализа
     */
    generateRecommendations(analyzedData, pilotData = null) {
        const recommendations = [];
        const summary = analyzedData.summary;
        const thresholds = Storage.getThresholds();

        // === ПРОВЕРКА: ВНЁС ЛИ ПИЛОТ ДАННЫЕ? ===
        // pilotData может быть в двух форматах:
        // 1. { ground: [...], flight: [...] } - из отчёта
        // 2. { windSpeed, temp, ... } - из wizard
        const hasPilotData = pilotData && (
            (pilotData.ground && pilotData.ground.length > 0) ||
            (pilotData.flight && pilotData.flight.length > 0) ||
            (pilotData.windSpeed || pilotData.temp || pilotData.visibility)
        );

        // === КРИТИЧЕСКИЕ ФЛАГИ ОТ ПИЛОТА ===
        // Показываем ТОЛЬКО если пилот вносил данные
        if (hasPilotData) {
            const hasCriticalFlags = analyzedData.corrections?.criticalFlags;

            if (hasCriticalFlags?.fog) {
                recommendations.push({
                    type: 'critical',
                    icon: 'fa-smog',
                    text: `<strong>Туман по данным пилота!</strong> Видимость ограничена. Полёт не рекомендуется.`
                });
            }

            if (hasCriticalFlags?.precip) {
                recommendations.push({
                    type: 'warning',
                    icon: 'fa-cloud-rain',
                    text: `<strong>Осадки по данным пилота!</strong> Проверьте интенсивность перед вылетом.`
                });
            }

            if (hasCriticalFlags?.snow) {
                recommendations.push({
                    type: 'critical',
                    icon: 'fa-snowflake',
                    text: `<strong>Снег по данным пилота!</strong> Риск обледенения повышен.`
                });
            }
        }

        // === ПРОВЕРКА ПО ДАННЫМ АНАЛИЗА (ОТКРЫТЫЕ ДАННЫЕ) ===

        // Ветер
        if (parseFloat(summary.avgWind) > thresholds.windGround) {
            recommendations.push({
                type: 'critical',
                icon: 'fa-wind',
                text: `<strong>Ветер ${summary.avgWind} м/с</strong> превышает порог ${thresholds.windGround} м/с. Рекомендуется отложить полёт.`
            });
        } else if (parseFloat(summary.avgWind) > thresholds.windGround * 0.8) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-wind',
                text: `<strong>Ветер ${summary.avgWind} м/с</strong> близок к порогу. Мониторьте усиление.`
            });
        }

        // Осадки
        if (parseFloat(summary.totalPrecip) > 0) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-cloud-rain',
                text: `<strong>Ожидаются осадки (${summary.totalPrecip} мм)</strong>. Проверьте интенсивность перед вылетом.`
            });
        }

        // Обледенение
        const icingHours = analyzedData.hourly.filter(h => h.icingRisk === 'high');
        if (icingHours.length > 0) {
            recommendations.push({
                type: 'critical',
                icon: 'fa-snowflake',
                text: `<strong>Риск обледенения</strong> в ${icingHours.length} ч. Не рекомендуется полёт.`
            });
        }

        // Видимость
        const lowVisibilityHours = analyzedData.hourly.filter(h => h.visibility < thresholds.visibility);
        if (lowVisibilityHours.length > 0) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-eye',
                text: `<strong>Снижение видимости</strong> в ${lowVisibilityHours.length} ч. Будьте осторожны.`
            });
        }

        // === ОБЩИЙ РИСК ===
        // Текст НЕ упоминает коррекцию, если пилот не вносил данные
        if (summary.overallRisk === 'high') {
            recommendations.unshift({
                type: 'critical',
                icon: 'fa-ban',
                text: hasPilotData
                    ? `<strong>ВЫСОКИЙ РИСК</strong> по скорректированным данным. Полёт не рекомендуется.`
                    : `<strong>ВЫСОКИЙ РИСК</strong> по данным анализа. Полёт не рекомендуется.`
            });
        } else if (summary.overallRisk === 'medium') {
            recommendations.unshift({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                text: hasPilotData
                    ? `<strong>СРЕДНИЙ РИСК</strong> по скорректированным данным. Будьте осторожны.`
                    : `<strong>СРЕДНИЙ РИСК</strong> по данным анализа. Будьте осторожны.`
            });
        }

        // === ИНФОРМАЦИЯ О КОРРЕКЦИИ ===
        // Показываем ТОЛЬКО если пилот вносил данные
        if (hasPilotData) {
            recommendations.push({
                type: 'info',
                icon: 'fa-user-check',
                text: `<strong>Данные скорректированы</strong> по фактическим наблюдениям пилота.`
            });
        }

        // Полётные окна
        if (summary.flightWindows.length > 0 && summary.overallRisk !== 'high') {
            const bestWindow = summary.flightWindows.reduce((best, current) =>
                current.hours.length > best.hours.length ? current : best
            );

            recommendations.push({
                type: 'success',
                icon: 'fa-check-circle',
                text: `<strong>Благоприятное окно: ${bestWindow.start}–${bestWindow.end}</strong>. Лучшее время для полёта.`
            });
        }

        // Если есть коррекция от пилота
        // Используем ту же проверку hasPilotData, что и выше
        if (hasPilotData) {
            recommendations.push({
                type: 'info',
                icon: 'fa-flag',
                text: `<strong>Данные скорректированы</strong> по фактическим наблюдениям.`
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                icon: 'fa-check-circle',
                text: `<strong>Все параметры в норме</strong>. Полёт разрешён.`
            });
        }

        return recommendations;
    },

    /**
     * Применение коррекции пилота
     */
    applyPilotCorrection(analyzedData, pilotData) {
        if (!analyzedData || !analyzedData.hourly) return analyzedData;

        const corrections = {
            windBias: pilotData.windSpeed && analyzedData.hourly[0].wind10m > 0
                ? pilotData.windSpeed / analyzedData.hourly[0].wind10m
                : 1.0,
            tempOffset: pilotData.temp ? pilotData.temp - analyzedData.hourly[0].temp2m : 0,
            visibilityOverride: pilotData.fog ? 0.5 : null
        };

        const corrected = JSON.parse(JSON.stringify(analyzedData));

        corrected.hourly = corrected.hourly.map((hour, i) => {
            const weight = Math.exp(-i / 24); // Вес уменьшается со временем

            return {
                ...hour,
                wind10m: hour.wind10m * (1 + (corrections.windBias - 1) * weight),
                temp2m: hour.temp2m + (corrections.tempOffset * weight),
                visibility: corrections.visibilityOverride !== null
                    ? corrections.visibilityOverride
                    : hour.visibility
            };
        });

        corrected.corrected = true;
        corrected.corrections = corrections;
        
        // ✅ Добавляем вертикальный профиль для скорректированных данных
        corrected.verticalProfile = this.getVerticalProfile(corrected);

        return corrected;
    },

    /**
     * Очистка кэша
     */
    clearCache() {
        Storage.clearAllCache();
        Utils.log('Кэш метео очищен');
    }
};

// Добавляем в глобальную область
window.WeatherModule = WeatherModule;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherModule;
}
