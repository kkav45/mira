/**
 * MIRA - Route Optimizer
 * Оптимизация порядка маршрутов для минимизации переходов
 * Версия: 0.3.0
 */

const RouteOptimizer = {
    /**
     * Оптимизация порядка маршрутов для одной базы
     */
    optimizeForBase(routes, takeoffPoint) {
        if (!routes || routes.length === 0) return [];

        const optimized = [];
        let currentPoint = takeoffPoint;
        let remainingRoutes = [...routes];

        while (remainingRoutes.length > 0) {
            // Найти ближайший маршрут к текущей позиции
            const nearest = this.findNearestRoute(
                currentPoint,
                remainingRoutes
            );

            if (!nearest) break;

            // Добавить в порядок
            optimized.push(nearest.route);

            // Обновить текущую позицию (точка входа маршрута)
            currentPoint = {
                lat: nearest.route.entryPoint.lat,
                lon: nearest.route.entryPoint.lon
            };

            // Удалить из оставшихся
            remainingRoutes = remainingRoutes.filter(
                r => r.id !== nearest.route.id
            );
        }

        return optimized;
    },

    /**
     * Найти ближайший маршрут
     */
    findNearestRoute(currentPoint, routes) {
        let nearest = null;
        let minDistance = Infinity;

        for (const route of routes) {
            if (!route.entryPoint) continue;

            const distance = this.calculateDistance(
                currentPoint,
                { lat: route.entryPoint.lat, lon: route.entryPoint.lon }
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = {
                    route: route,
                    distance: Math.round(distance * 10) / 10
                };
            }
        }

        return nearest;
    },

    /**
     * Расчёт расстояния между двумя точками
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
     * Расчёт переходов между маршрутами
     */
    calculateTransitions(optimizedRoutes, takeoffPoint) {
        const transitions = [];
        let currentPoint = takeoffPoint;

        // Подход к первому маршруту
        if (optimizedRoutes.length > 0) {
            const firstRoute = optimizedRoutes[0];
            const approachDistance = this.calculateDistance(
                currentPoint,
                { lat: firstRoute.entryPoint.lat, lon: firstRoute.entryPoint.lon }
            );

            transitions.push({
                from: 'Точка взлёта',
                to: firstRoute.name,
                distance: Math.round(approachDistance * 10) / 10,
                type: 'approach'
            });
        }

        // Переходы между маршрутами
        for (let i = 0; i < optimizedRoutes.length - 1; i++) {
            const currentRoute = optimizedRoutes[i];
            const nextRoute = optimizedRoutes[i + 1];

            const transitionDistance = this.calculateDistance(
                { lat: currentRoute.entryPoint.lat, lon: currentRoute.entryPoint.lon },
                { lat: nextRoute.entryPoint.lat, lon: nextRoute.entryPoint.lon }
            );

            transitions.push({
                from: currentRoute.name,
                to: nextRoute.name,
                distance: Math.round(transitionDistance * 10) / 10,
                type: 'transition'
            });
        }

        // Возврат на базу
        if (optimizedRoutes.length > 0) {
            const lastRoute = optimizedRoutes[optimizedRoutes.length - 1];
            const returnDistance = this.calculateDistance(
                { lat: lastRoute.entryPoint.lat, lon: lastRoute.entryPoint.lon },
                takeoffPoint
            );

            transitions.push({
                from: lastRoute.name,
                to: 'Точка взлёта',
                distance: Math.round(returnDistance * 10) / 10,
                type: 'return'
            });
        }

        return transitions;
    },

    /**
     * Общая статистика переходов
     */
    getTransitionSummary(transitions) {
        const totalDistance = transitions.reduce(
            (sum, t) => sum + t.distance,
            0
        );

        const approachDistance = transitions
            .filter(t => t.type === 'approach')
            .reduce((sum, t) => sum + t.distance, 0);

        const transitionDistance = transitions
            .filter(t => t.type === 'transition')
            .reduce((sum, t) => sum + t.distance, 0);

        const returnDistance = transitions
            .filter(t => t.type === 'return')
            .reduce((sum, t) => sum + t.distance, 0);

        // Энергия на переходы (8 Вт·ч на км)
        const energyPerKm = 8;

        return {
            totalDistance: Math.round(totalDistance * 10) / 10,
            approachDistance: Math.round(approachDistance * 10) / 10,
            transitionDistance: Math.round(transitionDistance * 10) / 10,
            returnDistance: Math.round(returnDistance * 10) / 10,
            totalEnergy: Math.round(totalDistance * energyPerKm),
            transitionsCount: transitions.length
        };
    }
};

// Инициализация при загрузке
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RouteOptimizer;
}
