/**
 * MIRA - Главное приложение (app.js)
 * Инициализация, управление состоянием, глобальные функции
 */

// Глобальное состояние
const App = {
    initialized: false,
    isDesktop: false,
    currentView: 'overview',

    /**
     * Инициализация приложения
     */
    init(options = {}) {
        if (this.initialized) {
            Utils.warn('Приложение уже инициализировано');
            return;
        }

        this.isDesktop = options.isDesktop || window.innerWidth > 768;

        Utils.log(`Инициализация приложения (${this.isDesktop ? 'Desktop' : 'Mobile'})`);

        // Инициализация модулей
        this.initModules();

        // Инициализация карты
        this.initMap();

        // Инициализация UI
        this.initUI();

        // Загрузка сохранённых данных
        this.loadSavedData();

        // Обработчики событий
        this.bindEvents();

        this.initialized = true;
        Utils.log('Приложение инициализировано');
    },

    /**
     * Инициализация модулей
     */
    initModules() {
        // Инициализация WizardModule
        if (typeof WizardModule !== 'undefined') {
            WizardModule.init({
                callbacks: {
                    onStepChange: (step) => this.onStepChange(step)
                }
            });
        }

        // Инициализация PilotModule
        if (typeof PilotModule !== 'undefined') {
            PilotModule.init();
        }

        Utils.log('Модули инициализированы');
    },

    /**
     * Инициализация карты
     */
    initMap() {
        if (typeof MapModule !== 'undefined') {
            MapModule.init('map');
            
            // Центрирование на Москве по умолчанию
            MapModule.centerOnPoint(55.7558, 37.6173, 10);
        }
    },

    /**
     * Инициализация UI
     */
    initUI() {
        // Обновление кнопок в зависимости от платформы
        if (this.isDesktop) {
            document.body.classList.add('desktop');
        } else {
            document.body.classList.add('mobile');
        }

        // Скрываем wizard по умолчанию
        const wizardContainer = document.getElementById('wizardContainer');
        if (wizardContainer) {
            wizardContainer.style.display = 'none';
        }
    },

    /**
     * Загрузка сохранённых данных
     */
    loadSavedData() {
        // Загружаем последние данные
        const lastAnalysis = Storage.getLastAnalysis();
        if (lastAnalysis) {
            Utils.log('Последний анализ загружен из хранилища');
        }

        // Очищаем устаревший кэш
        Storage.clearExpiredCache();
    },

    /**
     * Привязка глобальных событий
     */
    bindEvents() {
        // Изменение размера окна
        window.addEventListener('resize', Utils.debounce(() => {
            this.isDesktop = window.innerWidth > 768;
            if (typeof ChartsModule !== 'undefined') {
                ChartsModule.resizeAllCharts();
            }
        }, 250));

        // Обработка кликов
        document.addEventListener('click', (e) => {
            // Кнопка геолокации
            if (e.target.closest('.geo-btn')) {
                this.getCurrentLocation();
            }

            // Закрытие модальных окон по клику вне
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            // Escape - закрытие модальных окон
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
                if (typeof PilotModule !== 'undefined') {
                    PilotModule.closeModal();
                }
            }
        });
    },

    /**
     * Изменение шага мастера
     */
    onStepChange(step) {
        Utils.log(`Переход на шаг ${step}`);
        
        // Обновляем видимость контента
        this.updateContentView(step);
    },

    /**
     * Обновление контента в зависимости от шага
     */
    updateContentView(step) {
        const wizardContainer = document.getElementById('wizardContainer');
        const mainPanel = document.getElementById('mainPanel');

        if (step === 1) {
            // Показываем выбор маршрута
            if (wizardContainer) wizardContainer.style.display = 'block';
            if (mainPanel) mainPanel.style.display = 'none';
        } else {
            // Показываем основной интерфейс
            if (wizardContainer) wizardContainer.style.display = 'none';
            if (mainPanel) mainPanel.style.display = 'flex';
        }
    },

    /**
     * Получение текущей геопозиции
     */
    getCurrentLocation() {
        if (!navigator.geolocation) {
            showToast('Геолокация не поддерживается', 'error');
            return;
        }

        const btn = document.querySelector('.geo-btn');
        if (btn) {
            btn.innerHTML = '<span class="spinner"></span>';
            btn.disabled = true;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Центрируем карту
                if (typeof MapModule !== 'undefined') {
                    MapModule.centerOnPoint(lat, lon, 14);
                }

                // Обновляем поля координат
                const latInput = document.getElementById('latInput');
                const lonInput = document.getElementById('lonInput');
                if (latInput) latInput.value = lat.toFixed(6);
                if (lonInput) lonInput.value = lon.toFixed(6);

                showToast('Местоположение определено', 'success');
                
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
                    btn.disabled = false;
                }
            },
            (error) => {
                showToast('Ошибка определения местоположения', 'error');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
                    btn.disabled = false;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    },

    /**
     * Переключение вкладок
     */
    switchTab(tabName) {
        this.currentView = tabName;

        // Обновляем активную вкладку
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.tab[onclick*="${tabName}"]`)?.classList.add('active');

        // Обновляем контент
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`)?.classList.add('active');

        // Инициализируем графики при переключении
        if (tabName === 'charts') {
            this.initCharts();
        }

        Utils.log(`Вкладка переключена: ${tabName}`);
    },

    /**
     * Инициализация графиков
     */
    initCharts() {
        if (typeof ChartsModule === 'undefined') return;

        // Получаем данные из текущего анализа
        let chartData = null;
        
        if (typeof WizardModule !== 'undefined' && WizardModule.stepData?.segmentAnalysis?.length > 0) {
            const analysis = WizardModule.stepData.segmentAnalysis[0].analyzed;
            chartData = WeatherModule.prepareChartData(analysis);
        }

        if (!chartData) return;

        // Инициализируем графики
        const containers = {
            timeSeriesChart: chartData,
            verticalProfileChart: null,
            temperatureProfileChart: null,
            windRoseChart: chartData,
            turbulenceChart: chartData,
            ceilingChart: chartData,
            flightWindowsChart: null
        };

        Object.entries(containers).forEach(([id, data]) => {
            const container = document.getElementById(id);
            if (container && !container.classList.contains('chart-initialized')) {
                container.classList.remove('loading');
                container.classList.add('chart-initialized');
                
                switch (id) {
                    case 'timeSeriesChart':
                        ChartsModule.createTimeSeriesChart(id, data);
                        break;
                    case 'windRoseChart':
                        ChartsModule.createWindRose(id, data);
                        break;
                    case 'turbulenceChart':
                        ChartsModule.createTurbulenceChart(id, data);
                        break;
                    case 'ceilingChart':
                        ChartsModule.createCeilingChart(id, data);
                        break;
                }
            }
        });
    },

    /**
     * Экспорт отчёта
     */
    exportReport() {
        if (typeof PdfExportModule === 'undefined') {
            showToast('Модуль экспорта PDF не загружен', 'error');
            return;
        }

        const data = typeof WizardModule !== 'undefined' ? WizardModule.getData() : null;
        
        if (!data || !data.route) {
            showToast('Нет данных для экспорта', 'error');
            return;
        }

        PdfExportModule.generateReport(data);
        Utils.log('Отчёт экспортирован в PDF');
    },

    /**
     * Открытие настроек
     */
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            // Загружаем текущие настройки
            const thresholds = Storage.getThresholds();
            
            Object.entries(thresholds).forEach(([key, value]) => {
                const input = document.getElementById(`setting_${key}`);
                if (input) {
                    input.value = value;
                }
            });

            modal.classList.add('active');
        }
    },

    /**
     * Сохранение настроек
     */
    saveSettings() {
        const thresholds = {
            windGround: parseFloat(document.getElementById('setting_windGround')?.value) || 10,
            windAlt: parseFloat(document.getElementById('setting_windAlt')?.value) || 15,
            visibility: parseFloat(document.getElementById('setting_visibility')?.value) || 2,
            precip: parseFloat(document.getElementById('setting_precip')?.value) || 1.4,
            tempMin: parseFloat(document.getElementById('setting_tempMin')?.value) || -10,
            tempMax: parseFloat(document.getElementById('setting_tempMax')?.value) || 35,
            cloudCeiling: parseFloat(document.getElementById('setting_cloudCeiling')?.value) || 300,
            humidityIcing: parseFloat(document.getElementById('setting_humidityIcing')?.value) || 80
        };

        Storage.saveThresholds(thresholds);
        showToast('Настройки сохранены', 'success');

        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Переключение режима маршрута
     */
    toggleRouteMode() {
        if (typeof MapModule !== 'undefined') {
            const isRouteMode = MapModule.toggleRouteMode();
            
            if (isRouteMode) {
                showToast('Режим маршрута: кликните по карте для установки точек', 'info');
                
                // Устанавливаем обработчик завершения маршрута
                MapModule.onRouteComplete = (points) => {
                    const route = RouteModule.createRoute(points);
                    if (route) {
                        RouteModule.saveRoute(route);
                        showToast('Маршрут создан и сохранён', 'success');
                        
                        // Переходим к шагу 1 мастера
                        if (typeof WizardModule !== 'undefined') {
                            WizardModule.stepData.route = route;
                            WizardModule.renderStepContent();
                        }
                    }
                };
            }
        }
    },

    /**
     * Переключение зон риска
     */
    toggleRiskZones() {
        if (typeof MapModule !== 'undefined') {
            const isVisible = MapModule.toggleRiskZones();
            const btn = document.getElementById('riskZonesBtn');
            
            if (btn) {
                btn.style.color = isVisible ? '#667eea' : '';
            }
            
            showToast(isVisible ? 'Зоны риска включены' : 'Зоны риска выключены', 'info');
        }
    },

    /**
     * Очистка маршрута
     */
    clearRoute() {
        if (confirm('Очистить текущий маршрут?')) {
            if (typeof RouteModule !== 'undefined') {
                RouteModule.clear();
            }
            if (typeof MapModule !== 'undefined') {
                MapModule.clearRoute();
            }
            if (typeof WizardModule !== 'undefined') {
                WizardModule.stepData.route = null;
                WizardModule.renderStepContent();
            }
            showToast('Маршрут очищен', 'info');
        }
    },

    /**
     * Оптимизация маршрута (НОВОЕ)
     */
    async optimizeCurrentRoute() {
        const route = typeof RouteModule !== 'undefined' ? RouteModule.currentRoute : null;

        if (!route || !route.points || route.points.length < 2) {
            showToast('Сначала создайте или загрузите маршрут', 'error');
            return;
        }

        const start = route.points[0];
        const end = route.points[route.points.length - 1];

        try {
            showToast('🔍 Оптимизация маршрута...', 'info');

            // Запуск оптимизации
            const result = await RouteModule.optimizeRoute(start, end, {
                maxDetour: 0.3,
                riskWeight: 0.7,
                distanceWeight: 0.3
            });

            // Показ на карте
            if (typeof MapModule !== 'undefined') {
                MapModule.showOptimizedRoutes(result);
            }

            // Информация
            const message = `✅ Лучший маршрут: ${result.best.route.distance.toFixed(1)} км\n` +
                           `📉 Экономия риска: ${result.riskSavings}\n` +
                           `⏱️ Время: ${result.best.route.flightTime} мин`;
            
            showToast(message, 'success');

            // Предложение загрузить лучший маршрут
            if (confirm('Загрузить лучший маршрут для анализа?')) {
                RouteModule.currentRoute = result.best.route;
                await this.analyzeRoute();
            }

        } catch (error) {
            console.error('Ошибка оптимизации:', error);
            showToast('Ошибка оптимизации: ' + error.message, 'error');
        }
    },

    /**
     * Анализ маршрута
     */
    async analyzeRoute() {
        const route = typeof RouteModule !== 'undefined' ? RouteModule.currentRoute : null;

        if (!route) {
            showToast('Сначала создайте или загрузите маршрут', 'error');
            return;
        }

        const date = document.getElementById('analysisDate')?.value;
        if (!date) {
            showToast('Выберите дату анализа', 'error');
            return;
        }

        try {
            RouteModule.createSegments();
            await RouteModule.analyzeSegments(date);

            if (typeof WizardModule !== 'undefined') {
                WizardModule.stepData.segments = RouteModule.segments;
                WizardModule.stepData.segmentAnalysis = RouteModule.segmentAnalysis;
                WizardModule.nextStep();
            }

            // 🔄 Обновляем состояние кнопки ДАШБОРД
            if (typeof DashboardModule !== 'undefined') {
                DashboardModule.updateButtonState();
            }

            showToast('Анализ завершён', 'success');
        } catch (error) {
            showToast('Ошибка анализа: ' + error.message, 'error');
        }
    },

    /**
     * Получение метео (для совместимости)
     */
    async getWeather() {
        const latInput = document.getElementById('latInput');
        const lonInput = document.getElementById('lonInput');

        const lat = parseFloat(latInput?.value);
        const lon = parseFloat(lonInput?.value);

        if (!lat || !lon) {
            showToast('Укажите координаты', 'error');
            return;
        }

        try {
            const forecast = await WeatherModule.getForecast(lat, lon);
            const analyzed = WeatherModule.analyzeForecast(forecast);

            // Отображаем данные
            this.displayWeatherData(analyzed);

            // Сохраняем для дальнейшего использования
            if (typeof WizardModule !== 'undefined') {
                WizardModule.stepData.segmentAnalysis = [{
                    analyzed: analyzed,
                    coordinates: { lat, lon }
                }];
            }

            // 🔄 Обновляем состояние кнопки ДАШБОРД
            if (typeof DashboardModule !== 'undefined') {
                DashboardModule.updateButtonState();
            }

            showToast('Данные получены', 'success');
        } catch (error) {
            showToast('Ошибка получения данных: ' + error.message, 'error');
        }
    },

    /**
     * Отображение метеоданных
     */
    displayWeatherData(analyzed) {
        if (!analyzed || !analyzed.hourly) return;

        const firstHour = analyzed.hourly[0];
        const summary = analyzed.summary;

        // Обновляем параметры
        const elements = {
            wind10m: firstHour.wind10m?.toFixed(1) || '0.0',
            wind500m: (firstHour.wind10m * 1.3)?.toFixed(1) || '0.0',
            visibility: firstHour.visibility?.toFixed(1) || '5.0',
            temp: firstHour.temp2m?.toFixed(1) || '0',
            precip: firstHour.precip?.toFixed(1) || '0.0',
            icing: firstHour.icingRisk === 'high' ? 'ВЫС' : firstHour.icingRisk === 'medium' ? 'СРЕД' : 'НИЗ'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Обновляем статус
        const statusEl = document.getElementById('flightStatus');
        if (statusEl) {
            const risk = summary.overallRisk;
            if (risk === 'high') {
                statusEl.className = 'flight-status status-forbidden';
                statusEl.innerHTML = '<i class="fas fa-times-circle"></i><span>ПОЛЁТ ЗАПРЕЩЁН</span>';
            } else if (risk === 'medium') {
                statusEl.className = 'flight-status status-restricted';
                statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>ПОЛЁТ С ОГРАНИЧЕНИЯМИ</span>';
            } else {
                statusEl.className = 'flight-status status-allowed';
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>ПОЛЁТ РАЗРЕШЁН</span>';
            }
        }

        // Отображаем рекомендации
        const recommendations = WeatherModule.generateRecommendations(analyzed);
        const recContainer = document.getElementById('recommendationsContent');
        if (recContainer) {
            recContainer.innerHTML = recommendations.map(rec => `
                <div class="recommendation-item ${rec.type}">
                    <i class="fas ${rec.icon}"></i>
                    <span class="recommendation-text">${rec.text}</span>
                </div>
            `).join('');
        }

        // Инициализируем графики
        const chartData = WeatherModule.prepareChartData(analyzed);
        if (typeof ChartsModule !== 'undefined') {
            ChartsModule.createTimeSeriesChart('timeSeriesChart', chartData);
            ChartsModule.createWindRose('windRoseChart', chartData);
        }
    }
};

// Глобальные функции для доступа из HTML
window.switchTab = (tabName) => App.switchTab(tabName);
window.exportReport = () => App.exportReport();
window.openSettings = () => App.openSettings();
window.saveSettings = () => App.saveSettings();
window.toggleRouteMode = () => App.toggleRouteMode();
window.toggleRiskZones = () => App.toggleRiskZones();
window.clearRoute = () => App.clearRoute();
window.analyzeRoute = () => App.analyzeRoute();
window.optimizeCurrentRoute = () => App.optimizeCurrentRoute();
window.getWeather = () => App.getWeather();
window.getCurrentLocation = () => App.getCurrentLocation();

// Функции пилота
window.openPilotChecklist = () => {
    if (typeof PilotModule !== 'undefined') {
        PilotModule.openModal();
    }
};

window.closePilotChecklist = () => {
    if (typeof PilotModule !== 'undefined') {
        PilotModule.closeModal();
    }
};

window.applyPilotCorrection = () => {
    if (typeof PilotModule !== 'undefined') {
        PilotModule.applyCorrection();
    }
};

window.clearPilotData = () => {
    if (typeof PilotModule !== 'undefined') {
        PilotModule.clearData();
    }
};

window.toggleSelectPointMode = () => {
    if (typeof PilotModule !== 'undefined') {
        PilotModule.toggleSelectPointMode();
    }
};

window.fillPilotCoordsFromLocation = () => {
    if (typeof PilotModule !== 'undefined') {
        PilotModule.fillCoordsFromLocation();
    }
};

// Уведомления
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
