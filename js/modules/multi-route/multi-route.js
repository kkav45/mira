/**
 * MIRA - Multi-Route Module
 * Управление несколькими маршрутами и точками взлёта
 * Версия: 0.3.0
 */

const MultiRouteModule = {
    /**
     * Точки взлёта (базы)
     */
    takeoffPoints: [],

    /**
     * Загруженные маршруты
     */
    routes: [],

    /**
     * Оптимизированное распределение
     */
    assignment: null,

    /**
     * Инициализация модуля
     */
    init() {
        this.takeoffPoints = [];
        this.routes = [];
        this.assignment = null;
        console.log('✅ MultiRouteModule инициализирован');
    },

    /**
     * Добавить точку взлёта
     */
    addTakeoffPoint(point) {
        const takeoffPoint = {
            id: 'base-' + Date.now(),
            name: point.name || `База ${this.takeoffPoints.length + 1}`,
            lat: point.lat,
            lon: point.lon,
            priority: point.priority || this.takeoffPoints.length + 1,
            battery: {
                voltage: point.voltage || 25.4,
                capacity: point.capacity || 39000,
                minVoltage: point.minVoltage || 19.8
            },
            antenna: point.antenna || 60,  // км
            weatherWindow: null
        };

        this.takeoffPoints.push(takeoffPoint);
        console.log('✅ Добавлена точка взлёта:', takeoffPoint.name);
        return takeoffPoint;
    },

    /**
     * Удалить точку взлёта
     */
    removeTakeoffPoint(id) {
        this.takeoffPoints = this.takeoffPoints.filter(p => p.id !== id);
        console.log('❌ Удалена точка взлёта:', id);
    },

    /**
     * Добавить маршрут
     */
    addRoute(route) {
        const newRoute = {
            id: route.id || 'route-' + Date.now(),
            name: route.name || `Маршрут ${this.routes.length + 1}`,
            segments: route.segments || [],
            totalDistance: route.totalDistance || 0,
            status: 'pending',  // pending | full | partial | skipped
            entryPoint: null,
            flightPlan: null,
            assignedBase: null
        };

        this.routes.push(newRoute);
        console.log('✅ Добавлен маршрут:', newRoute.name);
        return newRoute;
    },

    /**
     * Удалить маршрут
     */
    removeRoute(id) {
        this.routes = this.routes.filter(r => r.id !== id);
        console.log('❌ Удалён маршрут:', id);
    },

    /**
     * Найти ближайшую точку маршрута к точке взлёта
     */
    findNearestEntryPoint(route, takeoffPoint) {
        if (!route.segments || route.segments.length === 0) {
            return null;
        }

        let nearestPoint = null;
        let minDistance = Infinity;

        route.segments.forEach((segment, index) => {
            const distance = this.calculateDistance(
                takeoffPoint,
                { lat: segment.lat, lon: segment.lon }
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = {
                    segmentId: index + 1,
                    lat: segment.lat,
                    lon: segment.lon,
                    distance: Math.round(distance * 10) / 10
                };
            }
        });

        return nearestPoint;
    },

    /**
     * Расчёт расстояния между двумя точками (Haversine)
     */
    calculateDistance(point1, point2) {
        const R = 6371; // Радиус Земли, км
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLon = this.toRad(point2.lon - point1.lon);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.lat)) *
            Math.cos(this.toRad(point2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Конвертация в радианы
     */
    toRad(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Расчёт плана полёта для маршрута от точки входа
     */
    calculateFlightPlan(route, entryPoint, takeoffPoint) {
        if (!entryPoint || !route.segments) return null;

        const entryIndex = entryPoint.segmentId - 1;
        const segments = route.segments;

        // Расчёт левой стороны (от точки входа к началу)
        let leftDistance = 0;
        for (let i = entryIndex; i > 0; i--) {
            leftDistance += segments[i].distance || 5;
        }

        // Расчёт правой стороны (от точки входа к концу)
        let rightDistance = 0;
        for (let i = entryIndex; i < segments.length; i++) {
            rightDistance += segments[i].distance || 5;
        }

        // Общее расстояние по маршруту (туда + обратно + возврат в точку входа)
        const totalRouteDistance = leftDistance + rightDistance;

        // Расчёт энергии (упрощённо: 8 Вт·ч на км)
        const energyPerKm = 8;
        const totalEnergy = Math.round(totalRouteDistance * energyPerKm);

        // Время полёта (при средней скорости 50 км/ч)
        const avgSpeed = 50;
        const totalTime = Math.round((totalRouteDistance / avgSpeed) * 60);

        return {
            entryPoint: entryPoint,
            leftSide: {
                direction: `С${entryIndex + 1} → С1`,
                distance: Math.round(leftDistance * 10) / 10,
                energy: Math.round(leftDistance * energyPerKm)
            },
            rightSide: {
                direction: `С${entryIndex + 1} → С${segments.length}`,
                distance: Math.round(rightDistance * 10) / 10,
                energy: Math.round(rightDistance * energyPerKm)
            },
            total: {
                distance: Math.round(totalRouteDistance * 10) / 10,
                energy: totalEnergy,
                time: totalTime
            }
        };
    },

    /**
     * Проверка диапазона антенны
     */
    checkAntennaRange(route, takeoffPoint, maxRange = 60) {
        if (!route.segments) return false;

        for (const segment of route.segments) {
            const distance = this.calculateDistance(
                takeoffPoint,
                { lat: segment.lat, lon: segment.lon }
            );

            if (distance > maxRange) {
                return false;
            }
        }

        return true;
    },

    /**
     * Проверка энергетического бюджета
     */
    checkEnergyBudget(route, battery, flightPlan) {
        if (!flightPlan) return false;

        // Доступная энергия батареи
        const avgVoltage = (battery.voltage + battery.minVoltage) / 2;
        const availableEnergy = avgVoltage * (battery.capacity / 1000) * 0.8;  // 80% DoD

        // Требуемая энергия
        const requiredEnergy = flightPlan.total.energy;

        return requiredEnergy <= availableEnergy * 0.9;  // 90% от доступной
    },

    /**
     * Оптимизация распределения маршрутов по базам
     */
    optimizeAssignment(weatherData) {
        console.log('🔍 Оптимизация распределения маршрутов...');

        const assignment = [];

        // Для каждой базы рассчитать доступные маршруты
        for (const base of this.takeoffPoints) {
            // Анализ погоды для базы
            base.weatherWindow = this.analyzeWeatherForBase(base, weatherData);

            // Найти доступные маршруты
            const reachableRoutes = this.findReachableRoutes(base, weatherData);

            // Сортировка по приоритету
            const sortedRoutes = this.sortRoutesByPriority(
                reachableRoutes,
                base
            );

            assignment.push({
                base: base,
                routes: sortedRoutes,
                totalDistance: sortedRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.distance || 0),
                    0
                ),
                totalEnergy: sortedRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.energy || 0),
                    0
                )
            });
        }

        // Глобальная оптимизация (исключение дублирования)
        this.assignment = this.optimizeGlobalAssignment(assignment);

        console.log('✅ Оптимизация завершена');
        return this.assignment;
    },

    /**
     * Анализ погоды для базы
     */
    analyzeWeatherForBase(base, weatherData) {
        if (!weatherData || !weatherData.hourly) {
            return {
                start: '—',
                end: '—',
                duration: 0,
                avgWind: 0,
                precip: 0,
                status: 'unknown'
            };
        }

        // Упрощённый анализ: найти лучшее окно
        const hourly = weatherData.hourly;
        let bestWindow = null;
        let currentWindow = null;

        for (let i = 0; i < hourly.length; i++) {
            const hour = hourly[i];
            const isGood = hour.wind10m < 10 && hour.precip < 0.5;

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
                if (currentWindow && currentWindow.hours.length >= 2) {
                    if (!bestWindow || currentWindow.hours.length > bestWindow.hours.length) {
                        bestWindow = currentWindow;
                    }
                }
                currentWindow = null;
            }
        }

        if (!bestWindow && currentWindow && currentWindow.hours.length >= 2) {
            bestWindow = currentWindow;
        }

        if (bestWindow) {
            const startTime = new Date(bestWindow.start);
            const endTime = new Date(bestWindow.end);
            const duration = (endTime - startTime) / 1000 / 60;  // минут
            const avgWind = bestWindow.hours.reduce(
                (sum, h) => sum + h.wind10m, 0
            ) / bestWindow.hours.length;

            return {
                start: startTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                end: endTime.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                duration: Math.round(duration),
                avgWind: Math.round(avgWind * 10) / 10,
                precip: 0,
                status: 'good'
            };
        }

        return {
            start: '—',
            end: '—',
            duration: 0,
            avgWind: 0,
            precip: 0,
            status: 'poor'
        };
    },

    /**
     * Найти доступные маршруты для базы
     */
    findReachableRoutes(base, weatherData) {
        const reachable = [];

        for (const route of this.routes) {
            // Найти ближайшую точку входа
            const entryPoint = this.findNearestEntryPoint(route, base);

            if (!entryPoint) continue;

            // Проверка антенны
            const antennaCheck = this.checkAntennaRange(
                route,
                base,
                base.antenna
            );

            if (!antennaCheck) continue;

            // Расчёт плана полёта
            const flightPlan = this.calculateFlightPlan(
                route,
                entryPoint,
                base
            );

            // Проверка энергии
            const energyCheck = this.checkEnergyBudget(
                route,
                base.battery,
                flightPlan
            );

            if (!energyCheck) continue;

            // Добавить в список доступных
            reachable.push({
                ...route,
                entryPoint: entryPoint,
                flightPlan: flightPlan,
                assignedBase: base.id,
                distanceFromBase: entryPoint.distance
            });
        }

        return reachable;
    },

    /**
     * Сортировка маршрутов по приоритету
     */
    sortRoutesByPriority(routes, base) {
        return routes.sort((a, b) => {
            // Приоритет: ближайшие сначала
            if (a.distanceFromBase !== b.distanceFromBase) {
                return a.distanceFromBase - b.distanceFromBase;
            }

            // Затем: меньшие маршруты сначала
            return (
                a.flightPlan?.total?.distance || 0 -
                b.flightPlan?.total?.distance || 0
            );
        });
    },

    /**
     * Глобальная оптимизация распределения
     */
    optimizeGlobalAssignment(assignment) {
        const assignedRoutes = new Set();
        const optimized = [];

        for (const baseAssignment of assignment) {
            const uniqueRoutes = baseAssignment.routes.filter(
                route => !assignedRoutes.has(route.id)
            );

            // Пометить маршруты как назначенные
            uniqueRoutes.forEach(route =>
                assignedRoutes.add(route.id)
            );

            optimized.push({
                ...baseAssignment,
                routes: uniqueRoutes,
                totalDistance: uniqueRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.distance || 0),
                    0
                ),
                totalEnergy: uniqueRoutes.reduce(
                    (sum, r) => sum + (r.flightPlan?.total?.energy || 0),
                    0
                )
            });
        }

        return optimized;
    },

    /**
     * Экспорт результата
     */
    getAssignment() {
        return this.assignment;
    },

    /**
     * Статистика
     */
    getSummary() {
        if (!this.assignment) return null;

        const totalRoutes = this.assignment.reduce(
            (sum, b) => sum + b.routes.length,
            0
        );

        const totalDistance = this.assignment.reduce(
            (sum, b) => sum + b.totalDistance,
            0
        );

        const totalEnergy = this.assignment.reduce(
            (sum, b) => sum + b.totalEnergy,
            0
        );

        return {
            basesCount: this.assignment.length,
            routesCount: totalRoutes,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalEnergy: Math.round(totalEnergy),
            efficiency: Math.round(
                (totalRoutes / this.routes.length) * 100
            )
        };
    }
};

// Инициализация при загрузке
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiRouteModule;
}
