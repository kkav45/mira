/**
 * Вкладка дашборда: МЕТЕОПРОГНОЗ 🌤️
 * Отображение метеоданных, графиков и рекомендаций
 */

const DashboardTabsMeteo = {
    /**
     * Рендер контента вкладки
     */
    render() {
        // Проверяем наличие данных из разных источников
        const hasCachedData = typeof WeatherModule !== 'undefined' &&
                              WeatherModule.cachedData &&
                              Object.keys(WeatherModule.cachedData).length > 0;

        const hasSegmentAnalysis = typeof RouteModule !== 'undefined' &&
                                   RouteModule.segmentAnalysis &&
                                   RouteModule.segmentAnalysis.length > 0;

        const hasData = hasCachedData || hasSegmentAnalysis;

        if (!hasData) {
            return this.renderPlaceholder();
        }

        return this.renderContent();
    },

    /**
     * Заглушка при отсутствии данных
     */
    renderPlaceholder() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-cloud-sun" style="color: #667eea;"></i>
                    Метеопрогноз
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">Выполните анализ маршрута для получения метеоданных</p>
                </div>
            </div>
        `;
    },

    /**
     * Основной контент с данными
     */
    renderContent() {
        // Получаем данные из RouteModule.segmentAnalysis или WeatherModule
        const segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
            ? RouteModule.segmentAnalysis
            : [];

        const weatherData = typeof WeatherModule !== 'undefined'
            ? WeatherModule.cachedData || WeatherModule.data
            : {};

        console.log('📊 DashboardTabsMeteo.renderContent()', {
            segmentAnalysisCount: segmentAnalysis.length,
            weatherDataKeys: Object.keys(weatherData),
            firstSegment: segmentAnalysis[0]
        });

        // Используем первый сегмент для общих данных
        const firstSegment = segmentAnalysis.length > 0 ? segmentAnalysis[0] : null;
        const analyzed = firstSegment?.analyzed || weatherData.analyzed || {};
        
        // Получаем hourly из разных источников
        let hourly = [];
        if (analyzed.hourly && Array.isArray(analyzed.hourly)) {
            hourly = analyzed.hourly;
        } else if (weatherData.hourly && Array.isArray(weatherData.hourly)) {
            hourly = weatherData.hourly;
        } else if (analyzed.timeseries && Array.isArray(analyzed.timeseries)) {
            hourly = analyzed.timeseries;
        }

        console.log('📊 hourly data:', {
            count: hourly.length,
            firstHour: hourly[0]
        });

        const recommendations = analyzed.recommendations || [];
        const flightWindows = analyzed.flightWindows || [];

        return `
            <!-- Рекомендации -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-clipboard-list" style="color: #667eea;"></i>
                    Рекомендации
                </div>
                <div id="dashboardMeteoRecommendations">
                    ${this.renderRecommendations(recommendations)}
                </div>
            </div>

            <!-- Графики -->
            <div class="dashboard-charts-grid">
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-chart-line"></i>
                        Временной ряд метеопараметров
                    </div>
                    <div id="dashboardTimeSeriesChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-compass"></i>
                        Роза ветров
                    </div>
                    <div id="dashboardWindRoseChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-arrow-up"></i>
                        Вертикальный профиль ветра
                    </div>
                    <div id="dashboardWindProfileChart" style="height: 300px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-wave-square"></i>
                        Индекс турбулентности
                    </div>
                    <div id="dashboardTurbulenceChart" style="height: 300px;"></div>
                </div>
            </div>

            <!-- Полётные окна -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-clock" style="color: #38a169;"></i>
                    Благоприятные окна для полёта (24ч)
                </div>
                <div id="dashboardFlightWindows">
                    ${this.renderFlightWindows(flightWindows)}
                </div>
            </div>

            <!-- Таблица почасовых данных -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-table"></i>
                    Почасовые данные
                </div>
                <div style="overflow-x: auto;">
                    ${this.renderHourlyTable(hourly)}
                </div>
            </div>
        `;
    },

    /**
     * Рендер рекомендаций
     */
    renderRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return `
                <div class="dashboard-recommendation info">
                    <i class="fas fa-info-circle dashboard-rec-icon"></i>
                    <span class="dashboard-rec-text">Нет рекомендаций. Условия благоприятные.</span>
                </div>
            `;
        }

        return recommendations.map(rec => {
            const typeClass = rec.type || 'info';
            const icon = this.getRecommendationIcon(rec.type);
            return `
                <div class="dashboard-recommendation ${typeClass}">
                    <i class="fas ${icon} dashboard-rec-icon"></i>
                    <span class="dashboard-rec-text">${rec.text || rec.message || ''}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Иконка для рекомендации
     */
    getRecommendationIcon(type) {
        const icons = {
            critical: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            success: 'fa-check-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    },

    /**
     * Рендер полётных окон
     */
    renderFlightWindows(windows) {
        if (!windows || windows.length === 0) {
            return `
                <p style="color: #718096; font-size: 14px;">
                    <i class="fas fa-info-circle"></i>
                    Благоприятные окна не найдены
                </p>
            `;
        }

        return windows.map(w => {
            const riskClass = w.risk === 'low' ? 'allowed' : w.risk === 'medium' ? 'allowed' : 'forbidden';
            const riskLabel = w.risk === 'low' ? '🟢 Низкий' : w.risk === 'medium' ? '🟡 Средний' : '🔴 Высокий';
            return `
                <div class="dashboard-flight-window ${riskClass}">
                    <div class="dashboard-flight-window-time">${w.start || '--:--'}–${w.end || '--:--'}</div>
                    <div class="dashboard-flight-window-duration">${w.duration || 0} ч</div>
                    <div class="dashboard-flight-window-metrics">
                        <div class="dashboard-flight-window-metric">
                            <div class="dashboard-flight-window-metric-value">${w.wind || 0} м/с</div>
                            <div class="dashboard-flight-window-metric-label">Ветер</div>
                        </div>
                        <div class="dashboard-flight-window-metric">
                            <div class="dashboard-flight-window-metric-value">${w.temp > 0 ? '+' : ''}${w.temp || 0}°C</div>
                            <div class="dashboard-flight-window-metric-label">Темп.</div>
                        </div>
                        <div class="dashboard-flight-window-metric">
                            <div class="dashboard-flight-window-metric-value">${riskLabel}</div>
                            <div class="dashboard-flight-window-metric-label">Риск</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Рендер таблицы почасовых данных
     */
    renderHourlyTable(hourly) {
        if (!hourly || hourly.length === 0) {
            return '<p style="color: #718096;">Нет данных</p>';
        }

        const rows = hourly.slice(0, 12).map(h => {
            const riskClass = h.risk === 'low' ? 'low' : h.risk === 'medium' ? 'medium' : 'high';
            const riskLabel = h.risk === 'low' ? '🟢 Низкий' : h.risk === 'medium' ? '🟡 Средний' : '🔴 Высокий';
            return `
                <tr>
                    <td>${h.time || '--:--'}</td>
                    <td><span class="dashboard-status-badge ${riskClass}">${riskLabel}</span></td>
                    <td>${h.temp > 0 ? '+' : ''}${h.temp || 0}°C</td>
                    <td>${h.wind || 0} м/с</td>
                    <td>${h.windDir || 0}°</td>
                    <td>${h.precip || 0} мм/ч</td>
                    <td>${h.visibility || '>5'} км</td>
                    <td>${h.humidity || 0}%</td>
                </tr>
            `;
        }).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Время</th>
                        <th>Статус</th>
                        <th>Темп.</th>
                        <th>Ветер</th>
                        <th>Напр.</th>
                        <th>Осадки</th>
                        <th>Видимость</th>
                        <th>Влажность</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    /**
     * Построение графиков после рендера
     */
    afterRender() {
        // Получаем данные из RouteModule.segmentAnalysis
        const segmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis
            ? RouteModule.segmentAnalysis
            : [];

        const weatherData = typeof WeatherModule !== 'undefined'
            ? WeatherModule.cachedData || WeatherModule.data
            : {};

        // Используем первый сегмент
        const firstSegment = segmentAnalysis.length > 0 ? segmentAnalysis[0] : null;
        const analyzed = firstSegment?.analyzed || weatherData;

        console.log('📈 afterRender():', {
            firstSegment: firstSegment,
            analyzed: analyzed,
            hasHourly: !!analyzed?.hourly,
            hasTimeseries: !!analyzed?.timeseries
        });

        if (!analyzed) {
            console.warn('⚠️ No analyzed data found');
            return;
        }

        // Даём DOM время на рендер
        setTimeout(() => {
            this.initCharts(analyzed);
        }, 100);
    },

    /**
     * Инициализация графиков Plotly
     */
    initCharts(data) {
        if (typeof Plotly === 'undefined') {
            console.warn('⚠️ Plotly не загружен');
            return;
        }

        // Получаем почасовые данные
        const hourly = this.extractHourlyData(data);
        const times = hourly.map(h => h.time);

        console.log('📉 initCharts():', {
            hourlyCount: hourly.length,
            timesCount: times.length,
            firstHour: hourly[0],
            hasTime: !!hourly[0]?.time,
            hasTemp: !!hourly[0]?.temp,
            hasWind: !!hourly[0]?.wind,
            hasWindDir: !!hourly[0]?.windDir
        });

        // Временной ряд
        this.initTimeSeriesChart(times, hourly);

        // Роза ветров
        this.initWindRoseChart(hourly);

        // Вертикальный профиль ветра
        this.initWindProfileChart(data);

        // Турбулентность
        this.initTurbulenceChart(times, hourly);
    },

    /**
     * Извлечение почасовых данных
     */
    extractHourlyData(data) {
        // Пытаемся получить данные из разных источников
        if (data.hourly && Array.isArray(data.hourly)) return data.hourly;
        if (data.analyzed && data.analyzed.hourly) return data.analyzed.hourly;

        // Если есть raw данные Open-Meteo
        if (data.timeseries && Array.isArray(data.timeseries)) {
            return data.timeseries.map((t, i) => ({
                time: t.time ? t.time.split('T')[1] : `${i}:00`,
                temp: t.temperature_2m || 0,
                wind: t.wind_speed_10m || 0,
                windDir: t.wind_direction_10m || 0,
                precip: t.precipitation || 0,
                humidity: t.relative_humidity_2m || 0,
                visibility: t.visibility || 5,
                risk: t.risk || 'low'
            }));
        }

        return [];
    },

    /**
     * Временной ряд
     */
    initTimeSeriesChart(times, hourly) {
        const trace1 = {
            x: times,
            y: hourly.map(h => h.temp),
            name: 'Температура, °C',
            line: { color: '#ef4444' },
            type: 'scatter'
        };

        const trace2 = {
            x: times,
            y: hourly.map(h => h.wind),
            name: 'Ветер, м/с',
            line: { color: '#3b82f6' },
            type: 'scatter',
            yaxis: 'y2'
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 50 },
            height: 280,
            xaxis: { title: 'Время' },
            yaxis: { title: 'Температура, °C' },
            yaxis2: {
                title: 'Ветер, м/с',
                overlaying: 'y',
                side: 'right'
            },
            showlegend: true,
            legend: { x: 0, y: 1 }
        };

        Plotly.newPlot('dashboardTimeSeriesChart', [trace1, trace2], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Роза ветров
     */
    initWindRoseChart(hourly) {
        // Группировка по направлениям
        const directions = { 'С': 0, 'СВ': 0, 'В': 0, 'ЮВ': 0, 'Ю': 0, 'ЮЗ': 0, 'З': 0, 'СЗ': 0 };
        const counts = { 'С': 0, 'СВ': 0, 'В': 0, 'ЮВ': 0, 'Ю': 0, 'ЮЗ': 0, 'З': 0, 'СЗ': 0 };

        hourly.forEach(h => {
            const dir = h.windDir || 0;
            const speed = h.wind || 0;
            let sector = 'С';
            if (dir >= 337.5 || dir < 22.5) sector = 'С';
            else if (dir >= 22.5 && dir < 67.5) sector = 'СВ';
            else if (dir >= 67.5 && dir < 112.5) sector = 'В';
            else if (dir >= 112.5 && dir < 157.5) sector = 'ЮВ';
            else if (dir >= 157.5 && dir < 202.5) sector = 'Ю';
            else if (dir >= 202.5 && dir < 247.5) sector = 'ЮЗ';
            else if (dir >= 247.5 && dir < 292.5) sector = 'З';
            else if (dir >= 292.5 && dir < 337.5) sector = 'СЗ';

            directions[sector] += speed;
            counts[sector]++;
        });

        const avgSpeeds = Object.keys(directions).map(k => counts[k] > 0 ? directions[k] / counts[k] : 0);

        const trace = {
            type: 'barpolar',
            r: avgSpeeds,
            theta: [0, 45, 90, 135, 180, 225, 270, 315],
            marker: {
                color: '#3b82f6',
                line: { color: '#fff', width: 2 }
            }
        };

        const layout = {
            polar: {
                radialaxis: { visible: true },
                angularaxis: { direction: 'clockwise' }
            },
            margin: { t: 20, b: 20, l: 20, r: 20 },
            height: 280
        };

        Plotly.newPlot('dashboardWindRoseChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Вертикальный профиль ветра
     */
    initWindProfileChart(data) {
        const heights = [100, 200, 300, 400, 500];
        const windSpeeds = heights.map(h => {
            const key = `wind${h}m`;
            return (data.analyzed && data.analyzed[key]) || (data.current && data.current[key]) || 0;
        });

        // Если нет данных, используем заглушку
        if (windSpeeds.every(w => w === 0)) {
            for (let i = 0; i < heights.length; i++) {
                windSpeeds[i] = 5 + i * 2; // Примерные данные
            }
        }

        const trace = {
            x: windSpeeds,
            y: heights,
            mode: 'lines+markers',
            line: { color: '#3b82f6', width: 3 },
            marker: { size: 8 }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 20 },
            height: 280,
            xaxis: { title: 'Ветер, м/с' },
            yaxis: { title: 'Высота, м', autorange: 'reversed' }
        };

        Plotly.newPlot('dashboardWindProfileChart', [trace], layout, { responsive: true, displayModeBar: false });
    },

    /**
     * Турбулентность
     */
    initTurbulenceChart(times, hourly) {
        // Генерируем индекс турбулентности на основе ветра
        const turbulence = hourly.map(h => {
            const wind = h.wind || 0;
            return Math.min(100, wind * 10);
        });

        const trace = {
            x: times,
            y: turbulence,
            mode: 'lines+markers',
            line: { color: '#f59e0b', width: 3 },
            fill: 'tozeroy'
        };

        const layout = {
            margin: { t: 20, b: 40, l: 50, r: 20 },
            height: 280,
            xaxis: { title: 'Время' },
            yaxis: { title: 'Индекс' }
        };

        Plotly.newPlot('dashboardTurbulenceChart', [trace], layout, { responsive: true, displayModeBar: false });
    }
};
