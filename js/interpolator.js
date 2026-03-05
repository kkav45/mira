/**
 * MIRA - Метеоинтерполяция v2.0
 * Интерполяция метеоданных от сети аэропортов к произвольной точке
 *
 * Версия 2.0: Адаптивная стратегия с K_rel
 * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md раздел 3.2
 *
 * Использует IDW (Inverse Distance Weighting) с возможностью
 * учёта рельефа и качества данных
 */

const MeteoInterpolator = {
    // Параметры по умолчанию
    defaults: {
        maxRadiusKm: 500,        // Максимальный радиус поиска (по стандарту)
        minStations: 1,          // Минимум станций (1 для экстраполяции)
        maxStations: 12,         // Максимум станций
        idwPower: 2,             // Степень веса в IDW
        useElevation: true,      // Учитывать высоту
        lapseRate: 0.0065,       // Градиент температуры (°C/м)
        
        // Параметры адаптивной стратегии
        N_opt: 3,                // Оптимальное количество станций
        D_scale: 250,            // Масштабный коэффициент расстояния (км)
        alpha_full: 0.75,        // Коэффициент для N >= 3
        alpha_limited: 0.4       // Коэффициент для N = 1,2
    },

    /**
     * Расчёт расстояния между точками (гаверсинус)
     */
    distance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    /**
     * Поиск ближайших аэропортов
     */
    findNearbyAirports(airports, point, radiusKm = 500, maxCount = 12) {
        return airports
            .map(airport => ({
                ...airport,
                distance: this.distance(point.lat, point.lon, airport.latitude, airport.longitude)
            }))
            .filter(a => a.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxCount);
    },

    /**
     * 🆕 Расчёт коэффициента достоверности K_rel
     * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md формула 3.2.1
     * @param {number} N - Количество станций
     * @param {number} avgDistance - Среднее расстояние до станций (км)
     * @returns {number} K_rel от 0 до 1
     */
    calculateKrel(N, avgDistance) {
        const { N_opt, D_scale } = this.defaults;
        return (N / N_opt) * Math.exp(-avgDistance / D_scale);
    },

    /**
     * 🆕 Определение режима интерполяции
     * @param {number} N - Количество станций
     * @returns {string} 'full' | 'limited' | 'global'
     */
    getInterpolationMode(N) {
        if (N >= 3) return 'full';           // Полная интерполяция
        if (N >= 1) return 'limited';        // Ограниченная экстраполяция
        return 'global';                      // Только модель
    },

    /**
     * 🆕 Расчёт адаптивного коэффициента α
     * @param {number} N - Количество станций
     * @returns {number} α от 0 до 1
     */
    getAdaptiveAlpha(N) {
        const { alpha_full, alpha_limited } = this.defaults;
        
        if (N >= 3) return alpha_full;
        if (N >= 1) return alpha_limited;
        return 0.0;  // Только глобальная модель
    },

    /**
     * 🆕 Оценка качества интерполяции (расширенная)
     * @param {Object} result - Результат интерполяции
     * @returns {Object} Оценка качества
     */
    estimateQualityExtended(result) {
        const { stationsCount, radius, stations, point, mode } = result;
        
        // Расчёт K_rel
        const avgDistance = stations.length > 0 
            ? stations.reduce((sum, s) => sum + s.distance, 0) / stations.length 
            : 999;
        
        const K_rel = this.calculateKrel(stationsCount, avgDistance);
        
        // Оценка равномерности распределения
        let distributionScore = 100;
        if (stationsCount >= 3) {
            const angles = stations.map(s => {
                return Math.atan2(s.longitude - point.lon, s.latitude - point.lat) * 180 / Math.PI;
            }).sort((a, b) => a - b);

            let maxGap = 0;
            for (let i = 0; i < angles.length; i++) {
                let gap = angles[(i + 1) % angles.length] - angles[i];
                if (i === angles.length - 1) gap += 360;
                if (gap < 0) gap += 360;
                maxGap = Math.max(maxGap, gap);
            }

            if (maxGap > 120) {
                distributionScore = Math.max(0, 100 - (maxGap - 120) / 1.2);
            }
        }
        
        // Итоговый score
        let score = 100;
        const issues = [];
        
        // Штраф за режим
        if (mode === 'global') {
            score -= 60;
            issues.push('Только модельные данные (нет аэропортов)');
        } else if (mode === 'limited') {
            score -= 30;
            issues.push(`Мало станций: ${stationsCount} (средняя точность)`);
        }
        
        // Штраф за расстояние
        if (avgDistance > 200) {
            score -= Math.min(30, (avgDistance - 200) / 10);
            issues.push(`Большое среднее расстояние: ${Math.round(avgDistance)} км`);
        }
        
        // Штраф за неравномерность
        if (distributionScore < 80) {
            score -= (80 - distributionScore) / 2;
            issues.push(`Неравномерное распределение станций`);
        }
        
        // Штраф за возраст данных
        const avgAge = stations.reduce((sum, s) => sum + (s.age || 0), 0) / stations.length;
        if (avgAge > 30) {
            score -= Math.min(20, (avgAge - 30) / 3);
            issues.push(`Устаревшие данные METAR (${Math.round(avgAge)} мин)`);
        }
        
        return {
            score: Math.max(0, Math.round(score)),
            level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
            K_rel: Math.round(K_rel * 100) / 100,
            mode,
            stationsCount,
            avgDistance: Math.round(avgDistance),
            distributionScore: Math.round(distributionScore),
            issues,
            
            // Текстовое описание для UI
            description: this.getQualityDescription(score, K_rel, mode, stationsCount)
        };
    },

    /**
     * 🆕 Текстовое описание качества
     */
    getQualityDescription(score, K_rel, mode, stationsCount) {
        if (mode === 'global') {
            return {
                emoji: '⚪',
                title: 'Расчётные данные',
                text: 'Используются только данные глобальной модели'
            };
        }
        
        if (score >= 80) {
            return {
                emoji: '🟢',
                title: 'Высокая точность',
                text: `${stationsCount} станций, K_rel = ${K_rel.toFixed(2)}`
            };
        }
        
        if (score >= 60) {
            return {
                emoji: '🟡',
                title: 'Средняя точность',
                text: `${stationsCount} станций, рекомендуется перепроверить`
            };
        }
        
        return {
            emoji: '🟠',
            title: 'Низкая точность',
            text: 'Мало данных, высокая погрешность'
        };
    },

    /**
     * IDW интерполяция
     * @param {Array} stations - Массив станций с данными {value, distance}
     * @param {number} power - Степень веса (обычно 2)
     */
    idw(stations, power = 2) {
        if (!stations || stations.length === 0) return null;
        
        // Если есть станция с нулевым расстоянием
        const exact = stations.find(s => s.distance === 0);
        if (exact && exact.value !== null) return exact.value;
        
        let numerator = 0;
        let denominator = 0;
        
        for (const station of stations) {
            if (station.value === null || station.value === undefined) continue;
            
            const weight = 1 / Math.pow(station.distance || 0.001, power);
            numerator += station.value * weight;
            denominator += weight;
        }
        
        return denominator > 0 ? numerator / denominator : null;
    },

    /**
     * Интерполяция с поправкой на высоту (для температуры)
     */
    idwWithElevation(stations, pointElevation, power = 2, lapseRate = 0.0065) {
        if (!stations || stations.length === 0) return null;
        
        // Корректируем значения к высоте точки
        const corrected = stations.map(s => ({
            ...s,
            value: s.value !== null ? s.value + (pointElevation - (s.elevation || 0)) * lapseRate : null
        }));
        
        return this.idw(corrected, power);
    },

    /**
     * Взвешивание по качеству данных
     */
    qualityWeight(value, ageMinutes, maxAge = 180) {
        if (value === null) return 0;
        // Вес падает с возрастом данных
        const ageWeight = Math.max(0, 1 - ageMinutes / maxAge);
        return value * ageWeight;
    },

    /**
     * Основная функция интерполяции для точки
     * @param {Object} point - {lat, lon, elevation?}
     * @param {Array} airports - Массив аэропортов
     * @param {Object} metarData - Данные METAR по аэропортам {ICAO: {temp, wind, visibility, ...}}
     * @param {Object} options - Параметры
     */
    interpolate(point, airports, metarData, options = {}) {
        const config = { ...this.defaults, ...options };
        
        // Находим ближайшие аэропорты
        const nearby = this.findNearbyAirports(
            airports, 
            point, 
            config.maxRadiusKm, 
            config.maxStations
        );
        
        if (nearby.length < 1) {
            return {
                success: false,
                error: `Аэропорты не найдены в радиусе ${config.maxRadiusKm} км`,
                stations: []
            };
        }
        
        // Собираем данные по каждой станции
        const stationsWithData = nearby.map(station => {
            const data = metarData[station.icao] || {};
            return {
                ...station,
                temp: data.temp,
                dewpoint: data.dewpoint,
                windSpeed: data.windSpeed,
                windDir: data.windDir,
                visibility: data.visibility,
                qnh: data.qnh,
                cloudBase: data.cloudBase,
                age: data.age || 0
            };
        }).filter(s => s.temp !== undefined || s.windSpeed !== undefined);

        if (stationsWithData.length < 1) {
            return {
                success: false,
                error: `Нет данных METAR для станций`,
                stations: nearby,
                mode: 'global'
            };
        }

        // 🆕 Адаптивная стратегия интерполяции
        const N = stationsWithData.length;
        const mode = this.getInterpolationMode(N);
        const alpha = this.getAdaptiveAlpha(N);
        
        // Интерполяция по каждому параметру
        const result = {
            success: true,
            point: point,
            stations: stationsWithData,
            stationsCount: N,
            radius: Math.max(...stationsWithData.map(s => s.distance)),
            mode: mode,
            alpha: alpha,
            interpolated: {}
        };

        // Температура с поправкой на высоту
        if (stationsWithData.some(s => s.temp !== null)) {
            const airportTemp = this.idwWithElevation(
                stationsWithData.map(s => ({ value: s.temp, distance: s.distance, elevation: s.elevation || 0 })),
                point.elevation || 0,
                config.idwPower,
                config.lapseRate
            );
            
            // Смешивание с моделью (если есть globalData)
            if (options.globalData && options.globalData.temp !== undefined) {
                result.interpolated.temp = alpha * airportTemp + (1 - alpha) * options.globalData.temp;
                result.interpolated.temp_source = { airport: airportTemp, model: options.globalData.temp, alpha };
            } else {
                result.interpolated.temp = airportTemp;
            }
        }

        // Точка росы с поправкой на высоту
        if (stationsWithData.some(s => s.dewpoint !== null)) {
            const airportDewpoint = this.idwWithElevation(
                stationsWithData.map(s => ({ value: s.dewpoint, distance: s.distance, elevation: s.elevation || 0 })),
                point.elevation || 0,
                config.idwPower,
                config.lapseRate
            );
            
            if (options.globalData && options.globalData.dewpoint !== undefined) {
                result.interpolated.dewpoint = alpha * airportDewpoint + (1 - alpha) * options.globalData.dewpoint;
            } else {
                result.interpolated.dewpoint = airportDewpoint;
            }
        }

        // Ветер (векторная интерполяция)
        const windResult = this.interpolateWind(stationsWithData, config.idwPower);
        if (windResult) {
            if (options.globalData && options.globalData.windSpeed !== undefined) {
                // Смешивание ветра
                result.interpolated.windSpeed = alpha * windResult.speed + (1 - alpha) * options.globalData.windSpeed;
                result.interpolated.windDir = alpha * windResult.direction + (1 - alpha) * options.globalData.windDir;
            } else {
                result.interpolated.windSpeed = windResult.speed;
                result.interpolated.windDir = windResult.direction;
            }
        }

        // Видимость (IDW)
        if (stationsWithData.some(s => s.visibility !== null)) {
            const airportVisibility = this.idw(
                stationsWithData.map(s => ({ value: s.visibility, distance: s.distance })),
                config.idwPower
            );
            
            if (options.globalData && options.globalData.visibility !== undefined) {
                result.interpolated.visibility = alpha * airportVisibility + (1 - alpha) * options.globalData.visibility;
            } else {
                result.interpolated.visibility = airportVisibility;
            }
        }

        // Давление (приведённое к уровню моря - без поправки на высоту)
        if (stationsWithData.some(s => s.qnh !== null)) {
            const airportQnh = this.idw(
                stationsWithData.map(s => ({ value: s.qnh, distance: s.distance })),
                config.idwPower
            );
            
            if (options.globalData && options.globalData.qnh !== undefined) {
                result.interpolated.qnh = alpha * airportQnh + (1 - alpha) * options.globalData.qnh;
            } else {
                result.interpolated.qnh = airportQnh;
            }
        }

        // Облачность (средняя высота нижней границы)
        if (stationsWithData.some(s => s.cloudBase !== null)) {
            result.interpolated.cloudBase = this.idw(
                stationsWithData.map(s => ({ value: s.cloudBase, distance: s.distance })),
                config.idwPower
            );
        }

        // 🆕 Расширенная оценка качества с K_rel
        result.quality = this.estimateQualityExtended(result);
        result.K_rel = result.quality.K_rel;

        return result;
    },

    /**
     * Векторная интерполяция ветра
     */
    interpolateWind(stations, power = 2) {
        const validStations = stations.filter(s =>
            s.windSpeed !== null && s.windSpeed !== undefined &&
            s.windDir !== null && s.windDir !== undefined
        );
        
        if (validStations.length === 0) return null;

        // Разлагаем на компоненты U (запад-восток) и V (юг-север)
        let uNum = 0, vNum = 0, denom = 0;

        for (const station of validStations) {
            const weight = 1 / Math.pow(station.distance || 0.001, power);
            
            // Штиль или переменный ветер
            if (station.windSpeed === 0 || station.windDir === 'VRB') {
                continue; // Не учитываем в векторной интерполяции
            }
            
            const rad = station.windDir * Math.PI / 180;

            // Метео: ветер ОТ, математика: ветер К
            const u = -station.windSpeed * Math.sin(rad);
            const v = -station.windSpeed * Math.cos(rad);

            uNum += u * weight;
            vNum += v * weight;
            denom += weight;
        }

        if (denom === 0) {
            // Все станции со штилем - возвращаем 0
            return { speed: 0, direction: 0 };
        }

        const u = uNum / denom;
        const v = vNum / denom;

        // Скорость
        const speed = Math.sqrt(u * u + v * v);

        // Направление (откуда дует)
        let direction = Math.atan2(-u, -v) * 180 / Math.PI;
        if (direction < 0) direction += 360;

        return {
            speed: Math.round(speed * 10) / 10,
            direction: Math.round(direction)
        };
    },

    /**
     * Оценка качества интерполяции
     */
    estimateQuality(result) {
        const { stationsCount, radius, stations, point, mode } = result;
        
        let score = 100;
        const issues = [];
        
        // Режим работы
        if (mode === 'extrapolation') {
            score -= 40;
            issues.push('Экстраполяция по 1 станции (низкая точность)');
        } else if (mode === 'limited') {
            score -= 20;
            issues.push(`Мало станций: ${stationsCount} (средняя точность)`);
        }
        
        // Штраф за мало станций (если < 5)
        if (stationsCount < 5) {
            score -= (5 - stationsCount) * 5;
        }
        
        // Штраф за большой радиус
        if (radius > 200) {
            score -= Math.min(30, (radius - 200) / 10);
            issues.push(`Большой радиус: ${Math.round(radius)} км`);
        }
        
        // Штраф за неравномерное распределение (только если >= 3 станций)
        if (stationsCount >= 3) {
            const angles = stations.map(s => {
                return Math.atan2(s.longitude - point.lon, s.latitude - point.lat) * 180 / Math.PI;
            }).sort((a, b) => a - b);
            
            let maxGap = 0;
            for (let i = 0; i < angles.length; i++) {
                let gap = angles[(i + 1) % angles.length] - angles[i];
                if (i === angles.length - 1) gap += 360;
                if (gap < 0) gap += 360;
                maxGap = Math.max(maxGap, gap);
            }
            
            if (maxGap > 120) {
                score -= (maxGap - 120) / 10;
                issues.push(`Неравномерное распределение (разрыв ${Math.round(maxGap)}°)`);
            }
        }
        
        return {
            score: Math.max(0, Math.round(score)),
            level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
            issues,
            mode
        };
    }
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.MeteoInterpolator = MeteoInterpolator;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeteoInterpolator;
}
