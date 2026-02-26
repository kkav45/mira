/**
 * MIRA - Пошаговый мастер (wizard.js)
 * 4 шага:
 *   1. Дата + Время + Маршрут
 *   2. Анализ (4 вкладки: Рекомендации, Графики, Детали, Окна)
 *   3. Пилот
 *   4. Отчёт PDF
 */

const WizardModule = {
    currentStep: 1,
    totalSteps: 4,
    stepData: {},
    currentTab: 'recommendations',
    currentVizTab: 'table',
    callbacks: {},

    /**
     * Инициализация мастера
     */
    init(options = {}) {
        this.currentStep = 1;
        this.currentTab = 'recommendations';
        this.currentVizTab = 'table';
        this.step3TabsInitialized = false; // Флаг инициализации вкладок шага 3
        this.stepData = {
            date: Utils.formatDateTimeLocal(Utils.getTomorrowDate()).split('T')[0],
            time: '00:00',
            route: null,
            segments: [],
            segmentAnalysis: [],
            pilotData: null,
            pilotObservations: [], // Массив всех наблюдений пилота
            correctedAnalysis: null
        };
        this.callbacks = options.callbacks || {};

        this.renderSteps();
        this.renderStepContent();
        this.bindGlobalEvents();

        Utils.log('Мастер инициализирован');
    },

    /**
     * Отрисовка контента шага
     */
    renderStepContent() {
        const container = document.getElementById('wizardContent');
        if (!container) return;

        container.style.display = 'block';

        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.style.display = 'none';

        const tabs = document.getElementById('mainTabs');
        if (tabs) tabs.style.display = 'none';

        let html = '';

        switch (this.currentStep) {
            case 1:
                html += this.renderStep1Html();
                html += this.renderNavigation();
                break;
            case 2:
                html += this.renderStep2Html();
                html += this.renderNavigation();
                break;
            case 3:
                // Сбрасываем флаг инициализации вкладок при перерисовке шага 3
                this.step3TabsInitialized = false;
                html += this.renderStep3Html();
                html += this.renderNavigation();
                break;
            case 4:
                html += this.renderStep4Html();
                html += this.renderNavigation();
                break;
        }

        container.innerHTML = html;
        this.bindStepEvents();
    },

    /**
     * Отрисовка индикаторов шагов
     */
    renderSteps() {
        const container = document.getElementById('wizardSteps');
        if (!container) return;

        const steps = [
            { number: 1, label: 'Маршрут', icon: 'fa-route' },
            { number: 2, label: 'Анализ', icon: 'fa-chart-bar' },
            { number: 3, label: 'Пилот', icon: 'fa-flag' },
            { number: 4, label: 'Отчёт', icon: 'fa-file-pdf' }
        ];

        container.innerHTML = steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === this.currentStep;
            const isCompleted = stepNum < this.currentStep;
            
            return `
                <div class="wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                     data-step="${stepNum}">
                    <span class="step-number">
                        ${isCompleted ? '<i class="fas fa-check"></i>' : step.number}
                    </span>
                    <span class="step-label">${step.label}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Привязка глобальных событий
     */
    bindGlobalEvents() {
        document.addEventListener('click', (e) => {
            const stepEl = e.target.closest('.wizard-step');
            if (stepEl) {
                const step = parseInt(stepEl.dataset.step);
                if (step < this.currentStep) {
                    this.goToStep(step);
                }
            }

            const btn = e.target.closest('.step-nav-btn');
            if (btn) {
                if (btn.classList.contains('prev')) {
                    this.prevStep();
                } else if (btn.classList.contains('next')) {
                    this.nextStep();
                }
            }

            // Вкладки на шаге 2
            const tabEl = e.target.closest('.analysis-tab');
            if (tabEl) {
                const tabName = tabEl.dataset.tab;
                this.switchAnalysisTab(tabName);
            }
        });
    },

    /**
     * Переход к шагу
     */
    goToStep(step) {
        if (step < 1 || step > this.totalSteps) return;
        if (step > this.currentStep && !this.canProceed()) return;

        this.currentStep = step;
        this.renderSteps();
        this.renderStepContent();

        if (this.callbacks.onStepChange) {
            this.callbacks.onStepChange(step);
        }
    },

    /**
     * Следующий шаг
     */
    nextStep() {
        if (!this.canProceed()) return;
        
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.renderSteps();
            this.renderStepContent();

            if (this.callbacks.onStepChange) {
                this.callbacks.onStepChange(this.currentStep);
            }
        }
    },

    /**
     * Предыдущий шаг
     */
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderSteps();
            this.renderStepContent();

            if (this.callbacks.onStepChange) {
                this.callbacks.onStepChange(this.currentStep);
            }
        }
    },

    /**
     * Проверка возможности перехода
     */
    canProceed() {
        switch (this.currentStep) {
            case 1:
                return this.stepData.route !== null;
            case 2:
                return this.stepData.segments.length > 0;
            case 3:
                return true;
            default:
                return true;
        }
    },

    /**
     * Переключение вкладок анализа
     */
    switchAnalysisTab(tabName) {
        this.currentTab = tabName;

        // Обновляем визуально вкладки
        this.renderStep2Tabs();

        // Обновляем контент
        const contentContainer = document.getElementById('analysisTabContent');
        if (contentContainer) {
            // Показываем загрузку
            contentContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);"><span class="spinner" style="width: 30px; height: 30px; border-width: 3px;"></span><div style="margin-top: 10px;">Загрузка...</div></div>';

            // Инициализируем контент с задержкой
            setTimeout(() => {
                contentContainer.innerHTML = this.renderStep2ContentHtml();

                // Инициализируем специфичный контент
                if (tabName === 'charts') {
                    setTimeout(() => this.initCharts(), 150);
                } else if (tabName === 'energy') {
                    setTimeout(() => this.initEnergyAnalysis(), 150);
                } else if (tabName === 'details') {
                    setTimeout(() => this.renderDetailsTable(), 150);
                } else if (tabName === 'windows') {
                    // Окна уже отрендерены в HTML
                } else if (tabName === 'recommendations') {
                    setTimeout(() => this.renderSegmentRecommendations(), 150);
                }
            }, 100);
        }
    },

    /**
     * Контент вкладок (для переключения)
     */
    renderStep2ContentHtml() {
        switch (this.currentTab) {
            case 'recommendations':
                return this.renderRecommendationsTab();
            case 'energy':
                return this.renderEnergyTab();
            case 'charts':
                return this.renderChartsTab();
            case 'details':
                return this.renderDetailsTab();
            case 'windows':
                return this.renderWindowsTabHtml();
            default:
                return this.renderRecommendationsTab();
        }
    },

    /**
     * Отрисовка навигации
     */
    renderNavigation() {
        return `
            <div class="step-navigation">
                <button class="step-nav-btn prev" ${this.currentStep === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Назад
                </button>
                <button class="step-nav-btn next" ${!this.canProceed() ? 'disabled' : ''}>
                    ${this.currentStep === this.totalSteps ? '<i class="fas fa-flag-checkered"></i> Завершить' : '<i class="fas fa-chevron-right"></i> Далее'}
                </button>
            </div>
        `;
    },

    /**
     * Привязка событий для текущего шага
     */
    bindStepEvents() {
        switch (this.currentStep) {
            case 1:
                this.bindStep1Events();
                break;
            case 2:
                this.bindStep2Events();
                break;
            case 3:
                this.bindStep3Events();
                break;
            case 4:
                this.bindStep4Events();
                break;
        }
    },

    // ==================== ШАГ 1: ДАТА + ВРЕМЯ + МАРШРУТ ====================

    /**
     * Шаг 1: HTML
     */
    renderStep1Html() {
        const savedRoutes = RouteModule.getSavedRoutes();
        const selectedRouteId = this.stepData.route?.id;

        return `
            <div class="step-content">
                <h3 style="margin-bottom: 16px; color: #2d3748;">
                    <i class="fas fa-route" style="color: #667eea;"></i> Выбор маршрута
                </h3>

                <!-- Дата и время -->
                <div class="section-title" style="margin-bottom: 10px;">
                    <i class="fas fa-calendar-alt"></i> Дата и время
                </div>
                
                <div class="datetime-selector" style="margin-bottom: 20px;">
                    <div style="flex: 1;">
                        <label style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">Дата</label>
                        <input type="date" id="analysisDate" class="datetime-input" 
                               value="${this.stepData.date}" style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">Время</label>
                        <input type="time" id="analysisTime" class="datetime-input" value="${this.stepData.time}" 
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                </div>

                <!-- Выбор маршрута -->
                <div class="section-title" style="margin-bottom: 10px;">
                    <i class="fas fa-route"></i> Маршрут
                </div>

                <!-- Сохранённые маршруты -->
                ${savedRoutes.length > 0 ? `
                    <div class="saved-routes-list" style="margin-bottom: 20px;">
                        ${savedRoutes.map(route => `
                            <div class="saved-route-item ${selectedRouteId === route.id ? 'selected' : ''}" data-route-id="${route.id}">
                                <div>
                                    <div class="route-name">${route.name}</div>
                                    <div class="route-info">
                                        ${route.distance?.toFixed(1) || 0} км · 
                                        ${route.points?.length || 0} точек
                                    </div>
                                </div>
                                <div class="route-actions">
                                    <button class="route-action-btn load" data-route-id="${route.id}" title="Загрузить">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <button class="route-action-btn delete" data-route-id="${route.id}" title="Удалить">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 20px; color: rgba(0,0,0,0.5); margin-bottom: 20px; background: rgba(0,0,0,0.02); border-radius: 10px;">
                        <i class="fas fa-folder-open" style="font-size: 36px; margin-bottom: 8px; opacity: 0.3;"></i>
                        <p style="font-size: 12px;">Нет сохранённых маршрутов</p>
                    </div>
                `}

                <!-- Загрузка KML -->
                <label class="kml-upload" style="margin-bottom: 20px;">
                    <input type="file" id="kmlInput" accept=".kml,.xml" />
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Загрузить KML файл</span>
                </label>

                <!-- Ручной ввод -->
                <div style="padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.1);">
                    <div style="font-size: 12px; color: rgba(0,0,0,0.6); margin-bottom: 8px;">Или укажите координаты:</div>
                    <div class="coords-row">
                        <input type="text" class="coord-input" id="pointA" placeholder="Точка A (широта, долгота)" style="font-size: 12px;" />
                        <input type="text" class="coord-input" id="pointB" placeholder="Точка B (широта, долгота)" style="font-size: 12px;" />
                    </div>
                    <button class="action-btn" id="createRouteBtn" style="margin-top: 10px; padding: 10px; font-size: 13px;">
                        <i class="fas fa-plus"></i> Создать маршрут
                    </button>
                </div>

                <!-- Блок анализа -->
                <div id="analyzeBlock" style="display: none; margin-top: 24px; padding-top: 20px; border-top: 2px solid rgba(102, 126, 234, 0.3);">
                    <div style="padding: 12px; background: rgba(56, 161, 105, 0.1); border-radius: 10px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-check-circle" style="color: #38a169; font-size: 20px;"></i>
                            <div>
                                <div style="font-weight: 600; color: #276749;">Маршрут выбран</div>
                                <div style="font-size: 12px; color: rgba(0,0,0,0.6);" id="selectedRouteInfo">—</div>
                            </div>
                        </div>
                    </div>

                    <button class="action-btn" id="analyzeBtn" style="padding: 16px; font-size: 16px;">
                        <i class="fas fa-search"></i> Анализ
                    </button>

                    <div id="analyzeLoading" style="display: none; text-align: center; padding: 20px;">
                        <span class="spinner" style="width: 40px; height: 40px; border-width: 4px;"></span>
                        <div style="margin-top: 12px; font-size: 14px; color: rgba(0,0,0,0.6);">Анализ маршрута...</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Шаг 1: События
     */
    bindStep1Events() {
        // Загрузка KML
        const kmlInput = document.getElementById('kmlInput');
        if (kmlInput) {
            kmlInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const route = await RouteModule.importKML(file);
                        if (route) {
                            this.stepData.route = route;
                            RouteModule.saveRoute(route);
                            showToast(`Маршрут "${route.name}" загружен`, 'success');
                            this.showAnalyzeBlock();
                        }
                    } catch (error) {
                        showToast('Ошибка загрузки KML: ' + error.message, 'error');
                    }
                }
            });
        }

        // Загрузка маршрута (кнопка)
        document.querySelectorAll('.route-action-btn.load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const routeId = btn.dataset.routeId;
                const route = RouteModule.loadRoute(routeId);
                if (route) {
                    this.stepData.route = route;
                    MapModule.setRoute(route);
                    MapModule.fitToRoute(); // Приближение к маршруту
                    showToast(`Маршрут "${route.name}" загружен`, 'success');
                    this.showAnalyzeBlock();
                }
            });
        });

        // Загрузка маршрута (клик по элементу)
        document.querySelectorAll('.saved-route-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.route-action-btn')) return;
                
                const routeId = item.dataset.routeId;
                const route = RouteModule.loadRoute(routeId);
                if (route) {
                    this.stepData.route = route;
                    MapModule.setRoute(route);
                    MapModule.fitToRoute(); // Приближение к маршруту
                    showToast(`Маршрут "${route.name}" выбран`, 'success');
                    this.showAnalyzeBlock();
                }
            });
        });

        // Удаление
        document.querySelectorAll('.route-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const routeId = btn.dataset.routeId;
                if (confirm('Удалить этот маршрут?')) {
                    RouteModule.deleteRoute(routeId);
                    showToast('Маршрут удалён', 'info');
                    this.renderStepContent();
                }
            });
        });

        // Создание из координат
        const createBtn = document.getElementById('createRouteBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const pointA = document.getElementById('pointA').value.trim();
                const pointB = document.getElementById('pointB').value.trim();

                if (!pointA || !pointB) {
                    showToast('Введите координаты обеих точек', 'error');
                    return;
                }

                try {
                    const [latA, lonA] = pointA.split(',').map(s => parseFloat(s.trim()));
                    const [latB, lonB] = pointB.split(',').map(s => parseFloat(s.trim()));

                    if (isNaN(latA) || isNaN(lonA) || isNaN(latB) || isNaN(lonB)) {
                        showToast('Неверный формат координат', 'error');
                        return;
                    }

                    const route = RouteModule.createRoute(
                        [{ lat: latA, lon: lonA }, { lat: latB, lon: lonB }],
                        `Маршрут ${Utils.formatDate(new Date(), { day: '2-digit', month: '2-digit' })}`
                    );

                    if (route) {
                        this.stepData.route = route;
                        RouteModule.saveRoute(route);
                        MapModule.setRoute(route);
                        showToast('Маршрут создан', 'success');
                        this.showAnalyzeBlock();
                    }
                } catch (error) {
                    showToast('Ошибка создания маршрута', 'error');
                }
            });
        }

        // Анализ
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', async () => {
                const date = document.getElementById('analysisDate').value;
                const time = document.getElementById('analysisTime').value;
                
                if (!date) {
                    showToast('Выберите дату', 'error');
                    return;
                }

                if (!this.stepData.route || !this.stepData.route.points) {
                    showToast('Выберите маршрут', 'error');
                    return;
                }

                this.stepData.date = date;
                this.stepData.time = time;

                const loading = document.getElementById('analyzeLoading');
                loading.style.display = 'block';
                analyzeBtn.disabled = true;

                try {
                    RouteModule.createSegments();
                    this.stepData.segments = RouteModule.segments;

                    await RouteModule.analyzeSegments(date);
                    this.stepData.segmentAnalysis = RouteModule.segmentAnalysis;

                    const center = this.stepData.route.points[Math.floor(this.stepData.route.points.length / 2)];
                    const forecast = await WeatherModule.getForecast(center.lat, center.lon, date);
                    const analyzed = WeatherModule.analyzeForecast(forecast);
                    this.stepData.forecastData = { forecast, analyzed };

                    showToast('Анализ завершён', 'success');
                    
                    setTimeout(() => {
                        this.nextStep();
                    }, 500);
                } catch (error) {
                    showToast('Ошибка анализа: ' + error.message, 'error');
                } finally {
                    loading.style.display = 'none';
                    analyzeBtn.disabled = false;
                }
            });
        }
    },

    showAnalyzeBlock() {
        const block = document.getElementById('analyzeBlock');
        const info = document.getElementById('selectedRouteInfo');
        
        if (block && this.stepData.route) {
            block.style.display = 'block';
            info.textContent = `${this.stepData.route.name} · ${this.stepData.route.distance?.toFixed(1) || 0} км · ~${this.stepData.route.flightTime || 0} мин`;
        }
    },

    // ==================== ШАГ 2: АНАЛИЗ (4 ВКЛАДКИ) ====================

    /**
     * Шаг 2: HTML
     */
    renderStep2Html() {
        return `
            <div class="step-content">
                <!-- Вкладки -->
                <div class="analysis-tabs" id="analysisTabs">
                    <div class="analysis-tab ${this.currentTab === 'recommendations' ? 'active' : ''}" data-tab="recommendations">
                        <i class="fas fa-clipboard-list"></i> Рекомендации
                    </div>
                    <div class="analysis-tab ${this.currentTab === 'energy' ? 'active' : ''}" data-tab="energy">
                        <i class="fas fa-battery-three-quarters"></i> Энергия
                    </div>
                    <div class="analysis-tab ${this.currentTab === 'charts' ? 'active' : ''}" data-tab="charts">
                        <i class="fas fa-chart-line"></i> Графики
                    </div>
                    <div class="analysis-tab ${this.currentTab === 'details' ? 'active' : ''}" data-tab="details">
                        <i class="fas fa-table"></i> Детали
                    </div>
                    <div class="analysis-tab ${this.currentTab === 'windows' ? 'active' : ''}" data-tab="windows">
                        <i class="fas fa-clock"></i> Окна
                    </div>
                </div>

                <!-- Контент вкладок -->
                <div id="analysisTabContent">
                    ${this.renderStep2Content()}
                </div>
            </div>
        `;
    },

    /**
     * Отрисовка вкладок
     */
    renderStep2Tabs() {
        const container = document.getElementById('analysisTabs');
        if (!container) return;

        const tabs = [
            { id: 'recommendations', icon: 'fa-clipboard-list', label: 'Рекомендации' },
            { id: 'energy', icon: 'fa-battery-three-quarters', label: 'Энергия' },
            { id: 'charts', icon: 'fa-chart-line', label: 'Графики' },
            { id: 'details', icon: 'fa-table', label: 'Детали' },
            { id: 'windows', icon: 'fa-clock', label: 'Окна' }
        ];

        container.innerHTML = tabs.map(tab => `
            <div class="analysis-tab ${this.currentTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
                <i class="fas ${tab.icon}"></i> ${tab.label}
            </div>
        `).join('');
    },

    /**
     * Контент вкладок
     */
    renderStep2Content() {
        switch (this.currentTab) {
            case 'recommendations':
                return this.renderRecommendationsTab();
            case 'energy':
                setTimeout(() => this.initEnergyAnalysis(), 150);
                return this.renderEnergyTab();
            case 'charts':
                return this.renderChartsTab();
            case 'details':
                setTimeout(() => this.renderDetailsTable(), 100);
                return this.renderDetailsTab();
            case 'windows':
                return this.renderWindowsTabHtml();
            default:
                return this.renderRecommendationsTab();
        }
    },

    /**
     * Вкладка: Рекомендации
     */
    renderRecommendationsTab() {
        // Используем скорректированные данные если они есть
        const analysis = this.stepData.correctedAnalysis || this.stepData.segmentAnalysis[0]?.analyzed;
        const recommendations = analysis ? WeatherModule.generateRecommendations(analysis, this.stepData.pilotData) : [];

        return `
            <div class="tab-content-block">
                ${this.stepData.pilotData ? `
                    <div style="padding: 10px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(102, 126, 234, 0.2);">
                        <div style="font-size: 10px; color: #2d3748; font-weight: 600;">
                            <i class="fas fa-flag" style="color: #667eea;"></i> Данные скорректированы по фактическим наблюдениям с точки старта
                        </div>
                    </div>
                ` : ''}
                ${recommendations.length > 0 ? `
                    <div class="recommendations-block">
                        <div class="recommendations-content">
                            ${recommendations.map(rec => `
                                <div class="recommendation-item ${rec.type}">
                                    <i class="fas ${rec.icon}"></i>
                                    <span class="recommendation-text">${rec.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                        <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                        <p>Нет рекомендаций</p>
                    </div>
                `}
            </div>
        `;
    },

    /**
     * Вкладка: Графики
     */
    renderChartsTab() {
        // Используем скорректированные данные если они есть
        const analyzed = this.stepData.correctedAnalysis || this.stepData.forecastData?.analyzed;
        
        return `
            <div class="tab-content-block">
                ${this.stepData.pilotData ? `
                    <div style="padding: 10px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px; margin-bottom: 12px; border: 1px solid rgba(102, 126, 234, 0.2);">
                        <div style="font-size: 10px; color: #2d3748; font-weight: 600;">
                            <i class="fas fa-flag" style="color: #667eea;"></i> Данные скорректированы по фактическим наблюдениям
                        </div>
                    </div>
                ` : ''}
                <div class="charts-grid">
                    <div class="chart-item">
                        <div class="chart-title">Временной ряд метеопараметров</div>
                        <div class="chart-container loading" id="timeSeriesChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Вертикальный профиль ветра</div>
                        <div class="chart-container loading" id="verticalProfileChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Вертикальный профиль температуры</div>
                        <div class="chart-container loading" id="temperatureProfileChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Роза ветров</div>
                        <div class="chart-container loading" id="windRoseChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Индекс турбулентности</div>
                        <div class="chart-container loading" id="turbulenceChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Высота нижней границы облаков</div>
                        <div class="chart-container loading" id="ceilingChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Тепловая календарная карта полётных окон</div>
                        <div class="chart-container loading" id="flightWindowsChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Вкладка: Детали
     */
    renderDetailsTab() {
        const segments = this.stepData.segments;
        const analysis = this.stepData.segmentAnalysis;

        if (!segments || segments.length === 0) {
            return `
                <div class="tab-content-block">
                    <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                        <i class="fas fa-table" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                        <p>Нет данных сегментов</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="tab-content-block">
                <div style="margin-bottom: 16px;">
                    <div class="section-title">
                        <i class="fas fa-table"></i> Данные по сегментам (${segments.length})
                    </div>
                </div>

                <div style="overflow-x: visible;">
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th style="width: 60px;">Сегмент</th>
                                <th style="width: 100px;">Статус</th>
                                <th style="width: 90px;">Дистанция (км)</th>
                                <th style="width: 100px;">Ветер 10м (м/с)</th>
                                <th style="width: 110px;">Температура (°C)</th>
                                <th style="width: 110px;">Осадки (мм/ч)</th>
                                <th>Видимость (км)</th>
                            </tr>
                        </thead>
                        <tbody id="detailsTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * Вкладка: Окна
     */
    renderWindowsTab() {
        const analyzed = this.stepData.forecastData?.analyzed;
        const windows = analyzed?.summary?.flightWindows || [];

        // Если это вызов для инициализации (не для рендеринга HTML)
        const container = document.getElementById('windowsList');
        if (container && this.currentTab === 'windows') {
            container.innerHTML = windows.length > 0 ? windows.map((w, i) => {
                const start = new Date(w.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const end = new Date(w.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const duration = w.hours.length;

                return `
                    <div class="flight-window window-allowed">
                        <div style="font-size: 10px; opacity: 0.8;">Окно ${i + 1}</div>
                        <div style="font-weight: 700;">${start}–${end}</div>
                        <div style="font-size: 9px; opacity: 0.7;">${duration} ч</div>
                    </div>
                `;
            }).join('') : `
                <div class="flight-window window-forbidden">
                    <div style="font-size: 11px;">Благоприятных окон не найдено</div>
                </div>
            `;
            
            // Обновляем информацию о количестве окон
            const infoBlock = document.querySelector('#windowsList + div');
            if (infoBlock && windows.length > 0) {
                infoBlock.innerHTML = `
                    <div style="font-size: 13px; color: #276749;">
                        <i class="fas fa-check-circle" style="color: #38a169;"></i>
                        Найдено <strong>${windows.length}</strong> благоприятных окон для полёта
                    </div>
                `;
            }
            return;
        }

        // Возвращаем HTML для renderStep2Content
        return this.renderWindowsTabHtml();
    },

    /**
     * Вкладка: Окна (HTML)
     */
    renderWindowsTabHtml() {
        const analyzed = this.stepData.forecastData?.analyzed;
        const windows = analyzed?.summary?.flightWindows || [];

        return `
            <div class="tab-content-block">
                <div style="margin-bottom: 16px;">
                    <div class="section-title">
                        <i class="fas fa-clock"></i> Благоприятные окна для полёта (24ч)
                    </div>
                </div>

                <div class="flight-windows" id="windowsList" style="margin-bottom: 20px;">
                    ${windows.length > 0 ? windows.map((w, i) => {
                        const start = new Date(w.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const end = new Date(w.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const duration = w.hours.length;

                        return `
                            <div class="flight-window window-allowed">
                                <div style="font-size: 10px; opacity: 0.8;">Окно ${i + 1}</div>
                                <div style="font-weight: 700;">${start}–${end}</div>
                                <div style="font-size: 9px; opacity: 0.7;">${duration} ч</div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="flight-window window-forbidden">
                            <div style="font-size: 11px;">Благоприятных окон не найдено</div>
                        </div>
                    `}
                </div>

                ${windows.length > 0 ? `
                    <div style="padding: 12px; background: rgba(56, 161, 105, 0.1); border-radius: 10px;">
                        <div style="font-size: 13px; color: #276749;">
                            <i class="fas fa-check-circle" style="color: #38a169;"></i>
                            Найдено <strong>${windows.length}</strong> благоприятных окон для полёта
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Шаг 2: События
     */
    bindStep2Events() {
        // Отображаем сегменты на карте
        this.displaySegmentsOnMap();

        // Инициализируем текущую вкладку с задержкой (ждем пока HTML вставится в DOM)
        setTimeout(() => {
            const contentContainer = document.getElementById('analysisTabContent');
            if (!contentContainer) return;

            if (this.currentTab === 'charts') {
                this.initCharts();
            } else if (this.currentTab === 'energy') {
                this.initEnergyAnalysis();
            } else if (this.currentTab === 'details') {
                this.renderDetailsTable();
            } else if (this.currentTab === 'recommendations') {
                this.renderSegmentRecommendations();
            }
            // Windows не требует дополнительной инициализации
        }, 500);
    },

    /**
     * Отображение сегментов на карте
     */
    displaySegmentsOnMap() {
        if (typeof MapModule === 'undefined') return;
        
        const segments = this.stepData.segments;
        const analysis = this.stepData.segmentAnalysis;
        
        if (!segments || segments.length === 0) return;

        // Очищаем предыдущие сегменты
        if (MapModule.segmentsSource) {
            MapModule.segmentsSource.clear();
        }

        // Рисуем каждый сегмент с цветом риска
        segments.forEach((segment, i) => {
            const segAnalysis = analysis[i];
            const riskLevel = segAnalysis?.riskLevel || 'low';
            
            if (segment.points && segment.points.length > 0) {
                const coords = segment.points.map(p => 
                    ol.proj.fromLonLat([p.lon, p.lat])
                );
                
                const line = new ol.Feature({
                    geometry: new ol.geom.LineString(coords),
                    riskLevel: riskLevel,
                    segmentIndex: i
                });
                
                if (MapModule.segmentsSource) {
                    MapModule.segmentsSource.addFeature(line);
                }
            }
        });

        // Добавляем обработчик клика по сегментам
        this.addSegmentClickHandler();
    },

    /**
     * Обработчик клика по сегментам
     */
    addSegmentClickHandler() {
        if (typeof MapModule === 'undefined' || !MapModule.map) return;

        // Удаляем предыдущий обработчик если есть
        if (this.segmentClickHandlerKey) {
            ol.Observable.unByKey(this.segmentClickHandlerKey);
        }

        this.segmentClickHandlerKey = MapModule.map.on('click', (evt) => {
            const features = [];
            MapModule.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                if (feature.get('segmentIndex') !== undefined) {
                    features.push(feature);
                }
            });

            if (features.length > 0) {
                const feature = features[0];
                const segmentIndex = feature.get('segmentIndex');
                this.showSegmentModal(segmentIndex);
            }
        });
    },

    /**
     * Модальное окно сегмента (боковая панель)
     */
    showSegmentModal(segmentIndex) {
        const segment = this.stepData.segments[segmentIndex];
        const analysis = this.stepData.segmentAnalysis[segmentIndex];
        
        if (!segment || !analysis) return;

        this.currentSegmentIndex = segmentIndex;
        this.currentSegmentPage = 1; // Сброс на первую страницу при переключении сегмента
        this.totalSegmentPages = 3;

        // Подсветка сегмента на карте
        this.highlightSegmentOnMap(segmentIndex);

        this.renderSegmentPanel();
    },

    /**
     * Подсветка сегмента на карте
     */
    highlightSegmentOnMap(segmentIndex) {
        if (typeof MapModule === 'undefined' || !MapModule.segmentsSource) return;

        const features = MapModule.segmentsSource.getFeatures();
        
        features.forEach((feature, index) => {
            const riskLevel = feature.get('riskLevel') || 'low';
            const colors = {
                low: '#38a169',
                medium: '#ed8936',
                high: '#e53e3e'
            };
            
            if (index === segmentIndex) {
                // Активный сегмент - ярче и толще
                feature.setStyle(new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#667eea',
                        width: 10,
                        lineDash: [10, 5],
                        lineCap: 'round'
                    })
                }));
            } else {
                // Неактивные сегменты - обычный стиль
                feature.setStyle(new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: colors[riskLevel] || colors.low,
                        width: 6,
                        lineCap: 'round'
                    })
                }));
            }
        });

        // Центрирование на активном сегменте
        const segment = this.stepData.segments[segmentIndex];
        if (segment && segment.points && segment.points.length > 0) {
            const coords = segment.points.map(p => ol.proj.fromLonLat([p.lon, p.lat]));
            const extent = ol.extent.boundingExtent(coords);
            MapModule.view.fit(extent, { padding: [50, 50, 50, 50], duration: 500, maxZoom: 14 });
        }
    },

    /**
     * Отрисовка боковой панели сегмента
     */
    renderSegmentPanel() {
        const segmentIndex = this.currentSegmentIndex;
        const page = this.currentSegmentPage;

        const segment = this.stepData.segments[segmentIndex];
        const analysis = this.stepData.segmentAnalysis[segmentIndex];
        
        if (!segment || !analysis) return;

        const firstHour = analysis.analyzed?.hourly?.[0] || {};
        const hourly = analysis.analyzed?.hourly || [];
        
        const riskLabels = {
            low: { text: 'НИЗКИЙ', class: 'window-allowed' },
            medium: { text: 'СРЕДНИЙ', class: 'window-restricted' },
            high: { text: 'ВЫСОКИЙ', class: 'window-forbidden' }
        };
        
        const riskInfo = riskLabels[analysis.riskLevel] || riskLabels.low;
        const altitudeData = hourly.length > 0 ? hourly[0] : null;

        let pageContent = '';

        // Страница 1: Основная информация
        if (page === 1) {
            pageContent = `
                <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <div style="font-size: 10px; color: rgba(0,0,0,0.5); margin-bottom: 6px;">Координаты сегмента ${segmentIndex + 1}</div>
                    <span class="flight-window ${riskInfo.class}" style="font-size: 11px; padding: 6px 12px; margin-bottom: 10px;">
                        ${riskInfo.text}
                    </span>
                    <div style="font-size: 13px; font-weight: 700; color: #2d3748; margin: 10px 0; font-family: monospace;">
                        ${segment.center?.lat.toFixed(4)}, ${segment.center?.lon.toFixed(4)}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px;">
                    <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 9px; color: rgba(0,0,0,0.5);">📏 Дистанция</div>
                        <div style="font-size: 15px; font-weight: 700; color: #2d3748;">${segment.distance?.toFixed(1) || 0}</div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4);">км</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 9px; color: rgba(0,0,0,0.5);">🌧️ Осадки</div>
                        <div style="font-size: 15px; font-weight: 700; color: #2d3748;">${(firstHour.precip || 0).toFixed(1)}</div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4);">мм/ч</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 9px; color: rgba(0,0,0,0.5);">💨 Ветер</div>
                        <div style="font-size: 15px; font-weight: 700; color: #2d3748;">${Math.round(firstHour.wind10m || 0)}</div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4);">м/с</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 9px; color: rgba(0,0,0,0.5);">🌡️ Темп.</div>
                        <div style="font-size: 15px; font-weight: 700; color: #2d3748;">${Math.round(firstHour.temp2m || 0)}°</div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4);">C</div>
                    </div>
                </div>

                <div style="background: rgba(102, 126, 234, 0.05); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 11px; font-weight: 600; color: #2d3748; margin-bottom: 10px;">
                        <i class="fas fa-chart-area" style="color: #667eea;"></i> Анализ по высотам
                    </div>
                    <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(0,0,0,0.1);">
                                <th style="padding: 6px 4px; text-align: left;">Высота</th>
                                <th style="padding: 6px 4px;">Риск</th>
                                <th style="padding: 6px 4px;">Ветер</th>
                                <th style="padding: 6px 4px;">Темп.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderAltitudeRow(250, altitudeData)}
                            ${this.renderAltitudeRow(350, altitudeData)}
                            ${this.renderAltitudeRow(450, altitudeData)}
                            ${this.renderAltitudeRow(550, altitudeData)}
                        </tbody>
                    </table>
                </div>

                <div style="background: rgba(237, 137, 54, 0.1); border-radius: 8px; padding: 10px;">
                    <div style="font-size: 11px; font-weight: 600; color: #c05621;">
                        <i class="fas fa-exclamation-triangle"></i> Факторы риска
                    </div>
                    <div style="font-size: 11px; color: rgba(0,0,0,0.7); margin-top: 6px; line-height: 1.6;">
                        ${this.renderRiskFactors(altitudeData)}
                    </div>
                </div>
            `;
        }
        // Страница 2: Детальная информация
        else if (page === 2) {
            pageContent = `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #2d3748; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                        <i class="fas fa-info-circle" style="color: #667eea;"></i> Информация о сегменте
                    </div>
                    <div style="font-size: 11px; color: rgba(0,0,0,0.7); line-height: 2;">
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Координаты:</span>
                            <span style="font-weight: 600; font-family: monospace;">${segment.center?.lat.toFixed(4)}, ${segment.center?.lon.toFixed(4)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Дистанция:</span>
                            <span style="font-weight: 600;">${segment.distance?.toFixed(1)} км</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Общий риск:</span>
                            <span class="flight-window ${riskInfo.class}" style="padding: 2px 8px; font-size: 10px;">${riskInfo.text}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Ветер 10м:</span>
                            <span style="font-weight: 600;">${(firstHour.wind10m || 0).toFixed(1)} м/с</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Ветер 500м:</span>
                            <span style="font-weight: 600;">${((firstHour.wind10m || 0) * 1.3).toFixed(1)} м/с</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Температура 2м:</span>
                            <span style="font-weight: 600;">${(firstHour.temp2m || 0).toFixed(1)}°C</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Осадки:</span>
                            <span style="font-weight: 600;">${(firstHour.precip || 0).toFixed(1)} мм/ч</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Видимость:</span>
                            <span style="font-weight: 600;">${(firstHour.visibility || 5).toFixed(1)} км</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                            <span style="color: rgba(0,0,0,0.5);">Влажность:</span>
                            <span style="font-weight: 600;">${(firstHour.humidity || 50).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight: 600; color: #2d3748; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                        <i class="fas fa-chart-line" style="color: #667eea;"></i> Динамика по времени
                    </div>
                    <div style="max-height: 250px; overflow-y: auto; font-size: 10px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 2px solid rgba(0,0,0,0.1); position: sticky; top: 0; background: #fff;">
                                    <th style="padding: 8px 4px; text-align: left; font-size: 9px;">Время</th>
                                    <th style="padding: 8px 4px; text-align: center; font-size: 9px;">Ветер</th>
                                    <th style="padding: 8px 4px; text-align: center; font-size: 9px;">Темп.</th>
                                    <th style="padding: 8px 4px; text-align: center; font-size: 9px;">Осадки</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${hourly.slice(0, 24).map(h => {
                                    const time = new Date(h.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                                    return `
                                        <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                                            <td style="padding: 8px 4px; font-weight: 600;">${time}</td>
                                            <td style="padding: 8px 4px; text-align: center;">${(h.wind10m || 0).toFixed(1)}</td>
                                            <td style="padding: 8px 4px; text-align: center;">${(h.temp2m || 0).toFixed(0)}°</td>
                                            <td style="padding: 8px 4px; text-align: center;">${(h.precip || 0).toFixed(1)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        // Страница 3: Рекомендации
        else if (page === 3) {
            const recommendations = WeatherModule.generateRecommendations(analysis.analyzed);
            pageContent = `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 600; color: #2d3748; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.1);">
                        <i class="fas fa-clipboard-list" style="color: #667eea;"></i> Рекомендации
                    </div>
                    ${recommendations.length > 0 ? `
                        <div style="max-height: 400px; overflow-y: auto;">
                            ${recommendations.map(rec => `
                                <div style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                                        <i class="fas ${rec.icon}" style="font-size: 16px; color: ${rec.type === 'critical' ? '#e53e3e' : rec.type === 'warning' ? '#dd6b20' : rec.type === 'success' ? '#38a169' : '#3182ce'}; margin-top: 2px;"></i>
                                        <span style="font-size: 12px; line-height: 1.5; color: #4a5568;">${rec.text.replace(/<[^>]*>/g, '')}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 30px 20px; color: rgba(0,0,0,0.5);">
                            <i class="fas fa-check-circle" style="font-size: 40px; margin-bottom: 12px; opacity: 0.3; color: #38a169;"></i>
                            <div style="font-size: 12px;">Нет особых рекомендаций</div>
                        </div>
                    `}
                </div>

                <div style="background: rgba(102, 126, 234, 0.05); border-radius: 8px; padding: 12px;">
                    <div style="font-size: 11px; font-weight: 600; color: #2d3748; margin-bottom: 8px;">
                        <i class="fas fa-lightbulb" style="color: #667eea;"></i> Общие рекомендации
                    </div>
                    <div style="font-size: 11px; color: rgba(0,0,0,0.7); line-height: 1.8;">
                        <div>• Проверяйте актуальные данные</div>
                        <div>• Имейте запасной аэродром</div>
                        <div>• Контролируйте метеоусловия</div>
                        <div>• При ухудшении — прекратите полёт</div>
                    </div>
                </div>
            `;
        }

        // Пагинация между сегментами (верхняя)
        const segmentPaginationHtml = `
            <div class="segment-pagination">
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.5); text-transform: uppercase; margin-bottom: 10px; text-align: center;">
                    Навигация по сегментам
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <button class="segment-nav-btn" onclick="showSegmentModal(${segmentIndex - 1})" ${segmentIndex === 0 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div style="font-size: 13px; font-weight: 700; color: #667eea; text-align: center;">
                        Сегмент ${segmentIndex + 1} / ${this.stepData.segments.length}
                    </div>
                    <button class="segment-nav-btn" onclick="showSegmentModal(${segmentIndex + 1})" ${segmentIndex === this.stepData.segments.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Пагинация страниц контента (нижняя)
        const pagePaginationHtml = `
            <div class="page-pagination">
                <div style="font-size: 10px; font-weight: 600; color: rgba(0,0,0,0.5); text-transform: uppercase; margin-bottom: 8px; text-align: center;">
                    Страницы информации
                </div>
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <button class="segment-page-btn ${page === 1 ? 'active' : ''}" onclick="changeSegmentPage(1)" title="Основное">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="segment-page-btn ${page === 2 ? 'active' : ''}" onclick="changeSegmentPage(2)" title="Детали">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="segment-page-btn ${page === 3 ? 'active' : ''}" onclick="changeSegmentPage(3)" title="Рекомендации">
                        <i class="fas fa-clipboard-list"></i>
                    </button>
                </div>
            </div>
        `;

        const panelHtml = `
            <div class="segment-panel active" id="segmentPanel">
                <div class="segment-panel-header">
                    <h3><i class="fas fa-map-marker-alt" style="color: #667eea;"></i> Сегмент ${segmentIndex + 1}</h3>
                    <button class="segment-panel-close" onclick="closeSegmentModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="segment-panel-body">
                    ${segmentPaginationHtml}
                    ${pageContent}
                    ${pagePaginationHtml}
                </div>
            </div>
        `;

        let existingPanel = document.getElementById('segmentPanel');
        if (existingPanel) {
            existingPanel.remove();
        }
        document.body.insertAdjacentHTML('beforeend', panelHtml);
    },

    /**
     * Строка данных по высоте
     */
    renderAltitudeRow(height, data) {
        if (!data) return '';
        
        const windKey = `wind${height}`;
        const tempKey = `temp${height}`;
        const rhKey = `rh${height}`;
        const riskKey = `risk${height}`;
        
        const wind = data[windKey] || (data.wind10m * (1 + height / 1000 * 0.15));
        const temp = data[tempKey] || (data.temp2m - (height / 1000) * 6.5);
        const rh = data[rhKey] || Math.max(50, data.humidity - (height / 100));
        const risk = data[riskKey] || (wind > 15 ? 'high' : wind > 10 ? 'medium' : 'low');
        
        const riskLabels = {
            low: '<span style="color: #38a169; font-weight: 600;">НИЗ</span>',
            medium: '<span style="color: #ed8936; font-weight: 600;">СРЕД</span>',
            high: '<span style="color: #e53e3e; font-weight: 600;">ВЫС</span>'
        };

        return `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 6px 4px; font-weight: 600;">${height}м</td>
                <td style="padding: 6px 4px; text-align: center;">${riskLabels[risk] || riskLabels.low}</td>
                <td style="padding: 6px 4px; text-align: center;">${Math.round(wind)} м/с</td>
                <td style="padding: 6px 4px; text-align: center;">${Math.round(temp)}°C</td>
            </tr>
        `;
    },

    /**
     * Факторы риска
     */
    renderRiskFactors(data) {
        if (!data) return 'Нет данных';
        
        const factors = [];
        
        // Обледенение
        if (data.temp2m <= 5 && data.temp2m >= -10 && data.humidity > 80) {
            factors.push('• Риск обледенения');
        }
        
        // Ветер
        if (data.wind10m > 10) {
            factors.push('• Сильный ветер');
        }
        
        // Осадки
        if (data.precip > 0.5) {
            factors.push('• Осадки');
        }
        
        // Видимость
        if (data.visibility < 2) {
            factors.push('������������ Низкая видимость');
        }
        
        if (factors.length === 0) {
            return 'Факторы риска отсутствуют';
        }
        
        return factors.join('<br>');
    },

    /**
     * Переключение страницы сегмента
     */
    changeSegmentPage(page) {
        this.currentSegmentPage = page;
        this.renderSegmentPanel();
    },

    closeSegmentModal() {
        const panel = document.getElementById('segmentPanel');
        if (panel) {
            panel.classList.remove('active');
            setTimeout(() => {
                panel.remove();
            }, 300);
        }
        
        // Сброс подсветки сегментов на карте
        this.resetSegmentHighlight();
    },

    /**
     * Сброс подсветки сегментов
     */
    resetSegmentHighlight() {
        if (typeof MapModule === 'undefined' || !MapModule.segmentsSource) return;

        const features = MapModule.segmentsSource.getFeatures();
        const colors = {
            low: '#38a169',
            medium: '#ed8936',
            high: '#e53e3e'
        };
        
        features.forEach(feature => {
            const riskLevel = feature.get('riskLevel') || 'low';
            feature.setStyle(new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: colors[riskLevel] || colors.low,
                    width: 6,
                    lineCap: 'round'
                })
            }));
        });
    },

    /**
     * Рекомендации п�� сегментам
     */
    renderSegmentRecommendations() {
        const container = document.querySelector('.tab-content-block .recommendations-block');
        if (!container) return;
        
        // Добавляем информацию о сегментах
        const segmentsCount = this.stepData.segments.length;
        const highRiskCount = this.stepData.segmentAnalysis.filter(s => s.riskLevel === 'high').length;
        const mediumRiskCount = this.stepData.segmentAnalysis.filter(s => s.riskLevel === 'medium').length;
        const lowRiskCount = segmentsCount - highRiskCount - mediumRiskCount;
        
        // Генерируем детализацию по сегментам с ссылками
        const segmentDetails = this.stepData.segmentAnalysis.map((s, i) => {
            const firstHour = s.analyzed?.hourly?.[0] || {};
            const riskLabel = s.riskLevel === 'high' ? 'ВЫСОКИЙ' : s.riskLevel === 'medium' ? 'СРЕДНИЙ' : 'НИЗКИЙ';
            const riskClass = s.riskLevel === 'high' ? 'badge-danger' : s.riskLevel === 'medium' ? 'badge-warn' : 'badge-ok';
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="flex: 1;">
                        <span style="font-weight: 600; color: #2d3748;">Сегмент ${i + 1}</span>
                        <span class="badge ${riskClass}" style="margin-left: 8px;">${riskLabel}</span>
                        <span style="color: rgba(0,0,0,0.6); font-size: 12px; margin-left: 8px;">
                            В: ${(firstHour.wind10m || 0).toFixed(1)} м/с · О: ${(firstHour.precip || 0).toFixed(1)} мм/ч · T: ${(firstHour.temp2m || 0).toFixed(1)}°C
                        </span>
                    </div>
                    <button class="segment-detail-btn" onclick="showSegmentModal(${i})">
                        <i class="fas fa-info-circle"></i> Подробнее
                    </button>
                </div>
            `;
        }).join('');

        // Определяем общий статус
        let overallStatus = 'ПОЛЁТ РАЗРЕШЁН';
        let statusClass = 'status-allowed';
        if (highRiskCount > 0) {
            overallStatus = 'ПОЛЁТ ЗАПРЕЩЁН';
            statusClass = 'status-forbidden';
        } else if (mediumRiskCount > segmentsCount * 0.5) {
            overallStatus = 'ПОЛЁТ С ОГРАНИЧЕНИЯМИ';
            statusClass = 'status-restricted';
        }

        const infoHtml = `
            <div style="margin-bottom: 16px;">
                <div class="flight-status ${statusClass}" style="margin-bottom: 0;">
                    <i class="fas fa-${highRiskCount > 0 ? 'times-circle' : mediumRiskCount > 0 ? 'exclamation-triangle' : 'check-circle'}"></i>
                    <span>${overallStatus}</span>
                </div>
            </div>
            
            <div style="background: rgba(102, 126, 234, 0.1); border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 13px; color: #2d3748;">
                    <i class="fas fa-chart-pie" style="color: #667eea;"></i>
                    <strong>Сегменты маршрута:</strong> ${segmentsCount} всего
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                    <span class="badge badge-ok">${lowRiskCount} низкий риск</span>
                    <span class="badge badge-warn">${mediumRiskCount} средний риск</span>
                    <span class="badge badge-danger">${highRiskCount} высокий риск</span>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.02); border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 12px; font-weight: 600; color: #2d3748; margin-bottom: 8px;">
                    <i class="fas fa-list-ul"></i> Детализация по сегментам:
                </div>
                <div style="font-size: 11px; color: rgba(0,0,0,0.7); line-height: 1.8;">
                    ${segmentDetails}
                </div>
            </div>
            
            <div style="font-size: 11px; color: rgba(0,0,0,0.5); margin-bottom: 16px;">
                <i class="fas fa-info-circle"></i> Кликните на сегмент на ����арте или в таблице для подробной информации
            </div>
        `;
        
        const existingInfo = container.querySelector('.segment-info-block');
        if (!existingInfo) {
            container.insertAdjacentHTML('afterbegin', infoHtml);
        }
    },

    initCharts() {
        // Используем скорректированные данные если они есть
        const analyzed = this.stepData.correctedAnalysis || this.stepData.forecastData?.analyzed;
        const chartData = analyzed ? WeatherModule.prepareChartData(analyzed) : null;

        if (!chartData) {
            console.log('Нет данных для графиков');
            return;
        }

        const charts = [
            { id: 'timeSeriesChart', fn: () => ChartsModule.createTimeSeriesChart('timeSeriesChart', chartData) },
            { id: 'verticalProfileChart', fn: () => ChartsModule.createVerticalWindProfile('verticalProfileChart', chartData.wind10m) },
            { id: 'temperatureProfileChart', fn: () => ChartsModule.createTemperatureProfile('temperatureProfileChart', chartData.temperature) },
            { id: 'windRoseChart', fn: () => ChartsModule.createWindRose('windRoseChart', chartData) },
            { id: 'turbulenceChart', fn: () => ChartsModule.createTurbulenceChart('turbulenceChart', chartData) },
            { id: 'ceilingChart', fn: () => ChartsModule.createCeilingChart('ceilingChart', chartData) },
            { id: 'flightWindowsChart', fn: () => ChartsModule.createFlightWindowsCalendar('flightWindowsChart', analyzed.summary.flightWindows) }
        ];

        let initializedCount = 0;
        charts.forEach(chart => {
            const el = document.getElementById(chart.id);
            if (el) {
                // Сбрасываем классы для повторной инициализации
                el.classList.remove('loading', 'chart-initialized');

                // Инициализируем с небольшой задержкой
                setTimeout(() => {
                    el.classList.add('chart-initialized');
                    chart.fn();
                    initializedCount++;
                    console.log(`Инициализирован график: ${chart.id}, всего: ${initializedCount}/7`);
                }, 50 * initializedCount);
            } else {
                console.log(`Элемент графика не найден: ${chart.id}`);
            }
        });
    },

    renderDetailsTable() {
        const tbody = document.getElementById('detailsTableBody');
        if (!tbody) return;

        const segments = this.stepData.segments;
        const analysis = this.stepData.segmentAnalysis;
        
        if (!segments || segments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: rgba(0,0,0,0.5);">Нет данных</td></tr>';
            return;
        }

        tbody.innerHTML = segments.map((segment, i) => {
            const segAnalysis = analysis[i];
            const riskLevel = segAnalysis?.riskLevel || 'low';
            const statusClass = riskLevel === 'high' ? 'window-forbidden' : riskLevel === 'medium' ? 'window-restricted' : 'window-allowed';
            const statusText = riskLevel === 'high' ? 'Высокий' : riskLevel === 'medium' ? 'Средний' : 'Низкий';
            const firstHour = segAnalysis?.analyzed?.hourly?.[0] || {};

            return `
                <tr style="cursor: pointer;" onclick="WizardModule.showSegmentModal(${i})">
                    <td style="font-weight: 600;">${i + 1}</td>
                    <td><span class="flight-window ${statusClass}" style="padding: 4px 8px; font-size: 10px;">${statusText}</span></td>
                    <td>${segment.distance?.toFixed(1) || 0}</td>
                    <td>${(firstHour.wind10m || 0).toFixed(1)}</td>
                    <td>${(firstHour.temp2m || 0).toFixed(1)}</td>
                    <td>${(firstHour.precip || 0).toFixed(1)}</td>
                    <td>${(firstHour.visibility || 5).toFixed(1)}</td>
                </tr>
            `;
        }).join('');
    },

    // ==================== ШАГ 3: ПИЛОТ ====================

    /**
     * Шаг 3: HTML
     */
    renderStep3Html() {
        const hasObservations = this.stepData.pilotObservations.length > 0;
        const hasCorrection = this.stepData.correctedAnalysis !== null;

        return `
            <div class="step-content">
                <h3 style="margin-bottom: 16px; color: #2d3748;">
                    <i class="fas fa-flag" style="color: #667eea;"></i> Сидя на земле
                </h3>

                <!-- Вкладки -->
                <div class="analysis-tabs" style="margin-bottom: 16px;">
                    <div class="analysis-tab ${!hasCorrection ? 'active' : ''}" onclick="WizardModule.switchStep3Tab('input')">
                        <i class="fas fa-edit"></i> Ввод данных
                    </div>
                    <div class="analysis-tab ${hasCorrection ? 'active' : ''}" onclick="WizardModule.switchStep3Tab('results')" ${!hasCorrection ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        <i class="fas fa-chart-bar"></i> Результаты
                    </div>
                </div>

                <!-- Контент вкладок -->
                <div id="step3TabContent">
                    ${!hasCorrection ? this.renderStep3InputTab() : this.renderStep3ResultsTab()}
                </div>
            </div>
        `;
    },

    /**
     * Вкладка ввода данных (шаг 3)
     */
    renderStep3InputTab() {
        const observationsList = this.stepData.pilotObservations.map((obs, i) => `
            <div style="padding: 10px; background: rgba(102, 126, 234, 0.05); border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 11px; font-weight: 600; color: #2d3748;">
                        <i class="fas fa-map-marker-alt" style="color: #667eea;"></i> ${obs.lat.toFixed(4)}, ${obs.lon.toFixed(4)}
                    </div>
                    <div style="font-size: 10px; color: #718096;">
                        <i class="fas fa-clock"></i> ${new Date(obs.time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 10px;">
                    ${obs.windSpeed ? `<span style="padding: 2px 6px; background: rgba(56, 161, 105, 0.1); border-radius: 4px;">💨 ${obs.windSpeed} м/с</span>` : ''}
                    ${obs.temp ? `<span style="padding: 2px 6px; background: rgba(237, 137, 54, 0.1); border-radius: 4px;">🌡️ ${obs.temp}°C</span>` : ''}
                    ${obs.humidity ? `<span style="padding: 2px 6px; background: rgba(66, 153, 225, 0.1); border-radius: 4px;">💧 ${obs.humidity}%</span>` : ''}
                    ${obs.visibility ? `<span style="padding: 2px 6px; background: rgba(128, 128, 128, 0.1); border-radius: 4px;">👁️ ${obs.visibility} км</span>` : ''}
                    ${obs.fog ? '<span style="padding: 2px 6px; background: rgba(150, 150, 150, 0.2); border-radius: 4px;">🌫️ Туман</span>' : ''}
                    ${obs.precip ? '<span style="padding: 2px 6px; background: rgba(66, 153, 225, 0.2); border-radius: 4px;">🌧️ Осадки</span>' : ''}
                </div>
                <button onclick="WizardModule.removeObservation(${i})" style="position: absolute; right: 10px; top: 10px; background: none; border: none; cursor: pointer; color: #e53e3e; font-size: 14px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        return `
            <div>
                <div style="padding: 12px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 10px; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #2d3748;">
                        <i class="fas fa-info-circle" style="color: #667eea;"></i>
                        Внесите фактические данные для коррекции прогноза. Чем больше данных, тем точнее прогноз!
                    </div>
                </div>

                <!-- Координаты -->
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase; margin-bottom: 8px;">
                        <i class="fas fa-map-marker-alt"></i> Координаты наблюдения
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="pilotLat" class="coord-input" placeholder="Широта" readonly
                               style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px; font-family: monospace; background: rgba(0,0,0,0.05);" />
                        <input type="text" id="pilotLon" class="coord-input" placeholder="Долгота" readonly
                               style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px; font-family: monospace; background: rgba(0,0,0,0.05);" />
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="action-btn" onclick="WizardModule.getCurrentLocation()" 
                                style="flex: 1; background: linear-gradient(135deg, rgba(56, 161, 105, 0.8) 0%, rgba(38, 166, 154, 0.8) 100%);">
                            <i class="fas fa-location-crosshairs"></i> Моё местоположение
                        </button>
                        <button class="action-btn" onclick="WizardModule.selectPointOnMap()" 
                                style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);">
                            <i class="fas fa-map-marker-alt"></i> На карте
                        </button>
                    </div>
                </div>

                <!-- Время наблюдения -->
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase; margin-bottom: 8px;">
                        <i class="fas fa-clock"></i> Время наблюдения
                    </div>
                    <input type="datetime-local" id="pilotTime" 
                           style="width: 100%; padding: 8px; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; font-size: 13px;" />
                </div>

                <!-- Метеоданные -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-wind"></i> Ветер (м/с)
                        </label>
                        <input type="number" id="pilotWindSpeed" class="coord-input"
                               placeholder="0.0" step="0.1" min="0" max="50"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-compass"></i> Направление (°)
                        </label>
                        <input type="number" id="pilotWindDir" class="coord-input"
                               placeholder="0–360" step="1" min="0" max="360"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-thermometer-half"></i> Температура (°C)
                        </label>
                        <input type="number" id="pilotTemp" class="coord-input"
                               placeholder="+0.0" step="0.1" min="-40" max="50"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-tint"></i> Влажность (%)
                        </label>
                        <input type="number" id="pilotHumidity" class="coord-input"
                               placeholder="0" step="1" min="0" max="100"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-eye"></i> Видимость (км)
                        </label>
                        <input type="number" id="pilotVisibility" class="coord-input"
                               placeholder=">5" step="0.1" min="0.1" max="10"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">
                            <i class="fas fa-cloud"></i> Облака (м)
                        </label>
                        <input type="number" id="pilotCloudBase" class="coord-input"
                               placeholder="0" step="50" min="0" max="5000"
                               style="width: 100%; margin-top: 4px;" />
                    </div>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" id="pilotFog" style="width: 18px; height: 18px;" />
                        <span><i class="fas fa-smog"></i> Туман</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 8px; cursor: pointer;">
                        <input type="checkbox" id="pilotPrecip" style="width: 18px; height: 18px;" />
                        <span><i class="fas fa-cloud-rain"></i> Осадки</span>
                    </label>
                </div>

                ${this.stepData.pilotObservations.length > 0 ? `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 12px; font-weight: 600; color: #2d3748; margin-bottom: 12px;">
                            <i class="fas fa-list" style="color: #667eea;"></i> Наблюдения (${this.stepData.pilotObservations.length})
                        </div>
                        <div style="position: relative;">
                            ${observationsList}
                        </div>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 12px;">
                    <button class="action-btn" id="addObservationBtn" style="flex: 1;">
                        <i class="fas fa-plus-circle"></i> Добавить наблюдение
                    </button>
                    <button class="action-btn" id="clearAllBtn"
                            style="width: 56px; background: linear-gradient(135deg, rgba(237, 137, 54, 0.8) 0%, rgba(237, 137, 54, 0.6) 100%);">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 16px;">
                    <button class="action-btn" id="applyCorrectionBtn" style="flex: 1;" 
                            ${this.stepData.pilotObservations.length === 0 ? 'disabled' : ''}
                            style="flex: 1; opacity: ${this.stepData.pilotObservations.length === 0 ? 0.5 : 1};">
                        <i class="fas fa-check-circle"></i> Применить коррекцию
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Вкладка результатов (шаг 3) - Расширенный анализ с 4 источниками
     */
    renderStep3ResultsTab() {
        const activeTab = this.currentTab || 'recommendations';
        const activeViz = this.currentVizTab || 'table';

        console.log('📊 renderStep3ResultsTab:', { activeTab, currentTab: this.currentTab, activeViz });

        // Получаем данные для 4 источников
        const sourcesData = this.getSourcesData();

        return `
            <div>
                <div style="padding: 12px; background: linear-gradient(135deg, rgba(56, 161, 105, 0.15) 0%, rgba(38, 166, 154, 0.15) 100%); border-radius: 10px; margin-bottom: 16px; border: 1px solid rgba(56, 161, 105, 0.3);">
                    <div style="font-size: 13px; color: #276749; font-weight: 600;">
                        <i class="fas fa-check-circle" style="color: #38a169;"></i>
                        Данные скорректированы по ${this.stepData.pilotObservations.length} наблюдению(ям)
                    </div>
                </div>

                <!-- КАРТОЧКИ ИСТОЧНИКОВ (всегда видны) -->
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-database"></i> Источники данных
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                        ${this.renderSourceCard('openMeteo', sourcesData.openMeteo)}
                        ${this.renderSourceCard('metNo', sourcesData.metNo)}
                        ${this.renderSourceCard('pilot', sourcesData.pilot)}
                        ${this.renderSourceCard('corrected', sourcesData.corrected)}
                    </div>
                </div>

                <!-- ВКЛАДКИ ВИЗУАЛИЗАЦИИ -->
                <div style="margin-bottom: 15px;">
                    <div style="font-size: 12px; font-weight: 700; color: #4a5568; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-bar"></i> Визуализация
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 0; flex-wrap: wrap;">
                        <div class="viz-tab ${activeViz === 'table' ? 'active' : ''}" data-viz="table" onclick="WizardModule.switchVizTab('table')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'table' ? 'white' : '#718096'}; background: ${activeViz === 'table' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-table"></i> <span style="white-space: nowrap;">Таблица</span>
                        </div>
                        <div class="viz-tab ${activeViz === 'charts' ? 'active' : ''}" data-viz="charts" onclick="WizardModule.switchVizTab('charts')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'charts' ? 'white' : '#718096'}; background: ${activeViz === 'charts' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-chart-area"></i> <span style="white-space: nowrap;">Графики</span>
                        </div>
                        <div class="viz-tab ${activeViz === 'profile' ? 'active' : ''}" data-viz="profile" onclick="WizardModule.switchVizTab('profile')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'profile' ? 'white' : '#718096'}; background: ${activeViz === 'profile' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-layer-group"></i> <span style="white-space: nowrap;">Профиль</span>
                        </div>
                        <div class="viz-tab ${activeViz === 'stats' ? 'active' : ''}" data-viz="stats" onclick="WizardModule.switchVizTab('stats')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'stats' ? 'white' : '#718096'}; background: ${activeViz === 'stats' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-chart-bar"></i> <span style="white-space: nowrap;">Статист.</span>
                        </div>
                        <div class="viz-tab ${activeViz === 'risks' ? 'active' : ''}" data-viz="risks" onclick="WizardModule.switchVizTab('risks')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'risks' ? 'white' : '#718096'}; background: ${activeViz === 'risks' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-chart-pie"></i> <span style="white-space: nowrap;">Риски</span>
                        </div>
                        <div class="viz-tab ${activeViz === 'recommendations' ? 'active' : ''}" data-viz="recommendations" onclick="WizardModule.switchVizTab('recommendations')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'recommendations' ? 'white' : '#718096'}; background: ${activeViz === 'recommendations' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-lightbulb"></i> <span style="white-space: nowrap;">Реком.</span>
                        </div>
                        <div class="viz-tab ${activeViz === 'details' ? 'active' : ''}" data-viz="details" onclick="WizardModule.switchVizTab('details')" style="padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; transition: all 0.2s; font-size: 11px; font-weight: 600; color: ${activeViz === 'details' ? 'white' : '#718096'}; background: ${activeViz === 'details' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'}; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-list"></i> <span style="white-space: nowrap;">Детали</span>
                        </div>
                    </div>

                    <!-- Контент визуализации -->
                    <div id="step3VizContent" style="background: #f8fafc; border-radius: 12px; padding: 20px; min-height: 400px;"></div>
                </div>

                <div style="margin-top: 16px;">
                    <button class="action-btn" onclick="WizardModule.backToInput()" style="width: 100%;">
                        <i class="fas fa-arrow-left"></i> Вернуться к вводу данных
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Получение данных для 4 источников
     */
    getSourcesData() {
        const correctedAnalysis = this.stepData.correctedAnalysis;
        const originalAnalysis = this.stepData.segmentAnalysis?.[0]?.analyzed;
        const metNoAnalysis = this.stepData.metNoAnalysis; // 🇳🇴 Реальные данные MET No (отключено)
        const pilotData = this.stepData.pilotData;

        // Open-Meteo (оригинальный прогноз)
        const openMeteo = {
            id: 'openMeteo',
            name: 'Open-Meteo',
            icon: 'fa-cloud-sun',
            color: '#3b82f6',
            risk: originalAnalysis?.summary?.overallRisk || 'low',
            riskScore: originalAnalysis?.hourly?.[0]?.riskScore || 0,
            wind: originalAnalysis?.hourly?.[0]?.wind10m || 0,
            temp: originalAnalysis?.hourly?.[0]?.temp2m || 0,
            humidity: originalAnalysis?.hourly?.[0]?.humidity || 0,
            confidence: 63,
            confidenceText: 'прогноз 24ч'
        };

        // 🇳🇴 MET No (отключено из-за CORS)
        const metNo = {
            id: 'metNo',
            name: 'MET Norway',
            icon: 'fa-globe-europe',
            color: '#10b981',
            risk: metNoAnalysis?.summary?.overallRisk || originalAnalysis?.summary?.overallRisk || 'low',
            riskScore: metNoAnalysis?.hourly?.[0]?.riskScore || originalAnalysis?.hourly?.[0]?.riskScore || 0,
            wind: metNoAnalysis?.hourly?.[0]?.wind10m || (originalAnalysis?.hourly?.[0]?.wind10m || 0) * 0.9,
            temp: metNoAnalysis?.hourly?.[0]?.temp2m || (originalAnalysis?.hourly?.[0]?.temp2m || 0) - 0.5,
            humidity: metNoAnalysis?.hourly?.[0]?.humidity || Math.min(100, (originalAnalysis?.hourly?.[0]?.humidity || 0) + 5),
            confidence: this.stepData.metNoError ? 0 : 58,
            confidenceText: this.stepData.metNoError ? 'CORS ошибка' : (metNoAnalysis ? 'прогноз 24ч' : 'нет данных'),
            error: this.stepData.metNoError || (metNoAnalysis ? null : 'Требуется прокси-сервер')
        };

        // Пилот (фактические данные)
        const hasPilotData = pilotData && (pilotData.windSpeed || pilotData.temp || pilotData.humidity);

        const pilot = {
            id: 'pilot',
            name: 'Пилот (факт)',
            icon: 'fa-flag',
            color: '#f59e0b',
            risk: hasPilotData ? (correctedAnalysis?.summary?.overallRisk || 'medium') : 'low',
            riskScore: hasPilotData ? (correctedAnalysis?.hourly?.[0]?.riskScore || 0) : 0,
            wind: hasPilotData ? (pilotData?.windSpeed || 0) : 0,
            temp: hasPilotData ? (pilotData?.temp || 0) : 0,
            humidity: hasPilotData ? (pilotData?.humidity || 0) : 0,
            confidence: 100,
            confidenceText: hasPilotData ? 'фактические данные' : 'нет данных'
        };

        // Скорректированный (Open-Meteo + Пилот)
        const corrected = {
            id: 'corrected',
            name: 'Скорректированный',
            icon: 'fa-cog',
            color: '#ef4444',
            risk: correctedAnalysis?.summary?.overallRisk || 'medium',
            riskScore: correctedAnalysis?.hourly?.[0]?.riskScore || 3.5,
            wind: correctedAnalysis?.hourly?.[0]?.wind10m || 0,
            temp: correctedAnalysis?.hourly?.[0]?.temp2m || 0,
            humidity: correctedAnalysis?.hourly?.[0]?.humidity || 0,
            confidence: 100,
            confidenceText: 'факт + коррекция'
        };

        return { openMeteo, metNo, pilot, corrected };
    },

    /**
     * Рендер карточки источника
     */
    renderSourceCard(sourceId, data) {
        const riskConfig = {
            low: { class: 'risk-low', text: '🟢', score: data.riskScore.toFixed(1) },
            medium: { class: 'risk-medium', text: '🟡', score: data.riskScore.toFixed(1) },
            high: { class: 'risk-high', text: '🔴', score: data.riskScore.toFixed(1) }
        };
        const risk = riskConfig[data.risk] || riskConfig.low;

        const warningIcon = data.risk === 'medium' || data.risk === 'high' ? ' <span style="color: #dd6b20;">⚠️</span>' : '';
        
        // 🇳🇴 Ошибка загрузки MET No
        const errorBadge = data.error ? `<div style="font-size: 9px; color: #e53e3e; margin-top: 5px;"><i class="fas fa-exclamation-circle"></i> ${data.error}</div>` : '';

        return `
            <div class="source-card source-${sourceId}" onclick="WizardModule.selectSource('${sourceId}')" style="background: white; border-radius: 12px; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border-top: 4px solid ${data.color}; transition: all 0.2s; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: ${data.color}20; color: ${data.color};">
                        <i class="fas ${data.icon}"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 2px;">${data.name}</div>
                        <div style="font-size: 10px; color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Доверие: ${data.confidence}% (${data.confidenceText})</div>
                        ${errorBadge}
                    </div>
                </div>
                <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 10px; background: ${risk.class === 'risk-low' ? '#c6f6d5' : risk.class === 'risk-medium' ? '#feebc8' : '#fed7d7'}; color: ${risk.class === 'risk-low' ? '#22543d' : risk.class === 'risk-medium' ? '#744210' : '#742a2a'};">
                    ${risk.text} ${risk.score}${warningIcon}
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
                    <div style="display: flex; justify-content: space-between; color: #4a5568;">
                        <span style="color: #718096;"><i class="fas fa-wind"></i> Ветер</span>
                        <span style="font-weight: 600; color: #2d3748;">${data.wind.toFixed(1)} м/с</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #4a5568;">
                        <span style="color: #718096;"><i class="fas fa-thermometer-half"></i> Темп.</span>
                        <span style="font-weight: 600; color: #2d3748;">${data.temp >= 0 ? '+' : ''}${data.temp.toFixed(1)}°C</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #4a5568;">
                        <span style="color: #718096;"><i class="fas fa-tint"></i> Влажн.</span>
                        <span style="font-weight: 600; color: #2d3748;">${data.humidity.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Переключение вкладки визуализации
     */
    switchVizTab(vizTab) {
        this.currentVizTab = vizTab;
        console.log('👆 Переключение визуализации:', vizTab);

        // Обновляем активный класс вкладок по data-viz атрибуту
        document.querySelectorAll('.viz-tab').forEach(tab => {
            const isActive = tab.dataset.viz === vizTab;
            if (isActive) {
                tab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                tab.style.color = 'white';
            } else {
                tab.style.background = 'transparent';
                tab.style.color = '#718096';
            }
        });

        // Рендерим контент
        this.renderVizContent();
    },

    /**
     * Рендер контента визуализации
     */
    renderVizContent() {
        const container = document.getElementById('step3VizContent');
        if (!container) {
            console.error('❌ step3VizContent не найден!');
            return;
        }
        
        console.log('🎨 renderVizContent вызван, currentVizTab:', this.currentVizTab);

        switch (this.currentVizTab) {
            case 'table':
                console.log('📊 Рендер таблицы');
                container.innerHTML = this.renderVizTable();
                break;
            case 'charts':
                console.log('📈 Рендер графиков');
                container.innerHTML = this.renderVizCharts();
                setTimeout(() => this.initVizCharts(), 100);
                break;
            case 'profile':
                console.log('🎯 Рендер вертикального профиля');
                container.innerHTML = this.renderVizProfile();
                break;
            case 'stats':
                console.log('📊 Рендер статистики');
                container.innerHTML = this.renderVizStats();
                break;
            case 'risks':
                console.log('📊 Рендер анализа рисков');
                container.innerHTML = this.renderVizRisks();
                break;
            case 'recommendations':
                console.log('💡 Рендер рекомендаций');
                container.innerHTML = this.renderVizRecommendations();
                break;
            case 'details':
                console.log('📋 Рендер деталей');
                container.innerHTML = this.renderVizDetails();
                break;
            default:
                console.log('⚠️ Неизвестная вкладка, рендер таблицы по умолчанию');
                container.innerHTML = this.renderVizTable();
        }

        // Обновляем стили вкладок после рендера контента
        setTimeout(() => {
            document.querySelectorAll('.viz-tab').forEach(tab => {
                const isActive = tab.dataset.viz === this.currentVizTab;
                if (isActive) {
                    tab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    tab.style.color = 'white';
                } else {
                    tab.style.background = 'transparent';
                    tab.style.color = '#718096';
                }
            });
        }, 50);
    },

    /**
     * Вкладка: Анализ рисков (НОВОЕ)
     */
    renderVizRisks() {
        const analysis = this.stepData.correctedAnalysis;
        const riskBreakdown = analysis?.hourly?.[0]?.riskBreakdown;
        const trends = analysis?.trends;

        return `
            <div>
                <!-- ДЕТАЛИЗАЦИЯ РИСКОВ ПО КАТЕГОРИЯМ -->
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-pie"></i> Детализация рисков по категориям
                    </div>
                    ${riskBreakdown ? `
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                            ${this.renderRiskBreakdownCard('Ветер', riskBreakdown.wind)}
                            ${this.renderRiskBreakdownCard('Осадки', riskBreakdown.precip)}
                            ${this.renderRiskBreakdownCard('Видимость', riskBreakdown.visibility)}
                            ${this.renderRiskBreakdownCard('Обледенение', riskBreakdown.icing)}
                            ${this.renderRiskBreakdownCard('Турбулентность', riskBreakdown.turbulence)}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                            <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                            <p>Нет данных для анализа рисков</p>
                        </div>
                    `}
                </div>

                <!-- ТРЕНДЫ И ТЕНДЕНЦИИ -->
                ${trends ? `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-chart-line"></i> Тренды и тенденции
                        </div>
                        
                        <!-- Индикаторы трендов -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
                            ${this.renderTrendIndicator('Ветер', trends.wind)}
                            ${this.renderTrendIndicator('Темп.', trends.temp)}
                            ${this.renderTrendIndicator('Влажн.', trends.humidity)}
                            ${this.renderTrendIndicator('Видим.', trends.visibility)}
                        </div>
                        
                        <!-- Сводка трендов -->
                        ${trends.summary && trends.summary.length > 0 ? `
                            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                                ${trends.summary.map(t => `
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 13px;">
                                        <i class="fas ${t.type === 'warning' ? 'fa-exclamation-triangle' : t.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}" 
                                           style="color: ${t.type === 'warning' ? '#ed8936' : t.type === 'success' ? '#38a169' : '#3b82f6'};"></i>
                                        <span style="color: #2d3748;">${t.text}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <!-- Точки перелома -->
                        ${trends.breakpoints && trends.breakpoints.length > 0 ? `
                            <div style="background: linear-gradient(135deg, rgba(237, 137, 54, 0.1) 0%, rgba(237, 137, 54, 0.05) 100%); border-left: 3px solid #ed8936; border-radius: 8px; padding: 15px;">
                                <div style="font-size: 13px; font-weight: 600; color: #744210; margin-bottom: 10px;">
                                    <i class="fas fa-clock"></i> Точки перелома (когда риск изменится):
                                </div>
                                ${trends.breakpoints.map((bp, i) => `
                                    <div style="font-size: 12px; color: #2d3748; padding: 5px 0; ${i < trends.breakpoints.length - 1 ? 'border-bottom: 1px solid rgba(0,0,0,0.05)' : ''}">
                                        <strong>${bp.time}</strong> — ${bp.event || bp.reason}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Вкладка: Таблица сравнения
     */
    renderVizTable() {
        const sources = this.getSourcesData();
        
        // 🇳🇴 Расхождение между Open-Meteo и MET No
        const windDiff = Math.abs(sources.openMeteo.wind - sources.metNo.wind);
        const tempDiff = Math.abs(sources.openMeteo.temp - sources.metNo.temp);
        const humidityDiff = Math.abs(sources.openMeteo.humidity - sources.metNo.humidity);
        const totalDiscrepancy = (windDiff / 10 + tempDiff / 10 + humidityDiff / 100) / 3;
        
        let discrepancyLevel = 'low';
        let discrepancyMessage = '✅ Прогнозы согласованы';
        let discrepancyColor = '#c6f6d5';
        
        if (totalDiscrepancy > 0.3) {
            discrepancyLevel = 'medium';
            discrepancyMessage = `⚠️ Среднее расхождение: ветер ${windDiff.toFixed(1)} м/с`;
            discrepancyColor = '#feebc8';
        }
        if (totalDiscrepancy > 0.6) {
            discrepancyLevel = 'high';
            discrepancyMessage = `❗ Высокое расхождение: ветер ${windDiff.toFixed(1)} м/с (${((windDiff / Math.max(sources.openMeteo.wind, sources.metNo.wind)) * 100).toFixed(0)}%)`;
            discrepancyColor = '#fed7d7';
        }

        return `
            <!-- Уведомление о расхождении -->
            <div style="background: linear-gradient(135deg, ${discrepancyColor} 0%, ${discrepancyColor}dd 100%); border: 2px solid ${discrepancyLevel === 'high' ? '#ed8936' : discrepancyLevel === 'medium' ? '#d69e2e' : '#38a169'}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas ${discrepancyLevel === 'high' ? 'fa-exclamation-triangle' : discrepancyLevel === 'medium' ? 'fa-info-circle' : 'fa-check-circle'}" style="font-size: 24px; color: ${discrepancyLevel === 'high' ? '#ed8936' : discrepancyLevel === 'medium' ? '#d69e2e' : '#38a169'};"></i>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 600; color: #2d3748; margin-bottom: 4px;">
                            ${discrepancyLevel === 'high' ? 'Высокое расхождение прогнозов!' : discrepancyLevel === 'medium' ? 'Среднее расхождение прогнозов' : 'Прогнозы согласованы'}
                        </div>
                        <div style="font-size: 12px; color: #4a5568;">
                            ${discrepancyMessage}
                        </div>
                    </div>
                    ${discrepancyLevel !== 'low' ? `
                        <div style="text-align: right; font-size: 11px; color: #718096;">
                            <div>Open-Meteo: ${sources.openMeteo.wind.toFixed(1)} м/с</div>
                            <div>MET No: ${sources.metNo.wind.toFixed(1)} м/с</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        
            <table class="comparison-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <thead>
                    <tr>
                        <th style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px; text-align: left; font-weight: 600; font-size: 13px; width: 160px;">Параметр</th>
                        <th style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px; text-align: center; font-weight: 600; font-size: 13px; border-left: 4px solid ${sources.openMeteo.color};">
                            <i class="fas ${sources.openMeteo.icon}"></i> ${sources.openMeteo.name}
                        </th>
                        <th style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px; text-align: center; font-weight: 600; font-size: 13px; border-left: 4px solid ${sources.metNo.color};">
                            <i class="fas ${sources.metNo.icon}"></i> ${sources.metNo.name}
                        </th>
                        <th style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px; text-align: center; font-weight: 600; font-size: 13px; border-left: 4px solid ${sources.pilot.color};">
                            <i class="fas ${sources.pilot.icon}"></i> ${sources.pilot.name}
                        </th>
                        <th style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px; text-align: center; font-weight: 600; font-size: 13px; border-left: 4px solid ${sources.corrected.color};">
                            <i class="fas ${sources.corrected.icon}"></i> ${sources.corrected.name}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2d3748;">Ветер 10м (м/с)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.openMeteo.color};">${sources.openMeteo.wind.toFixed(1)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.metNo.color};">${sources.metNo.wind.toFixed(1)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.pilot.color}; font-weight: 700;">${sources.pilot.wind.toFixed(1)}${sources.pilot.risk !== 'low' ? ' <span style="color: #dd6b20;">⚠️</span>' : ''}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.corrected.color}; font-weight: 700;">${sources.corrected.wind.toFixed(1)}${sources.corrected.risk !== 'low' ? ' <span style="color: #dd6b20;">⚠️</span>' : ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2d3748;">Температура (°C)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.openMeteo.color};">${sources.openMeteo.temp >= 0 ? '+' : ''}${sources.openMeteo.temp.toFixed(1)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.metNo.color};">${sources.metNo.temp >= 0 ? '+' : ''}${sources.metNo.temp.toFixed(1)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.pilot.color}; font-weight: 700;">${sources.pilot.temp >= 0 ? '+' : ''}${sources.pilot.temp.toFixed(1)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.corrected.color}; font-weight: 700;">${sources.corrected.temp >= 0 ? '+' : ''}${sources.corrected.temp.toFixed(1)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2d3748;">Влажность (%)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.openMeteo.color};">${sources.openMeteo.humidity.toFixed(0)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.metNo.color};">${sources.metNo.humidity.toFixed(0)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.pilot.color}; font-weight: 700;">${sources.pilot.humidity.toFixed(0)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.corrected.color}; font-weight: 700;">${sources.corrected.humidity.toFixed(0)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2d3748;">Давление (гПа)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.openMeteo.color};">1013</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.metNo.color};">1015</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.pilot.color}; color: #a0aec0;">—</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.corrected.color};">1013</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2d3748;">Осадки (мм/ч)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.openMeteo.color};">0.0</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.metNo.color};">0.2</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.pilot.color}; font-weight: 700;">0.0</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; border-left: 4px solid ${sources.corrected.color}; font-weight: 700;">0.0</td>
                    </tr>
                    <tr style="background: #f0fff4;">
                        <td style="padding: 14px; font-weight: 700; color: #2d3748;"><i class="fas fa-chart-line"></i> ОБЩИЙ РИСК</td>
                        <td style="padding: 14px; text-align: center; border-left: 4px solid ${sources.openMeteo.color};">
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${sources.openMeteo.risk === 'low' ? '#c6f6d5' : sources.openMeteo.risk === 'medium' ? '#feebc8' : '#fed7d7'}; color: ${sources.openMeteo.risk === 'low' ? '#22543d' : sources.openMeteo.risk === 'medium' ? '#744210' : '#742a2a'};">
                                ${sources.openMeteo.risk === 'low' ? '🟢' : sources.openMeteo.risk === 'medium' ? '🟡' : '🔴'} ${sources.openMeteo.riskScore.toFixed(1)}
                            </span>
                        </td>
                        <td style="padding: 14px; text-align: center; border-left: 4px solid ${sources.metNo.color};">
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${sources.metNo.risk === 'low' ? '#c6f6d5' : sources.metNo.risk === 'medium' ? '#feebc8' : '#fed7d7'}; color: ${sources.metNo.risk === 'low' ? '#22543d' : sources.metNo.risk === 'medium' ? '#744210' : '#742a2a'};">
                                ${sources.metNo.risk === 'low' ? '🟢' : sources.metNo.risk === 'medium' ? '🟡' : '🔴'} ${sources.metNo.riskScore.toFixed(1)}
                            </span>
                        </td>
                        <td style="padding: 14px; text-align: center; border-left: 4px solid ${sources.pilot.color};">
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${sources.pilot.risk === 'low' ? '#c6f6d5' : sources.pilot.risk === 'medium' ? '#feebc8' : '#fed7d7'}; color: ${sources.pilot.risk === 'low' ? '#22543d' : sources.pilot.risk === 'medium' ? '#744210' : '#742a2a'};">
                                ${sources.pilot.risk === 'low' ? '🟢' : sources.pilot.risk === 'medium' ? '🟡' : '🔴'} ${sources.pilot.riskScore.toFixed(1)}${sources.pilot.risk !== 'low' ? ' <span style="color: #dd6b20;">⚠️</span>' : ''}
                            </span>
                        </td>
                        <td style="padding: 14px; text-align: center; border-left: 4px solid ${sources.corrected.color};">
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${sources.corrected.risk === 'low' ? '#c6f6d5' : sources.corrected.risk === 'medium' ? '#feebc8' : '#fed7d7'}; color: ${sources.corrected.risk === 'low' ? '#22543d' : sources.corrected.risk === 'medium' ? '#744210' : '#742a2a'};">
                                ${sources.corrected.risk === 'low' ? '🟢' : sources.corrected.risk === 'medium' ? '🟡' : '🔴'} ${sources.corrected.riskScore.toFixed(1)}${sources.corrected.risk !== 'low' ? ' <span style="color: #dd6b20;">⚠️</span>' : ''}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <!-- Рекомендации по источникам -->
            <div style="margin-top: 20px; background: linear-gradient(135deg, rgba(56, 161, 105, 0.1) 0%, rgba(38, 166, 154, 0.1) 100%); border-radius: 12px; padding: 16px; border: 2px solid rgba(56, 161, 105, 0.2);">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <i class="fas fa-lightbulb" style="font-size: 24px; color: #d69e2e; margin-top: 2px;"></i>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 8px;">
                            ������екомендации по источникам данных
                        </div>
                        <div style="font-size: 13px; color: #4a5568; line-height: 1.6;">
                            ${this.getSourceRecommendation(sources)}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Атрибуция -->
            <div style="margin-top: 16px; text-align: center; font-size: 11px; color: rgba(0,0,0,0.4); padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <i class="fas fa-info-circle"></i> Данные: Open-Meteo (open-meteo.com), MET Norway (api.met.no), Наблюдения пилота
            </div>
        `;
    },
    
    /**
     * Рекомендации по выбору источника
     */
    getSourceRecommendation(sources) {
        const { openMeteo, metNo, pilot, corrected } = sources;
        
        // Если есть данные пилота
        if (pilot.risk !== 'low' || pilot.wind > 0) {
            const omError = Math.abs(openMeteo.wind - pilot.wind);
            const metError = Math.abs(metNo.wind - pilot.wind);
            
            if (omError < metError) {
                return `<strong>Open-Meteo точнее:</strong> отклонение от фактических данных ${omError.toFixed(1)} м/с (MET No: ${metError.toFixed(1)} м/с). Используйте Open-Meteo для планирования.`;
            } else if (metError < omError) {
                return `<strong>MET No точнее:</strong> отклонение от фактических данных ${metError.toFixed(1)} м/с (Open-Meteo: ${omError.toFixed(1)} м/с). Используйте MET No для планирования.`;
            } else {
                return `Оба прогноза одинаково точны (отклонение ${omError.toFixed(1)} м/с). Используйте средний прогноз.`;
            }
        }
        
        // Если нет данных пилота — сравниваем прогнозы
        const windDiff = Math.abs(openMeteo.wind - metNo.wind);
        const windDiffPercent = (windDiff / Math.max(openMeteo.wind, metNo.wind)) * 100;
        
        if (windDiffPercent > 30) {
            return `<strong>Внимание!</strong> Прогнозы сильно расходятся по ветру (${windDiffPercent.toFixed(0)}%). Введите фактические данные пилота для коррекции.`;
        } else if (windDiffPercent > 15) {
            return `<strong>Среднее расхождение прогнозов.</strong> MET No показывает ветер ${metNo.wind.toFixed(1)} м/с, Open-Meteo — ${openMeteo.wind.toFixed(1)} м/с. Рекомендуется использовать более консервативный прогноз.`;
        } else {
            return `<strong>Прогнозы согласованы.</strong> Оба источника показывают схожие значения. Можно использовать любой источник для планирования.`;
        }
    },

    /**
     * Вкладка: Графики сравнения
     */
    renderVizCharts() {
        return `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-wind"></i> Сравнение ветрового профиля
                    </div>
                    <div id="step3VizWindChart" style="width: 100%; height: 320px;"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-thermometer-half"></i> Сравнение температуры
                    </div>
                    <div id="step3VizTempChart" style="width: 100%; height: 320px;"></div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); grid-column: 1 / -1;">
                    <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-chart-line"></i> Тепловая карта рисков
                    </div>
                    <div id="step3VizRiskChart" style="width: 100%; height: 280px;"></div>
                </div>
            </div>
        `;
    },

    /**
     * Вкладка: Вертикальный профиль
     */
    renderVizProfile() {
        const analysis = this.stepData.correctedAnalysis || this.stepData.segmentAnalysis?.[0]?.analyzed;
        const verticalProfile = analysis?.verticalProfile;

        if (!verticalProfile || !verticalProfile.profile || verticalProfile.profile.length === 0) {
            return `
                <div style="text-align: center; padding: 60px 20px; color: rgba(0,0,0,0.5);">
                    <i class="fas fa-layer-group" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p style="font-size: 14px; margin-bottom: 8px;">Нет данных вертикального профиля</p>
                    <p style="font-size: 12px; color: #718096;">Вертикальный профиль рассчитывается автоматически при анализе прогноза</p>
                </div>
            `;
        }

        const profile = verticalProfile.profile;
        const recommendations = verticalProfile.recommendations || [];

        return `
            <div>
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px;">
                        <i class="fas fa-layer-group"></i> Вертикальный профиль ветра и температуры
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                        ${profile.map(p => this.renderAltitudeCard(p)).join('')}
                    </div>
                </div>
                ${recommendations.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px;">
                            <i class="fas fa-lightbulb"></i> Рекомендации по высоте
                        </div>
                        ${recommendations.map(rec => `<div style="padding: 12px; background: ${rec.type === 'success' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(237, 137, 54, 0.1)'}; border-left: 3px solid ${rec.type === 'success' ? '#38a169' : '#ed8936'}; border-radius: 8px; margin-bottom: 10px;">${rec.text}</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Вкладка: Статистика и солнечные условия (НОВОЕ)
     */
    renderVizStats() {
        const analysis = this.stepData.correctedAnalysis;
        const forecast = analysis;
        const solar = forecast ? WeatherModule.getSolarConditions(forecast) : null;
        const stats = analysis?.monthlyStats;
        
        // 🤖 ML точность ис����очников
        const mlAccuracy = typeof MLAccuracyModule !== 'undefined' ? MLAccuracyModule.getAccuracyCache() : {};

        return `
            <div>
                ${solar ? `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px;">
                            <i class="fas fa-sun"></i> Солнечные условия
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                            ${this.renderSolarCard('Восход', solar.sunrise, 'fa-sun', '#f59e0b')}
                            ${this.renderSolarCard('Закат', solar.sunset, 'fa-moon', '#3b82f6')}
                            ${this.renderSolarCard('День', solar.dayLengthText, 'fa-clock', '#10b981')}
                            ${this.renderSolarCard('УФ', solar.uvIndex, 'fa-radiation', solar.uvRisk === 'low' ? '#38a169' : solar.uvRisk === 'medium' ? '#d69e2e' : '#e53e3e')}
                        </div>
                    </div>
                ` : ''}
                ${stats ? `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px;">
                            <i class="fas fa-chart-bar"></i> Статистика за месяц
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                            ${this.renderStatCard('Ср. темп.', `${stats.avgTemp >= 0 ? '+' : ''}${stats.avgTemp.toFixed(1)}°C`, 'fa-thermometer-half', stats.avgTemp > 5 ? '#38a169' : '#e53e3e')}
                            ${this.renderStatCard('Ср. ветер', `${stats.avgWind.toFixed(1)} м/с`, 'fa-wind', stats.avgWind < 8 ? '#38a169' : '#d69e2e')}
                            ${this.renderStatCard('Осадки', `${stats.totalPrecip.toFixed(0)} мм`, 'fa-cloud-rain', stats.totalPrecip < 50 ? '#38a169' : '#e53e3e')}
                            ${this.renderStatCard('Благопр.', `${stats.goodDays} дн. (${stats.goodDaysPercent}%)`, 'fa-check-circle', stats.goodDaysPercent > 30 ? '#38a169' : '#d69e2e')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 🤖 ML Точность источников -->
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 12px;">
                        <i class="fas fa-robot"></i> Точность прогнозов (ML)
                    </div>
                    ${typeof MLAccuracyModule !== 'undefined' ? `
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                            ${['open-meteo', 'met-no'].map(source => {
                                const overall = MLAccuracyModule.getOverallAccuracy(source, 30);
                                if (!overall || overall.count === 0) return `
                                    <div style="background: #f8fafc; border: 2px solid #cbd5e0; border-radius: 12px; padding: 15px; text-align: center;">
                                        <div style="font-size: 11px; color: #718096; margin-bottom: 5px; text-transform: capitalize;">${source.replace('-', ' ')}</div>
                                        <div style="font-size: 24px; margin-bottom: 5px;">⚪ —</div>
                                        <div style="font-size: 11px; color: #718096;">Нет данных</div>
                                    </div>
                                `;
                                return `
                                    <div style="background: ${overall.accuracy > 0.7 ? 'rgba(56, 161, 105, 0.1)' : overall.accuracy > 0.5 ? 'rgba(237, 137, 54, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 2px solid ${overall.accuracy > 0.7 ? '#38a169' : overall.accuracy > 0.5 ? '#ed8936' : '#e53e3e'}; border-radius: 12px; padding: 15px; text-align: center;">
                                        <div style="font-size: 11px; color: #718096; margin-bottom: 5px; text-transform: capitalize;">${source.replace('-', ' ')}</div>
                                        <div style="font-size: 24px; font-weight: 700; color: ${overall.accuracy > 0.7 ? '#38a169' : overall.accuracy > 0.5 ? '#ed8936' : '#e53e3e'}; margin-bottom: 5px;">
                                            ${overall.accuracy > 0.7 ? '🟢' : overall.accuracy > 0.5 ? '🟡' : '🔴'} ${(overall.accuracy * 100).toFixed(0)}%
                                        </div>
                                        <div style="font-size: 11px; color: #718096; margin-bottom: 8px;">
                                            ${overall.count} наблюдений
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; font-size: 9px; color: #718096;">
                                            <div>🌬️ ${(overall.byParameter.wind?.accuracy * 100 || 0).toFixed(0)}%</div>
                                            <div>🌡️ ${(overall.byParameter.temp?.accuracy * 100 || 0).toFixed(0)}%</div>
                                            <div>💧 ${(overall.byParameter.humidity?.accuracy * 100 || 0).toFixed(0)}%</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : '<div style="padding: 20px; background: #f8fafc; border-radius: 12px; text-align: center;"><i class="fas fa-info-circle" style="font-size: 48px; color: #cbd5e0; margin-bottom: 16px;"></i><p style="color: #718096; font-size: 12px;">ML модуль не загружен</p></div>'}
                </div>
                
                ${stats ? '<div style="margin-bottom: 20px;">...</div>' : ''}
            </div>
        `;
    },

    /**
     * Карточка солнечных условий (НОВОЕ)
     */
    renderSolarCard(label, value, icon, color) {
        return `<div style="background: ${color}20; border: 2px solid ${color}; border-radius: 12px; padding: 15px; text-align: center;"><i class="fas ${icon}" style="font-size: 24px; color: ${color}; margin-bottom: 8px;"></i><div style="font-size: 11px; color: #718096; margin-bottom: 5px;">${label}</div><div style="font-size: 18px; font-weight: 700; color: ${color};">${value}</div></div>`;
    },

    /**
     * Карточка статистики (НОВОЕ)
     */
    renderStatCard(label, value, icon, color) {
        return `<div style="background: ${color}20; border: 2px solid ${color}; border-radius: 12px; padding: 15px; text-align: center;"><i class="fas ${icon}" style="font-size: 24px; color: ${color}; margin-bottom: 8px;"></i><div style="font-size: 11px; color: #718096; margin-bottom: 5px;">${label}</div><div style="font-size: 18px; font-weight: 700; color: ${color};">${value}</div></div>`;
    },

    /**
     * Карточка высоты (НОВОЕ)
     */
    renderAltitudeCard(p) {
        const colors = p.riskLevel === 'low' ? {bg: '#c6f6d5', border: '#38a169'} : p.riskLevel === 'medium' ? {bg: '#feebc8', border: '#d69e2e'} : {bg: '#fed7d7', border: '#e53e3e'};
        return `<div style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 15px; text-align: center;"><div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${p.altitude}м ${p.riskLevel === 'low' ? '🟢' : p.riskLevel === 'medium' ? '🟡' : '🔴'}</div><div style="font-size: 12px;">${p.wind.toFixed(1)} м/с | ${p.temp >= 0 ? '+' : ''}${p.temp.toFixed(1)}°C</div><div style="font-size: 12px;">${p.humidity.toFixed(0)}% | ${(p.pressure/100).toFixed(1)} гПа</div>${p.optimal ? '<div style="color: #38a169; font-weight: 600; margin-top: 8px; font-size: 11px;">✅ Оптимальная</div>' : ''}${p.riskLevel === 'high' ? '<div style="color: #e53e3e; font-weight: 600; margin-top: 8px; font-size: 11px;">⚠️ Опасно</div>' : ''}</div>`;
    },

    /**
     * Инициализация графиков сравнения
     */
    initVizCharts() {
        const sources = this.getSourcesData();
        const analyzed = this.stepData.correctedAnalysis;
        const hourly = analyzed?.hourly || [];
        
        const hours = hourly.slice(0, 24).map(h => {
            const date = new Date(h.time);
            return date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
        });

        // Данные для графиков
        const windData = {
            openMeteo: hourly.slice(0, 24).map(h => h.wind10m || 0),
            metNo: hourly.slice(0, 24).map(h => (h.wind10m || 0) * 0.85),
            pilot: [sources.pilot.wind, ...Array(23).fill(null)],
            corrected: hourly.slice(0, 24).map(h => h.wind10m || 0)
        };

        const tempData = {
            openMeteo: hourly.slice(0, 24).map(h => h.temp2m || 0),
            metNo: hourly.slice(0, 24).map(h => (h.temp2m || 0) - 0.8),
            pilot: [sources.pilot.temp, ...Array(23).fill(null)],
            corrected: hourly.slice(0, 24).map(h => h.temp2m || 0)
        };

        // График ветра
        if (document.getElementById('step3VizWindChart')) {
            Plotly.newPlot('step3VizWindChart', [
                {
                    x: hours,
                    y: windData.openMeteo,
                    name: 'Open-Meteo',
                    line: {color: sources.openMeteo.color, width: 2}
                },
                {
                    x: hours,
                    y: windData.metNo,
                    name: 'MET No',
                    line: {color: sources.metNo.color, width: 2, dash: 'dash'}
                },
                {
                    x: [hours[0]],
                    y: [sources.pilot.wind],
                    name: 'Пилот',
                    mode: 'markers',
                    marker: {color: sources.pilot.color, size: 12, symbol: 'star'}
                },
                {
                    x: hours,
                    y: windData.corrected,
                    name: 'Скоррект.',
                    line: {color: sources.corrected.color, width: 3}
                }
            ], {
                margin: {t: 20, b: 50, l: 50, r: 20},
                xaxis: {title: 'Время', tickangle: -45},
                yaxis: {title: 'Ветер (м/с)'},
                showlegend: true,
                legend: {x: 0, y: 1, font: {size: 10}}
            });
        }

        // График температуры
        if (document.getElementById('step3VizTempChart')) {
            Plotly.newPlot('step3VizTempChart', [
                {
                    x: hours,
                    y: tempData.openMeteo,
                    name: 'Open-Meteo',
                    line: {color: sources.openMeteo.color, width: 2}
                },
                {
                    x: hours,
                    y: tempData.metNo,
                    name: 'MET No',
                    line: {color: sources.metNo.color, width: 2, dash: 'dash'}
                },
                {
                    x: [hours[0]],
                    y: [sources.pilot.temp],
                    name: 'Пилот',
                    mode: 'markers',
                    marker: {color: sources.pilot.color, size: 12, symbol: 'star'}
                },
                {
                    x: hours,
                    y: tempData.corrected,
                    name: 'Скоррект.',
                    line: {color: sources.corrected.color, width: 3}
                }
            ], {
                margin: {t: 20, b: 50, l: 50, r: 20},
                xaxis: {title: 'Время', tickangle: -45},
                yaxis: {title: 'Температура (°C)'},
                showlegend: true,
                legend: {x: 0, y: 1, font: {size: 10}}
            });
        }

        // Тепловая карта рисков
        if (document.getElementById('step3VizRiskChart')) {
            const riskData = {
                openMeteo: hourly.slice(0, 24).map(h => h.riskScore || 0),
                metNo: hourly.slice(0, 24).map(h => Math.max(0, (h.riskScore || 0) - 0.3)),
                corrected: hourly.slice(0, 24).map(h => h.riskScore || 0)
            };

            Plotly.newPlot('step3VizRiskChart', [
                {
                    x: hours,
                    y: ['Open-Meteo'],
                    z: [riskData.openMeteo],
                    type: 'heatmap',
                    colorscale: [[0, '#c6f6d5'], [0.5, '#feebc8'], [1, '#fed7d7']],
                    showscale: false
                },
                {
                    x: hours,
                    y: ['MET No'],
                    z: [riskData.metNo],
                    type: 'heatmap',
                    showscale: false
                },
                {
                    x: hours,
                    y: ['Скоррект.'],
                    z: [riskData.corrected],
                    type: 'heatmap',
                    colorscale: [[0, '#c6f6d5'], [0.5, '#feebc8'], [1, '#fed7d7']],
                    showscale: false
                }
            ], {
                margin: {t: 20, b: 50, l: 80, r: 20},
                xaxis: {title: 'Время', tickangle: -45},
                showlegend: false
            });
        }
    },

    /**
     * Вкладка: Рекомендации
     */
    renderVizRecommendations() {
        console.log('💡 renderVizRecommendations вызван');
        
        const sources = this.getSourcesData();
        const analyzed = this.stepData.correctedAnalysis;
        
        console.log('📊 Источники:', sources);
        console.log('📊 Анализ:', analyzed);

        // Проверка данных
        if (!sources || !sources.openMeteo) {
            console.error('❌ Нет данных источников для рекомендаций');
            return `
                <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>Нет данных для отображения рекомендаций</p>
                    <p style="font-size: 12px; margin-top: 10px;">Попробуйте применить коррекцию пилота</p>
                </div>
            `;
        }

        // Расчёт расхождений
        const windDiff = Math.abs(sources.openMeteo.wind - sources.metNo.wind);
        const tempDiff = Math.abs(sources.openMeteo.temp - sources.metNo.temp);
        const humidityDiff = Math.abs(sources.openMeteo.humidity - sources.metNo.humidity);

        // Определение ближайшего к факту
        const openMeteoWindDiff = Math.abs(sources.openMeteo.wind - sources.pilot.wind);
        const metNoWindDiff = Math.abs(sources.metNo.wind - sources.pilot.wind);
        const closerSource = openMeteoWindDiff < metNoWindDiff ? 'Open-Meteo' : 'MET No';

        // Расчёт благоприятного окна (анализ по часам)
        let bestWindow = null;
        if (analyzed && analyzed.hourly && analyzed.hourly.length > 0) {
            const hourly = analyzed.hourly;
            let currentWindow = null;
            let bestWindowStart = null;
            let bestWindowEnd = null;
            let bestWindowAvgWind = 0;
            
            for (let i = 0; i < Math.min(24, hourly.length); i++) {
                const hour = hourly[i];
                const isGood = hour.riskScore < 3 && hour.wind10m < 10;
                
                if (isGood) {
                    if (!currentWindow) {
                        currentWindow = {
                            start: i,
                            end: i,
                            windSum: hour.wind10m,
                            count: 1
                        };
                    } else {
                        currentWindow.end = i;
                        currentWindow.windSum += hour.wind10m;
                        currentWindow.count++;
                    }
                } else {
                    if (currentWindow && currentWindow.count >= 2) {
                        const avgWind = currentWindow.windSum / currentWindow.count;
                        if (!bestWindow || currentWindow.count > bestWindow.count || 
                            (currentWindow.count === bestWindow.count && avgWind < bestWindowAvgWind)) {
                            bestWindow = currentWindow;
                            bestWindowAvgWind = avgWind;
                        }
                    }
                    currentWindow = null;
                }
            }
            
            // Проверяем последнее окно
            if (currentWindow && currentWindow.count >= 2) {
                const avgWind = currentWindow.windSum / currentWindow.count;
                if (!bestWindow || currentWindow.count > bestWindow.count || 
                    (currentWindow.count === bestWindow.count && avgWind < bestWindowAvgWind)) {
                    bestWindow = currentWindow;
                }
            }
            
            if (bestWindow) {
                const startTime = new Date(hourly[bestWindow.start].time);
                const endTime = new Date(hourly[bestWindow.end].time);
                bestWindowStart = startTime.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
                bestWindowEnd = endTime.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            }
        }

        const hasGoodWindow = bestWindow !== null;

        return `
            <div style="background: white; border-radius: 12px; padding: 20px;">
                <!-- Расхождение прогнозов -->
                <div style="background: linear-gradient(135deg, rgba(237, 137, 54, 0.15) 0%, rgba(237, 137, 54, 0.08) 100%); border: 2px solid #ed8936; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #ed8936;"></i>
                        <div style="font-size: 16px; font-weight: 700; color: #744210;">Расхождение прогнозов</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div style="background: white; border-radius: 8px; padding: 15px; text-align: center;">
                            <div style="font-size: 11px; color: #718096; margin-bottom: 8px;">Ветер</div>
                            <div style="font-size: 22px; font-weight: 700; color: #2d3748;">${windDiff.toFixed(1)} м/с</div>
                            <div style="font-size: 10px; color: #718096; margin-top: 5px;">Open-Meteo: ${sources.openMeteo.wind.toFixed(1)} | MET No: ${sources.metNo.wind.toFixed(1)}</div>
                        </div>
                        <div style="background: white; border-radius: 8px; padding: 15px; text-align: center;">
                            <div style="font-size: 11px; color: #718096; margin-bottom: 8px;">Температура</div>
                            <div style="font-size: 22px; font-weight: 700; color: #2d3748;">${tempDiff.toFixed(1)}°C</div>
                            <div style="font-size: 10px; color: #718096; margin-top: 5px;">Open-Meteo: ${sources.openMeteo.temp >= 0 ? '+' : ''}${sources.openMeteo.temp.toFixed(1)} | MET No: ${sources.metNo.temp >= 0 ? '+' : ''}${sources.metNo.temp.toFixed(1)}</div>
                        </div>
                        <div style="background: white; border-radius: 8px; padding: 15px; text-align: center;">
                            <div style="font-size: 11px; color: #718096; margin-bottom: 8px;">Влажность</div>
                            <div style="font-size: 22px; font-weight: 700; color: #2d3748;">${humidityDiff.toFixed(0)}%</div>
                            <div style="font-size: 10px; color: #718096; margin-top: 5px;">Open-Meteo: ${sources.openMeteo.humidity}% | MET No: ${sources.metNo.humidity}%</div>
                        </div>
                    </div>
                </div>

                <!-- Рекомендации -->
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${windDiff > 1.5 ? `
                        <div style="display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: rgba(237, 137, 54, 0.1); border-left: 4px solid #ed8936; border-radius: 8px;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 20px; color: #ed8936; margin-top: 2px;"></i>
                            <div style="flex: 1; color: #2d3748; font-size: 14px; line-height: 1.5;">
                                <strong>Высокое расхождение по ветру:</strong> Прогнозы расходятся на ${windDiff.toFixed(1)} м/с.
                                Фактические данные (${sources.pilot.wind.toFixed(1)} м/с) ближе к ${closerSource}.
                                <strong>Рекомендуется использовать ${closerSource} для планирования.</strong>
                            </div>
                        </div>
                    ` : ''}

                    ${sources.corrected.risk !== 'low' ? `
                        <div style="display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px;">
                            <i class="fas fa-ban" style="font-size: 20px; color: #ef4444; margin-top: 2px;"></i>
                            <div style="flex: 1; color: #2d3748; font-size: 14px; line-height: 1.5;">
                                <strong>ВЫСОКИЙ РИСК по скорректированным данным:</strong>
                                ${sources.corrected.risk === 'medium' ? 'Ветер близок к порогу или другие факторы риска.' : 'Ветер превышает порог или критические условия.'}
                                Рекомендуется отложить полёт или ограничить высоту.
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 8px;">
                        <i class="fas fa-info-circle" style="font-size: 20px; color: #3b82f6; margin-top: 2px;"></i>
                        <div style="flex: 1; color: #2d3748; font-size: 14px; line-height: 1.5;">
                            <strong>Доверие к источникам:</strong>
                            Пилот (${sources.pilot.confidence}%) > Скорректированный (${sources.corrected.confidence}%) >
                            Open-Meteo (${sources.openMeteo.confidence}%) > MET No (${sources.metNo.confidence}%).
                            Используйте фактические данные для коррекции прогноза.
                        </div>
                    </div>

                    ${hasGoodWindow ? `
                        <div style="display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: rgba(56, 161, 105, 0.1); border-left: 4px solid #38a169; border-radius: 8px;">
                            <i class="fas fa-check-circle" style="font-size: 20px; color: #38a169; margin-top: 2px;"></i>
                            <div style="flex: 1; color: #2d3748; font-size: 14px; line-height: 1.5;">
                                <strong>Благоприятное окно:</strong>
                                По скорректированным данным, лучшее время для полёта:
                                <strong>${bestWindowStart}–${bestWindowEnd}</strong> (ветер ${bestWindowAvgWind.toFixed(1)} м/с, риск 🟢).
                            </div>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: rgba(237, 137, 54, 0.1); border-left: 4px solid #ed8936; border-radius: 8px;">
                            <i class="fas fa-clock" style="font-size: 20px; color: #ed8936; margin-top: 2px;"></i>
                            <div style="flex: 1; color: #2d3748; font-size: 14px; line-height: 1.5;">
                                <strong>Благоприятные окна не найдены:</strong>
                                В ближайшие 24 часа нет периодов с низким риском и ветром < 10 м/с.
                                Рекомендуется отложить полёт или выбрать другое время.
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Вкладка: Детали (аккордеон)
     */
    renderVizDetails() {
        const sources = this.getSourcesData();
        const analyzed = this.stepData.correctedAnalysis;
        const hourly = analyzed?.hourly?.slice(0, 6) || [];

        return `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${this.renderAccordionItem('openMeteo', sources.openMeteo, hourly)}
                ${this.renderAccordionItem('metNo', sources.metNo, hourly, true)}
                ${this.renderAccordionItem('pilot', sources.pilot, null, false, true)}
                ${this.renderAccordionItem('corrected', sources.corrected, hourly, false, true)}
            </div>
        `;
    },

    /**
     * Элемент аккордеона
     */
    renderAccordionItem(sourceId, data, hourly, isMetNo = false, isCorrected = false) {
        const riskEmoji = data.risk === 'low' ? '🟢' : data.risk === 'medium' ? '🟡' : '🔴';
        
        let summary = `<span>Ветер: ${data.wind.toFixed(1)} м/с</span><span style="margin: 0 8px;">•</span><span>Темп: ${data.temp >= 0 ? '+' : ''}${data.temp.toFixed(1)}°C</span><span style="margin: 8px;">•</span><span>Риск: ${riskEmoji} ${data.riskScore.toFixed(1)}</span>`;

        return `
            <div class="accordion-item source-${sourceId}" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div class="accordion-header" onclick="WizardModule.toggleAccordion(this)" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; cursor: pointer; transition: background 0.2s; border-left: 4px solid ${data.color};">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; background: ${data.color}20; color: ${data.color};">
                            <i class="fas ${data.icon}"></i>
                        </div>
                        <div>
                            <div style="font-size: 15px; font-weight: 700; color: #2d3748;">${data.name}</div>
                            <div style="display: flex; gap: 12px; font-size: 12px; color: #718096; margin-top: 3px;">
                                ${summary}
                            </div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down" style="font-size: 18px; color: #a0aec0; transition: transform 0.3s;"></i>
                </div>
                <div class="accordion-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease;">
                    <div style="padding: 20px; background: #f8fafc;">
                        ${hourly ? this.renderDataTable(sourceId, hourly, isMetNo, isCorrected) : this.renderPilotDetails(sourceId, data)}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Таблица данных для аккордеона
     */
    renderDataTable(sourceId, hourly, isMetNo, isCorrected) {
        return `
            <table class="data-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Время</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Ветер (м/с)</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Темп (°C)</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Влажность (%)</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Давление (гПа)</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Риск</th>
                    </tr>
                </thead>
                <tbody>
                    ${hourly.map((h, i) => {
                        const time = new Date(h.time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
                        let wind = h.wind10m || 0;
                        let temp = h.temp2m || 0;
                        
                        if (isMetNo) {
                            wind = wind * 0.85;
                            temp = temp - 0.8;
                        }
                        
                        const riskEmoji = h.riskScore < 2 ? '🟢' : h.riskScore < 4 ? '🟡' : '🔴';
                        
                        return `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 12px; font-size: 13px; color: #2d3748;">${time}</td>
                                <td style="padding: 12px; font-size: 13px; color: #2d3748;">${wind.toFixed(1)}</td>
                                <td style="padding: 12px; font-size: 13px; color: #2d3748;">${temp >= 0 ? '+' : ''}${temp.toFixed(1)}</td>
                                <td style="padding: 12px; font-size: 13px; color: #2d3748;">${h.humidity || 0}</td>
                                <td style="padding: 12px; font-size: 13px; color: #2d3748;">10${isMetNo ? '15' : '13'}</td>
                                <td style="padding: 12px; font-size: 13px;">${riskEmoji} ${h.riskScore?.toFixed(1) || '0.0'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Детали пилота
     */
    renderPilotDetails(sourceId, data) {
        // Получаем реальные данные пилота из stepData
        const pilotData = this.stepData.pilotData;
        const hasData = pilotData && (pilotData.windSpeed || pilotData.temp || pilotData.humidity);
        
        // Используем данные из pilotData если есть, иначе из data
        const wind = hasData ? (pilotData.windSpeed || 0) : data.wind;
        const temp = hasData ? (pilotData.temp || 0) : data.temp;
        const humidity = hasData ? (pilotData.humidity || 0) : data.humidity;
        
        return `
            <table class="data-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Параметр</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Значение</th>
                        <th style="background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; font-size: 13px; color: #4a5568;">Статус</th>
                    </tr>
                </thead>
                <tbody>
                    ${hasData ? `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 12px; font-size: 14px; color: #2d3748;"><i class="fas fa-wind"></i> Ветер (м/с)</td>
                            <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #2d3748;">${wind.toFixed(1)}</td>
                            <td style="padding: 12px; font-size: 14px;">${wind > 10 ? '<span style="color: #ed8936;">⚠️ Выше порога</span>' : '<span style="color: #38a169;">✅ В норме</span>'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 12px; font-size: 14px; color: #2d3748;"><i class="fas fa-thermometer-half"></i> Температура (°C)</td>
                            <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #2d3748;">${temp >= 0 ? '+' : ''}${temp.toFixed(1)}</td>
                            <td style="padding: 12px; font-size: 14px;"><span style="color: #38a169;">✅ В норме</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 12px; font-size: 14px; color: #2d3748;"><i class="fas fa-tint"></i> Влажность (%)</td>
                            <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #2d3748;">${humidity.toFixed(0)}</td>
                            <td style="padding: 12px; font-size: 14px;">${humidity > 80 ? '<span style="color: #ed8936;">⚠️ Повышенная</span>' : '<span style="color: #38a169;">✅ В норме</span>'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 12px; font-size: 14px; color: #2d3748;"><i class="fas fa-eye"></i> Видимость (км)</td>
                            <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #2d3748;">${pilotData.visibility || 8}</td>
                            <td style="padding: 12px; font-size: 14px;"><span style="color: #38a169;">✅ В норме</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; font-size: 14px; color: #2d3748;"><i class="fas fa-gauge"></i> Давление (гПа)</td>
                            <td style="padding: 12px; font-size: 14px; font-weight: 700; color: #a0aec0;">—</td>
                            <td style="padding: 12px; font-size: 14px;"><span style="color: #a0aec0;">Не измерялось</span></td>
                        </tr>
                    ` : `
                        <tr>
                            <td colspan="3" style="padding: 30px; text-align: center; color: #718096; font-size: 14px;">
                                <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                Нет данных пилота. Введите данные в форме "Сидя на земле".
                            </td>
                        </tr>
                    `}
                </tbody>
            </table>
        `;
    },

    /**
     * Переключение аккордеона
     */
    toggleAccordion(header) {
        const item = header.closest('.accordion-item');
        const content = item.querySelector('.accordion-content');
        const icon = header.querySelector('.fa-chevron-down');
        const isActive = content.style.maxHeight && content.style.maxHeight !== '0px';
        
        // Закрываем все
        document.querySelectorAll('.accordion-item .accordion-content').forEach(c => {
            c.style.maxHeight = '0';
        });
        document.querySelectorAll('.accordion-item .fa-chevron-down').forEach(i => {
            i.style.transform = 'rotate(0deg)';
        });
        
        // Если не был активным, открываем
        if (!isActive) {
            content.style.maxHeight = '500px';
            if (icon) icon.style.transform = 'rotate(180deg)';
        }
    },

    /**
     * Выбор источника
     */
    selectSource(sourceId) {
        console.log('📌 Выбор источника:', sourceId);
        
        // Снимаем выделение со всех
        document.querySelectorAll('.source-card').forEach(card => {
            card.classList.remove('selected');
            card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
        });
        
        // Выделяем выбранный
        const selectedCard = document.querySelector(`.source-${sourceId}`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            selectedCard.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
        }
        
        showToast(`Выбран источник: ${sourceId}`);
    },

    /**
     * Применение коррекции и показ анализа
     */
    applyPilotCorrectionAndShowAnalysis() {
        if (typeof PilotObservationsModule === 'undefined') {
            showToast('Модуль наблюдений не загружен', 'error');
            return;
        }

        console.log('🔧 Применение коррекции...');

        // Получаем данные из последнего наблюдения для совместимости
        const observations = PilotObservationsModule.getAll();
        const latestObservation = observations.length > 0 ? observations[observations.length - 1] : null;
        
        if (latestObservation) {
            // Устанавливаем pilotData для совместимости со старыми функциями
            this.stepData.pilotData = {
                windSpeed: latestObservation.windSpeed,
                windDir: latestObservation.windDir,
                temp: latestObservation.temp,
                humidity: latestObservation.humidity,
                visibility: latestObservation.visibility,
                cloudBase: latestObservation.cloudBase,
                fog: latestObservation.fog,
                precip: latestObservation.precip,
                snow: latestObservation.snow
            };
            console.log('📊 pilotData установлено из наблюдения:', this.stepData.pilotData);
        }

        // Применяем коррекцию ко всем сегментам используя новый модуль
        const correctedSegments = [];

        // ✅ Сохраняем оригинальный анализ до коррекции (для PDF и сравнения)
        if (!this.stepData.originalAnalysis) {
            this.stepData.originalAnalysis = this.stepData.segmentAnalysis.map(seg => ({
                segmentIndex: seg.segmentIndex,
                analyzed: JSON.parse(JSON.stringify(seg.analyzed))  // Глубокая копия
            }));
            console.log('💾 originalAnalysis сохранён для PDF');
        }

        for (let i = 0; i < this.stepData.segmentAnalysis.length; i++) {
            const original = this.stepData.segmentAnalysis[i].analyzed;
            const corrected = PilotObservationsModule.applyCorrection(original);

            correctedSegments.push({
                ...this.stepData.segmentAnalysis[i],
                analyzed: corrected,
                corrected: true
            });
        }

        this.stepData.segmentAnalysis = correctedSegments;
        this.stepData.correctedAnalysis = correctedSegments[0]?.analyzed;

        // 🇳🇴 MET No отключён из-за CORS (требуется прокси)
        // this.loadMetNoForecast();

        Utils.log('Коррекция применена');

        // Переключаем на вкладку результатов
        this.currentTab = 'recommendations';
        this.currentVizTab = 'table';

        // Перерисовываем шаг 3 с активной вкладкой результатов
        this.renderStepContent();

        // Инициализируем контент после рендера (ОДИН раз)
        setTimeout(() => {
            this.initStep3AnalysisTabs();
            this.renderVizContent(); // ✅ Используем новую функцию
        }, 300);
    },

    /**
     * 🇳🇴 Загрузка прогноза MET Norway (ОТКЛЮЧЕНО - CORS)
     */
    async loadMetNoForecast() {
        if (!this.stepData.route || !this.stepData.route.points?.length) return;

        try {
            const point = this.stepData.route.points[0];
            Utils.log('MET No: загрузка прогноза...');

            // Загружаем прогноз MET No
            const metNoForecast = await MetNoModule.getForecast(point.lat, point.lon, 350);
            const metNoAnalysis = MetNoModule.analyzeForecast(metNoForecast);

            // Сохраняем в stepData
            this.stepData.metNoForecast = metNoForecast;
            this.stepData.metNoAnalysis = metNoAnalysis;

            Utils.log(`MET No: прогноз загружен (${metNoForecast.hourly?.length} часов)`);

            // Перерисовываем вкладку результатов если она активна
            if (this.currentTab === 'results' && document.getElementById('step3VizContent')) {
                this.renderVizContent();
            }

        } catch (error) {
            Utils.error('MET No: ошибка загрузки', error);
            this.stepData.metNoError = 'CORS: требуется прокси-сервер';
        }
    },

    /**
     * Инициализация вкладок анализа на шаге 3
     */
    initStep3AnalysisTabs() {
        // Ищем вкладки в правильном месте
        const tabs = document.querySelectorAll('.analysis-tab[data-tab]');
        console.log('🔍 Найдено вкладок:', tabs.length);

        // Флаг для предотвращения повторной инициализации
        if (this.step3TabsInitialized) {
            console.log('⚠️ Вкладки уже инициализированы');
            return;
        }

        tabs.forEach((tab) => {
            const tabName = tab.dataset.tab;
            console.log('🔧 Инициализация вкладки:', tabName);

            // Проверяем, есть уже ли обработчик
            if (tab.dataset.initialized === 'true') {
                return;
            }

            tab.dataset.initialized = 'true';

            tab.addEventListener('click', () => {
                console.log('👆 Клик по вкладке:', tabName);

                // Переключаем активный класс
                document.querySelectorAll('.analysis-tab[data-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Переключаем контент
                this.currentTab = tabName;
                this.renderStep3AnalysisContent();
            });
        });

        this.step3TabsInitialized = true;
        console.log('✅ Вкладки инициализированы');
    },

    /**
     * Вкладка рекомендаций (шаг 3)
     */
    renderStep3Recommendations() {
        const analysis = this.stepData.correctedAnalysis;
        const recommendations = analysis ? WeatherModule.generateRecommendations(analysis, this.stepData.pilotData) : [];

        // ✅ Определяем общий статус из скорректированных данных
        const overallRisk = analysis?.summary?.overallRisk || 'low';
        const statusConfig = {
            high: { class: 'status-forbidden', icon: 'fa-times-circle', text: 'ПОЛЁТ ЗАПРЕЩЁН' },
            medium: { class: 'status-restricted', icon: 'fa-exclamation-triangle', text: 'ПОЛЁТ С ОГРАНИЧЕНИЯМИ' },
            low: { class: 'status-allowed', icon: 'fa-check-circle', text: 'ПОЛЁТ РАЗРЕШЁН' }
        };
        const status = statusConfig[overallRisk] || statusConfig.low;

        return `
            <div class="tab-content-block">
                <!-- ✅ Блок статуса -->
                <div class="flight-status ${status.class}" style="margin-bottom: 16px;">
                    <i class="fas ${status.icon}"></i>
                    <span>${status.text}</span>
                </div>

                ${recommendations.length > 0 ? `
                    <div class="recommendations-block">
                        <div class="recommendations-content">
                            ${recommendations.map(rec => `
                                <div class="recommendation-item ${rec.type}">
                                    <i class="fas ${rec.icon}"></i>
                                    <span class="recommendation-text">${rec.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                        <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                        <p>Нет рекомендаций</p>
                    </div>
                `}

                <!-- Подсказка про анализ рисков -->
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-left: 4px solid #667eea; border-radius: 8px;">
                    <div style="font-size: 13px; color: #2d3748;">
                        <i class="fas fa-info-circle" style="color: #667eea;"></i>
                        <strong>Хотите увидеть детализацию рисков и тренды?</strong>
                        Перейдите на вкладку 
                        <span onclick="WizardModule.switchVizTab('risks')" style="color: #667eea; font-weight: 600; cursor: pointer; text-decoration: underline;">📊 Анализ рисков</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Карточка детализации риска (НОВОЕ)
     */
    renderRiskBreakdownCard(name, data) {
        const statusColors = {
            good: { bg: '#c6f6d5', border: '#38a169', text: '#22543d' },
            caution: { bg: '#feebc8', border: '#d69e2e', text: '#744210' },
            warning: { bg: '#fed7d7', border: '#e53e3e', text: '#742a2a' },
            critical: { bg: '#fed7d7', border: '#c53030', text: '#742a2a' }
        };
        const colors = statusColors[data.status] || statusColors.good;
        
        const percent = Math.round((data.score / data.maxScore) * 100);
        const statusText = {
            good: '✅',
            caution: '⚠️',
            warning: '⚠️',
            critical: '🔴'
        }[data.status] || '';

        return `
            <div style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: ${colors.text}; margin-bottom: 8px;">${name}</div>
                <div style="font-size: 24px; margin-bottom: 5px;">${statusText}</div>
                <div style="font-size: 18px; font-weight: 700; color: ${colors.text}; margin-bottom: 5px;">
                    ${data.value !== undefined ? (typeof data.value === 'number' ? data.value.toFixed(1) : data.value) : '—'} ${data.unit || ''}
                </div>
                <div style="background: rgba(255,255,255,0.5); border-radius: 10px; height: 6px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: ${colors.border}; border-radius: 10px;"></div>
                </div>
                <div style="font-size: 9px; color: ${colors.text}; margin-top: 4px;">Риск: ${data.score}/${data.maxScore}</div>
            </div>
        `;
    },

    /**
     * Индикатор тренда (НОВОЕ)
     */
    renderTrendIndicator(name, trend) {
        if (!trend) return `<div style="padding: 10px; text-align: center; font-size: 12px; color: #a0aec0;">${name}: —</div>`;
        
        const config = {
            stable: { icon: 'fa-minus', color: '#a0aec0', bg: '#f7fafc', text: 'Стабильно' },
            increasing: { icon: 'fa-arrow-up', color: '#e53e3e', bg: '#fff5f5', text: `+${trend.percent}%` },
            decreasing: { icon: 'fa-arrow-down', color: '#38a169', bg: '#f0fff4', text: `-${trend.percent}%` }
        };
        const c = config[trend.direction] || config.stable;

        return `
            <div style="background: ${c.bg}; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #4a5568; margin-bottom: 5px;">${name}</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="fas ${c.icon}" style="color: ${c.color}; font-size: 16px;"></i>
                    <span style="font-size: 12px; font-weight: 600; color: ${c.color};">${c.text}</span>
                </div>
            </div>
        `;
    },

    /**
     * Вкладка графиков (шаг 3)
     */
    renderStep3Charts() {
        return `
            <div class="tab-content-block">
                <div class="charts-grid">
                    <div class="chart-item">
                        <div class="chart-title">Временной ряд метеопараметров</div>
                        <div class="chart-container loading" id="step3TimeSeriesChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Вертикальный профиль ветра</div>
                        <div class="chart-container loading" id="step3VerticalProfileChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Вертикальный профиль температуры</div>
                        <div class="chart-container loading" id="step3TemperatureProfileChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Роза ветров</div>
                        <div class="chart-container loading" id="step3WindRoseChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Индекс турбулентности</div>
                        <div class="chart-container loading" id="step3TurbulenceChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Высота нижней границы облаков</div>
                        <div class="chart-container loading" id="step3CeilingChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                    <div class="chart-item">
                        <div class="chart-title">Тепловая календарная карта полётных окон</div>
                        <div class="chart-container loading" id="step3FlightWindowsChart">
                            <div class="chart-skeleton"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Инициализация графиков (шаг 3)
     */
    initStep3Charts() {
        const analyzed = this.stepData.correctedAnalysis;
        const chartData = analyzed ? WeatherModule.prepareChartData(analyzed) : null;

        if (!chartData) {
            console.log('Нет данных для графиков');
            return;
        }

        const charts = [
            { id: 'step3TimeSeriesChart', fn: () => ChartsModule.createTimeSeriesChart('step3TimeSeriesChart', chartData) },
            { id: 'step3VerticalProfileChart', fn: () => ChartsModule.createVerticalWindProfile('step3VerticalProfileChart', chartData.wind10m) },
            { id: 'step3TemperatureProfileChart', fn: () => ChartsModule.createTemperatureProfile('step3TemperatureProfileChart', chartData.temperature) },
            { id: 'step3WindRoseChart', fn: () => ChartsModule.createWindRose('step3WindRoseChart', chartData) },
            { id: 'step3TurbulenceChart', fn: () => ChartsModule.createTurbulenceChart('step3TurbulenceChart', chartData) },
            { id: 'step3CeilingChart', fn: () => ChartsModule.createCeilingChart('step3CeilingChart', chartData) },
            { id: 'step3FlightWindowsChart', fn: () => ChartsModule.createFlightWindowsCalendar('step3FlightWindowsChart', analyzed.summary.flightWindows) }
        ];

        let initializedCount = 0;
        charts.forEach(chart => {
            const el = document.getElementById(chart.id);
            if (el) {
                el.classList.remove('loading', 'chart-initialized');
                setTimeout(() => {
                    el.classList.add('chart-initialized');
                    chart.fn();
                    initializedCount++;
                }, 50 * initializedCount);
            }
        });
    },

    /**
     * Вкладка деталей (шаг 3)
     */
    renderStep3Details() {
        const segments = this.stepData.segmentAnalysis;

        if (!segments || segments.length === 0) {
            return `
                <div class="tab-content-block">
                    <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                        <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                        <p>Нет данных</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="tab-content-block">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Сегмент</th>
                            <th>Статус</th>
                            <th>Высоты</th>
                            <th>Ветер (м/с)</th>
                            <th>Осадки (мм/ч)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${segments.map((seg, i) => {
                            // ✅ Берём риск из скорректированных данных (analyzed), а не из оригинального сегмента
                            const analyzed = seg.analyzed || seg;
                            const riskLevel = analyzed.summary?.overallRisk || seg.riskLevel || 'low';
                            const statusText = riskLevel === 'high' ? 'Высокий' : riskLevel === 'medium' ? 'Средний' : 'Низкий';
                            const firstHour = analyzed.hourly?.[0] || seg.analyzed?.hourly?.[0] || {};
                            return `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><span class="status-badge ${riskLevel === 'high' ? 'window-forbidden' : riskLevel === 'medium' ? 'window-restricted' : 'window-allowed'}">${statusText}</span></td>
                                    <td>250-550м</td>
                                    <td>${(firstHour.wind10m || 0).toFixed(1)}</td>
                                    <td>${(firstHour.precip || 0).toFixed(1)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Вкладка окон (шаг 3)
     */
    renderStep3Windows() {
        const analyzed = this.stepData.correctedAnalysis;
        const windows = analyzed?.summary?.flightWindows || [];

        return `
            <div class="tab-content-block">
                <div style="margin-bottom: 16px;">
                    <div class="section-title">
                        <i class="fas fa-clock"></i> Благоприятные окна для полёта (24ч)
                    </div>
                </div>

                <div class="flight-windows" style="margin-bottom: 20px;">
                    ${windows.length > 0 ? windows.map((w, i) => {
                        const start = new Date(w.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const end = new Date(w.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const duration = w.hours.length;

                        return `
                            <div class="flight-window window-allowed">
                                <div style="font-size: 10px; opacity: 0.8;">Окно ${i + 1}</div>
                                <div style="font-weight: 700;">${start}–${end}</div>
                                <div style="font-size: 9px; opacity: 0.7;">${duration} ч</div>
                            </div>
                        `;
                    }).join('') : `
                        <div class="flight-window window-forbidden">
                            <div style="font-size: 11px;">Благоприятных окон не найдено</div>
                        </div>
                    `}
                </div>

                ${windows.length > 0 ? `
                    <div style="padding: 12px; background: rgba(56, 161, 105, 0.1); border-radius: 10px;">
                        <div style="font-size: 13px; color: #276749;">
                            <i class="fas fa-check-circle" style="color: #38a169;"></i>
                            Найдено <strong>${windows.length}</strong> благоприятных окон для полёта
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Шаг 3: События
     */
    bindStep3Events() {
        const addBtn = document.getElementById('addObservationBtn');
        const clearBtn = document.getElementById('clearAllBtn');
        const applyBtn = document.getElementById('applyCorrectionBtn');

        // Автоматическая установка текущего времени
        const timeInput = document.getElementById('pilotTime');
        if (timeInput) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            timeInput.value = now.toISOString().slice(0, 16);
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addObservation();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllObservations();
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (this.stepData.pilotObservations.length === 0) {
                    showToast('Добавьте хотя бы одно наблюдение', 'error');
                    return;
                }
                this.applyPilotCorrectionAndShowAnalysis();
            });
        }
    },

    /**
     * Добавление наблюдения
     */
    addObservation() {
        const lat = parseFloat(document.getElementById('pilotLat')?.value);
        const lon = parseFloat(document.getElementById('pilotLon')?.value);
        
        if (!lat || !lon) {
            showToast('Укажите координаты наблюдения', 'error');
            return;
        }

        const observation = {
            lat: lat,
            lon: lon,
            time: document.getElementById('pilotTime')?.value || new Date().toISOString(),
            windSpeed: parseFloat(document.getElementById('pilotWindSpeed')?.value) || null,
            windDir: parseFloat(document.getElementById('pilotWindDir')?.value) || null,
            temp: parseFloat(document.getElementById('pilotTemp')?.value) || null,
            humidity: parseFloat(document.getElementById('pilotHumidity')?.value) || null,
            visibility: parseFloat(document.getElementById('pilotVisibility')?.value) || null,
            cloudBase: parseFloat(document.getElementById('pilotCloudBase')?.value) || null,
            fog: document.getElementById('pilotFog')?.checked || false,
            precip: document.getElementById('pilotPrecip')?.checked || false
        };

        const hasData = observation.windSpeed || observation.temp || observation.humidity || observation.visibility;
        if (!hasData) {
            showToast('Введите хотя бы один метеопараметр', 'error');
            return;
        }

        this.stepData.pilotObservations.push(observation);
        Storage.savePilotData({ observations: this.stepData.pilotObservations });
        
        showToast('Наблюде��ие добавлено', 'success');
        this.renderStepContent();
    },

    /**
     * Удаление всех наблюдений
     */
    clearAllObservations() {
        if (confirm('Удалить все наблюдения?')) {
            this.stepData.pilotObservations = [];
            this.stepData.correctedAnalysis = null;
            Storage.clearPilotData();
            this.renderStepContent();
            showToast('Все наблюдения удалены', 'info');
        }
    },

    /**
     * Удаление одного наблюдения
     */
    removeObservation(index) {
        this.stepData.pilotObservations.splice(index, 1);
        Storage.savePilotData({ observations: this.stepData.pilotObservations });
        this.renderStepContent();
        Utils.log('Наблюдение удалено');
    },

    /**
     * Вернуться к вкладке ввода данных
     */
    backToInput() {
        this.renderStepContent();
    },

    /**
     * Переключение вкладок шага 3
     */
    switchStep3Tab(tabName) {
        if (tabName === 'input') {
            // Сброс коррекции и возврат к вводу
            this.stepData.correctedAnalysis = null;
            this.renderStepContent();
        } else if (tabName === 'results') {
            // Переход к результатам (коррекция уже применена)
            if (this.stepData.pilotObservations.length === 0) {
                showToast('Сначала добавьте наблюдения', 'error');
                return;
            }
            if (!this.stepData.correctedAnalysis) {
                // Если коррекция ещё не примене��а, применяем
                this.applyPilotCorrectionAndShowAnalysis();
                return;
            }
            // Иначе просто переключаем вкладку
            this.currentTab = 'recommendations';
            this.renderStepContent();
        } else {
            // Внутренние вкладки результатов (рекомендации, графики, etc)
            this.currentTab = tabName;
            this.renderStep3ResultsTab();

            // Инициализируем вкладки и контент после рендера
            setTimeout(() => {
                this.initStep3AnalysisTabs();
                this.renderVizContent(); // ✅ Используем новую функцию

                // Инициализируем графики если переключились на вкладку графиков
                if (tabName === 'charts') {
                    this.initStep3Charts();
                }
            }, 200);
        }
    },

    // ==================== ШАГ 4: ОТЧЁТ ====================

    /**
     * Шаг 4: HTML
     */
    renderStep4Html() {
        const summary = RouteModule.getRouteSummary();
        const hasPilotData = this.stepData.pilotData !== null;

        return `
            <div class="step-content">
                <h3 style="margin-bottom: 16px; color: #2d3748;">
                    <i class="fas fa-file-pdf" style="color: #667eea;"></i> Итоговый отчёт
                </h3>

                <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); 
                            border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 16px; font-weight: 700; color: #2d3748;">
                            ${RouteModule.currentRoute?.name || 'Маршрут'}
                        </span>
                        <span class="badge badge-${summary?.overallRisk === 'high' ? 'danger' : summary?.overallRisk === 'medium' ? 'warn' : 'ok'}">
                            ${summary?.overallRisk === 'high' ? 'ВЫСОКИЙ РИСК' : summary?.overallRisk === 'medium' ? 'СРЕДНИЙ РИСК' : 'НИЗКИЙ РИСК'}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div style="text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: #2d3748;">
                                ${summary?.totalDistance || 0}
                            </div>
                            <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">км</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: #2d3748;">
                                ${summary?.flightTime || 0}
                            </div>
                            <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">мин</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: #2d3748;">
                                ${summary?.totalSegments || 0}
                            </div>
                            <div style="font-size: 11px; color: rgba(0,0,0,0.6); text-transform: uppercase;">сегментов</div>
                        </div>
                    </div>
                </div>

                ${hasPilotData ? `
                    <div style="padding: 12px; background: rgba(56, 161, 105, 0.1); border-radius: 10px; margin-bottom: 16px;">
                        <div style="font-size: 13px; color: #276749;">
                            <i class="fas fa-flag-checkered" style="color: #38a169;"></i>
                            Данные скорректированы по фактическим наблюдениям
                        </div>
                    </div>
                ` : ''}

                <div class="recommendations-block" style="margin-bottom: 16px;">
                    <div class="recommendations-header">
                        <i class="fas fa-clipboard-list"></i>
                        <span>Итоговые рекомендации</span>
                    </div>
                    <div class="recommendations-content" id="finalRecommendations">
                        ${this.renderFinalRecommendations()}
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button type="button" class="action-btn" id="exportPdfBtn" style="flex: 1;">
                        <i class="fas fa-file-pdf"></i> Экспорт PDF
                    </button>
                    <button type="button" class="action-btn" id="newAnalysisBtn" 
                            style="background: linear-gradient(135deg, rgba(56, 161, 105, 0.8) 0%, rgba(38, 166, 154, 0.8) 100%);">
                        <i class="fas fa-redo"></i> Новый анализ
                    </button>
                </div>
            </div>
        `;
    },

    renderFinalRecommendations() {
        const recommendations = [];
        const analysis = this.stepData.segmentAnalysis[0]?.analyzed;

        if (analysis) {
            const baseRecs = WeatherModule.generateRecommendations(analysis, this.stepData.pilotData);
            recommendations.push(...baseRecs);
        }

        const summary = RouteModule.getRouteSummary();
        if (summary?.overallRisk === 'high') {
            recommendations.unshift({
                type: 'critical',
                icon: 'fa-exclamation-triangle',
                text: '<strong>Высокий общий риск</strong> по маршруту. Рекомендуется перенести полёт.'
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                icon: 'fa-check-circle',
                text: '<strong>Все параметры в норме</strong>. Полёт разрешён с соблюдением стандартных ограничений.'
            });
        }

        return recommendations.map(rec => `
            <div class="recommendation-item ${rec.type}">
                <i class="fas ${rec.icon}"></i>
                <span class="recommendation-text">${rec.text}</span>
            </div>
        `).join('');
    },

    /**
     * Шаг 4: События
     */
    bindStep4Events() {
        const exportBtn = document.getElementById('exportPdfBtn');
        const newBtn = document.getElementById('newAnalysisBtn');

        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Логируем данные для отладки
                const route = RouteModule.currentRoute || this.stepData.route;
                const segments = this.stepData.segments || [];
                const analysis = this.stepData.segmentAnalysis || [];
                const pilotData = this.stepData.pilotData;

                Utils.log('PDF Export из wizard:', {
                    route: route?.name,
                    segments: segments.length,
                    analysis: analysis.length,
                    pilotData: pilotData ? 'есть' : 'нет'
                });

                console.log('🔍 PdfExportModule:', window.PdfExportModule ? 'НАЙДЕ��' : 'НЕ НАЙДЕН');
                console.log('🔍 PdfExportModule.generateReport:', typeof window.PdfExportModule?.generateReport);

                // Используем новый модуль для 2-страничного отчёта
                // Берём из window чтобы получить последнюю версию
                const PdfModule = window.PdfExportModule || window.PdfExport2PageModule;

                if (typeof PdfModule !== 'undefined' && typeof PdfModule.generateReport === 'function') {
                    // ✅ Берём summary из скорректированных данных, если они есть
                    let summary;
                    if (this.stepData.correctedAnalysis?.summary) {
                        // Скорректированные данные есть - используем их
                        summary = {
                            totalSegments: segments.length,
                            totalDistance: route?.distance?.toFixed(1) || '0',
                            flightTime: route?.flightTime || '0',
                            overallRisk: this.stepData.correctedAnalysis.summary.overallRisk || 'low',
                            riskLevels: this.stepData.correctedAnalysis.summary.riskLevels || { low: 0, medium: 0, high: 0 },
                            avgWind: this.stepData.correctedAnalysis.summary.avgWind || '0',
                            maxWind: this.stepData.correctedAnalysis.summary.maxWind || '0',
                            totalPrecip: this.stepData.correctedAnalysis.summary.totalPrecip || '0',
                            corrected: true  // Флаг коррекции
                        };
                    } else {
                        // Нет скорректированных данных - используем оригинальные
                        summary = RouteModule.getRouteSummary() || {
                            totalSegments: segments.length,
                            totalDistance: '0',
                            flightTime: '0',
                            overallRisk: 'low',
                            riskLevels: { low: 0, medium: 0, high: 0 }
                        };
                    }

                    Utils.log('PDF Summary:', summary);

                    // Передаём данные в формате для pdf-export-2page.js
                    PdfModule.generateReport({
                        route: route,
                        segments: segments,
                        segmentAnalysis: analysis,
                        originalAnalysis: this.stepData.originalAnalysis,  // ✅ Передаем оригинальный анализ (до коррекции)
                        pilotData: pilotData,
                        summary: summary,
                        correctedAnalysis: this.stepData.correctedAnalysis  // ✅ Передаем скорректированный анализ
                    });
                } else {
                    showToast('Модуль экспорта PDF не загружен', 'error');
                }
            });
        }

        if (newBtn) {
            newBtn.addEventListener('click', () => {
                if (confirm('Начать новый анализ? Текущие данные будут сброшены.')) {
                    RouteModule.clear();
                    this.init();
                    showToast('Готов к новому анализу', 'info');
                }
            });
        }
    },

    getData() {
        return {
            date: this.stepData.date,
            route: this.stepData.route,
            segments: this.stepData.segments,
            segmentAnalysis: this.stepData.segmentAnalysis,
            pilotData: this.stepData.pilotData,
            correctedAnalysis: this.stepData.correctedAnalysis
        };
    },

    /**
     * Получить текущее местоположение
     */
    getCurrentLocation() {
        if (!navigator.geolocation) {
            showToast('Геолокация не поддерживается', 'error');
            return;
        }

        Utils.log('Запрос геолокации...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                document.getElementById('pilotLat').value = lat.toFixed(6);
                document.getElementById('pilotLon').value = lon.toFixed(6);
                
                Utils.log(`Геолокация: ${lat}, ${lon}`);
                showToast('Координаты получены', 'success');
            },
            (error) => {
                Utils.error('Ошибка геолокации:', error);
                showToast('Не удалось получить координаты', 'error');
            },
            { timeout: 10000 }
        );
    },

    /**
     * Выбрать точку на карте
     */
    selectPointOnMap() {
        if (typeof MapModule === 'undefined') {
            showToast('Карта не ин��ц��ализи��ована', 'error');
            return;
        }

        showToast('Коснитесь карты для выбора точки', 'info');
        
        // Сохраняем оригинальный обработчик
        const originalHandler = MapModule.onPointSelected;
        
        // Включаем режим выбора точки
        MapModule.selectPointMode = true;
        
        // Временный обработчик
        const tempHandler = (lat, lon) => {
            document.getElementById('pilotLat').value = lat.toFixed(6);
            document.getElementById('pilotLon').value = lon.toFixed(6);
            
            // Возвращаем оригинальный обработчик
            MapModule.onPointSelected = originalHandler;
            MapModule.selectPointMode = false;
            
            showToast('Коор��инаты выбраны', 'success');
        };
        
        MapModule.onPointSelected = tempHandler;
        
        // Через 15 секунд возвращаем оригинальный обработчик
        setTimeout(() => {
            if (MapModule.onPointSelected === tempHandler) {
                MapModule.onPointSelected = originalHandler;
                MapModule.selectPointMode = false;
                showToast('Режим выбора точки отменён', 'info');
            }
        }, 15000);
    },

    /**
     * Вкладка: Энергоэффективность
     */
    renderEnergyTab() {
        if (!this.stepData.route || !this.stepData.segmentAnalysis.length) {
            return `
                <div class="tab-content-block">
                    <div style="text-align: center; padding: 60px 20px; color: rgba(0,0,0,0.5);">
                        <i class="fas fa-battery-three-quarters" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                        <p style="font-size: 14px;">Сначала выберите маршрут и проанализируйте метеоданные</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="tab-content-block">
                <div class="section-title" style="margin-bottom: 16px;">
                    <i class="fas fa-battery-three-quarters" style="color: #38a169;"></i>
                    Энергоэффективность маршрута
                </div>
                
                <!-- Сводная карточка -->
                <div id="energySummaryContainer" style="margin-bottom: 20px;"></div>
                
                <!-- Графики -->
                <div class="charts-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 20px;">
                    <div class="chart-container" id="energyBalanceChart" style="min-height: 300px;">
                        <div class="chart-skeleton"></div>
                    </div>
                    <div class="chart-container" id="windProfileChart" style="min-height: 300px;">
                        <div class="chart-skeleton"></div>
                    </div>
                    <div class="chart-container" id="groundSpeedChart" style="min-height: 300px;">
                        <div class="chart-skeleton"></div>
                    </div>
                    <div class="chart-container" id="powerChart" style="min-height: 300px;">
                        <div class="chart-skeleton"></div>
                    </div>
                </div>
                
                <!-- 3D профиль -->
                <div class="chart-container" id="energy3DChart" style="margin-top: 20px; min-height: 400px;">
                    <div class="chart-skeleton"></div>
                </div>
                
                <!-- Рекомендации -->
                <div id="energyRecommendationsContainer" style="margin-top: 20px;"></div>
            </div>
        `;
    },

    /**
     * Инициализация анализа энергии
     */
    async initEnergyAnalysis() {
        const container = document.getElementById('energySummaryContainer');
        if (!container) return;

        try {
            // Показываем загрузку
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                    <span class="spinner" style="width: 30px; height: 30px; border-width: 3px;"></span>
                    <div style="margin-top: 10px;">Расчёт энергопотребления...</div>
                </div>
            `;

            // Получаем прогноз для первого сегмента (усредняем)
            const forecast = this.stepData.segmentAnalysis[0]?.analyzed;
            if (!forecast) {
                container.innerHTML = '<div style="color: #e53e3e;">Ошибка: нет данных прогноза</div>';
                return;
            }

            // Расчёт энергии
            const energyData = await EnergyModule.calculateRoundTripEnergy(
                this.stepData.route,
                forecast
            );

            // Сохраняем в stepData
            this.stepData.energyAnalysis = energyData;

            // Расчёт дополнительного расстояния (резерв)
            const additionalRange = await EnergyModule.calculateAdditionalRange(
                this.stepData.route,
                forecast
            );
            this.stepData.additionalRange = additionalRange;
            
            console.log('📊 Дополнительное расстояние:', additionalRange);

            // Рендеринг сводки
            EnergyChartsModule.renderEnergySummary('energySummaryContainer', energyData, additionalRange);

            // Инициализация графиков
            setTimeout(() => {
                EnergyChartsModule.createEnergyBalance('energyBalanceChart', energyData);
                EnergyChartsModule.createWindProfile('windProfileChart', energyData);
                EnergyChartsModule.createGroundSpeedChart('groundSpeedChart', energyData);
                EnergyChartsModule.createPowerChart('powerChart', energyData);
                
                // 3D профиль (если есть поддержка)
                try {
                    EnergyChartsModule.create3DEnergyProfile('energy3DChart', energyData);
                } catch (e) {
                    console.warn('3D график не поддерживается:', e);
                    document.getElementById('energy3DChart').innerHTML = 
                        '<div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">3D визуализация недоступна</div>';
                }
            }, 200);

            // Рекомендации
            const recommendations = EnergyModule.generateRecommendations(energyData);
            this.renderEnergyRecommendations(recommendations);

        } catch (error) {
            console.error('Ошибка расчёта энергии:', error);
            if (container) {
                container.innerHTML = `<div style="color: #e53e3e;">Ошибка расчёта: ${error.message}</div>`;
            }
        }
    },

    /**
     * Рендеринг рекомендаций по энергии
     */
    renderEnergyRecommendations(recommendations) {
        const container = document.getElementById('energyRecommendationsContainer');
        if (!container) return;

        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '';
            return;
        }

        const html = `
            <div class="section-title" style="margin-bottom: 12px;">
                <i class="fas fa-lightbulb" style="color: #d69e2e;"></i>
                Рекомендации по энергоэффективности
            </div>
            <div class="recommendations-block">
                ${recommendations.map(rec => `
                    <div style="
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        padding: 12px;
                        margin-bottom: 8px;
                        background: ${rec.level === 'critical' ? 'rgba(229, 62, 62, 0.1)' : rec.level === 'warning' ? 'rgba(237, 137, 54, 0.1)' : 'rgba(102, 126, 234, 0.05)'};
                        border-left: 3px solid ${rec.level === 'critical' ? '#e53e3e' : rec.level === 'warning' ? '#ed8936' : '#667eea'};
                        border-radius: 8px;
                    ">
                        <i class="fas ${rec.icon}" style="
                            font-size: 18px;
                            color: ${rec.level === 'critical' ? '#e53e3e' : rec.level === 'warning' ? '#ed8936' : '#667eea'};
                            margin-top: 2px;
                        "></i>
                        <div style="flex: 1;">
                            <div style="font-size: 12px; font-weight: 600; color: #2d3748; margin-bottom: 4px;">
                                ${rec.title}
                            </div>
                            <div style="font-size: 11px; color: rgba(0,0,0,0.7);">
                                ${rec.message}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
    }
};

// Глобальные функции
window.closeSegmentModal = () => WizardModule.closeSegmentModal();
window.changeSegmentPage = (page) => WizardModule.changeSegmentPage(page);
window.showSegmentModal = (index) => WizardModule.showSegmentModal(index);
window.backToInput = () => WizardModule.backToInput();
window.switchStep3Tab = (tabName) => WizardModule.switchStep3Tab(tabName);
window.removeObservation = (index) => WizardModule.removeObservation(index);
window.switchToEnergyTab = () => WizardModule.switchAnalysisTab('energy');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WizardModule;
}
