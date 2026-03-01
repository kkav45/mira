/**
 * MIRA - Multi-Route Integration with Wizard
 * Интеграция мульти-маршрута в шаг 1 мастера
 * Версия: 0.3.0
 */

const MultiRouteWizardIntegration = {
    /**
     * Инициализация интеграции
     */
    init() {
        console.log('🔍 MultiRouteWizardIntegration.init() вызван');
        
        // Ждём пока WizardModule будет определён
        if (typeof WizardModule === 'undefined') {
            console.warn('⚠️ WizardModule ещё не определён, ждём...');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.bindToWizard();
        console.log('✅ MultiRouteWizardIntegration инициализирован');
    },

    /**
     * Привязка к wizard
     */
    bindToWizard() {
        console.log('🔗 bindToWizard() вызван');
        
        // Перехватываем рендер шага 1
        if (typeof WizardModule !== 'undefined') {
            const originalRenderStep1Html = WizardModule.renderStep1Html;

            WizardModule.renderStep1Html = function() {
                console.log('🔧 WizardModule.renderStep1Html() перехвачен');
                const html = originalRenderStep1Html.call(this);
                return MultiRouteWizardIntegration.enhanceStep1Html(html);
            };

            // Перехватываем bindStep1Events
            const originalBindStep1Events = WizardModule.bindStep1Events;

            WizardModule.bindStep1Events = function() {
                console.log('🔧 WizardModule.bindStep1Events() перехвачен');
                originalBindStep1Events.call(this);
                MultiRouteWizardIntegration.bindStep1Events();
            };
            
            // Принудительно перерендериваем шаг 1 если он текущий
            if (WizardModule.currentStep === 1) {
                console.log('🔄 Принудительный ререндер шага 1');
                setTimeout(() => {
                    WizardModule.renderStepContent();
                }, 50);
            }
        }
    },

    /**
     * Улучшение HTML шага 1
     */
    enhanceStep1Html(html) {
        console.log('🔧 enhanceStep1Html() вызван');

        // 1. Сначала добавляем кнопки выбора точки для каждого маршрута
        html = this.enhanceRouteList(html);

        // 2. Блок "Общие точки взлёта" УДАЛЁН - теперь только кнопки для каждого маршрута

        return html;
    },

    /**
     * Улучшение списка маршрутов (добавление кнопок выбора точки)
     */
    enhanceRouteList(html) {
        // Ищем saved-routes-list и добавляем кнопки для каждого маршрута
        const routesListStart = html.indexOf('class="saved-routes-list"');
        if (routesListStart === -1) return html;

        // Находим все route-actions и добавляем контейнер для кнопки точки
        return html.replace(
            /(<div class="route-actions">.*?<\/div>)/gs,
            '$1 <div class="route-takeoff" style="margin-top: 8px;"></div>'
        );
    },

    /**
     * Обновление кнопки точки для конкретного маршрута
     */
    updateRouteTakeoffButton(routeId) {
        console.log('🔘 Обновление кнопки для маршрута:', routeId);

        const route = typeof MultiRouteModule !== 'undefined' ?
            MultiRouteModule.routes.find(r => r.id === routeId) : null;

        const btnSelector = `[data-route-takeoff-btn="${routeId}"]`;
        const btn = document.querySelector(btnSelector);

        if (btn) {
            const hasTakeoff = route?.takeoffPoint;
            btn.innerHTML = `
                <i class="fas ${hasTakeoff ? 'fa-check-circle' : 'fa-map-marker-alt'}" style="color: ${hasTakeoff ? 'white' : '#38a169'};"></i>
                ${hasTakeoff ? 'Точка выбрана' : 'Выбрать точку взлёта'}
            `;
            btn.style.background = hasTakeoff ?
                'linear-gradient(135deg, rgba(56, 161, 105, 0.8) 0%, rgba(38, 166, 154, 0.8) 100%)' :
                '#f7fafc';
            btn.style.color = hasTakeoff ? 'white' : '#4a5568';
        }
    },

    /**
     * Ренер списка точек взлёта
     */
    renderTakeoffPointsList() {
        const points = MultiRouteModule?.takeoffPoints || [];

        if (points.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: rgba(0,0,0,0.5); background: rgba(0,0,0,0.02); border-radius: 10px;"><i class="fas fa-info-circle"></i> Нет точек взлёта</div>';
        }

        return points.map((point, i) => `
            <div style="padding: 12px; background: #f7fafc; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: #2d3748;">
                        <i class="fas fa-helicopter" style="color: #667eea;"></i> ${point.name}
                    </div>
                    <div style="font-size: 11px; color: #718096;">
                        📍 ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}
                    </div>
                </div>
                <button class="route-action-btn" onclick="MultiRouteModule.removeTakeoffPoint('${point.id}')" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    },

    /**
     * События шага 1
     */
    bindStep1Events() {
        console.log('🔗 bindStep1Events() вызван');

        // Добавляем кнопки выбора точки для каждого маршрута
        this.addRouteTakeoffButtons();

        // Обновляем список точек взлёта при изменении
        if (typeof MultiRouteModule !== 'undefined') {
            const originalAddTakeoffPoint = MultiRouteModule.addTakeoffPoint;

            MultiRouteModule.addTakeoffPoint = (point) => {
                const result = originalAddTakeoffPoint.call(MultiRouteModule, point);
                this.refreshTakeoffPointsList();
                return result;
            };

            const originalRemoveTakeoffPoint = MultiRouteModule.removeTakeoffPoint;

            MultiRouteModule.removeTakeoffPoint = (id) => {
                const result = originalRemoveTakeoffPoint.call(MultiRouteModule, id);
                this.refreshTakeoffPointsList();
                return result;
            };
        }

        // Перехват загрузки KML — ТОЛЬКО для перерисовки кнопок
        const kmlInput = document.getElementById('kmlInput');
        if (kmlInput) {
            kmlInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Ждём пока RouteModule обработает KML
                setTimeout(() => {
                    console.log('🔄 KML загружен, обновляем кнопки');
                    this.addRouteTakeoffButtons();
                    this.updateSelectedRoutesInfo();
                }, 200);
            });
        }

        // Кнопка анализа всех маршрутов
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            const originalHandler = analyzeBtn.onclick;

            analyzeBtn.onclick = async () => {
                if (originalHandler) {
                    await originalHandler();
                }

                // Запуск мульти-маршрут оптимизации
                await MultiRouteWizardIntegration.analyzeAllRoutes();
            };
        }
    },

    /**
     * Добавление кнопок выбора точки для каждого маршрута
     */
    addRouteTakeoffButtons() {
        console.log('🔘 Добавление кнопок выбора точки для маршрутов');

        // Находим все элементы маршрутов и добавляем кнопки
        setTimeout(() => {
            const routeItems = document.querySelectorAll('.saved-route-item');
            console.log('Найдено маршрутов:', routeItems.length);

            routeItems.forEach((item, index) => {
                const routeId = item.dataset.routeId;
                let takeoffDiv = item.querySelector('.route-takeoff');

                if (!takeoffDiv) {
                    takeoffDiv = document.createElement('div');
                    takeoffDiv.className = 'route-takeoff';
                    takeoffDiv.style.marginTop = '8px';
                    item.appendChild(takeoffDiv);
                }

                // Получаем информацию о точке взлёта маршрута
                const route = typeof MultiRouteModule !== 'undefined' ?
                    MultiRouteModule.routes.find(r => r.id === routeId) : null;

                const hasTakeoff = route?.takeoffPoint;

                console.log(`Маршрут ${routeId}: точка ${hasTakeoff ? 'выбрана' : 'не выбрана'}`);

                takeoffDiv.innerHTML = `
                    <button class="action-btn"
                            data-route-takeoff-btn="${routeId}"
                            onclick="TakeoffPointSelector.startSelection('${routeId}')"
                            style="width: 100%; padding: 8px; font-size: 11px; background: ${hasTakeoff ? 'linear-gradient(135deg, rgba(56, 161, 105, 0.8) 0%, rgba(38, 166, 154, 0.8) 100%)' : '#f7fafc'}; color: ${hasTakeoff ? 'white' : '#4a5568'}; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fas ${hasTakeoff ? 'fa-check-circle' : 'fa-map-marker-alt'}" style="color: ${hasTakeoff ? 'white' : '#38a169'};"></i>
                        ${hasTakeoff ? 'Точка выбрана' : 'Выбрать точку взлёта'}
                    </button>
                `;
            });

            console.log('✅ Кнопки добавлены для', routeItems.length, 'маршрутов');
        }, 100);
    },

    /**
     * Перерисовка шага 1 после изменений
     */
    refreshStep1() {
        if (typeof WizardModule !== 'undefined' && WizardModule.currentStep === 1) {
            console.log('🔄 Перерисовка шага 1');
            WizardModule.renderStepContent();
        }
    },

    /**
     * Обновление списка точек взлёта
     */
    refreshTakeoffPointsList() {
        const listEl = document.getElementById('takeoffPointsList');
        if (!listEl) return;

        listEl.innerHTML = this.renderTakeoffPointsList();
    },

    /**
     * Обновление информации о маршрутах
     */
    updateSelectedRoutesInfo() {
        const infoEl = document.getElementById('selectedRouteInfo');
        if (!infoEl) return;

        const routes = MultiRouteModule?.routes || [];
        if (routes.length === 0) {
            infoEl.textContent = '—';
            return;
        }

        const totalDistance = routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0);
        infoEl.textContent = `${routes.length} маршр., ${totalDistance.toFixed(1)} км`;
    },

    /**
     * Анализ всех маршрутов
     */
    async analyzeAllRoutes() {
        const date = document.getElementById('analysisDate')?.value;
        if (!date) {
            showToast('Выберите дату анализа', 'error');
            return;
        }

        // Проверка: есть ли маршруты
        const routes = MultiRouteModule?.routes || [];
        if (routes.length === 0) {
            showToast('Добавьте хотя бы один маршрут', 'error');
            return;
        }

        // Проверка: есть ли точки взлёта для маршрутов
        const routesWithoutTakeoff = routes.filter(r => !r.takeoffPoint);
        if (routesWithoutTakeoff.length > 0) {
            showToast(`Выберите точки взлёта для ${routesWithoutTakeoff.length} маршр.`, 'warning');
            return;
        }

        const loading = document.getElementById('analyzeLoading');
        const analyzeBtn = document.getElementById('analyzeBtn');

        if (loading) loading.style.display = 'block';
        if (analyzeBtn) analyzeBtn.disabled = true;

        try {
            // 1. Основной анализ для ПЕРВОГО маршрута (для совместимости)
            const firstRoute = routes[0];
            WizardModule.stepData.route = firstRoute;

            RouteModule.createSegments();
            await RouteModule.analyzeSegments(date);

            WizardModule.stepData.segments = RouteModule.segments;
            WizardModule.stepData.segmentAnalysis = RouteModule.segmentAnalysis;

            // 2. Анализ ВСЕХ остальных маршрутов
            console.log('🌤️ Анализ всех маршрутов:', routes.length);

            for (let i = 1; i < routes.length; i++) {
                const route = routes[i];
                console.log(`🌤️ Анализ маршрута ${i + 1}:`, route.name);

                // Устанавливаем маршрут как текущий
                RouteModule.currentRoute = route;

                // Создаём сегменты для этого маршрута
                RouteModule.createSegments();

                // Анализируем сегменты
                await RouteModule.analyzeSegments(date);

                // Сохраняем анализ для этого маршрута
                route.segmentAnalysis = RouteModule.segmentAnalysis;

                console.log(`✅ Маршрут ${i + 1} проанализирован:`, RouteModule.segmentAnalysis.length, 'сегментов');
            }

            // 3. Мульти-маршрут анализ (все маршруты + все точки)
            if (typeof MultiRouteModule !== 'undefined') {
                const weatherData = WeatherModule.cachedData;
                const assignment = MultiRouteModule.optimizeAssignment(weatherData);

                console.log('✅ Мульти-маршрут оптимизация:', assignment);
            }

            showToast('Анализ завершён', 'success');

            setTimeout(() => {
                WizardModule.nextStep();
            }, 500);
        } catch (error) {
            console.error('Ошибка анализа:', error);
            showToast('Ошибка анализа: ' + error.message, 'error');
        } finally {
            if (loading) loading.style.display = 'none';
            if (analyzeBtn) analyzeBtn.disabled = false;
        }
    }
};

// Инициализация при загрузке
// ВАЖНО: Должно быть после загрузки wizard.js
setTimeout(() => {
    console.log('🔍 Попытка инициализации MultiRouteWizardIntegration...');
    
    if (typeof WizardModule === 'undefined') {
        console.warn('⚠️ WizardModule не найден, повторная попытка через 200мс...');
        setTimeout(arguments.callee, 200);
        return;
    }
    
    MultiRouteWizardIntegration.init();
}, 100);

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiRouteWizardIntegration;
}
