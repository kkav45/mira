/**
 * MIRA - Расширенная система коррекции метеоданных
 * Поддержка множественных наблюдений по времени и координатам
 */

const PilotObservationsModule = {
    /**
     * Добавить наблюдение
     */
    add(observation) {
        if (!WizardModule.stepData.pilotObservations) {
            WizardModule.stepData.pilotObservations = [];
        }

        observation.id = Date.now();
        observation.createdAt = new Date().toISOString();

        WizardModule.stepData.pilotObservations.push(observation);
        this.save();

        console.log('✅ Наблюдение добавлено:', observation);

        // 🤖 АВТОМАТИЧЕСКИ: Сохранить для ML
        this.saveForML(observation);

        // 🔄 Обновляем состояние кнопки ДАШБОРД
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.updateButtonState();
        }

        return observation;
    },

    /**
     * Сохранение для ML (НОВОЕ)
     */
    async saveForML(observation) {
        if (typeof MLAccuracyModule === 'undefined') {
            console.log('⚠️ MLAccuracyModule не загружен');
            return;
        }

        if (!WizardModule.stepData.segmentAnalysis || WizardModule.stepData.segmentAnalysis.length === 0) {
            console.log('⚠️ Нет данных прогноза для ML');
            return;
        }

        // Получаем прогноз для той же точки
        const forecast = WizardModule.stepData.segmentAnalysis[0]?.analyzed?.hourly?.[0];
        
        if (!forecast) {
            console.log('⚠️ Нет прогноза для сравнения');
            return;
        }

        const lat = observation.coords?.lat || WizardModule.stepData.route?.points?.[0]?.lat;
        const lon = observation.coords?.lon || WizardModule.stepData.route?.points?.[0]?.lon;

        console.log('🤖 ML: Сравнение прогноза с фактом...', {lat, lon});

        // 🌬️ Ветер
        if (observation.windSpeed && forecast.wind10m) {
            MLAccuracyModule.addObservation(
                'open-meteo',
                'wind',
                forecast.wind10m,
                observation.windSpeed,
                lat,
                lon
            );
        }

        // 🌡️ Температура
        if (observation.temp !== null && forecast.temp2m) {
            MLAccuracyModule.addObservation(
                'open-meteo',
                'temp',
                forecast.temp2m,
                observation.temp,
                lat,
                lon
            );
        }

        // 💧 Влажность
        if (observation.humidity && forecast.humidity) {
            MLAccuracyModule.addObservation(
                'open-meteo',
                'humidity',
                forecast.humidity,
                observation.humidity,
                lat,
                lon
            );
        }

        // Обновляем UI точности если открыта вкладка
        if (typeof WizardModule !== 'undefined' && WizardModule.currentVizTab === 'stats') {
            WizardModule.renderVizContent();
        }

        console.log('✅ ML: Данные сохранены');
    },

    /**
     * Удалить наблюдение по индексу
     */
    remove(index) {
        if (index >= 0 && index < WizardModule.stepData.pilotObservations.length) {
            WizardModule.stepData.pilotObservations.splice(index, 1);
            this.save();
            console.log('🗑️ Наблюдение удалено');
        }
    },

    /**
     * Очистить все наблюдения
     */
    clear() {
        WizardModule.stepData.pilotObservations = [];
        WizardModule.stepData.correctedAnalysis = null;
        this.save();
        console.log('🗑️ Все наблюдения очищены');
    },

    /**
     * Получить все наблюдения
     */
    getAll() {
        return WizardModule.stepData.pilotObservations || [];
    },

    /**
     * Получить наблюдения типа "ground" (Сидя на земле)
     */
    getGroundObservations() {
        const all = this.getAll();
        return all.filter(obs => obs.type === 'ground');
    },

    /**
     * Получить наблюдения типа "flight" (В полёте)
     */
    getFlightObservations() {
        const all = this.getAll();
        return all.filter(obs => obs.type === 'flight');
    },

    /**
     * Сохранить в localStorage
     */
    save() {
        try {
            localStorage.setItem('mira_pilot_observations', JSON.stringify({
                observations: WizardModule.stepData.pilotObservations,
                savedAt: new Date().toISOString()
            }));
        } catch (e) {
            console.error('Ошибка сохранения наблюдений:', e);
        }
    },

    /**
     * Загрузить из localStorage
     */
    load() {
        try {
            const data = localStorage.getItem('mira_pilot_observations');
            if (data) {
                const parsed = JSON.parse(data);
                WizardModule.stepData.pilotObservations = parsed.observations || [];
                console.log('📥 Загружено наблюдений:', WizardModule.stepData.pilotObservations.length);
            }
        } catch (e) {
            console.error('Ошибка загрузки наблюдений:', e);
        }
    },

    /**
     * Применить коррекцию по всем наблюдениям
     */
    applyCorrection(analyzedData) {
        const observations = this.getAll();

        if (observations.length === 0 || !analyzedData) {
            return analyzedData;
        }

        console.log('🔧 Применение коррекции по', observations.length, 'наблюдению(ям)');

        // Сортируем наблюдения по времени
        const sorted = [...observations].sort((a, b) =>
            new Date(a.time) - new Date(b.time)
        );

        // Получаем пороги для пересчёта рисков
        const thresholds = typeof Storage !== 'undefined' ? Storage.getThresholds() : {
            windGround: 10,
            windAlt: 15,
            visibility: 5,
            precip: 1.4,
            humidityIcing: 80
        };

        // Применяем коррекцию для каждого часа прогноза
        const corrected = JSON.parse(JSON.stringify(analyzedData));

        // Собираем критические флаги из наблюдений
        const hasFogInObservations = sorted.some(obs => obs.fog);
        const hasPrecipInObservations = sorted.some(obs => obs.precip);
        const hasSnowInObservations = sorted.some(obs => obs.snow);
        const minVisibilityFromObservations = Math.min(...sorted.filter(obs => obs.visibility).map(obs => obs.visibility), 10);

        corrected.hourly = corrected.hourly.map((hour, hourIndex) => {
            const hourTime = new Date(hour.time);

            // Находим ближайшие наблюдения
            const weights = sorted.map(obs => {
                const obsTime = new Date(obs.time);
                const diffHours = Math.abs((hourTime - obsTime) / (1000 * 60 * 60));

                // Вес уменьшается с расстоянием по времени
                const timeWeight = Math.exp(-diffHours / 12);

                return {
                    obs,
                    weight: timeWeight
                };
            });

            // Суммарный вес
            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

            if (totalWeight === 0) {
                return hour;
            }

            // Применяем взвешенную коррекцию
            let correctedHour = { ...hour };

            // Ветер
            const windCorrections = weights.filter(w => w.obs.windSpeed && hour.wind10m > 0);
            if (windCorrections.length > 0) {
                const weightedBias = windCorrections.reduce((sum, w) =>
                    sum + (w.obs.windSpeed / hour.wind10m - 1) * w.weight, 0
                ) / totalWeight;

                correctedHour.wind10m = hour.wind10m * (1 + weightedBias);
            }

            // Температура
            const tempCorrections = weights.filter(w => w.obs.temp !== null);
            if (tempCorrections.length > 0) {
                const weightedOffset = tempCorrections.reduce((sum, w) =>
                    sum + (w.obs.temp - hour.temp2m) * w.weight, 0
                ) / totalWeight;

                correctedHour.temp2m = hour.temp2m + weightedOffset;
            }

            // Влажность
            const humidityCorrections = weights.filter(w => w.obs.humidity);
            if (humidityCorrections.length > 0) {
                const weightedOffset = humidityCorrections.reduce((sum, w) =>
                    sum + (w.obs.humidity - hour.humidity) * w.weight, 0
                ) / totalWeight;

                correctedHour.humidity = Math.max(0, Math.min(100, hour.humidity + weightedOffset));
            }

            // === КРИТИЧЕСКИЕ ПОПРАВКИ ОТ ПИЛОТА ===

            // Видимость (туман)
            if (hasFogInObservations) {
                correctedHour.visibility = Math.min(0.5, minVisibilityFromObservations);
            } else if (sorted.some(obs => obs.visibility && obs.visibility < 5)) {
                correctedHour.visibility = Math.min(correctedHour.visibility, minVisibilityFromObservations);
            }

            // Осадки
            if (hasPrecipInObservations || hasSnowInObservations) {
                correctedHour.precip = Math.max(correctedHour.precip, 0.5);
                if (hasSnowInObservations && correctedHour.temp2m <= 0) {
                    correctedHour.snow = Math.max(correctedHour.snow || 0, 0.5);
                }
            }

            // === ПЕРЕСЧЁТ РИСКОВ ===
            
            // Риск-скор (общий)
            let riskScore = 0;

            // Ветер
            if (correctedHour.wind10m > thresholds.windGround) riskScore += 2;
            else if (correctedHour.wind10m > thresholds.windGround * 0.8) riskScore += 1;

            // Видимость
            if (correctedHour.visibility < thresholds.visibility) riskScore += 2;
            else if (correctedHour.visibility < thresholds.visibility * 1.5) riskScore += 1;

            // Осадки
            if (correctedHour.precip > thresholds.precip) riskScore += 2;
            else if (correctedHour.precip > 0.5) riskScore += 1;

            // Обледенение (пересчитываем с новой температурой и влажностью)
            const icingRisk = this.calculateIcingRisk(correctedHour.temp2m, correctedHour.humidity, thresholds);
            correctedHour.icingRisk = icingRisk;
            if (icingRisk === 'high') riskScore += 2;
            else if (icingRisk === 'medium') riskScore += 1;

            // Турбулентность
            correctedHour.turbulenceRisk = this.calculateTurbulenceRisk(correctedHour.wind10m, correctedHour.windGust || correctedHour.wind10m * 1.3);
            if (correctedHour.turbulenceRisk === 'high') riskScore += 2;
            else if (correctedHour.turbulenceRisk === 'medium') riskScore += 1;

            correctedHour.riskScore = riskScore;

            // Уровень риска
            if (riskScore >= 5) correctedHour.risk = 'high';
            else if (riskScore >= 2) correctedHour.risk = 'medium';
            else correctedHour.risk = 'low';

            return correctedHour;
        });

        // === ПЕРЕСЧЁТ SUMMARY ===
        corrected.summary = this.recalculateSummary(corrected.hourly, thresholds);

        corrected.corrected = true;
        corrected.observationCount = observations.length;
        corrected.corrections = {
            method: 'multi-point weighted',
            observations: observations.length,
            criticalFlags: {
                fog: hasFogInObservations,
                precip: hasPrecipInObservations,
                snow: hasSnowInObservations
            }
        };

        console.log('✅ Коррекция применена. Пересчитаны риски.');
        console.log('📊 Новый overallRisk:', corrected.summary.overallRisk);
        return corrected;
    },

    /**
     * Расчёт риска обледенения
     */
    calculateIcingRisk(temp, humidity, thresholds) {
        if (temp <= 5 && temp >= -10 && humidity > thresholds.humidityIcing) {
            if (temp <= 0 && temp >= -5) return 'high';
            return 'medium';
        }
        return 'low';
    },

    /**
     * Расчёт риска турбулентности
     */
    calculateTurbulenceRisk(windSpeed, windGust) {
        const gustFactor = windSpeed > 0 ? windGust / windSpeed : 1;

        if (gustFactor > 1.5 || windSpeed > 15) return 'high';
        if (gustFactor > 1.2 || windSpeed > 10) return 'medium';
        return 'low';
    },

    /**
     * Пересчёт сводки после коррекции
     */
    recalculateSummary(hourly, thresholds) {
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

        // Добавляем последнее окно
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
     * Экспорт наблюдений в JSON
     */
    export() {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            count: this.getAll().length,
            observations: this.getAll()
        }, null, 2);
    },

    /**
     * Импорт наблюдений из JSON
     */
    import(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.observations && Array.isArray(data.observations)) {
                WizardModule.stepData.pilotObservations = data.observations;
                this.save();
                console.log('📥 Импортировано наблюдений:', data.observations.length);
                return true;
            }
        } catch (e) {
            console.error('Ошибка импорта наблюдений:', e);
        }
        return false;
    }
};

// Добавляем в глобальную область
window.PilotObservationsModule = PilotObservationsModule;

console.log('✅ PilotObservationsModule загружен');
