/**
 * Вкладка дашборда: В ПОЛЁТЕ ✈️
 * Наблюдения пилота во время полёта
 */

const DashboardTabsFlight = {
    render() {
        const observations = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule.getFlightObservations()
            : [];

        if (!observations || observations.length === 0) {
            return this.renderPlaceholder();
        }

        return this.renderContent(observations);
    },

    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-plane" style="color: #3b82f6;"></i>
                    В полёте
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Нет данных наблюдений в полёте</p>
                </div>
            </div>
        `;
    },

    renderContent(observations) {
        return `
            <!-- Статистика -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-chart-pie" style="color: #3b82f6;"></i>
                    Статистика полёта
                </div>
                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">📝</div>
                        <div class="dashboard-energy-card-value">${observations.length}</div>
                        <div class="dashboard-energy-card-label">Наблюдений</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⏱️</div>
                        <div class="dashboard-energy-card-value">${this.getFlightDuration(observations)}</div>
                        <div class="dashboard-energy-card-label">Длительность</div>
                    </div>
                </div>
            </div>

            <!-- Хронология -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-timeline" style="color: #667eea;"></i>
                    Хронология наблюдений
                </div>
                ${this.renderTimeline(observations)}
            </div>

            <!-- График отклонений -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-line"></i>
                        Отклонения от прогноза
                    </div>
                    <div id="dashboardFlightDeviationChart" style="height: 300px;"></div>
                </div>
            </div>
        `;
    },

    renderTimeline(observations) {
        const items = observations.map(obs => `
            <div class="dashboard-flight-window allowed" style="padding: 12px;">
                <div class="dashboard-flight-window-time" style="font-size: 14px;">
                    ${this.formatTime(obs.timestamp)}
                </div>
                <div class="dashboard-flight-window-metrics">
                    <div class="dashboard-flight-window-metric">
                        <div class="dashboard-flight-window-metric-value">${obs.windSpeed || 0}</div>
                        <div class="dashboard-flight-window-metric-label">Ветер</div>
                    </div>
                    <div class="dashboard-flight-window-metric">
                        <div class="dashboard-flight-window-metric-value">${obs.temp > 0 ? '+' : ''}${obs.temp || 0}</div>
                        <div class="dashboard-flight-window-metric-label">Темп.</div>
                    </div>
                    <div class="dashboard-flight-window-metric">
                        <div class="dashboard-flight-window-metric-value">${obs.humidity || 0}%</div>
                        <div class="dashboard-flight-window-metric-label">Влажн.</div>
                    </div>
                </div>
            </div>
        `).join('');

        return items || '<p style="color: #718096;">Нет наблюдений</p>';
    },

    getFlightDuration(observations) {
        if (observations.length < 2) return '—';
        const first = new Date(observations[0].timestamp);
        const last = new Date(observations[observations.length - 1].timestamp);
        const diff = Math.round((last - first) / 60000);
        return `${diff} мин`;
    },

    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },

    afterRender() {
        setTimeout(() => {
            this.initDeviationChart();
        }, 100);
    },

    initDeviationChart() {
        if (typeof Plotly === 'undefined') return;

        const observations = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule.getFlightObservations()
            : [];

        if (observations.length === 0) return;

        const times = observations.map(o => this.formatTime(o.timestamp));
        const tempDeviation = observations.map(o => (o.temp || 0) - 20);
        const windDeviation = observations.map(o => (o.windSpeed || 0) - 5);

        const trace1 = {
            x: times,
            y: tempDeviation,
            name: 'Δ Темп.',
            line: { color: '#ef4444' },
            type: 'scatter'
        };

        const trace2 = {
            x: times,
            y: windDeviation,
            name: 'Δ Ветер',
            line: { color: '#3b82f6' },
            type: 'scatter'
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 20 },
            height: 280,
            xaxis: { title: 'Время' },
            yaxis: { title: 'Отклонение' },
            showlegend: true
        };

        const chartId = 'dashboardFlightDeviationChart';
        const el = document.getElementById(chartId);
        if (el) {
            Plotly.newPlot(chartId, [trace1, trace2], layout, { responsive: true, displayModeBar: false });
        }
    }
};
