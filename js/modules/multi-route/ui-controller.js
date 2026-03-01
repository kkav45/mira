/**
 * MIRA - Multi-Route UI Controller
 * Управление интерфейсом мульти-маршрутной системы
 * Версия: 0.3.0
 */

const MultiRouteUI = {
    /**
     * Флаг инициализации
     */
    initialized: false,

    /**
     * Инициализация
     */
    init() {
        // Предотвращение повторной инициализации
        if (this.initialized) {
            console.log('⚠️ MultiRouteUI уже инициализирован');
            return;
        }

        this.initialized = true;
        this.bindEvents();
        console.log('✅ MultiRouteUI инициализирован');
    },

    /**
     * Привязка событий
     */
    bindEvents() {
        // Кнопка добавления точки взлёта
        const addTakeoffBtn = document.getElementById('addTakeoffPointBtn');
        if (addTakeoffBtn) {
            addTakeoffBtn.addEventListener('click', () => this.showAddTakeoffModal());
        }

        // Кнопка загрузки KML
        const loadKmlBtn = document.getElementById('loadKmlBtn');
        if (loadKmlBtn) {
            loadKmlBtn.addEventListener('click', () => this.handleKmlUpload());
        }

        // Кнопка расчёта оптимального маршрута
        const optimizeBtn = document.getElementById('optimizeRoutesBtn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.runOptimization());
        }

        // Кнопка очистки всех маршрутов
        const clearBtn = document.getElementById('clearRoutesBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }

        // Обработчик выбора файла KML
        const kmlInput = document.getElementById('kmlFileInput');
        if (kmlInput) {
            kmlInput.addEventListener('change', (e) => this.processKmlFile(e.target.files[0]));
        }
    },

    /**
     * Показать модальное окно добавления точки взлёта
     */
    showAddTakeoffModal() {
        const modal = document.getElementById('addTakeoffModal');
        if (!modal) {
            this.createAddTakeoffModal();
        } else {
            modal.classList.add('active');
        }
    },

    /**
     * Создать модальное окно добавления точки взлёта
     */
    createAddTakeoffModal() {
        const modalHtml = `
            <div id="addTakeoffModal" class="modal active">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-helicopter"></i> Добавить точку взлёта</h3>
                        <button class="close-modal" onclick="MultiRouteUI.closeModal('addTakeoffModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 12px; color: rgba(0,0,0,0.6); text-transform: uppercase; font-weight: 600;">
                                <i class="fas fa-map-marker-alt"></i> Координаты
                            </label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
                                <input type="number" id="takeoffLat" placeholder="Широта" step="0.0001" 
                                       style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;"/>
                                <input type="number" id="takeoffLon" placeholder="Долгота" step="0.0001"
                                       style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;"/>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 12px; color: rgba(0,0,0,0.6); text-transform: uppercase; font-weight: 600;">
                                <i class="fas fa-tag"></i> Название
                            </label>
                            <input type="text" id="takeoffName" placeholder="База А" 
                                   style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px;"/>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 12px; color: rgba(0,0,0,0.6); text-transform: uppercase; font-weight: 600;">
                                <i class="fas fa-sort-numeric-down"></i> Приоритет
                            </label>
                            <select id="takeoffPriority" 
                                    style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px;">
                                <option value="1">1 - Основная база</option>
                                <option value="2">2 - Резервная база</option>
                                <option value="3">3 - Дополнительная база</option>
                            </select>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                            <div>
                                <label style="font-size: 11px; color: rgba(0,0,0,0.6);">Напряжение (В)</label>
                                <input type="number" id="takeoffVoltage" value="25.4" step="0.1"
                                       style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px;"/>
                            </div>
                            <div>
                                <label style="font-size: 11px; color: rgba(0,0,0,0.6);">Ёмкость (мА·ч)</label>
                                <input type="number" id="takeoffCapacity" value="39000" step="1000"
                                       style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px;"/>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 11px; color: rgba(0,0,0,0.6);">Дальность антенны (км)</label>
                            <input type="number" id="takeoffAntenna" value="60" step="5"
                                   style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 6px;"/>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <button class="action-btn" onclick="MultiRouteUI.saveTakeoffPoint()" 
                                    style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <i class="fas fa-save"></i> Сохранить
                            </button>
                            <button class="action-btn" onclick="MultiRouteUI.getCurrentLocation()"
                                    style="width: 56px; background: linear-gradient(135deg, rgba(56, 161, 105, 0.8) 0%, rgba(38, 166, 154, 0.8) 100%);">
                                <i class="fas fa-location-crosshairs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Закрыть модальное окно
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Сохранить точку взлёта
     */
    saveTakeoffPoint() {
        const lat = parseFloat(document.getElementById('takeoffLat').value);
        const lon = parseFloat(document.getElementById('takeoffLon').value);
        const name = document.getElementById('takeoffName').value;
        const priority = parseInt(document.getElementById('takeoffPriority').value);
        const voltage = parseFloat(document.getElementById('takeoffVoltage').value);
        const capacity = parseFloat(document.getElementById('takeoffCapacity').value);
        const antenna = parseInt(document.getElementById('takeoffAntenna').value);

        if (!lat || !lon) {
            alert('Укажите координаты!');
            return;
        }

        const point = {
            lat,
            lon,
            name: name || `База ${MultiRouteModule.takeoffPoints.length + 1}`,
            priority,
            voltage,
            capacity,
            antenna
        };

        MultiRouteModule.addTakeoffPoint(point);

        // Визуализация на карте (если модуль карты инициализирован)
        if (typeof MultiRouteMapModule !== 'undefined' && MultiRouteMapModule.map) {
            MultiRouteMapModule.displayTakeoffPoint(point);
            MultiRouteMapModule.fitToTakeoffPoints();
        }

        // Обновление вкладки дашборда
        this.refreshDashboard();

        // Закрытие модального окна
        this.closeModal('addTakeoffModal');

        alert(`✅ Точка взлёта "${point.name}" добавлена!`);
    },

    /**
     * Получить текущее местоположение
     */
    getCurrentLocation() {
        if (!navigator.geolocation) {
            alert('Геолокация не поддерживается браузером');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('takeoffLat').value = position.coords.latitude.toFixed(6);
                document.getElementById('takeoffLon').value = position.coords.longitude.toFixed(6);
            },
            (error) => {
                alert('Ошибка получения местоположения: ' + error.message);
            }
        );
    },

    /**
     * Обработка загрузки KML
     */
    handleKmlUpload() {
        const input = document.getElementById('kmlFileInput');
        if (input) {
            input.click();
        } else {
            // Создать скрытый input если нет
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'file';
            hiddenInput.id = 'kmlFileInput';
            hiddenInput.accept = '.kml,.xml';
            hiddenInput.style.display = 'none';
            hiddenInput.addEventListener('change', (e) => this.processKmlFile(e.target.files[0]));
            document.body.appendChild(hiddenInput);
            hiddenInput.click();
        }
    },

    /**
     * Обработка KML файла
     */
    processKmlFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const kmlContent = e.target.result;
                const route = this.parseKml(kmlContent, file.name);

                if (route) {
                    MultiRouteModule.addRoute(route);

                    // Визуализация на карте (если модуль карты инициализирован)
                    if (typeof MultiRouteMapModule !== 'undefined' && MultiRouteMapModule.map) {
                        MultiRouteMapModule.displayRoute(route);
                        MultiRouteMapModule.fitToRoutes();
                    }

                    // Обновление вкладки дашборда
                    this.refreshDashboard();

                    alert(`✅ Маршрут "${route.name}" загружен!`);
                }
            } catch (error) {
                alert('Ошибка загрузки KML: ' + error.message);
            }
        };

        reader.readAsText(file);
    },

    /**
     * Парсинг KML
     */
    parseKml(kmlContent, fileName) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

        const placemarks = xmlDoc.getElementsByTagName('Placemark');
        if (placemarks.length === 0) {
            throw new Error('KML файл не содержит маршрутов');
        }

        const segments = [];
        let totalDistance = 0;

        // Парсинг координат из первого Placemark
        const coordinates = placemarks[0].getElementsByTagName('coordinates');
        if (coordinates.length > 0) {
            const coordsText = coordinates[0].textContent.trim();
            const coordPairs = coordsText.split(/\s+/);

            coordPairs.forEach((pair, index) => {
                const [lon, lat, alt] = pair.split(',').map(Number);
                if (!isNaN(lon) && !isNaN(lat)) {
                    segments.push({
                        id: index + 1,
                        lat: lat,
                        lon: lon,
                        distance: 5  //默认值，实际计算需要更复杂的逻辑
                    });

                    if (index > 0) {
                        const prev = coordPairs[index - 1].split(',').map(Number);
                        totalDistance += this.calculateDistance(lat, lon, prev[1], prev[0]);
                    }
                }
            });
        }

        return {
            id: 'route-' + Date.now(),
            name: fileName.replace('.kml', ''),
            segments,
            totalDistance: Math.round(totalDistance * 10) / 10
        };
    },

    /**
     * Расчёт расстояния (Haversine)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Запуск оптимизации
     */
    runOptimization() {
        if (MultiRouteModule.takeoffPoints.length === 0) {
            alert('Сначала добавьте точки взлёта!');
            return;
        }

        if (MultiRouteModule.routes.length === 0) {
            alert('Сначала загрузите маршруты!');
            return;
        }

        // Получение данных о погоде
        const weatherData = typeof WeatherModule !== 'undefined' ? WeatherModule.cachedData : null;

        // Запуск оптимизации
        const assignment = MultiRouteModule.optimizeAssignment(weatherData);

        // Визуализация результатов
        this.displayOptimizationResults(assignment);

        // Обновление вкладки дашборда
        this.refreshDashboard();

        alert('✅ Оптимизация завершена! Проверьте вкладку "Мульти-маршрут"');
    },

    /**
     * Отображение результатов оптимизации
     */
    displayOptimizationResults(assignment) {
        if (!assignment || assignment.length === 0) return;

        // Очистка карты
        if (typeof MultiRouteMapModule !== 'undefined') {
            MultiRouteMapModule.clear();
        }

        // Отображение точек взлёта
        assignment.forEach(baseAssignment => {
            if (typeof MultiRouteMapModule !== 'undefined') {
                MultiRouteMapModule.displayTakeoffPoint(baseAssignment.base);
                MultiRouteMapModule.displayAntennaZone(baseAssignment.base, baseAssignment.base.antenna);
            }
        });

        // Отображение маршрутов с цветами по статусу
        assignment.forEach(baseAssignment => {
            baseAssignment.routes.forEach(route => {
                if (typeof MultiRouteMapModule !== 'undefined') {
                    MultiRouteMapModule.displayRoute(route);
                }
            });
        });

        // Приблизить к маршрутам
        if (typeof MultiRouteMapModule !== 'undefined') {
            setTimeout(() => MultiRouteMapModule.fitToRoutes(), 100);
        }
    },

    /**
     * Очистить все маршруты и точки
     */
    clearAll() {
        if (!confirm('Вы уверены, что хотите удалить все маршруты и точки взлёта?')) return;

        MultiRouteModule.init();

        if (typeof MultiRouteMapModule !== 'undefined') {
            MultiRouteMapModule.clear();
        }

        this.refreshDashboard();

        alert('✅ Все данные очищены');
    },

    /**
     * Обновить вкладку дашборда
     */
    refreshDashboard() {
        if (typeof DashboardModule !== 'undefined' && DashboardModule.activeTab === 'multiroute') {
            DashboardModule.renderTabContent('multiroute');
        }
    },

    /**
     * Отобразить все данные на карте
     */
    displayAllData() {
        if (typeof MultiRouteMapModule === 'undefined' || !MultiRouteMapModule.map) return;

        // Очистка карты
        MultiRouteMapModule.clear();

        // Отобразить точки взлёта
        if (MultiRouteModule.takeoffPoints.length > 0) {
            MultiRouteMapModule.displayAllTakeoffPoints(MultiRouteModule.takeoffPoints);

            // Отобразить зоны антенн
            MultiRouteModule.takeoffPoints.forEach(base => {
                MultiRouteMapModule.displayAntennaZone(base, base.antenna);
            });
        }

        // Отобразить маршруты
        if (MultiRouteModule.routes.length > 0) {
            MultiRouteMapModule.displayAllRoutes(MultiRouteModule.routes);
        }

        // Приблизить ко всем объектам
        if (MultiRouteModule.takeoffPoints.length > 0) {
            MultiRouteMapModule.fitToTakeoffPoints();
        } else if (MultiRouteModule.routes.length > 0) {
            MultiRouteMapModule.fitToRoutes();
        }
    }
};

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MultiRouteUI.init());
} else {
    MultiRouteUI.init();
}

// Экспорт для использования в HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiRouteUI;
}
