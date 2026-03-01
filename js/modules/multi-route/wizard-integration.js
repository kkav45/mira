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
        // Перехватываем рендер шага 1
        if (typeof WizardModule !== 'undefined') {
            const originalRenderStep1Html = WizardModule.renderStep1Html;

            WizardModule.renderStep1Html = function() {
                const html = originalRenderStep1Html.call(this);
                return MultiRouteWizardIntegration.enhanceStep1Html(html);
            };

            // Перехватываем bindStep1Events
            const originalBindStep1Events = WizardModule.bindStep1Events;

            WizardModule.bindStep1Events = function() {
                originalBindStep1Events.call(this);
                MultiRouteWizardIntegration.bindStep1Events();
            };
        }
    },

    /**
     * Улучшение HTML шага 1
     */
    enhanceStep1Html(html) {
        console.log('🔧 enhanceStep1Html() вызван');
        console.log('HTML length:', html.length);

        // Добавляем блок точек взлёта после даты и времени
        const takeoffBlock = `
            <!-- Точки взлёта для мульти-маршрута -->
            <div class="section-title" style="margin-bottom: 10px;">
                <i class="fas fa-helicopter"></i> Точки взлёта
            </div>

            <div id="takeoffPointsBlock" style="margin-bottom: 20px;">
                <div id="takeoffPointsList">
                    ${this.renderTakeoffPointsList()}
                </div>
                <button class="action-btn" onclick="MultiRouteUI.showAddTakeoffModal()"
                        style="margin-top: 10px; width: 100%;">
                    <i class="fas fa-plus"></i> Добавить точку взлёта
                </button>
            </div>

            <!-- Разделитель -->
            <div style="margin: 20px 0; border-top: 1px solid rgba(0,0,0,0.1);"></div>
        `;

        // Вставляем после закрывающего тега datetime-selector
        const datetimeSelectorEnd = html.indexOf('class="datetime-selector"');
        console.log('datetimeSelectorEnd:', datetimeSelectorEnd);
        
        if (datetimeSelectorEnd === -1) {
            console.warn('⚠️ Не найден datetime-selector в HTML');
            return html;
        }

        // Находим закрывающий </div> для datetime-selector
        const closeDivAfter = html.indexOf('</div>', datetimeSelectorEnd);
        console.log('closeDivAfter:', closeDivAfter);
        
        if (closeDivAfter === -1) {
            console.warn('⚠️ Не найден закрывающий </div>');
            return html;
        }

        // Вставляем после закрывающего </div>
        const insertPosition = closeDivAfter + 6; // длина '</div>'
        const newHtml = html.slice(0, insertPosition) + '\n' + takeoffBlock + html.slice(insertPosition);
        
        console.log('✅ Блок точек взлёта добавлен');
        return newHtml;
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
        // Обновляем список точек взлёта при изменении
        if (typeof MultiRouteModule !== 'undefined') {
            const originalAddTakeoffPoint = MultiRouteModule.addTakeoffPoint;

            MultiRouteModule.addTakeoffPoint = function(point) {
                const result = originalAddTakeoffPoint.call(this, point);
                MultiRouteWizardIntegration.refreshTakeoffPointsList();
                return result;
            };

            const originalRemoveTakeoffPoint = MultiRouteModule.removeTakeoffPoint;

            MultiRouteModule.removeTakeoffPoint = function(id) {
                const result = originalRemoveTakeoffPoint.call(this, id);
                MultiRouteWizardIntegration.refreshTakeoffPointsList();
                return result;
            };
        }

        // Перехват загрузки KML для добавления в мульти-маршрут
        const kmlInput = document.getElementById('kmlInput');
        if (kmlInput) {
            const originalHandler = kmlInput.onchange;

            kmlInput.onchange = async (e) => {
                if (originalHandler) {
                    await originalHandler(e);
                }

                // Добавляем последний загруженный маршрут в мульти-маршрут
                const routes = RouteModule.getSavedRoutes();
                const lastRoute = routes[routes.length - 1];

                if (lastRoute && typeof MultiRouteModule !== 'undefined') {
                    MultiRouteModule.addRoute(lastRoute);
                    MultiRouteWizardIntegration.updateSelectedRoutesInfo();
                }
            };
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
        if (!date) return;

        // Проверка: есть ли маршруты
        const routes = MultiRouteModule?.routes || [];
        if (routes.length === 0) {
            alert('Добавьте хотя бы один маршрут');
            return;
        }

        // Проверка: есть ли точки взлёта
        const takeoffPoints = MultiRouteModule?.takeoffPoints || [];
        if (takeoffPoints.length === 0) {
            alert('Добавьте хотя бы одну точку взлёта');
            return;
        }

        // Запуск оптимизации
        const weatherData = WeatherModule.cachedData;
        const assignment = MultiRouteModule.optimizeAssignment(weatherData);

        console.log('✅ Мульти-маршрут оптимизация:', assignment);
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
