/**
 * Вкладка дашборда: СЕГМЕНТЫ 🗺️
 * Детализация по сегментам маршрута
 */

const DashboardTabsSegments = {
    render() {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];

        if (!segments || segments.length === 0) {
            return this.renderPlaceholder();
        }

        return this.renderContent(segments);
    },

    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-map" style="color: #48bb78;"></i>
                    Сегменты маршрута
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Создайте маршрут для анализа сегментов</p>
                </div>
            </div>
        `;
    },

    renderContent(segments) {
        const analysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
            ? RouteModule.segmentAnalysis
            : [];

        return `
            <!-- Сводка -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-route" style="color: #667eea;"></i>
                    Маршрут
                </div>
                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🛤️</div>
                        <div class="dashboard-energy-card-value">${segments.length}</div>
                        <div class="dashboard-energy-card-label">Сегментов</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">📏</div>
                        <div class="dashboard-energy-card-value">${this.getTotalDistance(segments)} км</div>
                        <div class="dashboard-energy-card-label">Дистанция</div>
                    </div>
                </div>
            </div>

            <!-- Выбор сегмента -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-th" style="color: #48bb78;"></i>
                    Сегменты
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
                    ${segments.map((s, i) => `
                        <button class="dashboard-tab" data-segment="${i}" style="padding: 8px 16px;">
                            С${i + 1}
                        </button>
                    `).join('')}
                </div>
                <div id="dashboardSegmentDetails">
                    ${this.renderSegmentDetails(segments[0], 0)}
                </div>
            </div>

            <!-- Таблица всех сегментов -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-table"></i>
                    Сводная таблица
                </div>
                ${this.renderSegmentsTable(segments, analysis)}
            </div>
        `;
    },

    renderSegmentDetails(segment, index) {
        if (!segment) return '<p>Нет данных</p>';

        const riskClass = segment.risk === 'low' ? 'low' : segment.risk === 'medium' ? 'medium' : 'high';
        const riskLabel = segment.risk === 'low' ? '🟢 Низкий' : segment.risk === 'medium' ? '🟡 Средний' : '🔴 Высокий';

        return `
            <div class="dashboard-card" style="background: #f7fafc;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div>
                        <div style="font-size: 11px; color: #718096;">Координаты</div>
                        <div style="font-size: 14px; font-weight: 600;">${segment.lat?.toFixed(4) || '—'}, ${segment.lon?.toFixed(4) || '—'}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096;">Дистанция</div>
                        <div style="font-size: 14px; font-weight: 600;">${segment.distance || 5} км</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096;">Риск</div>
                        <div><span class="dashboard-status-badge ${riskClass}">${riskLabel}</span></div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096;">Ветер 10м</div>
                        <div style="font-size: 14px; font-weight: 600;">${segment.wind10m || segment.wind || 0} м/с</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096;">Температура</div>
                        <div style="font-size: 14px; font-weight: 600;">${segment.temp > 0 ? '+' : ''}${segment.temp || 0}°C</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096;">Осадки</div>
                        <div style="font-size: 14px; font-weight: 600;">${segment.precip || 0} мм/ч</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderSegmentsTable(segments, analysis) {
        if (!segments || segments.length === 0) {
            return '<p style="color: #718096;">Нет данных</p>';
        }

        const rows = segments.map((s, i) => {
            const riskClass = s.risk === 'low' ? 'low' : s.risk === 'medium' ? 'medium' : 'high';
            const riskLabel = s.risk === 'low' ? '🟢' : s.risk === 'medium' ? '🟡' : '🔴';

            return `
                <tr>
                    <td><strong>С${i + 1}</strong></td>
                    <td>${riskLabel}</td>
                    <td>${s.distance || 5}</td>
                    <td>${s.wind10m || s.wind || 0}</td>
                    <td>${s.temp > 0 ? '+' : ''}${s.temp || 0}</td>
                    <td>${s.precip || 0}</td>
                    <td>${s.visibility || '>5'}</td>
                    <td>${s.humidity || 0}%</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Сегмент</th>
                        <th>Риск</th>
                        <th>Дистанция</th>
                        <th>Ветер</th>
                        <th>Темп.</th>
                        <th>Осадки</th>
                        <th>Видимость</th>
                        <th>Влажность</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    getTotalDistance(segments) {
        return segments.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(1);
    },

    afterRender() {
        // Привязка событий для выбора сегмента
        setTimeout(() => {
            const buttons = document.querySelectorAll('[data-segment]');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.segment);
                    const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
                        ? RouteModule.segments
                        : [];
                    const details = document.getElementById('dashboardSegmentDetails');
                    if (details && segments[index]) {
                        details.innerHTML = this.renderSegmentDetails(segments[index], index);
                    }

                    // Обновление активной кнопки
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }, 100);
    }
};
