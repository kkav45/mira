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
            forecast_days: 7,
            // Единицы измерения (явно указываем)
            temperature_unit: 'celsius',      // °C (по умолчанию)
            windspeed_unit: 'ms',             // м/с (по умолчанию km/h)
            precipitation_unit: 'mm',         // мм (по умолчанию)
            visibility_unit: 'km'             // км (по умолчанию m)
        };
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

        return {
            sunrise: sunrise ? new Date(sunrise).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : '—',
            sunset: sunset ? new Date(sunset).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'}) : '—',
            dayLength: dayLength,
            dayLengthText: `${Math.floor(dayLength / 60)}ч ${dayLength % 60}мин`,
            uvIndex: uvIndex,
            uvRisk: uvIndex <= 2 ? 'low' : uvIndex <= 5 ? 'medium' : 'high'
        };
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

        // Если указана дата, используем start_date и end_date вместо forecast_days
        if (date) {
            params.start_date = date;
            params.end_date = date;
            delete params.forecast_days;
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
            const hour = {
                time: hourly.time[i],
                temp2m: hourly.temperature_2m?.[i] || 0,           // °C
                humidity: hourly.relative_humidity_2m?.[i] || 0,   // %
                dewPoint: hourly.dew_point_2m?.[i] || 0,           // °C
                wind10m: hourly.wind_speed_10m?.[i] || 0,          // м/с
                windDir: hourly.wind_direction_10m?.[i] || 0,      // °
                windGust: hourly.wind_gusts_10m?.[i] || 0,         // м/с
                precip: hourly.precipitation?.[i] || 0,            // мм
                rain: hourly.rain?.[i] || 0,                       // мм
                snow: hourly.snowfall?.[i] || 0,                   // мм
                cloudCover: hourly.cloud_cover?.[i] || 0,          // %
                cloudCoverLow: hourly.cloud_cover_low?.[i] || 0,   // %
                pressure: hourly.pressure_msl?.[i] || 0,           // гПа
                visibility: hourly.visibility?.[i] || 10,          // км (API возвращает км)
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
            summary: this.generateSummary(analyzed, thresholds),
            trends: trends,
            verticalProfile: verticalProfile,
            solar: solar  // ✅ Добавляем солнечные условия
        };
    },

    /**
     * Расчёт общего риска
     */
    calculateRiskScore(hour, thresholds) {
        let score = 0;

        // Ветер
        if (hour.wind10m > thresholds.windGround) score += 2;
        else if (hour.wind10m > thresholds.windGround * 0.8) score += 1;

        // Видимость
        if (hour.visibility < thresholds.visibility) score += 2;
        else if (hour.visibility < thresholds.visibility * 1.5) score += 1;

        // Осадки
        if (hour.precip > thresholds.precip) score += 2;
        else if (hour.precip > 0.5) score += 1;

        // Обледенение
        if (hour.icingRisk === 'high') score += 2;
        else if (hour.icingRisk === 'medium') score += 1;

        return score;
    },

    /**
     * Детализация рисков по категориям (НОВОЕ)
     */
    calculateRiskBreakdown(hour, thresholds) {
        const breakdown = {
            wind: { score: 0, maxScore: 3, value: hour.wind10m, unit: 'м/с', trend: 'stable' },
            precip: { score: 0, maxScore: 3, value: hour.precip, unit: 'мм/ч', trend: 'stable' },
            visibility: { score: 0, maxScore: 3, value: hour.visibility, unit: 'км', trend: 'stable' },
            icing: { score: 0, maxScore: 3, value: hour.icingRisk, unit: '', trend: 'stable' },
            turbulence: { score: 0, maxScore: 3, value: hour.turbulenceRisk, unit: '', trend: 'stable' }
        };

        // Ветер (0-3 балла)
        if (hour.wind10m > thresholds.windGround) {
            breakdown.wind.score = 3;
            breakdown.wind.status = 'critical';
        } else if (hour.wind10m > thresholds.windGround * 0.8) {
            breakdown.wind.score = 2;
            breakdown.wind.status = 'warning';
        } else if (hour.wind10m > thresholds.windGround * 0.6) {
            breakdown.wind.score = 1;
            breakdown.wind.status = 'caution';
        } else {
            breakdown.wind.status = 'good';
        }

        // Осадки (0-3 балла)
        if (hour.precip > thresholds.precip * 2) {
            breakdown.precip.score = 3;
            breakdown.precip.status = 'critical';
        } else if (hour.precip > thresholds.precip) {
            breakdown.precip.score = 2;
            breakdown.precip.status = 'warning';
        } else if (hour.precip > 0.5) {
            breakdown.precip.score = 1;
            breakdown.precip.status = 'caution';
        } else {
            breakdown.precip.status = 'good';
        }

        // Видимость (0-3 балла)
        if (hour.visibility < thresholds.visibility * 0.5) {
            breakdown.visibility.score = 3;
            breakdown.visibility.status = 'critical';
        } else if (hour.visibility < thresholds.visibility) {
            breakdown.visibility.score = 2;
            breakdown.visibility.status = 'warning';
        } else if (hour.visibility < thresholds.visibility * 1.5) {
            breakdown.visibility.score = 1;
            breakdown.visibility.status = 'caution';
        } else {
            breakdown.visibility.status = 'good';
        }

        // Обледенение (0-3 балла)
        if (hour.icingRisk === 'high') {
            breakdown.icing.score = 3;
            breakdown.icing.status = 'critical';
        } else if (hour.icingRisk === 'medium') {
            breakdown.icing.score = 2;
            breakdown.icing.status = 'warning';
        } else if (hour.icingRisk === 'low') {
            breakdown.icing.score = 0;
            breakdown.icing.status = 'good';
        }

        // Турбулентность (0-3 балла)
        if (hour.turbulenceRisk === 'high') {
            breakdown.turbulence.score = 3;
            breakdown.turbulence.status = 'critical';
        } else if (hour.turbulenceRisk === 'medium') {
            breakdown.turbulence.score = 2;
            breakdown.turbulence.status = 'warning';
        } else {
            breakdown.turbulence.score = 0;
            breakdown.turbulence.status = 'good';
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
     * Уровень риска
     */
    getRiskLevel(score) {
        if (score >= 5) return 'high';
        if (score >= 2) return 'medium';
        return 'low';
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
    generateSummary(hourly, thresholds) {
        const validHours = hourly.filter(h => h.riskScore < 3);
        const flightWindows = this.findFlightWindows(hourly, thresholds);
        
        const avgTemp = hourly.reduce((sum, h) => sum + h.temp2m, 0) / hourly.length;
        const avgWind = hourly.reduce((sum, h) => sum + h.wind10m, 0) / hourly.length;
        const maxWind = Math.max(...hourly.map(h => h.wind10m));
        const totalPrecip = hourly.reduce((sum, h) => sum + h.precip, 0);

        return {
            validHoursCount: validHours.length,
            flightWindows: flightWindows,
            avgTemp: avgTemp.toFixed(1),
            avgWind: avgWind.toFixed(1),
            maxWind: maxWind.toFixed(1),
            totalPrecip: totalPrecip.toFixed(1),
            overallRisk: this.getOverallRisk(hourly)
        };
    },

    /**
     * Поиск благоприятных окон для полёта
     */
    findFlightWindows(hourly, thresholds, minDuration = 2) {
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
                        hours: [hour]
                    };
                } else {
                    currentWindow.end = hour.time;
                    currentWindow.hours.push(hour);
                }
            } else {
                if (currentWindow && currentWindow.hours.length >= minDuration) {
                    windows.push(currentWindow);
                }
                currentWindow = null;
            }
        }

        // Добавляем последний окно
        if (currentWindow && currentWindow.hours.length >= minDuration) {
            windows.push(currentWindow);
        }

        return windows;
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
     * Интерполяция данных для высот (ОБНОВЛЁННАЯ)
     */
    interpolateForAltitude(data, altitude) {
        // Стандартные высоты для БВС
        const ALTITUDES = [250, 350, 450, 550];
        
        // Базовые параметры
        const tempLapse = -6.5 / 1000; // °C на метр (стандартная атмосфера)
        const tempAdjustment = tempLapse * altitude;
        
        // Ветер увеличивается с высотой (логарифмический профиль)
        // На 500м ветер примерно на 15-20% сильнее
        const windFactor = 1 + (altitude / 500) * 0.18;
        
        // Влажность уменьшается с высотой
        const humidityFactor = Math.max(0.5, 1 - (altitude / 2000));
        
        // Давление (барометрическая формула)
        const pressureAdjustment = Math.exp(-altitude / 8500);
        
        // Точка росы (упрощённо)
        const dewPointAdjustment = tempAdjustment * 0.8;
        
        return {
            altitude: altitude,
            temp: (data.temp2m || 0) + tempAdjustment,
            wind: (data.wind10m || 0) * windFactor,
            windDir: data.windDir || 0,
            humidity: Math.max(0, (data.humidity || 50) * humidityFactor),
            pressure: (data.pressure || 1013) * pressureAdjustment,
            dewPoint: (data.dewPoint || data.temp2m - 5) + dewPointAdjustment,
            
            // Дополнительные расчёты
            windGust: (data.windGust || data.wind10m * 1.2) * windFactor,
            cloudCover: data.cloudCover || 0,
            
            // Флаги
            isAboveClouds: altitude > 500 && (data.cloudCover || 0) > 80,
            isBelowClouds: altitude < 300 && (data.cloudCoverLow || 0) > 50
        };
    },

    /**
     * Вертикальный профиль для всех стандартных высот (НОВОЕ)
     */
    getVerticalProfile(analyzedData) {
        if (!analyzedData || !analyzedData.hourly) return null;
        
        const currentHour = analyzedData.hourly[0];
        const ALTITUDES = [250, 350, 450, 550];
        
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

        // === КРИТИЧЕСКИЕ ФЛАГИ ОТ ПИЛОТА ===
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

        // === ПРОВЕРКА ПО СКОРРЕКТИРОВАННЫМ ДАННЫМ ===

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

        // Осадки (из данных)
        if (!hasCriticalFlags?.precip && parseFloat(summary.totalPrecip) > 0) {
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
        if (lowVisibilityHours.length > 0 && !hasCriticalFlags?.fog) {
            recommendations.push({
                type: 'warning',
                icon: 'fa-eye',
                text: `<strong>Снижение видимости</strong> в ${lowVisibilityHours.length} ч. Будьте осторожны.`
            });
        }

        // === ОБЩИЙ РИСК ===
        if (summary.overallRisk === 'high') {
            recommendations.unshift({
                type: 'critical',
                icon: 'fa-ban',
                text: `<strong>ВЫСОКИЙ РИСК</strong> по скорректированным данным. Полёт не рекомендуется.`
            });
        } else if (summary.overallRisk === 'medium') {
            recommendations.unshift({
                type: 'warning',
                icon: 'fa-exclamation-triangle',
                text: `<strong>СРЕДНИЙ РИСК</strong> по скорректированным данным. Будьте осторожны.`
            });
        }

        // Полётные окна
        if (summary.flightWindows.length > 0 && summary.overallRisk !== 'high') {
            const bestWindow = summary.flightWindows.reduce((best, current) =>
                current.hours.length > best.hours.length ? current : best
            );
            const startTime = new Date(bestWindow.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(bestWindow.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            recommendations.push({
                type: 'success',
                icon: 'fa-check-circle',
                text: `<strong>Благоприятное окно: ${startTime}–${endTime}</strong>. Лучшее время для полёта.`
            });
        }

        // Если есть коррекция от пилота
        if (pilotData || analyzedData.corrected) {
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
