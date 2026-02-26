/**
 * MIRA - Модуль энергоэффективности (energy-model.js)
 * Расчёт энергопотребления БВС с учётом ветра, температур и других метеофакторов
 * 
 * Версия: 1.0
 * Дата: 26 февраля 2026 г.
 */

const EnergyModule = {
    // Профиль БВС по умолчанию
    defaultUAVProfile: {
        type: 'fixed-wing',           // fixed-wing | multirotor
        batteryCapacity: 39000,       // мА·ч
        batteryVoltage: 25.4,         // В (полный заряд)
        cutoffVoltage: 16.8,          // В (отсечка)
        cruiseSpeed: 69,              // км/ч
        maxFlightTime: 210,           // мин
        basePower: 120,               // Вт (бортовые системы)
        dragCoefficient: 0.185,       // коэффициент сопротивления
        weight: 8500,                 // г
        wingSpan: 2100,               // мм
        batteryCycles: 0,             // циклов заряда (для деградации)
        minReserve: 0.25              // минимальный резерв (25%)
    },

    /**
     * Получить профиль БВС
     */
    getUAVProfile() {
        const stored = localStorage.getItem('mira_uav_profile');
        if (stored) {
            try {
                return { ...this.defaultUAVProfile, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Ошибка загрузки профиля БВС:', e);
            }
        }
        return { ...this.defaultUAVProfile };
    },

    /**
     * Сохранить профиль БВС
     */
    saveUAVProfile(profile) {
        try {
            localStorage.setItem('mira_uav_profile', JSON.stringify(profile));
            Utils.log('Профиль БВС сохранён');
            return true;
        } catch (e) {
            Utils.error('Ошибка сохранения профиля БВС', e);
            return false;
        }
    },

    /**
     * Получить доступную энергию батареи с учётом деградации
     */
    getAvailableEnergy(uavProfile = null) {
        if (!uavProfile) uavProfile = this.getUAVProfile();

        // Средняя ёмкость
        const avgVoltage = (uavProfile.batteryVoltage + uavProfile.cutoffVoltage) / 2;

        // Деградация от циклов (примерно 0.2% на цикл)
        const degradationFactor = Math.max(0.6, 1 - (uavProfile.batteryCycles * 0.002));

        // Доступная энергия (номинальная)
        const nominalEnergy = avgVoltage * (uavProfile.batteryCapacity / 1000) * degradationFactor;

        return {
            total: nominalEnergy,                    // Вт·ч (полная)
            usable: nominalEnergy * 0.8,             // Вт·ч (80% DoD)
            withReserve: nominalEnergy * 0.8 * (1 - uavProfile.minReserve), // с резервом
            degradation: degradationFactor           // % текущей ёмкости
        };
    },

    /**
     * Получить плотность воздуха
     */
    getAirDensity(temp, pressure, humidity, altitude) {
        const R_d = 287.05;  // Газовая постоянная сухого воздуха
        const R_v = 461.5;   // Газовая постоянная водяного пара
        
        // Давление насыщенного пара (формула Магнуса)
        const e_s = 6.112 * Math.exp((17.67 * temp) / (temp + 243.5));
        const e = e_s * (humidity / 100);
        
        // Плотность влажного воздуха
        const rho = (pressure * 100 - 0.378 * e) / (R_d * (temp + 273.15));
        
        return rho; // кг/м³
    },

    /**
     * Температурная коррекция ёмкости батареи
     */
    getBatteryTempCorrection(temp) {
        // LiPo теряют ёмкость на холоде
        if (temp >= 20) return 1.0;
        if (temp >= 10) return 0.95;
        if (temp >= 0) return 0.85;
        if (temp >= -10) return 0.70;
        return 0.55; // < -10°C
    },

    /**
     * Получить ветровые компоненты
     */
    getWindComponents(windSpeed, windDir, routeBearing) {
        // Угол между ветром и маршрутом
        let angle = (windDir - routeBearing) * Math.PI / 180;
        
        // Нормализация угла
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        
        // Встречная/попутная составляющая
        const headwind = -windSpeed * Math.cos(angle);
        
        // Боковая составляющая
        const crosswind = windSpeed * Math.sin(angle);
        
        return {
            headwind: headwind,     // положительный = встречный, отрицательный = попутный
            crosswind: crosswind,   // положительный = справа, отрицательный = слева
            angle: angle * 180 / Math.PI,
            isHeadwind: headwind > 0,
            isCrosswind: Math.abs(crosswind) > Math.abs(headwind)
        };
    },

    /**
     * Расчёт мощности для сегмента
     */
    calculatePower(segment, meteo, uavProfile) {
        let P = uavProfile.basePower;

        // Воздушная скорость (м/с)
        // cruiseSpeed в км/ч, headwind в м/с (встречный > 0)
        // Для поддержания путевой скорости БВС должна лететь быстрее через воздух
        const V_air = uavProfile.cruiseSpeed / 3.6 + segment.headwind;

        // Аэродинамическое сопротивление
        const powerAero = uavProfile.dragCoefficient * V_air * V_air;
        P += powerAero;
        
        // Плотность воздуха
        const rho = this.getAirDensity(meteo.temp, meteo.pressure, meteo.humidity, segment.altitude);
        const rhoRatio = 1.225 / rho;
        P *= rhoRatio;
        
        // Температурная коррекция батареи
        const tempCorrection = this.getBatteryTempCorrection(meteo.temp);
        P /= tempCorrection; // Меньше ёмкость → больше ток → больше потери
        
        // Осадки и обледенение
        let precipPenalty = 1.0;
        if (meteo.precip > 0.5) precipPenalty += 0.05;
        if (meteo.precip > 2.0) precipPenalty += 0.10;
        
        if (meteo.icingRisk === 'medium') precipPenalty += 0.15;
        if (meteo.icingRisk === 'high') precipPenalty += 0.30;
        
        P *= precipPenalty;
        
        // Турбулентность
        const gustFactor = meteo.windGust / meteo.windSpeed;
        if (gustFactor > 1.5) P *= 1.10;
        else if (gustFactor > 1.2) P *= 1.05;
        
        // Набор высоты
        if (segment.climbRate && segment.climbRate > 0) {
            const climbPower = uavProfile.weight * 9.81 * segment.climbRate / 1000;
            P += climbPower;
        }
        
        return Math.max(P, 80); // Минимум 80 Вт
    },

    /**
     * Получить метео для высоты (интерполяция)
     */
    interpolateForAltitude(forecast, altitude) {
        const heights = [10, 100, 250, 350, 450, 550];
        const data = forecast.hourly && forecast.hourly.length > 0 ? forecast.hourly[0] : null;
        
        // Защита от отсутствия данных
        if (!data) {
            return {
                windSpeed: 3,
                windDirection: 0,
                windGust: 5,
                temp: 15,
                pressure: 1013,
                humidity: 60,
                precip: 0,
                icingRisk: 'none'
            };
        }

        // Находим ближайшие высоты
        let lower = heights[0];
        let upper = heights[heights.length - 1];

        for (let i = 0; i < heights.length - 1; i++) {
            if (altitude >= heights[i] && altitude <= heights[i + 1]) {
                lower = heights[i];
                upper = heights[i + 1];
                break;
            }
        }

        // Коэффициент интерполяции
        const t = (altitude - lower) / (upper - lower);

        // Базовые значения
        const wind10m = data.wind10m || 0;
        const windDirection10m = data.windDirection10m || 0;
        const temp2m = data.temp2m || 15;
        const pressure = data.pressure || 1013;
        const humidity = data.humidity || 60;
        const windGusts10m = data.windGusts10m || wind10m * 1.3;
        const precipitation = data.precipitation || 0;

        const windLower = wind10m * (1 + (lower / 500) * 0.15);
        const windUpper = wind10m * (1 + (upper / 500) * 0.15);

        const tempLower = temp2m + (-6.5 / 1000) * lower;
        const tempUpper = temp2m + (-6.5 / 1000) * upper;

        const pressureLower = pressure * Math.exp(-lower / 8500);
        const pressureUpper = pressure * Math.exp(-upper / 8500);

        const humidityLower = Math.max(0, humidity - lower / 100);
        const humidityUpper = Math.max(0, humidity - upper / 100);

        // Интерполяция
        return {
            windSpeed: windLower + (windUpper - windLower) * t,
            windDirection: windDirection10m,
            windGust: windGusts10m * (1 + (altitude / 500) * 0.15),
            temp: tempLower + (tempUpper - tempLower) * t,
            pressure: pressureLower + (pressureUpper - pressureLower) * t,
            humidity: humidityLower + (humidityUpper - humidityLower) * t,
            precip: precipitation,
            icingRisk: WeatherModule.calculateIcingRisk(
                tempLower + (tempUpper - tempLower) * t,
                humidityLower + (humidityUpper - humidityLower) * t
            )
        };
    },

    /**
     * Основной расчёт энергопотребления для маршрута туда-обратно
     */
    async calculateRoundTripEnergy(route, forecast) {
        const uavProfile = this.getUAVProfile();
        const segments = RouteModule.createSegments(route);
        
        const result = {
            outbound: {
                direction: 'туда',
                bearing: this.calculateRouteBearing(route.points),
                segments: [],
                totalEnergy: 0,
                totalTime: 0,
                totalDistance: 0
            },
            return: {
                direction: 'обратно',
                bearing: 0,
                segments: [],
                totalEnergy: 0,
                totalTime: 0,
                totalDistance: 0
            },
            summary: {
                totalDistance: 0,
                totalEnergy: 0,
                totalTime: 0,
                avgGroundSpeed: 0,
                energyReserve: 0,
                canComplete: false,
                hasReserve: false
            },
            battery: this.getAvailableEnergy(uavProfile),
            uavProfile: uavProfile
        };
        
        result.return.bearing = (result.outbound.bearing + 180) % 360;

        // Расчёт для направления "ТУДА"
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const meteo = this.interpolateForAltitude(forecast, segment.altitude || 350);

            const windComponents = this.getWindComponents(
                meteo.windSpeed,
                meteo.windDirection,
                result.outbound.bearing
            );

            // Путевая скорость (встречный ветер УМЕНЬШАЕТ, попутный УВЕЛИЧИВАЕТ)
            const groundSpeed = Math.max(15, uavProfile.cruiseSpeed - windComponents.headwind * 3.6);

            // Мощность
            const power = this.calculatePower({
                ...segment,
                headwind: windComponents.headwind,
                altitude: segment.altitude || 350
            }, meteo, uavProfile);

            // Время и энергия
            const timeHours = segment.distance / groundSpeed;
            const energy = power * timeHours;

            result.outbound.segments.push({
                segmentId: i + 1,
                distance: segment.distance,
                bearing: result.outbound.bearing,
                altitude: segment.altitude || 350,
                wind: {
                    speed: meteo.windSpeed || 0,
                    direction: meteo.windDirection || 0,
                    headwind: windComponents.headwind || 0,
                    crosswind: windComponents.crosswind || 0,
                    isHeadwind: windComponents.isHeadwind,
                    isCrosswind: windComponents.isCrosswind
                },
                groundSpeed: groundSpeed,
                airSpeed: uavProfile.cruiseSpeed / 3.6 + (windComponents.headwind || 0),  // м/с
                power: power,
                time: timeHours * 60, // мин
                energy: energy,
                meteo: {
                    temp: meteo.temp || 15,
                    pressure: meteo.pressure || 1013,
                    humidity: meteo.humidity || 60,
                    density: this.getAirDensity(meteo.temp || 15, meteo.pressure || 1013, meteo.humidity || 60, segment.altitude || 350),
                    precip: meteo.precip || 0,
                    icingRisk: meteo.icingRisk || 'none'
                }
            });

            result.outbound.totalEnergy += energy;
            result.outbound.totalTime += timeHours * 60;
            result.outbound.totalDistance += segment.distance;
        }
        
        // Расчёт для направления "ОБРАТНО" (разворот на 180°)
        const reversedSegments = [...result.outbound.segments].reverse();

        for (const seg of reversedSegments) {
            const returnBearing = (seg.bearing + 180) % 360;

            const windComponents = this.getWindComponents(
                seg.wind.speed || 0,
                seg.wind.direction || 0,
                returnBearing
            );

            // Путевая скорость для обратного пути
            const groundSpeed = Math.max(15, uavProfile.cruiseSpeed - windComponents.headwind * 3.6);
            const timeHours = seg.distance / groundSpeed;

            // Пересчёт мощности для нового направления ветра
            const power = this.calculatePower({
                distance: seg.distance,
                headwind: windComponents.headwind,
                altitude: seg.altitude || 350
            }, {
                temp: seg.meteo.temp || 15,
                pressure: seg.meteo.pressure || 1013,
                humidity: seg.meteo.humidity || 60,
                precip: seg.meteo.precip || 0,
                icingRisk: seg.meteo.icingRisk || 'none'
            }, uavProfile);

            const energy = power * timeHours;

            result.return.segments.push({
                ...seg,
                bearing: returnBearing,
                wind: {
                    ...seg.wind,
                    headwind: windComponents.headwind,
                    crosswind: -seg.wind.crosswind,
                    isHeadwind: windComponents.isHeadwind,
                    isCrosswind: windComponents.isCrosswind
                },
                groundSpeed: groundSpeed,
                time: timeHours * 60,
                energy: energy,
                power: power
            });

            result.return.totalEnergy += energy;
            result.return.totalTime += timeHours * 60;
            result.return.totalDistance += seg.distance;
        }
        
        // Сводный результат
        result.summary.totalDistance = result.outbound.totalDistance + result.return.totalDistance;
        result.summary.totalEnergy = result.outbound.totalEnergy + result.return.totalEnergy;
        result.summary.totalTime = result.outbound.totalTime + result.return.totalTime;
        result.summary.avgGroundSpeed = result.summary.totalDistance / (result.summary.totalTime / 60);
        
        // Остаток энергии
        result.summary.energyReserve = (result.battery.usable - result.summary.totalEnergy) / 
                                        result.battery.usable * 100;
        result.summary.canComplete = result.summary.totalEnergy <= result.battery.usable;
        result.summary.withReserve = result.summary.totalEnergy * (1 + uavProfile.minReserve);
        result.summary.hasReserve = result.summary.withReserve <= result.battery.usable;
        
        // Статус
        result.summary.status = this.getEnergyStatus(result.summary);
        
        return result;
    },

    /**
     * Расчёт среднего азимута маршрута
     */
    calculateRouteBearing(points) {
        if (!points || points.length < 2) return 0;
        
        const first = points[0];
        const last = points[points.length - 1];
        
        const dLon = (last.lon - first.lon) * Math.PI / 180;
        const lat1 = first.lat * Math.PI / 180;
        const lat2 = last.lat * Math.PI / 180;
        
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - 
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    },

    /**
     * Определение статуса по энергии
     */
    getEnergyStatus(summary) {
        if (!summary.canComplete) {
            return {
                level: 'forbidden',
                label: 'НЕДОСТАТОЧНО ЭНЕРГИИ',
                color: '#e53e3e',
                icon: 'fa-battery-empty',
                message: 'Энергии недостаточно для завершения маршрута'
            };
        }
        
        if (!summary.hasReserve) {
            return {
                level: 'restricted',
                label: 'МАЛЫЙ РЕЗЕРВ',
                color: '#ed8936',
                icon: 'fa-battery-half',
                message: `Резерв ${summary.energyReserve.toFixed(0)}% меньше требуемого`
            };
        }
        
        if (summary.energyReserve < 40) {
            return {
                level: 'caution',
                label: 'СРЕДНИЙ РЕЗЕРВ',
                color: '#d69e2e',
                icon: 'fa-battery-three-quarters',
                message: 'Рекомендуется сократить маршрут'
            };
        }
        
        return {
            level: 'allowed',
            label: 'ПОЛЁТ РАЗРЕШЁН',
            color: '#38a169',
            icon: 'fa-battery-full',
            message: 'Достаточно энергии с запасом'
        };
    },

    /**
     * Генерация рекомендаций по энергоэффективности
     */
    generateRecommendations(energyResult) {
        const recommendations = [];
        const summary = energyResult.summary;
        const outbound = energyResult.outbound;
        const return_ = energyResult.return;
        
        // 1. Рекомендации по направлению
        if (outbound.totalEnergy > return_.totalEnergy * 1.3) {
            recommendations.push({
                type: 'direction',
                level: 'info',
                title: 'Встречный ветер на пути "туда"',
                message: `На пути "туда" расход на ${((outbound.totalEnergy / return_.totalEnergy - 1) * 100).toFixed(0)}% больше. Рассмотрите вылет в обратном направлении.`,
                icon: 'fa-wind'
            });
        }
        
        // 2. Рекомендации по высоте
        const highWindSegments = outbound.segments.filter(s => 
            Math.abs(s.wind.headwind) > 8
        );
        
        if (highWindSegments.length > outbound.segments.length * 0.5) {
            recommendations.push({
                type: 'altitude',
                level: 'warning',
                title: 'Сильный ветер на крейсерской высоте',
                message: 'Рассмотрите полёт на другой высоте, где ветер слабее',
                icon: 'fa-arrow-up'
            });
        }
        
        // 3. Рекомендации по времени
        recommendations.push({
            type: 'time',
            level: 'info',
            title: 'Оптимальное время вылета',
            message: 'Раннее утро или вечер — ветер обычно слабее',
            icon: 'fa-clock'
        });
        
        // 4. Температурные рекомендации
        const avgTemp = outbound.segments.reduce((sum, s) => sum + s.meteo.temp, 0) / 
                       outbound.segments.length;
        
        if (avgTemp < 5) {
            recommendations.push({
                type: 'temperature',
                level: 'warning',
                title: 'Низкая температура',
                message: `Средняя температура ${avgTemp.toFixed(0)}°C. Ёмкость батареи снижена на ${((1 - this.getBatteryTempCorrection(avgTemp)) * 100).toFixed(0)}%`,
                icon: 'fa-thermometer-quarter'
            });
        }
        
        // 5. Резерв
        if (!summary.hasReserve) {
            recommendations.push({
                type: 'reserve',
                level: 'critical',
                title: 'Недостаточный резерв',
                message: `Требуется минимум ${(energyResult.uavProfile.minReserve * 100).toFixed(0)}% резерва. Сократите маршрут.`,
                icon: 'fa-exclamation-triangle'
            });
        }
        
        return recommendations;
    },

    /**
     * Оптимизация высоты для каждого сегмента
     */
    optimizeAltitude(route, forecast, altitudes = [250, 350, 450, 550]) {
        const uavProfile = this.getUAVProfile();
        const segments = RouteModule.createSegments(route);
        const optimalSegments = [];

        for (const segment of segments) {
            let bestAltitude = altitudes[0];
            let bestEnergy = Infinity;

            for (const alt of altitudes) {
                const meteo = this.interpolateForAltitude(forecast, alt);
                const windComponents = this.getWindComponents(
                    meteo.windSpeed,
                    meteo.windDirection,
                    this.calculateRouteBearing(route.points)
                );

                const groundSpeed = Math.max(15, uavProfile.cruiseSpeed - windComponents.headwind * 3.6);
                const power = this.calculatePower({
                    ...segment,
                    headwind: windComponents.headwind,
                    altitude: alt
                }, meteo, uavProfile);

                const timeHours = segment.distance / groundSpeed;
                const energy = power * timeHours;

                if (energy < bestEnergy) {
                    bestEnergy = energy;
                    bestAltitude = alt;
                }
            }

            optimalSegments.push({
                segment: segment,
                optimalAltitude: bestAltitude,
                energy: bestEnergy
            });
        }

        return optimalSegments;
    },

    /**
     * Расчёт дополнительного расстояния с учётом возврата (туда-обратно)
     * Показывает, сколько ещё можно пролететь км от текущей точки маршрута
     * с обязательным возвратом к точке старта
     */
    async calculateAdditionalRange(route, forecast) {
        const uavProfile = this.getUAVProfile();
        const battery = this.getAvailableEnergy(uavProfile);

        // Сначала считаем энергию для основного маршрута туда-обратно
        const mainTripEnergy = await this.calculateRoundTripEnergy(route, forecast);
        const mainEnergyUsed = mainTripEnergy.summary.totalEnergy;

        // Доступная энергия с резервом
        const usableEnergy = battery.withReserve;

        // Оставшаяся энергия после основного маршрута
        const remainingEnergy = usableEnergy - mainEnergyUsed;

        console.log('🔋 Расчет дополнительного расстояния:', {
            batteryTotal: battery.total.toFixed(0) + ' Вт·ч',
            batteryUsable: battery.usable.toFixed(0) + ' Вт·ч',
            batteryWithReserve: battery.withReserve.toFixed(0) + ' Вт·ч',
            mainEnergyUsed: mainEnergyUsed.toFixed(0) + ' Вт·ч',
            remainingEnergy: remainingEnergy.toFixed(0) + ' Вт·ч'
        });

        // Если энергии нет или она отрицательная — дополнительный полёт невозможен
        if (remainingEnergy <= 0) {
            console.log('⚠️ Нет резерва для дополнительного полёта');
            return {
                canExtend: false,
                additionalDistance: 0,
                additionalFlightTime: 0,
                energyRemaining: 0,
                status: {
                    level: 'forbidden',
                    label: 'НЕТ РЕЗЕРВА',
                    color: '#e53e3e',
                    icon: 'fa-battery-empty',
                    message: 'Энергия полностью расходуется на основной маршрут'
                },
                mainRouteEnergy: mainEnergyUsed,
                batteryTotal: battery.total,
                batteryUsable: battery.usable,
                batteryWithReserve: battery.withReserve
            };
        }

        // Средняя путевая скорость и мощность основного маршрута
        const avgGroundSpeed = mainTripEnergy.summary.avgGroundSpeed;
        const avgPower = mainEnergyUsed / (mainTripEnergy.summary.totalTime / 60);

        // Время полёта на оставшейся энергии (туда-обратно, значит делим пополам)
        const additionalTimeHours = remainingEnergy / avgPower;
        const additionalTimeOneWay = additionalTimeHours / 2;

        // Дополнительное расстояние (только в одну сторону от конечной точки)
        const additionalDistance = avgGroundSpeed * additionalTimeOneWay;

        // Общее время дополнительного полёта
        const additionalFlightTime = additionalTimeOneWay * 60 * 2;

        // Процент дополнительного расстояния от основного
        const mainDistance = mainTripEnergy.outbound.totalDistance;
        const additionalPercent = (additionalDistance / mainDistance) * 100;

        // Статус
        let status;
        if (additionalDistance < 1) {
            status = {
                level: 'caution',
                label: 'МИНИМАЛЬНЫЙ РЕЗЕРВ',
                color: '#d69e2e',
                icon: 'fa-battery-quarter',
                message: 'Резерва хватит менее чем на 1 км'
            };
        } else if (additionalPercent < 20) {
            status = {
                level: 'info',
                label: 'МАЛЫЙ РЕЗЕРВ',
                color: '#4299e1',
                icon: 'fa-battery-half',
                message: `Резерв: +${additionalDistance.toFixed(1)} км`
            };
        } else if (additionalPercent < 50) {
            status = {
                level: 'success',
                label: 'СРЕДНИЙ РЕЗЕРВ',
                color: '#48bb78',
                icon: 'fa-battery-three-quarters',
                message: `Резерв: +${additionalDistance.toFixed(1)} км (${additionalPercent.toFixed(0)}%)`
            };
        } else {
            status = {
                level: 'excellent',
                label: 'БОЛЬШОЙ РЕЗЕРВ',
                color: '#38a169',
                icon: 'fa-battery-full',
                message: `Резерв: +${additionalDistance.toFixed(1)} км (${additionalPercent.toFixed(0)}%)`
            };
        }

        return {
            canExtend: true,
            additionalDistance: additionalDistance,
            additionalFlightTime: additionalFlightTime,
            additionalTimeOneWay: additionalTimeOneWay * 60,
            energyRemaining: remainingEnergy,
            energyPercent: (remainingEnergy / usableEnergy) * 100,
            additionalPercent: additionalPercent,
            status: status,
            mainRouteEnergy: mainEnergyUsed,
            mainRouteDistance: mainDistance,
            batteryTotal: battery.total,
            batteryUsable: battery.usable,
            batteryWithReserve: battery.withReserve,
            avgPower: avgPower,
            avgGroundSpeed: avgGroundSpeed
        };
    },

    /**
     * Расчет максимального радиуса полёта от точки старта (туда-обратно)
     * Показывает максимальное расстояние, на которое можно улететь и вернуться
     */
    async calculateMaxRange(forecast, bearing = 0) {
        const uavProfile = this.getUAVProfile();
        const battery = this.getAvailableEnergy(uavProfile);
        const usableEnergy = battery.withReserve;

        // Средние метеоусловия
        const meteo = this.interpolateForAltitude(forecast, 350);
        const windComponents = this.getWindComponents(
            meteo.windSpeed,
            meteo.windDirection,
            bearing
        );

        // Путевая скорость туда и обратно
        const groundSpeedOut = Math.max(15, uavProfile.cruiseSpeed - windComponents.headwind * 3.6);
        const groundSpeedBack = Math.max(15, uavProfile.cruiseSpeed + windComponents.headwind * 3.6);

        // Мощность с учётом ветра
        const powerOut = this.calculatePower({
            distance: 1,
            headwind: windComponents.headwind,
            altitude: 350
        }, meteo, uavProfile);

        const powerBack = this.calculatePower({
            distance: 1,
            headwind: -windComponents.headwind,
            altitude: 350
        }, meteo, uavProfile);

        // Энергия на 1 км туда-обратно
        const energyPerKmOut = powerOut / groundSpeedOut;
        const energyPerKmBack = powerBack / groundSpeedBack;
        const energyPerKmRound = energyPerKmOut + energyPerKmBack;

        // Максимальный радиус
        const maxRadius = usableEnergy / energyPerKmRound;

        // Время полёта
        const timeOut = maxRadius / groundSpeedOut * 60;
        const timeBack = maxRadius / groundSpeedBack * 60;
        const totalTime = timeOut + timeBack;

        return {
            maxRadius: maxRadius,
            maxDistance: maxRadius * 2,
            totalTime: totalTime,
            timeOut: timeOut,
            timeBack: timeBack,
            energyPerKm: energyPerKmRound,
            windEffect: {
                headwind: windComponents.headwind,
                groundSpeedOut: groundSpeedOut,
                groundSpeedBack: groundSpeedBack,
                isFavorable: windComponents.headwind < 0
            },
            meteo: meteo,
            battery: battery
        };
    }
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnergyModule;
}

console.log('✅ EnergyModule загружен');
