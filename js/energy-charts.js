/**
 * MIRA - Визуализация энергоэффективности (energy-charts.js)
 * Графики и диаграммы для анализа энергопотребления
 * 
 * Версия: 1.0
 * Дата: 26 февраля 2026 г.
 */

const EnergyChartsModule = {
    defaultConfig: {
        responsive: true,
        displayModeBar: false,
        scrollZoom: false,
        displaylogo: false,
        hovermode: 'x unified'
    },

    /**
     * Сравнение энергии туда/обратно
     */
    createOutboundReturnComparison(containerId, energyData) {
        const outbound = energyData.outbound;
        const return_ = energyData.return;
        
        const traceOutbound = {
            x: outbound.segments.map(s => `С${s.segmentId}`),
            y: outbound.segments.map(s => s.energy),
            name: 'Туда',
            type: 'bar',
            marker: {
                color: outbound.segments.map(s => 
                    s.wind.isHeadwind ? '#fc8181' : '#68d391'
                ),
                opacity: 0.8
            },
            yaxis: 'y1'
        };
        
        const traceReturn = {
            x: return_.segments.map(s => `С${s.segmentId}`),
            y: return_.segments.map(s => s.energy),
            name: 'Обратно',
            type: 'bar',
            marker: {
                color: return_.segments.map(s => 
                    s.wind.isHeadwind ? '#fc8181' : '#68d391'
                ),
                opacity: 0.8
            },
            yaxis: 'y2'
        };
        
        const layout = {
            title: 'Энергопотребление: Туда vs Обратно',
            barmode: 'group',
            bargap: 0.15,
            yaxis: {
                title: 'Туда, Вт·ч',
                titlefont: { color: '#3182ce' },
                tickfont: { color: '#3182ce' }
            },
            yaxis2: {
                title: 'Обратно, Вт·ч',
                titlefont: { color: '#e53e3e' },
                tickfont: { color: '#e53e3e' },
                overlaying: 'y',
                side: 'right'
            },
            xaxis: {
                title: 'Сегмент'
            },
            showlegend: true,
            legend: {
                x: 1,
                xanchor: 'right',
                y: 1
            },
            margin: { t: 50, r: 50, l: 50, b: 50 },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(containerId, [traceOutbound, traceReturn], layout, this.defaultConfig);
    },

    /**
     * Профиль ветра вдоль маршрута
     */
    createWindProfile(containerId, energyData) {
        const outbound = energyData.outbound;
        
        const traceHeadwind = {
            x: outbound.segments.map(s => s.distance),
            y: outbound.segments.map(s => s.wind.headwind),
            name: 'Встречный ветер',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: '#3182ce',
                width: 2,
                shape: 'spline'
            },
            marker: {
                size: 8,
                color: outbound.segments.map(s => 
                    s.wind.isHeadwind ? '#e53e3e' : '#38a169'
                )
            },
            fill: 'tozero',
            fillcolor: 'rgba(49, 130, 206, 0.1)'
        };
        
        const traceCrosswind = {
            x: outbound.segments.map(s => s.distance),
            y: outbound.segments.map(s => s.wind.crosswind),
            name: 'Боковой ветер',
            type: 'scatter',
            mode: 'lines',
            line: {
                color: '#ed8936',
                width: 2,
                dash: 'dash'
            }
        };
        
        const layout = {
            title: 'Ветер по маршруту (высота 350м)',
            yaxis: {
                title: 'Ветер, м/с',
                range: [-15, 15]
            },
            xaxis: {
                title: 'Дистанция, км'
            },
            showlegend: true,
            margin: { t: 40, r: 30, l: 50, b: 50 },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            shapes: [{
                type: 'line',
                x0: 0,
                x1: outbound.totalDistance,
                y0: 0,
                y1: 0,
                line: {
                    color: '#718096',
                    width: 1,
                    dash: 'dot'
                }
            }]
        };
        
        Plotly.newPlot(containerId, [traceHeadwind, traceCrosswind], layout, this.defaultConfig);
    },

    /**
     * Путевая скорость по сегментам
     */
    createGroundSpeedChart(containerId, energyData) {
        const outbound = energyData.outbound;
        const return_ = energyData.return;
        
        const traceOutbound = {
            x: outbound.segments.map(s => s.distance),
            y: outbound.segments.map(s => s.groundSpeed),
            name: 'Туда',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: '#3182ce',
                width: 3
            },
            marker: { size: 8 }
        };
        
        const traceReturn = {
            x: return_.segments.map(s => s.distance),
            y: return_.segments.map(s => s.groundSpeed),
            name: 'Обратно',
            type: 'scatter',
            mode: 'lines+markers',
            line: {
                color: '#e53e3e',
                width: 3,
                dash: 'dash'
            },
            marker: { size: 8 }
        };
        
        const traceCruise = {
            x: [0, energyData.summary.totalDistance],
            y: [energyData.uavProfile.cruiseSpeed, energyData.uavProfile.cruiseSpeed],
            name: 'Крейсерская',
            type: 'scatter',
            mode: 'lines',
            line: {
                color: '#718096',
                width: 2,
                dash: 'dot'
            }
        };
        
        const layout = {
            title: 'Путевая скорость',
            yaxis: {
                title: 'Скорость, км/ч'
            },
            xaxis: {
                title: 'Дистанция, км'
            },
            showlegend: true,
            margin: { t: 40, r: 30, l: 50, b: 50 },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(containerId, [traceOutbound, traceReturn, traceCruise], layout, this.defaultConfig);
    },

    /**
     * 3D профиль энергопотребления
     */
    create3DEnergyProfile(containerId, energyData) {
        const outbound = energyData.outbound;
        
        // Собираем точки для 3D
        const distances = [];
        const altitudes = [];
        const energies = [];
        const headwinds = [];
        
        let cumulativeDistance = 0;
        outbound.segments.forEach(s => {
            distances.push(cumulativeDistance);
            altitudes.push(s.altitude);
            energies.push(s.energy);
            headwinds.push(s.wind.headwind);
            cumulativeDistance += s.distance;
        });
        
        // Добавляем обратный путь
        const returnStart = cumulativeDistance;
        energyData.return.segments.forEach(s => {
            distances.push(returnStart + cumulativeDistance - distances[distances.length - 1]);
            altitudes.push(s.altitude);
            energies.push(s.energy);
            headwinds.push(s.wind.headwind);
        });
        
        const trace = {
            type: 'scatter3d',
            mode: 'lines+markers',
            x: distances,
            y: altitudes,
            z: energies,
            marker: {
                size: 6,
                color: headwinds,
                colorscale: 'RdYlGn',
                reversescale: true,
                colorbar: {
                    title: 'Ветер<br>м/с',
                    thickness: 20,
                    tickfont: { size: 10 }
                },
                line: {
                    color: '#3182ce',
                    width: 4
                }
            },
            line: {
                width: 6
            }
        };
        
        const layout = {
            title: '3D профиль маршрута',
            scene: {
                xaxis: { title: 'Дистанция, км' },
                yaxis: { title: 'Высота, м' },
                zaxis: { title: 'Энергия, Вт·ч' },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.2 }
                }
            },
            margin: { t: 40, r: 20, l: 20, b: 20 }
        };
        
        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Роза ветров с азимутом маршрута
     */
    createWindRoseWithRoute(containerId, energyData, windDirection) {
        const outbound = energyData.outbound;
        const return_ = energyData.return;
        
        // Средний ветер
        const avgWindSpeed = outbound.segments.reduce((sum, s) => sum + s.wind.speed, 0) / 
                            outbound.segments.length;
        
        // Сектора
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        const angles = [0, 45, 90, 135, 180, 225, 270, 315];
        
        // Определяем сектор ветра
        const windSector = Math.round(windDirection / 45) % 8;
        
        const trace = {
            type: 'barpolar',
            r: directions.map((_, i) => i === windSector ? avgWindSpeed : avgWindSpeed * 0.3),
            theta: angles,
            name: 'Ветер',
            marker: {
                color: directions.map((_, i) => 
                    i === windSector ? '#fc8181' : '#cbd5e0'
                )
            }
        };
        
        // Линия маршрута "туда"
        const routeBearing = outbound.bearing;
        const routeReturnBearing = return_.bearing;
        
        const traceRouteOut = {
            type: 'scatterpolar',
            r: [0, 100],
            theta: [routeBearing, routeBearing],
            mode: 'lines',
            name: 'Туда',
            line: {
                color: '#3182ce',
                width: 3
            }
        };
        
        const traceRouteReturn = {
            type: 'scatterpolar',
            r: [0, 100],
            theta: [routeReturnBearing, routeReturnBearing],
            mode: 'lines',
            name: 'Обратно',
            line: {
                color: '#e53e3e',
                width: 3,
                dash: 'dash'
            }
        };
        
        const layout = {
            title: `Ветер: ${avgWindSpeed.toFixed(1)} м/с @ ${windDirection}°`,
            polar: {
                radialaxis: {
                    visible: true,
                    range: [0, Math.max(avgWindSpeed * 1.2, 15)]
                },
                angularaxis: {
                    direction: 'clockwise',
                    period: 8
                }
            },
            showlegend: true,
            margin: { t: 50, r: 30, l: 30, b: 30 },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(containerId, [trace, traceRouteOut, traceRouteReturn], layout, this.defaultConfig);
    },

    /**
     * Баланс энергии (pie chart)
     */
    createEnergyBalance(containerId, energyData) {
        const battery = energyData.battery;
        const summary = energyData.summary;
        
        const used = summary.totalEnergy;
        const reserve = battery.usable - used;
        const requiredReserve = battery.usable * energyData.uavProfile.minReserve;
        const available = reserve - requiredReserve;
        
        const labels = [];
        const values = [];
        const colors = [];
        
        labels.push('Потрачено');
        values.push(used);
        colors.push('#fc8181');
        
        if (available > 0) {
            labels.push('Доступный резерв');
            values.push(available);
            colors.push('#68d391');
        }
        
        labels.push('Обязательный резерв');
        values.push(requiredReserve);
        colors.push('#f6ad55');
        
        const trace = {
            type: 'pie',
            values: values,
            labels: labels,
            marker: {
                colors: colors
            },
            textinfo: 'label+percent',
            hole: 0.4
        };
        
        const layout = {
            title: `Баланс энергии: ${used.toFixed(0)} / ${battery.usable.toFixed(0)} Вт·ч`,
            showlegend: true,
            margin: { t: 50, r: 30, l: 30, b: 30 },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Мощность по сегментам
     */
    createPowerChart(containerId, energyData) {
        const outbound = energyData.outbound;
        
        const trace = {
            x: outbound.segments.map(s => `С${s.segmentId}`),
            y: outbound.segments.map(s => s.power),
            name: 'Мощность',
            type: 'bar',
            marker: {
                color: outbound.segments.map(s => {
                    if (s.meteo.icingRisk === 'high') return '#e53e3e';
                    if (s.meteo.icingRisk === 'medium') return '#ed8936';
                    if (s.wind.isHeadwind && s.wind.headwind > 5) return '#ed8936';
                    return '#38a169';
                }),
                opacity: 0.8
            }
        };
        
        const layout = {
            title: 'Потребляемая мощность по сегментам',
            yaxis: {
                title: 'Мощность, Вт'
            },
            xaxis: {
                title: 'Сегмент'
            },
            margin: { t: 40, r: 30, l: 50, b: 50 },
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)'
        };
        
        Plotly.newPlot(containerId, [trace], layout, this.defaultConfig);
    },

    /**
     * Сводная карточка энергоэффективности
     */
    renderEnergySummary(containerId, energyData, additionalRange = null) {
        const summary = energyData.summary;
        const battery = energyData.battery;
        const status = summary.status;

        // Блок дополнительного расстояния
        let additionalRangeBlock = '';
        if (additionalRange && additionalRange.status) {
            const rangeStatus = additionalRange.status;
            const addDistance = additionalRange.additionalDistance || 0;
            const addFlightTime = additionalRange.additionalFlightTime || 0;
            
            additionalRangeBlock = `
                <!-- Дополнительное расстояние -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding: 16px;
                    background: ${rangeStatus.color}15;
                    border: 2px dashed ${rangeStatus.color}60;
                    border-radius: 12px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <i class="fas fa-route" style="
                            font-size: 28px;
                            color: ${rangeStatus.color};
                        "></i>
                        <div style="flex: 1;">
                            <div style="font-size: 12px; font-weight: 600; color: ${rangeStatus.color}; margin-bottom: 4px;">
                                🛣️ Дополнительно можно пролететь
                            </div>
                            <div style="font-size: 11px; color: rgba(0,0,0,0.7);">
                                ${rangeStatus.message}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 120px;">
                        <div style="font-size: 28px; font-weight: 700; color: ${rangeStatus.color};">
                            +${addDistance.toFixed(1)} <span style="font-size: 14px;">км</span>
                        </div>
                        <div style="font-size: 10px; color: rgba(0,0,0,0.5); margin-top: 4px;">
                            (~${addFlightTime.toFixed(0)} мин туда-обратно)
                        </div>
                    </div>
                </div>
            `;
        }

        const html = `
            <div class="energy-summary-card" style="
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
                border-radius: 16px;
                padding: 20px;
                border: 1px solid rgba(102, 126, 234, 0.2);
            ">
                <!-- Статус -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding: 12px 16px;
                    background: ${status.color}15;
                    border: 1px solid ${status.color}40;
                    border-radius: 12px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas ${status.icon}" style="
                            font-size: 24px;
                            color: ${status.color};
                        "></i>
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: ${status.color};">
                                ${status.label}
                            </div>
                            <div style="font-size: 11px; color: rgba(0,0,0,0.6);">
                                ${status.message}
                            </div>
                        </div>
                    </div>
                </div>

                ${additionalRangeBlock}

                <!-- Основные метрики -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                ">
                    <div style="
                        background: rgba(255,255,255,0.8);
                        border-radius: 12px;
                        padding: 16px;
                        text-align: center;
                    ">
                        <div style="font-size: 10px; color: rgba(0,0,0,0.5); text-transform: uppercase; margin-bottom: 8px;">
                            <i class="fas fa-route"></i> Дистанция
                        </div>
                        <div style="font-size: 24px; font-weight: 700; color: #2d3748;">
                            ${summary.totalDistance.toFixed(1)} <span style="font-size: 12px;">км</span>
                        </div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4); margin-top: 4px;">
                            ${energyData.outbound.totalDistance.toFixed(1)} + ${energyData.return.totalDistance.toFixed(1)}
                        </div>
                    </div>
                    
                    <div style="
                        background: rgba(255,255,255,0.8);
                        border-radius: 12px;
                        padding: 16px;
                        text-align: center;
                    ">
                        <div style="font-size: 10px; color: rgba(0,0,0,0.5); text-transform: uppercase; margin-bottom: 8px;">
                            <i class="fas fa-clock"></i> Время
                        </div>
                        <div style="font-size: 24px; font-weight: 700; color: #2d3748;">
                            ${summary.totalTime.toFixed(0)} <span style="font-size: 12px;">мин</span>
                        </div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4); margin-top: 4px;">
                            ${energyData.uavProfile.maxFlightTime} мин макс.
                        </div>
                    </div>
                    
                    <div style="
                        background: rgba(255,255,255,0.8);
                        border-radius: 12px;
                        padding: 16px;
                        text-align: center;
                    ">
                        <div style="font-size: 10px; color: rgba(0,0,0,0.5); text-transform: uppercase; margin-bottom: 8px;">
                            <i class="fas fa-bolt"></i> Энергия
                        </div>
                        <div style="font-size: 24px; font-weight: 700; color: #2d3748;">
                            ${summary.totalEnergy.toFixed(0)} <span style="font-size: 12px;">Вт·ч</span>
                        </div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4); margin-top: 4px;">
                            ${battery.usable.toFixed(0)} Вт·ч доступно
                        </div>
                    </div>
                    
                    <div style="
                        background: rgba(255,255,255,0.8);
                        border-radius: 12px;
                        padding: 16px;
                        text-align: center;
                        border: 2px solid ${summary.energyReserve >= 25 ? '#38a169' : summary.energyReserve >= 15 ? '#ed8936' : '#e53e3e'};
                    ">
                        <div style="font-size: 10px; color: rgba(0,0,0,0.5); text-transform: uppercase; margin-bottom: 8px;">
                            <i class="fas fa-battery-three-quarters"></i> Резерв
                        </div>
                        <div style="font-size: 24px; font-weight: 700; color: ${summary.energyReserve >= 25 ? '#38a169' : summary.energyReserve >= 15 ? '#ed8936' : '#e53e3e'};">
                            ${summary.energyReserve.toFixed(0)} <span style="font-size: 12px;">%</span>
                        </div>
                        <div style="font-size: 9px; color: rgba(0,0,0,0.4); margin-top: 4px;">
                            Требуется: ${(energyData.uavProfile.minReserve * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>
                
                <!-- Детали по направлениям -->
                <div style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                ">
                    <div style="
                        background: rgba(49, 130, 206, 0.05);
                        border-radius: 12px;
                        padding: 16px;
                        border: 1px solid rgba(49, 130, 206, 0.2);
                    ">
                        <div style="font-size: 11px; font-weight: 600; color: #3182ce; margin-bottom: 12px;">
                            <i class="fas fa-arrow-right"></i> ТУДА
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Энергия</div>
                                <div style="font-size: 16px; font-weight: 600; color: #2d3748;">
                                    ${energyData.outbound.totalEnergy.toFixed(0)} Вт·ч
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Время</div>
                                <div style="font-size: 16px; font-weight: 600; color: #2d3748;">
                                    ${energyData.outbound.totalTime.toFixed(0)} мин
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Ср. скорость</div>
                                <div style="font-size: 14px; font-weight: 600; color: #2d3748;">
                                    ${(energyData.outbound.totalDistance / (energyData.outbound.totalTime / 60)).toFixed(0)} км/ч
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Ветер</div>
                                <div style="font-size: 14px; font-weight: 600; color: ${energyData.outbound.segments.some(s => s.wind.isHeadwind) ? '#e53e3e' : '#38a169'};">
                                    ${energyData.outbound.segments.some(s => s.wind.isHeadwind) ? 'Встречный' : 'Попутный'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="
                        background: rgba(229, 62, 62, 0.05);
                        border-radius: 12px;
                        padding: 16px;
                        border: 1px solid rgba(229, 62, 62, 0.2);
                    ">
                        <div style="font-size: 11px; font-weight: 600; color: #e53e3e; margin-bottom: 12px;">
                            <i class="fas fa-arrow-left"></i> ОБРАТНО
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Энергия</div>
                                <div style="font-size: 16px; font-weight: 600; color: #2d3748;">
                                    ${energyData.return.totalEnergy.toFixed(0)} Вт·ч
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Время</div>
                                <div style="font-size: 16px; font-weight: 600; color: #2d3748;">
                                    ${energyData.return.totalTime.toFixed(0)} мин
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Ср. скорость</div>
                                <div style="font-size: 14px; font-weight: 600; color: #2d3748;">
                                    ${(energyData.return.totalDistance / (energyData.return.totalTime / 60)).toFixed(0)} км/ч
                                </div>
                            </div>
                            <div>
                                <div style="font-size: 9px; color: rgba(0,0,0,0.5);">Ветер</div>
                                <div style="font-size: 14px; font-weight: 600; color: ${energyData.return.segments.some(s => s.wind.isHeadwind) ? '#e53e3e' : '#38a169'};">
                                    ${energyData.return.segments.some(s => s.wind.isHeadwind) ? 'Встречный' : 'Попутный'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        if (typeof containerId === 'string') {
            document.getElementById(containerId).innerHTML = html;
        } else {
            containerId.innerHTML = html;
        }
    }
};

console.log('✅ EnergyChartsModule загружен');
