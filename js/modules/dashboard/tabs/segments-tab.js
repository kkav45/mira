/**
 * Вкладка дашборда: СЕГМЕНТЫ 🗺️
 * Детализация по сегментам маршрута
 */

const DashboardTabsSegments = {
    selectedSegmentIndex: 0,

    render() {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];

        const segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
            ? RouteModule.segmentAnalysis
            : [];

        if (!segments || segments.length === 0) {
            return this.renderPlaceholder();
        }

        return this.renderContent(segments, segmentAnalysis);
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

    renderContent(segments, segmentAnalysis) {
        const totalDistance = segments.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(1);
        const avgRisk = this.calculateAverageRisk(segmentAnalysis);

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
                        <div class="dashboard-energy-card-value">${totalDistance} км</div>
                        <div class="dashboard-energy-card-label">Дистанция</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⏱️</div>
                        <div class="dashboard-energy-card-value">~${(totalDistance / 50 * 60).toFixed(0)} мин</div>
                        <div class="dashboard-energy-card-label">Время</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⚠️</div>
                        <div class="dashboard-energy-card-value">${avgRisk}</div>
                        <div class="dashboard-energy-card-label">Средний риск</div>
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
                    ${segments.map((s, i) => {
                        const analysis = segmentAnalysis[i];
                        const risk = analysis?.riskLevel || 'low';
                        const riskColor = risk === 'low' ? '#38a169' : risk === 'medium' ? '#d69e2e' : '#ef4444';
                        return `
                            <button class="dashboard-segment-btn ${i === this.selectedSegmentIndex ? 'active' : ''}" 
                                    data-segment="${i}" 
                                    style="padding: 8px 16px; border: 2px solid ${riskColor}; border-radius: 8px; background: ${i === this.selectedSegmentIndex ? riskColor : 'white'}; color: ${i === this.selectedSegmentIndex ? 'white' : riskColor}; cursor: pointer; font-weight: 600;">
                                С${i + 1}
                            </button>
                        `;
                    }).join('')}
                </div>
                <div id="dashboardSegmentDetails">
                    ${this.renderSegmentDetails(segments[this.selectedSegmentIndex], segmentAnalysis[this.selectedSegmentIndex], this.selectedSegmentIndex)}
                </div>
            </div>

            <!-- Графики по сегментам -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-wind"></i>
                        Ветер по сегментам
                    </div>
                    <div id="dashboardSegmentWindChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-thermometer-half"></i>
                        Температура по сегментам
                    </div>
                    <div id="dashboardSegmentTempChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-line"></i>
                        Профиль риска
                    </div>
                    <div id="dashboardSegmentRiskChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Путевая скорость
                    </div>
                    <div id="dashboardSegmentSpeedChart" style="height: 280px;"></div>
                </div>
            </div>

            <!-- Таблица всех сегментов -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-table"></i>
                    Сводная таблица
                </div>
                ${this.renderSegmentsTable(segments, segmentAnalysis)}
            </div>
        `;
    },

    renderSegmentDetails(segment, analysis, index) {
        if (!segment) return '<p>Нет данных</p>';

        const center = segment.center || segment;
        const riskLevel = analysis?.riskLevel || 'low';
        const riskClass = riskLevel === 'low' ? 'low' : riskLevel === 'medium' ? 'medium' : 'high';
        const riskLabel = riskLevel === 'low' ? '🟢 Низкий' : riskLevel === 'medium' ? '🟡 Средний' : '🔴 Высокий';

        // Получаем данные из анализа
        const hourly = analysis?.analyzed?.hourly || [];
        const firstHour = hourly[0] || {};
        const wind10m = firstHour.wind10m || firstHour.wind || 0;
        const temp2m = firstHour.temp2m || firstHour.temp || 0;
        const precip = firstHour.precip || firstHour.precipitation || 0;
        const visibility = firstHour.visibility || 5;

        return `
            <div class="dashboard-card" style="background: #f7fafc; border: 2px solid #e2e8f0;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 11px; color: #718096; text-transform: uppercase;">Координаты</div>
                        <div style="font-size: 14px; font-weight: 600; color: #2d3748;">${center.lat?.toFixed(4) || '—'}, ${center.lon?.toFixed(4) || '—'}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096; text-transform: uppercase;">Дистанция</div>
                        <div style="font-size: 14px; font-weight: 600; color: #2d3748;">${segment.distance || 5} км</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #718096; text-transform: uppercase;">Риск</div>
                        <div><span class="dashboard-status-badge ${riskClass}">${riskLabel}</span></div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">💨 Ветер 10м</div>
                        <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${wind10m} м/с</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">🌡️ Температура</div>
                        <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${temp2m > 0 ? '+' : ''}${temp2m}°C</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">🌧️ Осадки</div>
                        <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${precip} мм/ч</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">👁️ Видимость</div>
                        <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${visibility} км</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderSegmentsTable(segments, segmentAnalysis) {
        if (!segments || segments.length === 0) {
            return '<p style="color: #718096;">Нет данных</p>';
        }

        const rows = segments.map((s, i) => {
            const analysis = segmentAnalysis[i];
            const hourly = analysis?.analyzed?.hourly || [];
            const firstHour = hourly[0] || {};

            const riskClass = analysis?.riskLevel === 'low' ? 'low' : analysis?.riskLevel === 'medium' ? 'medium' : 'high';
            const riskLabel = analysis?.riskLevel === 'low' ? '🟢' : analysis?.riskLevel === 'medium' ? '🟡' : '🔴';

            return `
                <tr>
                    <td><strong>С${i + 1}</strong></td>
                    <td>${riskLabel}</td>
                    <td>${s.distance || 5}</td>
                    <td>${firstHour.wind10m || firstHour.wind || 0}</td>
                    <td>${firstHour.temp2m > 0 ? '+' : ''}${firstHour.temp2m || 0}</td>
                    <td>${firstHour.precip || firstHour.precipitation || 0}</td>
                    <td>${firstHour.visibility || 5}</td>
                    <td>${firstHour.humidity || firstHour.relative_humidity_2m || 0}%</td>
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

    calculateAverageRisk(segmentAnalysis) {
        if (!segmentAnalysis || segmentAnalysis.length === 0) return '—';

        const riskScores = { 'low': 1, 'medium': 2, 'high': 3 };
        const total = segmentAnalysis.reduce((sum, s) => sum + riskScores[s.riskLevel || 'low'], 0);
        const avg = total / segmentAnalysis.length;

        if (avg < 1.5) return '🟢 Низкий';
        if (avg < 2.5) return '🟡 Средний';
        return '🔴 Высокий';
    },

    afterRender() {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];

        const segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
            ? RouteModule.segmentAnalysis
            : [];

        if (segments.length === 0) return;

        setTimeout(() => {
            this.bindEvents();
            this.initCharts(segments, segmentAnalysis);
        }, 100);
    },

    bindEvents() {
        document.querySelectorAll('.dashboard-segment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.segment);
                this.selectedSegmentIndex = index;

                const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
                    ? RouteModule.segments
                    : [];

                const segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
                    ? RouteModule.segmentAnalysis
                    : [];

                const details = document.getElementById('dashboardSegmentDetails');
                if (details) {
                    details.innerHTML = this.renderSegmentDetails(segments[index], segmentAnalysis[index], index);
                }

                // Обновление кнопок
                document.querySelectorAll('.dashboard-segment-btn').forEach(b => {
                    const segIndex = parseInt(b.dataset.segment);
                    const risk = segmentAnalysis[segIndex]?.riskLevel || 'low';
                    const riskColor = risk === 'low' ? '#38a169' : risk === 'medium' ? '#d69e2e' : '#ef4444';
                    b.style.background = segIndex === index ? riskColor : 'white';
                    b.style.color = segIndex === index ? 'white' : riskColor;
                });
            });
        });
    },

    initCharts(segments, segmentAnalysis) {
        if (typeof Plotly === 'undefined') return;

        this.initWindChart(segments, segmentAnalysis);
        this.initTempChart(segments, segmentAnalysis);
        this.initRiskChart(segmentAnalysis);
        this.initSpeedChart(segments, segmentAnalysis);
    },

    initWindChart(segments, segmentAnalysis) {
        const windSpeeds = segmentAnalysis.map(sa => {
            const hourly = sa?.analyzed?.hourly || [];
            return hourly[0]?.wind10m || hourly[0]?.wind || 0;
        });

        const trace = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: windSpeeds,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3b82f6', width: 3 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Ветер, м/с' }
        };

        Plotly.newPlot('dashboardSegmentWindChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    initTempChart(segments, segmentAnalysis) {
        const temps = segmentAnalysis.map(sa => {
            const hourly = sa?.analyzed?.hourly || [];
            return hourly[0]?.temp2m || hourly[0]?.temp || 0;
        });

        const trace = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: temps,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#ef4444', width: 3 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Температура, °C' }
        };

        Plotly.newPlot('dashboardSegmentTempChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    initRiskChart(segmentAnalysis) {
        const riskScores = segmentAnalysis.map(sa => {
            const risk = sa?.riskLevel || 'low';
            return risk === 'low' ? 1 : risk === 'medium' ? 2 : 3;
        });

        const colors = riskScores.map(score => score === 1 ? '#38a169' : score === 2 ? '#d69e2e' : '#ef4444');

        const trace = {
            x: segmentAnalysis.map((s, i) => `С${i + 1}`),
            y: riskScores,
            type: 'bar',
            marker: { color: colors }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { 
                title: 'Риск',
                tickvals: [1, 2, 3],
                ticktext: ['Низкий', 'Средний', 'Высокий']
            }
        };

        Plotly.newPlot('dashboardSegmentRiskChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    initSpeedChart(segments, segmentAnalysis) {
        // Расчёт путевой скорости на основе ветра
        const speeds = segmentAnalysis.map(sa => {
            const hourly = sa?.analyzed?.hourly || [];
            const wind = hourly[0]?.wind10m || hourly[0]?.wind || 5;
            // Упрощённая модель: базовая скорость 50 км/ч ± ветер
            return Math.max(30, Math.min(80, 50 + (wind - 5) * 3));
        });

        const trace = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: speeds,
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#38a169', width: 3 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Скорость, км/ч' }
        };

        Plotly.newPlot('dashboardSegmentSpeedChart', [trace], layout, { responsive: true, displayModeBar: false });
    }
};
