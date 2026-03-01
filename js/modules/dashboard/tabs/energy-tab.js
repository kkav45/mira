/**
 * Вкладка дашборда: ЭНЕРГИЯ 🔋
 * Расчёт энергопотребления и баланса
 */

const DashboardTabsEnergy = {
    render() {
        const energyData = typeof EnergyModule !== 'undefined' && EnergyModule.result
            ? EnergyModule.result
            : null;

        if (!energyData) {
            return this.renderPlaceholder();
        }

        return this.renderContent(energyData);
    },

    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-battery-three-quarters" style="color: #ed8936;"></i>
                    Энергоэффективность
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Выполните анализ маршрута для расчёта энергии</p>
                </div>
            </div>
        `;
    },

    renderContent(data) {
        const statusClass = data.status === 'allowed' ? 'allowed' : data.status === 'warning' ? 'warning' : 'forbidden';
        const statusText = data.status === 'allowed' ? 'ПОЛЁТ РАЗРЕШЁН' : data.status === 'warning' ? 'ПОЛЁТ С ОГРАНИЧЕНИЯМИ' : 'ПОЛЁТ ЗАПРЕЩЁН';
        const statusIcon = data.status === 'allowed' ? 'fa-check-circle' : data.status === 'warning' ? 'fa-exclamation-circle' : 'fa-times-circle';

        return `
            <!-- Статус -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-bolt" style="color: #ed8936;"></i>
                    Статус энергоэффективности
                </div>
                <div class="dashboard-energy-status ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    <span>${statusText}</span>
                </div>

                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🛤️</div>
                        <div class="dashboard-energy-card-value">${data.totalDistance || 0} км</div>
                        <div class="dashboard-energy-card-label">Дистанция</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⏱️</div>
                        <div class="dashboard-energy-card-value">${data.totalTime || 0} мин</div>
                        <div class="dashboard-energy-card-label">Время</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⚡</div>
                        <div class="dashboard-energy-card-value">${data.totalEnergy || 0} Вт·ч</div>
                        <div class="dashboard-energy-card-label">Энергия</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🔋</div>
                        <div class="dashboard-energy-card-value">${data.reserve || 0}%</div>
                        <div class="dashboard-energy-card-label">Резерв</div>
                    </div>
                </div>
            </div>

            <!-- Туда / Обратно -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-exchange-alt" style="color: #667eea;"></i>
                    Баланс "Туда / Обратно"
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    ${this.renderDirectionCard('Туда', data.to, 'fa-arrow-right')}
                    ${this.renderDirectionCard('Обратно', data.return, 'fa-arrow-left')}
                </div>
            </div>

            <!-- Графики -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-pie"></i>
                        Баланс энергии
                    </div>
                    <div id="dashboardEnergyBalanceChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-wind"></i>
                        Профиль ветра
                    </div>
                    <div id="dashboardEnergyWindChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Путевая скорость
                    </div>
                    <div id="dashboardEnergySpeedChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-bolt"></i>
                        Мощность
                    </div>
                    <div id="dashboardEnergyPowerChart" style="height: 300px;"></div>
                </div>
            </div>
        `;
    },

    renderDirectionCard(direction, data, icon) {
        if (!data) return '<div>Нет данных</div>';

        return `
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; border: 2px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 16px; font-weight: 700;">
                    <i class="fas ${icon}" style="color: ${direction === 'Туда' ? '#3b82f6' : '#ef4444'};"></i>
                    ${direction.toUpperCase()}
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.energy || 0}</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Энергия, Вт·ч</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.time || 0}</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Время, мин</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.speed || 0}</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Скорость, км/ч</div>
                    </div>
                </div>
            </div>
        `;
    },

    afterRender() {
        const data = typeof EnergyModule !== 'undefined' && EnergyModule.result
            ? EnergyModule.result
            : null;

        if (!data) return;

        setTimeout(() => {
            this.initCharts(data);
        }, 100);
    },

    initCharts(data) {
        if (typeof Plotly === 'undefined') return;

        this.initEnergyBalanceChart(data);
        this.initWindChart(data);
        this.initSpeedChart(data);
        this.initPowerChart(data);
    },

    initEnergyBalanceChart(data) {
        const trace = {
            values: [data.totalEnergy || 0, data.reserve || 0, 25],
            labels: ['Потрачено', 'Резерв', 'Мин. резерв'],
            type: 'pie',
            marker: {
                colors: ['#ef4444', '#38a169', '#ed8936']
            }
        };

        const layout = {
            margin: { t: 20, b: 20, l: 20, r: 20 },
            height: 280,
            showlegend: true
        };

        const el = document.getElementById('dashboardEnergyBalanceChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyBalanceChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initWindChart(data) {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];

        const trace = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: segments.map(s => s.wind10m || s.wind || 0),
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3b82f6', width: 3 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 280,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Ветер, м/с' }
        };

        const el = document.getElementById('dashboardEnergyWindChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyWindChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initSpeedChart(data) {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];

        const trace1 = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: segments.map(s => 45 + Math.random() * 10),
            name: 'Туда',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#38a169', width: 3 }
        };

        const trace2 = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: segments.map(s => 55 + Math.random() * 10),
            name: 'Обратно',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#ef4444', width: 3, dash: 'dash' }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 280,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Скорость, км/ч' },
            showlegend: true
        };

        const el = document.getElementById('dashboardEnergySpeedChart');
        if (el) {
            Plotly.newPlot('dashboardEnergySpeedChart', [trace1, trace2], layout, { responsive: true, displayModeBar: false });
        }
    },

    initPowerChart(data) {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];

        const trace = {
            x: segments.map((s, i) => `С${i + 1}`),
            y: segments.map(s => 150 + Math.random() * 100),
            type: 'bar',
            marker: {
                color: segments.map(s => {
                    const risk = s.risk || 'low';
                    return risk === 'low' ? '#38a169' : risk === 'medium' ? '#d69e2e' : '#ef4444';
                })
            }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 280,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Мощность, Вт' }
        };

        const el = document.getElementById('dashboardEnergyPowerChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyPowerChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    }
};
