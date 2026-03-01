/**
 * MIRA - Takeoff Point Selector
 * Выбор точки взлёта кликом по карте для каждого маршрута
 * Версия: 0.3.0
 */

const TakeoffPointSelector = {
    /**
     * Активный режим выбора
     */
    selectingForRoute: null,  // id маршрута, для которого выбираем точку

    /**
     * Инициализация
     */
    init() {
        this.bindMapClickHandler();
        console.log('✅ TakeoffPointSelector инициализирован');
    },

    /**
     * Привязка обработчика клика по карте
     */
    bindMapClickHandler() {
        if (typeof MapModule === 'undefined' || !MapModule.map) {
            console.warn('⚠️ MapModule не инициализирован, повторная попытка...');
            setTimeout(() => this.bindMapClickHandler(), 100);
            return;
        }

        const map = MapModule.map;

        map.on('click', (event) => {
            if (!this.selectingForRoute) return;

            const coordinates = event.coordinate;
            const lonLat = ol.proj.toLonLat(coordinates);

            this.setTakeoffPointForRoute(
                this.selectingForRoute,
                { lat: lonLat[1], lon: lonLat[0] }
            );
        });

        console.log('🗺️ Обработчик клика по карте привязан');
    },

    /**
     * Начало выбора точки для маршрута
     */
    startSelection(routeId) {
        console.log('🎯 Начало выбора точки для маршрута:', routeId);

        this.selectingForRoute = routeId;

        // Визуальная индикация
        this.showSelectionIndicator();

        // Уведомление пользователя
        if (typeof showToast !== 'undefined') {
            showToast('🗺️ Кликните по карте для выбора точки взлёта', 'info');
        } else {
            alert('🗺️ Кликните по карте для выбора точки взлёта');
        }
    },

    /**
     * Завершение выбора
     */
    stopSelection() {
        console.log('❌ Завершение выбора точки');
        this.selectingForRoute = null;
        this.hideSelectionIndicator();
    },

    /**
     * Показ индикатора выбора
     */
    showSelectionIndicator() {
        // Добавляем стиль курсора
        const mapContainer = document.querySelector('.ol-viewport');
        if (mapContainer) {
            mapContainer.style.cursor = 'crosshair';
        }

        // Добавляем оверлей с маркером
        this.addSelectionOverlay();
    },

    /**
     * Скрытие индикатора выбора
     */
    hideSelectionIndicator() {
        // Возвращаем курсор
        const mapContainer = document.querySelector('.ol-viewport');
        if (mapContainer) {
            mapContainer.style.cursor = 'auto';
        }

        // Удаляем оверлей
        this.removeSelectionOverlay();
    },

    /**
     * Добавление оверлея выбора
     */
    addSelectionOverlay() {
        if (typeof MapModule === 'undefined' || !MapModule.map) return;

        // Создаём маркер
        const marker = new ol.Overlay({
            position: undefined,
            positioning: 'center-center',
            element: this.createMarkerElement(),
            stopEvent: false
        });

        MapModule.map.addOverlay(marker);
        this.selectionOverlay = marker;

        // Движение маркера за курсором
        MapModule.map.on('pointermove', (event) => {
            if (this.selectingForRoute) {
                marker.setPosition(event.coordinate);
            }
        });
    },

    /**
     * Создание элемента маркера
     */
    createMarkerElement() {
        const el = document.createElement('div');
        el.style.cssText = `
            position: relative;
            width: 40px;
            height: 40px;
        `;
        el.innerHTML = `
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(102, 126, 234, 0.3);
                border: 3px solid #667eea;
                border-radius: 50%;
                animation: pulse 1s infinite;
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 20px;
            ">🚁</div>
        `;
        return el;
    },

    /**
     * Удаление оверлея выбора
     */
    removeSelectionOverlay() {
        if (this.selectionOverlay && typeof MapModule !== 'undefined' && MapModule.map) {
            MapModule.map.removeOverlay(this.selectionOverlay);
            this.selectionOverlay = null;
        }
    },

    /**
     * Установка точки взлёта для маршрута
     */
    setTakeoffPointForRoute(routeId, point) {
        console.log('✅ Точка взлёта выбрана:', point);

        // Находим маршрут в MultiRouteModule
        if (typeof MultiRouteModule !== 'undefined') {
            const route = MultiRouteModule.routes.find(r => r.id === routeId);
            if (route) {
                // Проверяем совпадение с существующими базами
                const existingBase = this.findMatchingBase(point);

                if (existingBase) {
                    // Привязка к существующей базе
                    route.takeoffPoint = {
                        lat: point.lat,
                        lon: point.lon,
                        baseId: existingBase.id,
                        baseName: existingBase.name
                    };
                    console.log('🔗 Привязка к базе:', existingBase.name);
                } else {
                    // Создание новой точки
                    route.takeoffPoint = {
                        lat: point.lat,
                        lon: point.lon,
                        baseId: null,
                        baseName: 'Новая точка'
                    };
                    console.log('🆕 Новая точка взлёта');
                }

                // Отображаем маркер на карте
                this.displayTakeoffMarker(point, route.name);

                // Обновляем UI
                this.updateRouteTakeoffUI(routeId);
            }
        }

        // Завершаем выбор
        this.stopSelection();
    },

    /**
     * Отображение маркера точки взлёта
     */
    displayTakeoffMarker(point, routeName) {
        if (typeof MapModule === 'undefined' || !MapModule.map) return;

        const marker = new ol.Overlay({
            position: ol.proj.fromLonLat([point.lon, point.lat]),
            positioning: 'center-center',
            element: this.createTakeoffMarkerElement(routeName),
            stopEvent: false
        });

        MapModule.map.addOverlay(marker);

        // Сохраняем маркер для возможного удаления
        if (!this.takeoffMarkers) this.takeoffMarkers = [];
        this.takeoffMarkers.push(marker);

        console.log('🗺️ Маркер точки взлёта добавлен:', routeName);
    },

    /**
     * Создание элемента маркера точки взлёта
     */
    createTakeoffMarkerElement(routeName) {
        const el = document.createElement('div');
        el.style.cssText = `
            position: relative;
            width: 50px;
            height: 50px;
        `;
        el.innerHTML = `
            <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-bottom: 15px solid #38a169;
            "></div>
            <div style="
                position: absolute;
                bottom: 12px;
                left: 50%;
                transform: translateX(-50%);
                width: 30px;
                height: 30px;
                background: #38a169;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            ">🚁</div>
            <div style="
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                color: #2d3748;
            ">${routeName}</div>
        `;
        return el;
    },

    /**
     * Поиск совпадающей базы
     */
    findMatchingBase(point) {
        if (typeof MultiRouteModule === 'undefined') return null;

        const bases = MultiRouteModule.takeoffPoints || [];
        const maxDistance = 0.1;  // км (до 100м)

        for (const base of bases) {
            const distance = this.calculateDistance(point, base);
            if (distance <= maxDistance) {
                return base;
            }
        }

        return null;
    },

    /**
     * Расчёт расстояния между точками
     */
    calculateDistance(point1, point2) {
        const R = 6371;
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
     * Обновление UI маршрута
     */
    updateRouteTakeoffUI(routeId) {
        console.log('🔘 Обновление UI маршрута:', routeId);

        if (typeof MultiRouteModule === 'undefined') return;

        const route = MultiRouteModule.routes.find(r => r.id === routeId);
        if (!route || !route.takeoffPoint) return;

        // Обновляем кнопку маршрута
        if (typeof MultiRouteWizardIntegration !== 'undefined') {
            MultiRouteWizardIntegration.updateRouteTakeoffButton(routeId);
        }

        // Перерисовываем список точек взлёта
        if (typeof MultiRouteWizardIntegration !== 'undefined') {
            MultiRouteWizardIntegration.refreshTakeoffPointsList();
        }
    },

    /**
     * Сброс точки взлёта для маршрута
     */
    resetTakeoffPointForRoute(routeId) {
        if (typeof MultiRouteModule === 'undefined') return;

        const route = MultiRouteModule.routes.find(r => r.id === routeId);
        if (route) {
            route.takeoffPoint = null;
            this.updateRouteTakeoffUI(routeId);
        }
    }
};

// Добавляем CSS анимацию
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.7;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Инициализация при загрузке
setTimeout(() => {
    TakeoffPointSelector.init();
}, 200);

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TakeoffPointSelector;
}
