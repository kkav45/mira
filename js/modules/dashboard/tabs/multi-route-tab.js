/**
 * Вкладка дашборда: МУЛЬТИ-МАРШРУТ 🗺️
 * Управление несколькими маршрутами и точками взлёта
 */

const DashboardTabsMultiRoute = {
    render() {
        const hasRoutes = typeof MultiRouteModule !== 'undefined' &&
                         MultiRouteModule.routes &&
                         MultiRouteModule.routes.length > 0;

        const hasBases = typeof MultiRouteModule !== 'undefined' &&
                        MultiRouteModule.takeoffPoints &&
                        MultiRouteModule.takeoffPoints.length > 0;

        if (!hasRoutes && !hasBases) {
            return this.renderPlaceholder();
        }

        const assignment = MultiRouteModule.getAssignment();

        return this.renderContent(assignment);
    },

    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-map" style="color: #48bb78;"></i>
                    Мульти-маршрутный полёт
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px; margin-bottom: 20px;">Загрузите маршруты и установите точки взлёта</p>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; max-width: 500px; margin: 0 auto;">
                        <button class="action-btn" onclick="MultiRouteModule.addTakeoffPoint({lat: 55.75, lon: 37.61, name: 'База 1'})"
                                style="padding: 12px; font-size: 13px;">
                            <i class="fas fa-plus"></i> Добавить точку взлёта
                        </button>
                        <button class="action-btn" onclick="alert('Загрузка KML')"
                                style="padding: 12px; font-size: 13px;">
                            <i class="fas fa-upload"></i> Загрузить маршруты
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderContent(assignment) {
        const summary = MultiRouteModule.getSummary();
        const bases = MultiRouteModule.takeoffPoints || [];
        const routes = MultiRouteModule.routes || [];

        return `
            <!-- Статистика -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-chart-pie" style="color: #667eea;"></i>
                    Общая статистика
                </div>
                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🚁</div>
                        <div class="dashboard-energy-card-value">${bases.length}</div>
                        <div class="dashboard-energy-card-label">Базы</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🗺️</div>
                        <div class="dashboard-energy-card-value">${routes.length}</div>
                        <div class="dashboard-energy-card-label">Маршруты</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🛤️</div>
                        <div class="dashboard-energy-card-value">${summary?.totalDistance || 0} км</div>
                        <div class="dashboard-energy-card-label">Дистанция</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⚡</div>
                        <div class="dashboard-energy-card-value">${summary?.totalEnergy || 0} Вт·ч</div>
                        <div class="dashboard-energy-card-label">Энергия</div>
                    </div>
                </div>
            </div>

            <!-- Точки взлёта -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-helicopter" style="color: #ed8936;"></i>
                    Точки взлёта
                </div>
                ${this.renderTakeoffPoints(bases)}
            </div>

            <!-- Распределение по базам -->
            ${assignment ? this.renderAssignment(assignment) : ''}

            <!-- Кнопки управления -->
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button class="action-btn" onclick="MultiRouteModule.optimizeAssignment()"
                        style="flex: 1; padding: 16px; font-size: 14px;">
                    <i class="fas fa-calculator"></i> Рассчитать оптимальный маршрут
                </button>
                <button class="action-btn" onclick="alert('Экспорт PDF')"
                        style="width: 56px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </div>
        `;
    },

    renderTakeoffPoints(bases) {
        if (bases.length === 0) {
            return '<p style="color: #718096;">Нет точек взлёта</p>';
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                ${bases.map(base => `
                    <div style="padding: 15px; background: #f7fafc; border-radius: 10px; border: 2px solid ${base.weatherWindow?.status === 'good' ? '#38a169' : '#e2e8f0'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-weight: 600; color: #2d3748;">
                                <i class="fas fa-helicopter" style="color: #667eea;"></i> ${base.name}
                            </div>
                            ${base.weatherWindow?.status === 'good' ?
                                '<span style="padding: 4px 8px; background: #c6f6d5; color: #22543d; border-radius: 4px; font-size: 10px;">✅ Благоприятно</span>' :
                                '<span style="padding: 4px 8px; background: #feebc8; color: #744210; border-radius: 4px; font-size: 10px;">⏳ Ожидание</span>'
                            }
                        </div>
                        <div style="font-size: 11px; color: #718096; margin-bottom: 6px;">
                            📍 ${base.lat.toFixed(4)}, ${base.lon.toFixed(4)}
                        </div>
                        ${base.weatherWindow?.duration ? `
                            <div style="font-size: 11px; color: #2d3748;">
                                ⏰ Окно: ${base.weatherWindow.start} – ${base.weatherWindow.end} (${base.weatherWindow.duration} мин)
                            </div>
                            <div style="font-size: 11px; color: #2d3748;">
                                💨 Ветер: ${base.weatherWindow.avgWind} м/с
                            </div>
                        ` : '<div style="font-size: 11px; color: #718096;">Нет данных о погоде</div>'}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderAssignment(assignment) {
        if (!assignment || assignment.length === 0) return '';

        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-tasks" style="color: #38a169;"></i>
                    Распределение маршрутов по базам
                </div>
                ${assignment.map((baseAssignment, index) => `
                    <div style="margin-bottom: 20px; padding: 15px; background: #f7fafc; border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-weight: 600; color: #2d3748; font-size: 16px;">
                                <i class="fas fa-helicopter" style="color: #667eea;"></i> ${baseAssignment.base.name}
                            </div>
                            <div style="font-size: 12px; color: #718096;">
                                🛤️ ${Math.round(baseAssignment.totalDistance)} км │
                                ⚡ ${Math.round(baseAssignment.totalEnergy)} Вт·ч
                            </div>
                        </div>
                        ${baseAssignment.routes.length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${baseAssignment.routes.map((route, routeIndex) => `
                                    <div style="padding: 10px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div style="font-weight: 600; color: #2d3748;">
                                                ${index + 1}.${routeIndex + 1}. ${route.name}
                                            </div>
                                            <div style="font-size: 11px; color: #718096;">
                                                🛤️ ${route.flightPlan?.total?.distance || 0} км │
                                                ⏱️ ${route.flightPlan?.total?.time || 0} мин │
                                                ⚡ ${route.flightPlan?.total?.energy || 0} Вт·ч
                                            </div>
                                        </div>
                                        <div style="font-size: 10px; color: #718096; margin-top: 6px;">
                                            📍 Точка входа: С${route.entryPoint?.segmentId || '—'}
                                            (${route.entryPoint?.distance || 0} км от базы)
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p style="color: #718096; font-size: 13px;">Нет доступных маршрутов</p>'}
                    </div>
                `).join('')}
            </div>
        `;
    },

    afterRender() {
        // Инициализация после рендера
        console.log('🗺️ Multi-Route Tab rendered');
    }
};
