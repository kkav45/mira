/**
 * MIRA - Модуль Верификации и Калибровки
 * Версия: 1.0.0
 * Дата: 5 марта 2026 г.
 * 
 * Сравнение модельных данных с фактическими наблюдениями
 * Расчёт метрик точности (MAE, RMSE)
 * Адаптивная калибровка по телеметрии БВС
 * 
 * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md раздел 5
 */

const VerificationModule = {
    /**
     * Кэш наблюдений для верификации
     */
    observationsCache: [],

    /**
     * Сохранение наблюдения для последующей верификации
     * @param {Object} observation - Наблюдение (фактические данные)
     * @param {Object} modelData - Модельные данные для той же точки/времени
     */
    addObservation(observation, modelData) {
        const record = {
            timestamp: observation.timestamp || new Date().toISOString(),
            location: observation.location, // {lat, lon, alt}
            observation: observation,
            model: modelData,
            verified: false
        };
        
        this.observationsCache.push(record);
        
        // Храним только последние 100 наблюдений
        if (this.observationsCache.length > 100) {
            this.observationsCache.shift();
        }
        
        console.log(`✅ Добавлено наблюдение для верификации: ${observation.location?.lat}, ${observation.location?.lon}`);
    },

    /**
     * 🆕 Расчёт средней абсолютной ошибки (MAE)
     * @param {Array} modelValues - Массив модельных значений
     * @param {Array} observedValues - Массив фактических значений
     * @returns {number} MAE
     */
    calculateMAE(modelValues, observedValues) {
        if (modelValues.length !== observedValues.length) {
            console.error('❌ Длина массивов не совпадает');
            return null;
        }
        
        const n = modelValues.length;
        let sum = 0;
        
        for (let i = 0; i < n; i++) {
            sum += Math.abs(modelValues[i] - observedValues[i]);
        }
        
        return sum / n;
    },

    /**
     * 🆕 Расчёт среднеквадратичной ошибки (RMSE)
     * @param {Array} modelValues - Массив модельных значений
     * @param {Array} observedValues - Массив фактических значений
     * @returns {number} RMSE
     */
    calculateRMSE(modelValues, observedValues) {
        if (modelValues.length !== observedValues.length) {
            console.error('❌ Длина массивов не совпадает');
            return null;
        }
        
        const n = modelValues.length;
        let sumSquares = 0;
        
        for (let i = 0; i < n; i++) {
            const diff = modelValues[i] - observedValues[i];
            sumSquares += diff * diff;
        }
        
        return Math.sqrt(sumSquares / n);
    },

    /**
     * 🆕 Расчёт средней абсолютной процентной ошибки (MAPE)
     * @param {Array} modelValues - Массив модельных значений
     * @param {Array} observedValues - Массив фактических значений
     * @returns {number} MAPE в %
     */
    calculateMAPE(modelValues, observedValues) {
        if (modelValues.length !== observedValues.length) {
            console.error('❌ Длина массивов не совпадает');
            return null;
        }
        
        const n = modelValues.length;
        let sumPercent = 0;
        let validCount = 0;
        
        for (let i = 0; i < n; i++) {
            if (observedValues[i] !== 0) {
                sumPercent += Math.abs((modelValues[i] - observedValues[i]) / observedValues[i]) * 100;
                validCount++;
            }
        }
        
        return validCount > 0 ? sumPercent / validCount : null;
    },

    /**
     * 🆕 Верификация всех накопленных наблюдений
     * @param {string} parameter - Параметр для верификации ('temp', 'wind', 'pressure', etc.)
     * @returns {Object} Метрики точности
     */
    verifyParameter(parameter) {
        const verifiedRecords = this.observationsCache.filter(r => r.verified === false);
        
        if (verifiedRecords.length === 0) {
            return {
                success: false,
                error: 'Нет непроверенных наблюдений',
                count: 0
            };
        }
        
        const modelValues = [];
        const observedValues = [];
        const locations = [];
        
        for (const record of verifiedRecords) {
            const modelVal = record.model[parameter];
            const obsVal = record.observation[parameter];
            
            if (modelVal !== undefined && obsVal !== undefined) {
                modelValues.push(modelVal);
                observedValues.push(obsVal);
                locations.push(record.location);
            }
        }
        
        if (modelValues.length === 0) {
            return {
                success: false,
                error: `Нет данных для параметра: ${parameter}`,
                count: 0
            };
        }
        
        // Расчёт метрик
        const mae = this.calculateMAE(modelValues, observedValues);
        const rmse = this.calculateRMSE(modelValues, observedValues);
        const mape = this.calculateMAPE(modelValues, observedValues);
        
        // Помечаем как проверенные
        verifiedRecords.forEach(r => r.verified = true);
        
        return {
            success: true,
            parameter: parameter,
            count: modelValues.length,
            metrics: {
                mae: Math.round(mae * 100) / 100,
                rmse: Math.round(rmse * 100) / 100,
                mape: mape !== null ? Math.round(mape * 100) / 100 : null
            },
            bias: Math.round((modelValues.reduce((a, b) => a + b, 0) / modelValues.length - 
                           observedValues.reduce((a, b) => a + b, 0) / observedValues.length) * 100) / 100,
            locations: locations
        };
    },

    /**
     * 🆕 Комплексная верификация всех параметров
     * @returns {Object} Полная статистика верификации
     */
    verifyAll() {
        const parameters = ['temp', 'dewpoint', 'wind', 'pressure', 'humidity', 'visibility'];
        const results = {};
        
        for (const param of parameters) {
            results[param] = this.verifyParameter(param);
        }
        
        return {
            timestamp: new Date().toISOString(),
            totalObservations: this.observationsCache.length,
            verifiedCount: this.observationsCache.filter(r => r.verified).length,
            parameters: results
        };
    },

    /**
     * 🆕 Адаптивная коррекция профиля по телеметрии БВС
     * Согласно МЕТЕОМОДЕЛЬ_ОПИСАНИЕ.md формула 5.2
     * @param {Object} modelProfile - Модельный профиль (массив по высотам)
     * @param {Object} sensorData - Данные сенсоров БВС {altitude, temp, wind, pressure}
     * @param {number} k - Коэффициент коррекции (по умолчанию 0.5)
     * @returns {Array} Скорректированный профиль
     */
    correctProfileWithTelemetry(modelProfile, sensorData, k = 0.5) {
        if (!modelProfile || modelProfile.length === 0) {
            console.error('❌ Профиль пуст');
            return [];
        }
        
        if (!sensorData || sensorData.altitude === undefined) {
            console.error('❌ Нет данных сенсоров');
            return modelProfile;
        }
        
        const h_ref = sensorData.altitude;
        
        // Находим модельное значение на высоте измерения
        let modelAtRef = null;
        for (const level of modelProfile) {
            if (level.altitude === h_ref) {
                modelAtRef = level;
                break;
            }
        }
        
        // Если точного совпадения нет — интерполируем
        if (!modelAtRef) {
            modelAtRef = this.interpolateProfileLevel(modelProfile, h_ref);
        }
        
        if (!modelAtRef) {
            console.warn('⚠️ Не удалось получить модельное значение на высоте измерения');
            return modelProfile;
        }
        
        // Расчёт поправок
        const corrections = {
            temp: sensorData.temp !== undefined ? sensorData.temp - modelAtRef.temp : 0,
            wind: sensorData.wind !== undefined ? sensorData.wind - modelAtRef.wind : 0,
            pressure: sensorData.pressure !== undefined ? sensorData.pressure - modelAtRef.pressure : 0
        };
        
        // Применяем коррекцию ко всем уровням с затуханием
        const correctedProfile = modelProfile.map(level => {
            const altitudeDiff = Math.abs(level.altitude - h_ref);
            const decay = Math.exp(-altitudeDiff / 200); // Затухание с масштабом 200м
            
            const corrected = { ...level };
            
            if (sensorData.temp !== undefined) {
                corrected.temp = Math.round((level.temp + k * corrections.temp * decay) * 10) / 10;
            }
            
            if (sensorData.wind !== undefined) {
                corrected.wind = Math.round((level.wind + k * corrections.wind * decay) * 10) / 10;
            }
            
            if (sensorData.pressure !== undefined) {
                corrected.pressure = Math.round((level.pressure + k * corrections.pressure * decay) * 10) / 10;
            }
            
            corrected.isCalibrated = true;
            corrected.calibrationAltitude = h_ref;
            corrected.calibrationDecay = Math.round(decay * 100) / 100;
            
            return corrected;
        });
        
        console.log(`✅ Профиль откалиброван по данным на высоте ${h_ref}м`);
        return correctedProfile;
    },

    /**
     * Интерполяция уровня профиля по высоте
     */
    interpolateProfileLevel(profile, targetAltitude) {
        if (profile.length < 2) return null;
        
        // Находим соседние уровни
        let lower = null;
        let upper = null;
        
        for (let i = 0; i < profile.length - 1; i++) {
            if (profile[i].altitude <= targetAltitude && profile[i + 1].altitude >= targetAltitude) {
                lower = profile[i];
                upper = profile[i + 1];
                break;
            }
        }
        
        if (!lower || !upper) return null;
        
        // Линейная интерполяция
        const h1 = lower.altitude;
        const h2 = upper.altitude;
        const t = (targetAltitude - h1) / (h2 - h1);
        
        return {
            altitude: targetAltitude,
            temp: lower.temp + t * (upper.temp - lower.temp),
            wind: lower.wind + t * (upper.wind - lower.wind),
            pressure: lower.pressure + t * (upper.pressure - lower.pressure)
        };
    },

    /**
     * 🆕 Сравнение трёх источников данных
     * [Интерполяция], [Open-Meteo], [Пользователь]
     * @param {Object} interpolationData - Данные интерполяции
     * @param {Object} modelData - Данные глобальной модели
     * @param {Object} userData - Данные пользователя
     * @returns {Object} Результаты сравнения
     */
    compareSources(interpolationData, modelData, userData) {
        const comparison = {};
        
        const parameters = ['temp', 'wind', 'pressure', 'humidity'];
        
        for (const param of parameters) {
            const interpVal = interpolationData?.[param];
            const modelVal = modelData?.[param];
            const userVal = userData?.[param];
            
            if (userVal !== undefined && interpVal !== undefined && modelVal !== undefined) {
                const interpError = Math.abs(interpVal - userVal);
                const modelError = Math.abs(modelVal - userVal);
                
                comparison[param] = {
                    user: userVal,
                    interpolation: interpVal,
                    model: modelVal,
                    interpolationError: Math.round(interpError * 100) / 100,
                    modelError: Math.round(modelError * 100) / 100,
                    winner: interpError < modelError ? 'interpolation' : 'model'
                };
            }
        }
        
        return {
            timestamp: new Date().toISOString(),
            comparison: comparison,
            summary: {
                interpolationWins: Object.values(comparison).filter(c => c.winner === 'interpolation').length,
                modelWins: Object.values(comparison).filter(c => c.winner === 'model').length
            }
        };
    },

    /**
     * 🆕 Индикация качества данных для пользователя
     * @param {Object} qualityMetrics - Метрики качества
     * @returns {Object} Визуальное представление
     */
    getQualityIndicator(qualityMetrics) {
        const { score, K_rel, mode, stationsCount } = qualityMetrics;
        
        let emoji, title, color, description;
        
        if (mode === 'global' || score < 40) {
            emoji = '⚪';
            title = 'Расчётные данные';
            color = '#a0aec0';
            description = 'Используются только данные глобальной модели';
        } else if (score >= 80 && K_rel >= 0.7) {
            emoji = '🟢';
            title = 'Высокая точность';
            color = '#38a169';
            description = `${stationsCount} станций, K_rel = ${K_rel.toFixed(2)}`;
        } else if (score >= 60 || K_rel >= 0.4) {
            emoji = '🟡';
            title = 'Средняя точность';
            color = '#d69e2e';
            description = `${stationsCount} станций, рекомендуется перепроверить`;
        } else {
            emoji = '🟠';
            title = 'Низкая точность';
            color = '#dd6b20';
            description = 'Мало данных, высокая погрешность';
        }
        
        return {
            emoji,
            title,
            color,
            description,
            score: Math.round(score),
            K_rel: Math.round(K_rel * 100) / 100,
            level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
        };
    },

    /**
     * Экспорт данных верификации
     */
    exportVerificationData() {
        return {
            exportTime: new Date().toISOString(),
            observationsCount: this.observationsCache.length,
            observations: this.observationsCache,
            verification: this.verifyAll()
        };
    },

    /**
     * Очистка кэша наблюдений
     */
    clearCache() {
        this.observationsCache = [];
        console.log('🗑️ Кэш наблюдений очищен');
    }
};

// Экспорт для использования в браузере
if (typeof window !== 'undefined') {
    window.VerificationModule = VerificationModule;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VerificationModule;
}
