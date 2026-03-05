/**
 * MIRA - Вертикальное Профилирование Атмосферы
 * Версия: 1.0.0
 * Дата: 5 марта 2026 г.
 * 
 * Расчёт метеопараметров на высотах 0-650м для БВС
 * Включает: температуру, ветер, давление, плотность воздуха
 */

const VerticalProfileModule = {
    /**
     * Целевые высоты для БВС (метры)
     * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md раздел 4.1
     */
    TARGET_ALTITUDES: [0, 100, 250, 350, 450, 550, 650],

    /**
     * Стандартный температурный градиент (°C на метр)
     * Согласно международной стандартной атмосфере (ISA)
     */
    TEMP_LAPSE_RATE: 0.0065, // 6.5°C на 1000м

    /**
     * Параметры для расчёта плотности воздуха
     */
    AIR_CONSTANTS: {
        M: 0.0289644,  // Молярная масса воздуха, кг/моль
        R: 8.31447,    // Универсальная газовая постоянная, Дж/(моль·К)
        G: 9.80665,    // Ускорение свободного падения, м/с²
        P0: 101325,    // Стандартное давление на уровне моря, Па
        T0: 288.15     // Стандартная температура на уровне моря, К
    },

    /**
     * Типы подстилающей поверхности для расчёта шероховатости
     */
    SURFACE_TYPES: {
        water: { z0: 0.0002, name: 'Вода' },
        ice: { z0: 0.001, name: 'Лёд' },
        sand: { z0: 0.001, name: 'Песок' },
        grass: { z0: 0.01, name: 'Трава' },
        field: { z0: 0.03, name: 'Поле' },
        crops: { z0: 0.05, name: 'Сельхозкультуры' },
        shrubs: { z0: 0.1, name: 'Кустарники' },
        forest: { z0: 1.0, name: 'Лес' },
        suburb: { z0: 0.5, name: 'Пригород' },
        city: { z0: 2.0, name: 'Город' },
        downtown: { z0: 3.0, name: 'Центр города' }
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
     * Определение типа подстилающей поверхности по координатам
     * Упрощённая реализация (можно расширить через OSM)
     */
    getSurfaceType(lat, lon) {
        // Проверка на воду (упрощённо - по крупным водоёмам)
        // В полной версии можно использовать API или базу данных
        if (lat > 60) return this.SURFACE_TYPES.ice; // Северные регионы
        
        // По умолчанию - поле/трава (наиболее часто для БВС)
        return this.SURFACE_TYPES.field;
    },

    /**
     * Расчёт температуры на высоте
     * @param {number} tempSurface - Температура на поверхности, °C
     * @param {number} altitude - Высота, м
     * @param {number} lapseRate - Температурный градиент, °C/м
     * @returns {number} Температура на высоте, °C
     */
    calculateTemperature(tempSurface, altitude, lapseRate = this.TEMP_LAPSE_RATE) {
        return tempSurface - (lapseRate * altitude);
    },

    /**
     * Расчёт давления на высоте (барометрическая формула)
     * @param {number} pressureSurface - Давление на поверхности, гПа
     * @param {number} altitude - Высота, м
     * @param {number} tempSurface - Температура на поверхности, °C
     * @returns {number} Давление на высоте, гПа
     */
    calculatePressure(pressureSurface, altitude, tempSurface = 15) {
        const T0 = tempSurface + 273.15; // Перевод в Кельвины
        const L = this.TEMP_LAPSE_RATE;
        const g = this.AIR_CONSTANTS.G;
        const M = this.AIR_CONSTANTS.M;
        const R = this.AIR_CONSTANTS.R;
        
        const P0 = pressureSurface * 100; // гПа → Па
        
        // Барометрическая формула для тропосферы
        const P = P0 * Math.pow(1 - (L * altitude) / T0, (g * M) / (R * L));
        
        return P / 100; // Па → гПа
    },

    /**
     * Расчёт плотности воздуха (уравнение состояния идеального газа)
     * @param {number} pressure - Давление, гПа
     * @param {number} temperature - Температура, °C
     * @returns {number} Плотность воздуха, кг/м³
     */
    calculateAirDensity(pressure, temperature) {
        const P = pressure * 100; // гПа → Па
        const T = temperature + 273.15; // °C → К
        const M = this.AIR_CONSTANTS.M;
        const R = this.AIR_CONSTANTS.R;
        
        return (P * M) / (R * T);
    },

    /**
     * Расчёт плотностной высоты (Density Altitude)
     * @param {number} pressure - Давление, гПа
     * @param {number} temperature - Температура, °C
     * @returns {number} Плотностная высота, м
     */
    calculateDensityAltitude(pressure, temperature) {
        const P = pressure * 100; // гПа → Па
        const T = temperature + 273.15; // °C → К
        
        // Формула для плотностной высоты
        const DA = 44330 * (1 - Math.pow(P / this.AIR_CONSTANTS.P0, 1/5.255));
        
        // Коррекция на температуру
        const ISA_Temp = 15 - (this.TEMP_LAPSE_RATE * DA * 100);
        const tempDeviation = temperature - ISA_Temp;
        
        return DA + (tempDeviation * 120); // Приблизительная коррекция
    },

    /**
     * Логарифмический профиль ветра (приземный слой 0-100м)
     * @param {number} Vref - Скорость ветра на высоте href, м/с
     * @param {number} h - Целевая высота, м
     * @param {number} href - Высота измерения, м (обычно 10)
     * @param {number} z0 - Параметр шероховатости, м
     * @returns {number} Скорость ветра на высоте h, м/с
     */
    calculateWindLogarithmic(Vref, h, href = 10, z0 = 0.03) {
        if (h <= 0) return 0;
        if (h <= href) return Vref * (h / href); // Линейная аппроксимация очень близко к земле
        
        return Vref * Math.log(h / z0) / Math.log(href / z0);
    },

    /**
     * Степенной профиль ветра (выше 100м)
     * @param {number} V100 - Скорость ветра на 100м, м/с
     * @param {number} h - Целевая высота, м
     * @param {number} alpha - Показатель степени (зависит от стратификации)
     * @returns {number} Скорость ветра на высоте h, м/с
     */
    calculateWindPowerLaw(V100, h, alpha = 0.14) {
        if (h <= 100) return V100;
        return V100 * Math.pow(h / 100, alpha);
    },

    /**
     * Расчёт направления ветра с учётом эффекта Экмана
     * @param {number} dirSurface - Направление ветра на поверхности, °
     * @param {number} h - Высота, м
     * @param {number} beta - Коэффициент поворота, ° (5-15°)
     * @returns {number} Направление ветра на высоте, °
     */
    calculateWindDirectionEkman(dirSurface, h, beta = 10) {
        if (h <= 10) return dirSurface;
        
        const deltaTheta = beta * Math.log(h / 10);
        return (dirSurface + deltaTheta) % 360;
    },

    /**
     * Комплексный расчёт профиля ветра
     * @param {number} windSurface - Ветер на поверхности, м/с
     * @param {number} windDirSurface - Направление ветра, °
     * @param {number} altitude - Высота, м
     * @param {Object} surfaceType - Тип поверхности
     * @param {number} stabilityAlpha - Параметр стратификации
     * @returns {Object} { speed, direction, gust }
     */
    calculateWindProfile(windSurface, windDirSurface, altitude, surfaceType = null, stabilityAlpha = 0.14) {
        const z0 = surfaceType ? surfaceType.z0 : 0.03;
        
        let windSpeed;
        
        if (altitude <= 100) {
            // Логарифмический профиль для приземного слоя
            windSpeed = this.calculateWindLogarithmic(windSurface, altitude, 10, z0);
        } else {
            // Сначала расчёт на 100м
            const V100 = this.calculateWindLogarithmic(windSurface, 100, 10, z0);
            // Степенной закон выше 100м
            windSpeed = this.calculateWindPowerLaw(V100, altitude, stabilityAlpha);
        }
        
        // Направление с эффектом Экмана
        const windDir = this.calculateWindDirectionEkman(windDirSurface, altitude);
        
        // Порывы (увеличиваются с высотой)
        const gustFactor = 1 + (altitude / 1000) * 0.15;
        const windGust = Math.round(windSpeed * gustFactor * 10) / 10;
        
        return {
            speed: Math.round(windSpeed * 10) / 10,
            direction: Math.round(windDir),
            gust: windGust
        };
    },

    /**
     * Расчёт точки росы на высоте
     * @param {number} tempSurface - Температура на поверхности, °C
     * @param {number} dewpointSurface - Точка росы на поверхности, °C
     * @param {number} altitude - Высота, м
     * @returns {number} Точка росы на высоте, °C
     */
    calculateDewpoint(tempSurface, dewpointSurface, altitude) {
        // Точка росы уменьшается с высотой медленнее температуры
        const dewpointLapse = 0.002; // 0.2°C на 100м
        return dewpointSurface - (dewpointLapse * altitude);
    },

    /**
     * Расчёт относительной влажности
     * @param {number} temp - Температура, °C
     * @param {number} dewpoint - Точка росы, °C
     * @returns {number} Относительная влажность, %
     */
    calculateRelativeHumidity(temp, dewpoint) {
        if (temp === dewpoint) return 100;
        
        // Упрощённая формула Магнуса
        const a = 17.27;
        const b = 237.7;
        
        const alpha = ((a * temp) / (b + temp)) - ((a * dewpoint) / (b + dewpoint));
        const RH = 100 * Math.exp(alpha);
        
        return Math.round(Math.min(100, Math.max(0, RH)));
    },

    /**
     * Расчёт риска обледенения
     * @param {number} temp - Температура, °C
     * @param {number} humidity - Влажность, %
     * @param {boolean} hasPrecipitation - Есть осадки
     * @returns {string} 'low' | 'medium' | 'high'
     */
    calculateIcingRisk(temp, humidity, hasPrecipitation = false) {
        // Условия для обледенения
        const inTempRange = temp <= 5 && temp >= -10;
        const highHumidity = humidity > 80;
        
        if (!inTempRange) return 'low';
        
        // Высокий риск: от 0 до -5°C (наиболее опасный диапазон)
        if (temp <= 0 && temp >= -5 && highHumidity) {
            return 'high';
        }
        
        // Средний риск: остальной диапазон с высокой влажностью
        if (highHumidity || hasPrecipitation) {
            return 'medium';
        }
        
        return 'low';
    },

    /**
     * Расчёт вертикального сдвига ветра (для турбулентности)
     * @param {number} V1 - Ветер на нижней границе, м/с
     * @param {number} V2 - Ветер на верхней границе, м/с
     * @param {number} h1 - Нижняя высота, м
     * @param {number} h2 - Верхняя высота, м
     * @returns {number} Сдвиг ветра, с⁻¹
     */
    calculateWindShear(V1, V2, h1, h2) {
        if (h2 <= h1) return 0;
        return Math.abs(V2 - V1) / (h2 - h1);
    },

    /**
     * Расчёт числа Ричардсона (оценка стабильности слоя)
     * @param {number} T1 - Температура на нижней границе, °C
     * @param {number} T2 - Температура на верхней границе, °C
     * @param {number} V1 - Ветер на нижней границе, м/с
     * @param {number} V2 - Ветер на верхней границе, м/с
     * @param {number} h1 - Нижняя высота, м
     * @param {number} h2 - Верхняя высота, м
     * @returns {number} Число Ричардсона
     */
    calculateRichardsonNumber(T1, T2, V1, V2, h1, h2) {
        const g = this.AIR_CONSTANTS.G;
        const T_avg = ((T1 + T2) / 2) + 273.15; // Средняя температура в К
        
        const dT_dz = (T2 - T1) / (h2 - h1); // Градиент температуры
        const dV_dz = (V2 - V1) / (h2 - h1); // Градиент ветра
        
        if (Math.abs(dV_dz) < 0.001) return 999; // Нет сдвига
        
        const numerator = (g / T_avg) * dT_dz;
        const denominator = Math.pow(dV_dz, 2);
        
        return numerator / denominator;
    },

    /**
     * Оценка турбулентности по сдвигу ветра
     * @param {number} windShear - Вертикальный сдвиг ветра, с⁻¹
     * @returns {string} 'low' | 'moderate' | 'severe'
     */
    evaluateTurbulence(windShear) {
        if (windShear > 0.04) return 'severe';
        if (windShear > 0.02) return 'moderate';
        return 'low';
    },

    /**
     * Построение полного вертикального профиля
     * @param {Object} surfaceData - Данные на поверхности
     * @param {Object} options - Опции
     * @returns {Array} Массив данных по высотам
     */
    buildVerticalProfile(surfaceData, options = {}) {
        const {
            temp2m,
            dewpoint2m,
            pressure,
            wind10m,
            windDir10m,
            humidity,
            precip,
            cloudCover
        } = surfaceData;
        
        const {
            surfaceType = this.SURFACE_TYPES.field,
            stabilityAlpha = 0.14,
            hasPrecip = precip > 0
        } = options;
        
        const profile = [];
        const altitudes = options.altitudes || this.TARGET_ALTITUDES;
        
        for (let i = 0; i < altitudes.length; i++) {
            const h = altitudes[i];
            
            // Температура
            const temp = this.calculateTemperature(temp2m, h);
            
            // Давление
            const press = this.calculatePressure(pressure, h, temp2m);
            
            // Плотность
            const density = this.calculateAirDensity(press, temp);
            
            // Ветер
            const wind = this.calculateWindProfile(
                wind10m,
                windDir10m,
                h,
                surfaceType,
                stabilityAlpha
            );
            
            // Точка росы и влажность
            const dewpoint = this.calculateDewpoint(temp2m, dewpoint2m, h);
            const RH = this.calculateRelativeHumidity(temp, dewpoint);
            
            // Риски
            const icingRisk = this.calculateIcingRisk(temp, RH, hasPrecip);
            
            // Сдвиг ветра (с предыдущим уровнем)
            let windShear = 0;
            let turbulence = 'low';
            let Ri = null;
            
            if (i > 0) {
                const prev = profile[i - 1];
                windShear = this.calculateWindShear(prev.wind, wind.speed, prev.altitude, h);
                turbulence = this.evaluateTurbulence(windShear);
                
                Ri = this.calculateRichardsonNumber(
                    prev.temp, temp,
                    prev.wind, wind.speed,
                    prev.altitude, h
                );
            }
            
            profile.push({
                altitude: h,
                temp: Math.round(temp * 10) / 10,
                dewpoint: Math.round(dewpoint * 10) / 10,
                humidity: RH,
                pressure: Math.round(press * 10) / 10,
                density: Math.round(density * 1000) / 1000,
                wind: wind.speed,
                windDir: wind.direction,
                windGust: wind.gust,
                windShear: Math.round(windShear * 1000) / 1000,
                turbulence: turbulence,
                icingRisk: icingRisk,
                richardsonNumber: Ri !== null ? Math.round(Ri * 100) / 100 : null,
                isAboveClouds: h > 500 && (cloudCover || 0) > 80,
                isBelowClouds: h < 300 && (cloudCover || 0) > 50
            });
        }
        
        return profile;
    },

    /**
     * Анализ профиля и генерация рекомендаций
     * @param {Array} profile - Вертикальный профиль
     * @returns {Object} Рекомендации
     */
    analyzeProfile(profile) {
        const recommendations = [];
        const warnings = [];
        
        // Поиск зон обледенения
        const icingZones = profile.filter(p => p.icingRisk === 'high' || p.icingRisk === 'medium');
        if (icingZones.length > 0) {
            const minAlt = Math.min(...icingZones.map(p => p.altitude));
            const maxAlt = Math.max(...icingZones.map(p => p.altitude));
            warnings.push({
                type: 'icing',
                severity: icingZones.some(p => p.icingRisk === 'high') ? 'high' : 'medium',
                message: `Зона обледенения: ${minAlt}-${maxAlt}м`,
                altRange: [minAlt, maxAlt]
            });
        }
        
        // Поиск зон турбулентности
        const turbZones = profile.filter(p => p.turbulence === 'moderate' || p.turbulence === 'severe');
        if (turbZones.length > 0) {
            const minAlt = Math.min(...turbZones.map(p => p.altitude));
            const maxAlt = Math.max(...turbZones.map(p => p.altitude));
            warnings.push({
                type: 'turbulence',
                severity: turbZones.some(p => p.turbulence === 'severe') ? 'high' : 'medium',
                message: `Турбулентность: ${minAlt}-${maxAlt}м`,
                altRange: [minAlt, maxAlt]
            });
        }
        
        // Анализ плотности воздуха
        const surfaceDensity = profile.find(p => p.altitude === 0)?.density || 1.225;
        const maxAltDensity = profile[profile.length - 1]?.density || 1.0;
        const densityLoss = Math.round((1 - maxAltDensity / surfaceDensity) * 100);
        
        if (densityLoss > 15) {
            recommendations.push({
                type: 'info',
                icon: 'fa-wind',
                message: `Потеря плотности воздуха на ${densityLoss}% на макс. высоте`
            });
            
            recommendations.push({
                type: 'warning',
                icon: 'fa-battery-three-quarters',
                message: 'Увеличьте запас энергии на 20-25% для полётов на высотах >400м'
            });
        }
        
        // Рекомендации по оптимальной высоте
        const safeAltitudes = profile.filter(p => 
            p.icingRisk === 'low' && 
            p.turbulence === 'low' &&
            p.wind < 10
        );
        
        if (safeAltitudes.length > 0) {
            const optimalAlt = safeAltitudes[Math.floor(safeAltitudes.length / 2)].altitude;
            recommendations.push({
                type: 'success',
                icon: 'fa-check-circle',
                message: `Оптимальная высота полёта: ${optimalAlt}м`
            });
        }
        
        return {
            warnings,
            recommendations,
            densityLoss,
            safeAltitudes: safeAltitudes.map(p => p.altitude),
            maxWindAltitude: profile.reduce((max, p) => p.wind > max.wind ? p : max, profile[0]).altitude
        };
    },

    /**
     * Экспорт профиля в JSON формат
     * @param {Object} location - Координаты
     * @param {Array} profile - Вертикальный профиль
     * @param {Object} analysis - Результаты анализа
     * @returns {Object} JSON объект
     */
    exportToJSON(location, profile, analysis) {
        return {
            location: location,
            timestamp_utc: new Date().toISOString(),
            vertical_profile: profile.map(p => ({
                alt_m: p.altitude,
                temp_c: p.temp,
                dewpoint_c: p.dewpoint,
                humidity_pct: p.humidity,
                pressure_hpa: p.pressure,
                density_kgm3: p.density,
                wind_ms: p.wind,
                wind_dir_deg: p.windDir,
                wind_gust_ms: p.windGust,
                wind_shear: p.windShear,
                turbulence: p.turbulence,
                icing_risk: p.icingRisk,
                richardson_number: p.richardsonNumber
            })),
            hazards: analysis.warnings,
            recommendations: analysis.recommendations,
            summary: {
                density_loss_pct: analysis.densityLoss,
                safe_altitudes: analysis.safeAltitudes,
                max_wind_altitude: analysis.maxWindAltitude
            }
        };
    }
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.VerticalProfileModule = VerticalProfileModule;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VerticalProfileModule;
}
