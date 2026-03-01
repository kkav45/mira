/**
 * Вкладка дашборда: ЭНЕРГОЭФФЕКТИВНОСТЬ 🔋
 * Расчёт энергопотребления и баланса
 */

const DashboardTabsEnergy = {
    render() {
        // Проверяем наличие данных для расчёта энергии
        const hasRoute = typeof RouteModule !== 'undefined' && RouteModule.segments && RouteModule.segments.length > 0;
        const hasWeather = typeof WeatherModule !== 'undefined' && WeatherModule.cachedData;
        const hasSegmentAnalysis = typeof RouteModule !== 'undefined' && RouteModule.segmentAnalysis && RouteModule.segmentAnalysis.length > 0;

        if (!hasRoute || !hasSegmentAnalysis) {
            return this.renderPlaceholder();
        }

        // Расчёт энергии
        const energyData = this.calculateEnergy();

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

    /**
     * Расчёт энергопотребления
     */
    calculateEnergy() {
        const segments = RouteModule.segments || [];
        const segmentAnalysis = RouteModule.segmentAnalysis || [];

        // Профиль БВС (по умолчанию)
        const profile = {
            batteryCapacity: 39000,    // мА·ч (39 А·ч)
            batteryVoltage: 25.4,      // В (6S LiPo)
            cutoffVoltage: 16.8,       // В (отсечка)
            cruiseSpeed: 69,           // км/ч
            basePower: 120,            // Вт
            dragCoefficient: 0.185,
            weight: 8500,              // г
            minReserve: 0.25           // 25%
        };

        // Расчёт доступной энергии
        const avgVoltage = (profile.batteryVoltage + profile.cutoffVoltage) / 2; // 21.1 В
        const availableEnergy = avgVoltage * profile.batteryCapacity / 1000 * 0.8; // 658 Вт·ч (80% DoD)

        // Расчёт по сегментам
        let totalDistance = 0;
        let totalEnergy = 0;
        let toEnergy = 0;
        let returnEnergy = 0;
        const segmentEnergies = [];

        segments.forEach((segment, i) => {
            const analysis = segmentAnalysis[i];
            const hourly = analysis?.analyzed?.hourly || [];
            const firstHour = hourly[0] || {};

            const wind10m = firstHour.wind10m || firstHour.wind || 0;
            const windDir = firstHour.windDir || firstHour.wind_direction_10m || 0;

            // Угол между ветром и маршрутом
            const routeAngle = this.getRouteAngle(segment);
            const windAngle = windDir - routeAngle;
            const headwind = -wind10m * Math.cos(windAngle * Math.PI / 180);

            // Путевая скорость
            const groundSpeed = profile.cruiseSpeed + headwind * 3.6;

            // Время на сегменте
            const distance = segment.distance || 5;
            const timeHours = distance / Math.max(30, groundSpeed);

            // Мощность (упрощённо)
            const power = profile.basePower + 0.5 * Math.pow(Math.max(0, headwind * 3.6), 2);

            // Энергия на сегменте
            const energy = power * timeHours;

            totalDistance += distance;
            totalEnergy += energy;

            if (i < segments.length / 2) {
                toEnergy += energy;
            } else {
                returnEnergy += energy;
            }

            segmentEnergies.push({
                segment: i + 1,
                distance: distance,
                wind: wind10m,
                headwind: headwind,
                groundSpeed: groundSpeed,
                power: power,
                energy: energy,
                time: timeHours * 60
            });
        });

        // Резерв
        const reserve = Math.max(0, Math.round((1 - totalEnergy / availableEnergy) * 100));
        const status = reserve >= profile.minReserve * 100 ? 'allowed' : reserve >= 10 ? 'warning' : 'forbidden';

        return {
            status,
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalTime: Math.round(totalDistance / profile.cruiseSpeed * 60),
            totalEnergy: Math.round(totalEnergy),
            reserve,
            availableEnergy: Math.round(availableEnergy),
            to: {
                energy: Math.round(toEnergy),
                time: Math.round(toEnergy / totalEnergy * (totalDistance / profile.cruiseSpeed * 60)),
                speed: Math.round(profile.cruiseSpeed - 5)
            },
            return: {
                energy: Math.round(returnEnergy),
                time: Math.round(returnEnergy / totalEnergy * (totalDistance / profile.cruiseSpeed * 60)),
                speed: Math.round(profile.cruiseSpeed + 10)
            },
            segments: segmentEnergies,
            profile
        };
    },

    getRouteAngle(segment) {
        // Упрощённо: предполагаем маршрут с запада на восток (90°)
        return 90;
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
                        <div class="dashboard-energy-card-value">${data.totalDistance} км</div>
                        <div class="dashboard-energy-card-label">Дистанция</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⏱️</div>
                        <div class="dashboard-energy-card-value">${data.totalTime} мин</div>
                        <div class="dashboard-energy-card-label">Время</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">⚡</div>
                        <div class="dashboard-energy-card-value">${data.totalEnergy} Вт·ч</div>
                        <div class="dashboard-energy-card-label">Энергия</div>
                    </div>
                    <div class="dashboard-energy-card">
                        <div class="dashboard-energy-card-icon">🔋</div>
                        <div class="dashboard-energy-card-value">${data.reserve}%</div>
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
                    <div id="dashboardEnergyBalanceChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-wind"></i>
                        Профиль ветра
                    </div>
                    <div id="dashboardEnergyWindChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-tachometer-alt"></i>
                        Путевая скорость
                    </div>
                    <div id="dashboardEnergySpeedChart" style="height: 280px;"></div>
                </div>
                <div class="dashboard-chart-container">
                    <div class="dashboard-chart-title">
                        <i class="fas fa-bolt"></i>
                        Мощность
                    </div>
                    <div id="dashboardEnergyPowerChart" style="height: 280px;"></div>
                </div>
            </div>

            <!-- Детализация по сегментам -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-list"></i>
                    Детализация по сегментам
                </div>
                ${this.renderSegmentEnergyTable(data.segments)}
            </div>
        `;
    },

    renderDirectionCard(direction, data, icon) {
        return `
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; border: 2px solid #e2e8f0;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 16px; font-weight: 700;">
                    <i class="fas ${icon}" style="color: ${direction === 'Туда' ? '#3b82f6' : '#ef4444'};"></i>
                    ${direction.toUpperCase()}
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.energy} Вт·ч</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Энергия</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.time} мин</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Время</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${data.speed} км/ч</div>
                        <div style="font-size: 10px; color: #718096; text-transform: uppercase;">Скорость</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderSegmentEnergyTable(segments) {
        const rows = segments.map(s => `
            <tr>
                <td><strong>С${s.segment}</strong></td>
                <td>${Math.round(s.distance)} км</td>
                <td>${s.wind} м/с</td>
                <td>${s.headwind > 0 ? '+' : ''}${Math.round(s.headwind * 10) / 10} м/с</td>
                <td>${Math.round(s.groundSpeed)} км/ч</td>
                <td>${Math.round(s.power)} Вт</td>
                <td>${Math.round(s.energy)} Вт·ч</td>
                <td>${Math.round(s.time)} мин</td>
            </tr>
        `).join('');

        return `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Сегмент</th>
                        <th>Дистанция</th>
                        <th>Ветер</th>
                        <th>Встречный ветер</th>
                        <th>Скорость</th>
                        <th>Мощность</th>
                        <th>Энергия</th>
                        <th>Время</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    afterRender() {
        const hasRoute = typeof RouteModule !== 'undefined' && RouteModule.segments && RouteModule.segments.length > 0;
        if (!hasRoute) return;

        const energyData = this.calculateEnergy();
        if (!energyData) return;

        setTimeout(() => {
            this.initCharts(energyData);
        }, 100);
    },

    initCharts(data) {
        if (typeof Plotly === 'undefined') return;

        this.initEnergyBalanceChart(data);
        this.initWindChart(data.segments);
        this.initSpeedChart(data.segments);
        this.initPowerChart(data.segments);
    },

    initEnergyBalanceChart(data) {
        const trace = {
            values: [data.totalEnergy, data.reserve * data.availableEnergy / 100, data.availableEnergy * data.profile.minReserve],
            labels: ['Потрачено', 'Резерв', 'Мин. резерв'],
            type: 'pie',
            marker: {
                colors: ['#ef4444', '#38a169', '#ed8936']
            }
        };

        const layout = {
            margin: { t: 20, b: 20, l: 20, r: 20 },
            height: 260,
            showlegend: true
        };

        const el = document.getElementById('dashboardEnergyBalanceChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyBalanceChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initWindChart(segments) {
        const trace = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => s.wind),
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

        const el = document.getElementById('dashboardEnergyWindChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyWindChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initSpeedChart(segments) {
        const trace = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => Math.round(s.groundSpeed)),
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

        const el = document.getElementById('dashboardEnergySpeedChart');
        if (el) {
            Plotly.newPlot('dashboardEnergySpeedChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    },

    initPowerChart(segments) {
        const trace = {
            x: segments.map(s => `С${s.segment}`),
            y: segments.map(s => Math.round(s.power)),
            type: 'bar',
            marker: {
                color: segments.map(s => s.headwind > 0 ? '#ef4444' : '#38a169')
            }
        };

        const layout = {
            margin: { t: 20, b: 40, l: 40, r: 20 },
            height: 260,
            xaxis: { title: 'Сегмент' },
            yaxis: { title: 'Мощность, Вт' }
        };

        const el = document.getElementById('dashboardEnergyPowerChart');
        if (el) {
            Plotly.newPlot('dashboardEnergyPowerChart', [trace], layout, { responsive: true, displayModeBar: false });
        }
    }
};
