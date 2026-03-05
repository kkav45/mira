/**
 * MIRA - Модуль Расширенных Метеорологических Индексов
 * Версия: 1.0.0
 * Дата: 5 марта 2026 г.
 * 
 * Расчёт авиационных индексов:
 * - CAPE (Convective Available Potential Energy)
 * - LI (Lifted Index)
 * - EDR (Turbulence Index)
 * - K-индекс (грозовая активность)
 * - Число Ричардсона
 * 
 * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md разделы 4.5, 6.3
 */

const AtmosphericIndicesModule = {
    /**
     * Физические константы
     */
    CONSTANTS: {
        G: 9.80665,      // Ускорение свободного падения, м/с²
        CP: 1005,        // Удельная теплоёмкость воздуха при постоянном давлении, Дж/(кг·К)
        R: 287.05,       // Удельная газовая постоянная для воздуха, Дж/(кг·К)
        LV: 2.5e6,       // Удельная теплота парообразования, Дж/кг
        EPSILON: 0.622   // Отношение молярных масс водяного пара и сухого воздуха
    },

    /**
     * 🆕 Расчёт температуры потенциальной (Θ)
     * @param {number} T - Температура, К
     * @param {number} P - Давление, гПа
     * @param {number} P0 - Стандартное давление (1000 гПа)
     * @returns {number} Потенциальная температура, К
     */
    calculatePotentialTemperature(T, P, P0 = 1000) {
        return T * Math.pow(P0 / P, this.CONSTANTS.R / this.CONSTANTS.CP);
    },

    /**
     * 🆕 Расчёт температуры эквивалентно-потенциальной (Θe)
     * Упрощённая формула Болтона
     * @param {number} T - Температура, К
     * @param {number} P - Давление, гПа
     * @param {number} Td - Точка росы, К
     * @returns {number} Эквивалентно-потенциальная температура, К
     */
    calculateEquivalentPotentialTemperature(T, P, Td) {
        // Давление насыщения над водой
        const Ew = 6.112 * Math.exp((17.67 * (Td - 273.15)) / (Td - 29.65));
        
        // Коэффициент подъёма
        const LCL = 125 * Math.log(T / Td);
        const TLCL = T - 0.008 * LCL;
        
        // Упрощённая формула
        const w = this.CONSTANTS.EPSILON * Ew / (P - Ew);
        const Lv = this.CONSTANTS.LV;
        
        return this.calculatePotentialTemperature(T, P) * Math.exp((Lv * w) / (this.CONSTANTS.CP * TLCL));
    },

    /**
     * 🆕 CAPE (Convective Available Potential Energy)
     * Энергия конвективной доступной потенциальной
     * @param {Array} profile - Вертикальный профиль [{temp, pressure, humidity}, ...]
     * @returns {number} CAPE, Дж/кг
     */
    calculateCAPE(profile) {
        if (!profile || profile.length < 3) return 0;
        
        // Находим уровень свободной конвекции (LFC) и уровень равновесия (EL)
        let LFC = null;
        let EL = null;
        
        // Температура восходящей частицы
        for (let i = 0; i < profile.length - 1; i++) {
            const p = profile[i];
            const T_env = p.temp + 273.15; // К
            const Td_env = p.dewpoint + 273.15; // К
            
            // Температура восходящей частицы (сухоадиабатический подъём)
            const T_parcel = this.calculateParcelTemperature(profile[0].temp, profile[0].dewpoint, p.pressure);
            
            // Если частица теплее окружения — конвекция
            if (T_parcel > T_env && !LFC) {
                LFC = i;
            }
            
            if (T_parcel < T_env && LFC && !EL) {
                EL = i;
                break;
            }
        }
        
        if (!LFC || !EL) return 0;
        
        // Интегрирование CAPE между LFC и EL
        let CAPE = 0;
        const g = this.CONSTANTS.G;
        
        for (let i = LFC; i < EL; i++) {
            const T_env = profile[i].temp + 273.15;
            const T_parcel = this.calculateParcelTemperature(profile[0].temp, profile[0].dewpoint, profile[i].pressure);
            
            // Разница температур
            const dT = T_parcel - T_env;
            
            // Приращение CAPE
            CAPE += g * (dT / T_env) * 100; // 100 — масштабный коэффициент для дискретного интегрирования
        }
        
        return Math.round(CAPE);
    },

    /**
     * Температура восходящей частицы
     */
    calculateParcelTemperature(T0, Td0, P) {
        const T0_K = T0 + 273.15;
        const Td0_K = Td0 + 273.15;
        
        // Уровень конденсации (LCL)
        const LCL = 125 * (T0 - Td0);
        
        // Температура на LCL
        const TLCL = T0 - 0.008 * LCL;
        
        // Выше LCL — влажноадиабатический подъём
        const gamma_m = 0.006; // Влажноадиабатический градиент
        
        // Приблизительный расчёт
        return TLCL - gamma_m * LCL;
    },

    /**
     * 🆕 LI (Lifted Index)
     * Индекс подъёма
     * @param {Array} profile - Вертикальный профиль
     * @param {number} pressureLevel - Уровень давления (обычно 500 гПа)
     * @returns {number} LI, °C
     */
    calculateLI(profile, pressureLevel = 500) {
        if (!profile || profile.length < 3) return 0;
        
        // Находим уровень 500 гПа (или ближайший)
        let level500 = null;
        for (const level of profile) {
            if (Math.abs(level.pressure - pressureLevel) < 50) {
                level500 = level;
                break;
            }
        }
        
        if (!level500) return 0;
        
        // Температура окружающей среды на 500 гПа
        const T_env = level500.temp;
        
        // Температура восходящей частицы на 500 гПа
        const T_parcel = this.calculateParcelTemperature(profile[0].temp, profile[0].dewpoint, pressureLevel);
        
        // LI = T_env - T_parcel
        return Math.round((T_env - T_parcel) * 10) / 10;
    },

    /**
     * 🆕 EDR (Eddy Dissipation Rate)
     * Индекс турбулентности
     * @param {number} windShear - Вертикальный сдвиг ветра, с⁻¹
     * @param {number} RichardsonNumber - Число Ричардсона
     * @returns {number} EDR, м²/с³
     */
    calculateEDR(windShear, RichardsonNumber) {
        if (windShear <= 0) return 0;
        
        // Упрощённая параметризация
        const epsilon = Math.pow(windShear, 3) * 0.1;
        
        // Коррекция по Ричардсону
        let correction = 1;
        if (RichardsonNumber < 0.25) {
            correction = 1.5; // Сильная турбулентность
        } else if (RichardsonNumber < 1) {
            correction = 1.2; // Умеренная
        }
        
        return Math.round(epsilon * correction * 1000) / 1000;
    },

    /**
     * 🆕 Число Ричардсона (Ri)
     * Оценка стабильности слоя
     * @param {Object} lower - Нижний уровень профиля
     * @param {Object} upper - Верхний уровень профиля
     * @returns {number} Число Ричардсона
     */
    calculateRichardsonNumber(lower, upper) {
        if (!lower || !upper) return 999;
        
        const g = this.CONSTANTS.G;
        const T_avg = ((lower.temp + upper.temp) / 2) + 273.15; // К
        
        const dZ = upper.altitude - lower.altitude;
        if (dZ <= 0) return 999;
        
        // Градиент потенциальной температуры
        const theta_lower = this.calculatePotentialTemperature(lower.temp + 273.15, lower.pressure);
        const theta_upper = this.calculatePotentialTemperature(upper.temp + 273.15, upper.pressure);
        const dTheta_dZ = (theta_upper - theta_lower) / dZ;
        
        // Градиент ветра
        const dV_dZ = (upper.wind - lower.wind) / dZ;
        
        if (Math.abs(dV_dZ) < 0.001) return 999;
        
        const Ri = (g / T_avg) * (dTheta_dZ / Math.pow(dV_dZ, 2));
        
        return Math.round(Ri * 100) / 100;
    },

    /**
     * 🆕 K-индекс (грозовая активность)
     * @param {Object} surface - Поверхностные данные
     * @param {Object} level850 - Данные на уровне 850 гПа
     * @param {Object} level700 - Данные на уровне 700 гПа
     * @param {Object} level500 - Данные на уровне 500 гПа
     * @returns {number} K-индекс
     */
    calculateKIndex(surface, level850, level700, level500) {
        if (!level850 || !level700 || !level500) return 0;
        
        const T850 = level850.temp;
        const Td850 = level850.dewpoint;
        const T700 = level700.temp;
        const Td700 = level700.dewpoint;
        const T500 = level500.temp;
        const Td500 = level500.dewpoint;
        
        // K = (T850 - T500) + Td850 - (T700 - Td700)
        const K = (T850 - T500) + Td850 - (T700 - Td700);
        
        return Math.round(K * 10) / 10;
    },

    /**
     * 🆕 Индекс обледенения
     * @param {number} temp - Температура, °C
     * @param {number} humidity - Влажность, %
     * @param {boolean} hasPrecip - Есть осадки
     * @returns {Object} { risk: 'low'|'medium'|'high', score: number }
     */
    calculateIcingIndex(temp, humidity, hasPrecip = false) {
        let score = 0;
        
        // Температурный диапазон для обледенения
        if (temp <= 5 && temp >= -10) {
            score += 4;
            
            // Наиболее опасный диапазон
            if (temp <= 0 && temp >= -5) {
                score += 3;
            }
        }
        
        // Влажность
        if (humidity > 80) {
            score += 2;
        } else if (humidity > 60) {
            score += 1;
        }
        
        // Осадки
        if (hasPrecip) {
            score += 2;
        }
        
        let risk = 'low';
        if (score >= 7) risk = 'high';
        else if (score >= 4) risk = 'medium';
        
        return {
            risk,
            score: Math.min(10, score)
        };
    },

    /**
     * 🆕 Индекс турбулентности (по сдвигу ветра)
     * @param {number} windShear - Вертикальный сдвиг ветра, с⁻¹
     * @returns {Object} { risk: 'low'|'moderate'|'severe', score: number }
     */
    calculateTurbulenceIndex(windShear) {
        let score = 0;
        let risk = 'low';
        
        if (windShear > 0.04) {
            score = 3;
            risk = 'severe';
        } else if (windShear > 0.02) {
            score = 2;
            risk = 'moderate';
        } else if (windShear > 0.01) {
            score = 1;
            risk = 'low';
        }
        
        return {
            risk,
            score,
            windShear: Math.round(windShear * 1000) / 1000
        };
    },

    /**
     * 🆕 Комплексный расчёт всех индексов для профиля
     * @param {Array} profile - Вертикальный профиль
     * @param {Object} surfaceData - Поверхностные данные
     * @returns {Object} Все индексы
     */
    calculateAllIndices(profile, surfaceData) {
        if (!profile || profile.length < 3) {
            return null;
        }
        
        // Находим уровни для расчётов
        const level850 = profile.find(p => Math.abs(p.pressure - 850) < 50);
        const level700 = profile.find(p => Math.abs(p.pressure - 700) < 50);
        const level500 = profile.find(p => Math.abs(p.pressure - 500) < 50);
        
        // CAPE
        const CAPE = this.calculateCAPE(profile);
        
        // LI
        const LI = this.calculateLI(profile);
        
        // K-индекс
        const K = this.calculateKIndex(surfaceData, level850, level700, level500);
        
        // Число Ричардсона для каждого слоя
        const RichardsonNumbers = [];
        for (let i = 0; i < profile.length - 1; i++) {
            const Ri = this.calculateRichardsonNumber(profile[i], profile[i + 1]);
            RichardsonNumbers.push(Ri);
        }
        const minRi = Math.min(...RichardsonNumbers.filter(r => r < 999));
        
        // EDR
        const avgShear = profile.length > 1 
            ? (profile[profile.length - 1].wind - profile[0].wind) / (profile[profile.length - 1].altitude - profile[0].altitude)
            : 0;
        const EDR = this.calculateEDR(avgShear, minRi);
        
        // Индекс обледенения (для поверхности и уровней)
        const surfaceIcing = this.calculateIcingIndex(
            surfaceData.temp2m || profile[0]?.temp || 0,
            surfaceData.humidity || profile[0]?.humidity || 50,
            surfaceData.precip > 0
        );
        
        // Индекс турбулентности
        const turbulence = this.calculateTurbulenceIndex(avgShear);
        
        return {
            CAPE: CAPE,
            LI: LI,
            K_index: K,
            Richardson_min: minRi < 999 ? minRi : null,
            EDR: EDR,
            icing: surfaceIcing,
            turbulence: turbulence,
            
            // Интерпретация
            interpretation: this.interpretIndices(CAPE, LI, K, minRi, EDR)
        };
    },

    /**
     * Интерпретация индексов
     */
    interpretIndices(CAPE, LI, K, Ri, EDR) {
        const interpretation = [];
        
        // CAPE
        if (CAPE > 2500) {
            interpretation.push({ type: 'warning', text: 'Высокая конвективная энергия (CAPE > 2500 Дж/кг)' });
        } else if (CAPE > 1000) {
            interpretation.push({ type: 'info', text: 'Умеренная конвективная энергия' });
        }
        
        // LI
        if (LI < -4) {
            interpretation.push({ type: 'warning', text: 'Неустойчивая атмосфера (LI < -4)' });
        } else if (LI < 0) {
            interpretation.push({ type: 'info', text: 'Слабая неустойчивость' });
        }
        
        // K-индекс
        if (K > 30) {
            interpretation.push({ type: 'warning', text: 'Высокая вероятность гроз (K > 30)' });
        } else if (K > 20) {
            interpretation.push({ type: 'info', text: 'Умеренная вероятность гроз' });
        }
        
        // Ричардсон
        if (Ri < 0.25 && Ri > -999) {
            interpretation.push({ type: 'warning', text: 'Вероятна турбулентность (Ri < 0.25)' });
        }
        
        // EDR
        if (EDR > 0.3) {
            interpretation.push({ type: 'warning', text: 'Сильная турбулентность (EDR > 0.3)' });
        } else if (EDR > 0.15) {
            interpretation.push({ type: 'info', text: 'Умеренная турбулентность' });
        }
        
        return interpretation;
    },

    /**
     * 🆕 Экспорт всех данных в JSON формат (согласно разделу 8)
     * @param {Object} location - Координаты {lat, lon, alt_msl}
     * @param {Object} surfaceData - Поверхностные данные
     * @param {Array} verticalProfile - Вертикальный профиль
     * @param {Object} indices - Индексы
     * @param {Object} hazards - Опасные явления
     * @param {Object} metadata - Метаданные
     * @returns {Object} JSON объект
     */
    exportToJSON(location, surfaceData, verticalProfile, indices, hazards, metadata) {
        return {
            location: {
                lat: location.lat,
                lon: location.lon,
                alt_msl: location.alt
            },
            timestamp_utc: new Date().toISOString(),
            surface: {
                temperature_c: surfaceData.temp,
                dewpoint_c: surfaceData.dewpoint,
                humidity_pct: surfaceData.humidity,
                wind_dir_deg: surfaceData.windDir,
                wind_speed_ms: surfaceData.wind,
                wind_gust_ms: surfaceData.windGust,
                pressure_hpa: surfaceData.pressure,
                visibility_m: surfaceData.visibility,
                cloud_base_m: surfaceData.cloudBase
            },
            vertical_profile: verticalProfile.map(p => ({
                alt_m: p.altitude,
                temp_c: p.temp,
                dewpoint_c: p.dewpoint,
                humidity_pct: p.humidity,
                pressure_hpa: p.pressure,
                density_kgm3: p.density,
                wind_ms: p.wind,
                wind_dir_deg: p.windDir,
                wind_gust_ms: p.windGust,
                icing_risk: p.icingRisk,
                turbulence: p.turbulence,
                richardson_number: p.richardsonNumber
            })),
            hazards: hazards || [],
            indices: {
                cape_jkg: indices?.CAPE || 0,
                li_c: indices?.LI || 0,
                k_index: indices?.K_index || 0,
                richardson_min: indices?.Richardson_min,
                edr: indices?.EDR || 0,
                kp_index: metadata?.kpIndex || 0
            },
            recommendations: {
                optimal_window: [],
                avoid_after: null,
                notes: indices?.interpretation?.map(i => i.text) || []
            },
            metadata: {
                data_sources: metadata?.sources || ['METAR', 'Open-Meteo'],
                confidence: metadata?.confidence || 0.85,
                update_interval_min: metadata?.updateInterval || 30,
                interpolation_mode: metadata?.interpolationMode || 'IDW',
                K_rel: metadata?.K_rel || 0
            }
        };
    },

    /**
     * Скачивание JSON файла
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`✅ JSON экспортирован: ${filename}`);
    }
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.AtmosphericIndicesModule = AtmosphericIndicesModule;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AtmosphericIndicesModule;
}
