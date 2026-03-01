/**
 * Вкладка дашборда: СИДЯ НА ЗЕМЛЕ 🚩
 * Наблюдения пилота на точке старта, сравнение прогноз/факт
 */

const DashboardTabsGround = {
    render() {
        const observations = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule.getGroundObservations()
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
                    <i class="fas fa-flag" style="color: #ed8936;"></i>
                    Сидя на земле
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Введите данные наблюдений на шаге 2 мастера</p>
                </div>
            </div>
        `;
    },

    renderContent(observations) {
        const lastObservation = observations[observations.length - 1];
        const comparison = this.getForecastComparison(lastObservation);

        return `
            <!-- Последнее наблюдение -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-map-marker-alt" style="color: #ed8936;"></i>
                    Точка старта
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div style="background: #f7fafc; padding: 15px; border-radius: 10px;">
                        <div style="font-size: 11px; color: #718096; text-transform: uppercase;">Широта</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${lastObservation.lat?.toFixed(4) || '—'}</div>
                    </div>
                    <div style="background: #f7fafc; padding: 15px; border-radius: 10px;">
                        <div style="font-size: 11px; color: #718096; text-transform: uppercase;">Долгота</div>
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${lastObservation.lon?.toFixed(4) || '—'}</div>
                    </div>
                </div>
            </div>

            <!-- Параметры последнего наблюдения -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-clock" style="color: #3b82f6;"></i>
                    Последнее наблюдение (${this.formatTime(lastObservation.timestamp)})
                </div>
                <div class="dashboard-energy-cards">
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">💨</div>
                        <div class="dashboard-energy-card-value">${lastObservation.windSpeed || 0} м/с</div>
                        <div class="dashboard-energy-card-label">Ветер</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🧭</div>
                        <div class="dashboard-energy-card-value">${lastObservation.windDir || 0}°</div>
                        <div class="dashboard-energy-card-label">Направление</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🌡️</div>
                        <div class="dashboard-energy-card-value">${lastObservation.temp > 0 ? '+' : ''}${lastObservation.temp || 0}°C</div>
                        <div class="dashboard-energy-card-label">Температура</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">💧</div>
                        <div class="dashboard-energy-card-value">${lastObservation.humidity || 0}%</div>
                        <div class="dashboard-energy-card-label">Влажность</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">👁️</div>
                        <div class="dashboard-energy-card-value">${lastObservation.visibility || '>5'} км</div>
                        <div class="dashboard-energy-card-label">Видимость</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">☁️</div>
                        <div class="dashboard-energy-card-value">${lastObservation.cloudBase || 0} м</div>
                        <div class="dashboard-energy-card-label">Облака</div>
                    </div>
                </div>
            </div>

            <!-- Сравнение прогноз/факт -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-balance-scale" style="color: #48bb78;"></i>
                    Сравнение прогноз/факт
                </div>
                ${this.renderComparisonTable(comparison)}
            </div>

            <!-- Хронология наблюдений -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-history" style="color: #667eea;"></i>
                    Хронология наблюдений
                </div>
                ${this.renderObservationsTimeline(observations)}
            </div>
        `;
    },

    getForecastComparison(observation) {
        const weatherData = typeof WeatherModule !== 'undefined'
            ? WeatherModule.cachedData
            : {};

        // Пытаемся получить текущие данные из разных источников
        let forecast = {};
        if (weatherData.current) {
            forecast = weatherData.current;
        } else if (weatherData.analyzed && weatherData.analyzed.current) {
            forecast = weatherData.analyzed.current;
        }

        return {
            windSpeed: { forecast: forecast.wind10m || forecast.wind_speed_10m || 0, fact: observation.windSpeed || 0 },
            temp: { forecast: forecast.temp || forecast.temperature_2m || 0, fact: observation.temp || 0 },
            humidity: { forecast: forecast.humidity || forecast.relative_humidity_2m || 0, fact: observation.humidity || 0 },
            visibility: { forecast: forecast.visibility || 0, fact: observation.visibility || 0 }
        };
    },

    renderComparisonTable(comparison) {
        const rows = Object.entries(comparison).map(([key, data]) => {
            const delta = data.fact - data.forecast;
            const deltaPercent = data.forecast > 0 ? ((delta / data.forecast) * 100).toFixed(1) : 0;
            const status = Math.abs(deltaPercent) < 10 ? '✅' : deltaPercent > 0 ? '⚠️ +' : '⚠️ ';

            return `
                <tr>
                    <td>${this.getParamName(key)}</td>
                    <td>${data.forecast}</td>
                    <td>${data.fact}</td>
                    <td>${status}${delta > 0 ? '+' : ''}${deltaPercent}%</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Параметр</th>
                        <th>Прогноз</th>
                        <th>Факт</th>
                        <th>Отклонение</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    renderObservationsTimeline(observations) {
        const items = observations.slice().reverse().map(obs => `
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

    getParamName(key) {
        const names = {
            windSpeed: 'Ветер, м/с',
            windDir: 'Направление, °',
            temp: 'Температура, °C',
            humidity: 'Влажность, %',
            visibility: 'Видимость, км',
            cloudBase: 'Облака, м'
        };
        return names[key] || key;
    },

    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },

    afterRender() {}
};
