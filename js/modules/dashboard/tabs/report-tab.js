/**
 * Вкладка дашборда: ОТЧЁТ 📄
 * Автоматическое формирование отчёта по всем маршрутам
 */

const DashboardTabsReport = {
    // Текущие данные отчёта
    currentReportData: null,

    /**
     * Обновление заголовка для печати
     */
    updatePrintHeader() {
        const printDate = document.getElementById('printDate');
        const printRoutesCount = document.getElementById('printRoutesCount');
        const printTime = document.getElementById('printTime');

        const fullReport = typeof RouteModule !== 'undefined' && RouteModule.getFullReport
            ? RouteModule.getFullReport()
            : [];

        const analysisDate = fullReport?.[0]?.analysisDate;
        if (analysisDate) {
            const date = new Date(analysisDate);
            if (printDate) {
                printDate.textContent = date.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }
            if (printTime) {
                printTime.textContent = date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } else {
            const now = new Date();
            if (printDate) printDate.textContent = now.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            if (printTime) printTime.textContent = now.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        if (printRoutesCount) {
            const count = fullReport?.length || 0;
            printRoutesCount.textContent = `${count} ${this.declension(count, ['маршрут', 'маршрута', 'маршрутов'])}`;
        }
    },

    /**
     * Склонение слов по числу
     */
    declension(number, words) {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    },

    render() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-file-pdf" style="color: #f56565;"></i>
                    Отчёт по маршрутам
                </div>
                <div id="dashboardReportPreview" style="background: #f7fafc; padding: 20px; border-radius: 10px;">
                    ${this.renderPreview()}
                </div>
            </div>

            <!-- Кнопки действий -->
            <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="dashboard-back-btn" onclick="DashboardTabsReport.printReport()" style="flex: 1; justify-content: center; background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
                    <i class="fas fa-print"></i> Печать отчёта
                </button>
                <button class="dashboard-back-btn" onclick="DashboardTabsReport.downloadPDF()" style="flex: 1; justify-content: center; background: linear-gradient(135deg, #f56565 0%, #c53030 100%);">
                    <i class="fas fa-download"></i> Скачать PDF
                </button>
            </div>

            <!-- Кнопка печати Акта -->
            <div style="display: flex; gap: 12px; margin-top: 12px;">
                <button class="dashboard-back-btn" onclick="DashboardTabsReport.printAct()" style="flex: 1; justify-content: center; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);">
                    <i class="fas fa-file-signature"></i> Печать Акта оценки
                </button>
            </div>
        `;
    },

    renderPreview() {
        // Получаем полный отчёт по всем маршрутам
        const fullReport = typeof RouteModule !== 'undefined' && RouteModule.getFullReport
            ? RouteModule.getFullReport()
            : [];

        if (fullReport.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: rgba(0,0,0,0.5);">
                    <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>Нет данных для отчёта. Проведите анализ маршрутов.</p>
                </div>
            `;
        }

        // Формируем отчёт по каждому маршруту
        return fullReport.map(report => {
            const { route, analysisDate, segmentAnalysis, pilotData, meteorology, flightWindows, recommendations } = report;
            const dateStr = analysisDate ? new Date(analysisDate).toLocaleDateString('ru-RU', { 
                day: 'numeric', month: 'long', year: 'numeric' 
            }) : '—';

            const overallRisk = segmentAnalysis?.[0]?.riskLevel || 'low';
            const riskLabels = { low: 'НИЗКИЙ', medium: 'СРЕДНИЙ', high: 'ВЫСОКИЙ' };
            const riskColors = { low: '#38a169', medium: '#ed8936', high: '#e53e3e' };

            // Метеоданные
            const hourly = meteorology?.hourly?.[0];
            const temp = hourly?.temp2m !== undefined ? `${hourly.temp2m >= 0 ? '+' : ''}${Math.round(hourly.temp2m)}°C` : '—';
            const wind = hourly?.wind10m !== undefined ? `${hourly.wind10m.toFixed(1)} м/с` : '—';
            const visibility = hourly?.visibility !== undefined ? `${hourly.visibility} км` : '—';
            const precip = hourly?.precip !== undefined ? `${hourly.precip.toFixed(1)} мм` : '—';

            // Окна безопасности
            const safeWindows = (flightWindows || []).filter(w => w.risk === 'low');

            return `
                <div class="route-report-block" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
                            border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid rgba(102, 126, 234, 0.15);">
                    
                    <!-- Заголовок маршрута -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid rgba(102, 126, 234, 0.2);">
                        <div>
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748; margin-bottom: 4px;">
                                <i class="fas fa-route" style="color: #667eea;"></i> ${route.name}
                            </div>
                            <div style="font-size: 12px; color: rgba(0,0,0,0.6);">
                                📅 ${dateStr}
                            </div>
                        </div>
                        <span style="padding: 6px 12px; background: ${riskColors[overallRisk]}; color: #fff; border-radius: 6px; font-size: 12px; font-weight: 600;">
                            ${riskLabels[overallRisk] || '—'} РИСК
                        </span>
                    </div>

                    <!-- Параметры маршрута -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
                        <div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                            <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">Длина</div>
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${route.distance?.toFixed(1) || 0} км</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                            <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">Время</div>
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${route.flightTime || 0} мин</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                            <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">Сегменты</div>
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${segmentAnalysis?.length || 0}</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
                            <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">Тип</div>
                            <div style="font-size: 14px; font-weight: 600; color: #2d3748;">${route.type === 'kml' ? 'KML' : 'Ручной'}</div>
                        </div>
                    </div>

                    <!-- Метеоанализ -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 10px;">
                            <i class="fas fa-cloud-sun" style="color: #f59e0b;"></i> Метеоанализ
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                            <div style="padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                                <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">🌡️ Температура</div>
                                <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${temp}</div>
                            </div>
                            <div style="padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                                <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">💨 Ветер</div>
                                <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${wind}</div>
                            </div>
                            <div style="padding: 10px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2);">
                                <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">👁️ Видимость</div>
                                <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${visibility}</div>
                            </div>
                            <div style="padding: 10px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                <div style="font-size: 10px; color: rgba(0,0,0,0.6); text-transform: uppercase;">🌧️ Осадки</div>
                                <div style="font-size: 16px; font-weight: 700; color: #2d3748;">${precip}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Данные пилота -->
                    ${pilotData ? `
                        <div style="margin-bottom: 16px;">
                            <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 10px;">
                                <i class="fas fa-user-pilot" style="color: #38a169;"></i> Данные пилота
                            </div>
                            <div style="padding: 12px; background: rgba(56, 161, 105, 0.1); border-radius: 8px; border: 1px solid rgba(56, 161, 105, 0.2);">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                    <div>
                                        <div style="font-size: 10px; color: rgba(0,0,0,0.6);">📍 Координаты</div>
                                        <div style="font-size: 13px; font-weight: 600; color: #2d3748;">${pilotData.lat?.toFixed(4) || '—'}, ${pilotData.lon?.toFixed(4) || '—'}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 10px; color: rgba(0,0,0,0.6);">💨 Ветер</div>
                                        <div style="font-size: 13px; font-weight: 600; color: #2d3748;">${pilotData.windSpeed || '—'} м/с ${pilotData.windDir ? '(' + pilotData.windDir + '°)' : ''}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 10px; color: rgba(0,0,0,0.6);">🌡️ Температура</div>
                                        <div style="font-size: 13px; font-weight: 600; color: #2d3748;">${pilotData.temp || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Окна безопасности -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 10px;">
                            <i class="fas fa-clock" style="color: #10b981;"></i> Окна безопасности
                        </div>
                        ${safeWindows.length > 0 ? `
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${safeWindows.map(w => `
                                    <span style="padding: 6px 12px; background: rgba(56, 161, 105, 0.15); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 6px; font-size: 12px; color: #276749; font-weight: 600;">
                                        ${w.start} – ${w.end} (${w.duration} ч)
                                    </span>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="padding: 10px; background: rgba(237, 137, 54, 0.1); border-radius: 8px; font-size: 12px; color: #c05621;">
                                <i class="fas fa-exclamation-triangle"></i> Безопасные окна не найдены
                            </div>
                        `}
                    </div>

                    <!-- Рекомендации -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 700; color: #2d3748; margin-bottom: 10px;">
                            <i class="fas fa-clipboard-list" style="color: #667eea;"></i> Рекомендации
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${recommendations?.length > 0 ? recommendations.map(rec => `
                                <div style="padding: 10px 12px; background: ${rec.type === 'success' ? 'rgba(56, 161, 105, 0.1)' : rec.type === 'warning' ? 'rgba(237, 137, 54, 0.1)' : rec.type === 'critical' ? 'rgba(229, 62, 62, 0.1)' : 'rgba(59, 130, 246, 0.1)'}; 
                                            border-left: 3px solid ${rec.type === 'success' ? '#38a169' : rec.type === 'warning' ? '#ed8936' : rec.type === 'critical' ? '#e53e3e' : '#3b82f6'}; 
                                            border-radius: 6px; font-size: 12px; color: #2d3748;">
                                    <i class="fas ${rec.icon}" style="color: ${rec.type === 'success' ? '#38a169' : rec.type === 'warning' ? '#ed8936' : rec.type === 'critical' ? '#e53e3e' : '#3b82f6'};"></i>
                                    <span style="margin-left: 8px;">${rec.text}</span>
                                </div>
                            `).join('') : `
                                <div style="padding: 10px; background: rgba(56, 161, 105, 0.1); border-radius: 8px; font-size: 12px; color: #276749;">
                                    <i class="fas fa-check-circle"></i> Все параметры в норме
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Печать отчёта
     */
    printReport() {
        console.log('🖨️ Печать отчёта...');

        // Обновляем заголовок для печати
        this.updatePrintHeader();

        // Раскрываем аккордеон перед печатью
        const factorsContent = document.getElementById('factorsContent');
        const factorsIcon = document.getElementById('factorsIcon');
        const wasHidden = factorsContent && factorsContent.style.display === 'none';

        if (wasHidden) {
            factorsContent.style.display = 'block';
            factorsIcon.classList.add('rotated');
        }

        // Небольшая задержка для отображения контента
        setTimeout(() => {
            window.print();

            // Возвращаем аккордеон в исходное состояние
            if (wasHidden) {
                setTimeout(() => {
                    factorsContent.style.display = 'none';
                    factorsIcon.classList.remove('rotated');
                }, 500);
            }
        }, 300);
    },

    /**
     * Скачивание PDF
     */
    downloadPDF() {
        console.log('📄 PDF Export...');

        const fullReport = typeof RouteModule !== 'undefined' && RouteModule.getFullReport
            ? RouteModule.getFullReport()
            : [];

        const pilotData = typeof WizardModule !== 'undefined' ? WizardModule.stepData?.pilotData : null;

        if (fullReport.length === 0) {
            alert('Нет данных для экспорта');
            return;
        }

        const PdfModule = window.PdfExportModule || window.PdfExport2PageModule;

        if (typeof PdfModule !== 'undefined' && typeof PdfModule.generateReport === 'function') {
            PdfModule.generateReport({
                routes: fullReport,
                pilotData: pilotData
            });
        } else {
            alert('PDF модуль не загружен');
        }
    },

    /**
     * После отображения
     */
    afterRender() {
        // Обновляем заголовок для печати при открытии вкладки
        this.updatePrintHeader();
    },

    /**
     * Печать Акта оценки метеоусловий
     */
    printAct() {
        console.log('📄 Печать Акта оценки...');

        const fullReport = typeof RouteModule !== 'undefined' && RouteModule.getFullReport
            ? RouteModule.getFullReport()
            : [];

        if (fullReport.length === 0) {
            alert('Нет данных для формирования Акта. Проведите анализ маршрутов.');
            return;
        }

        // Используем первый маршрут для акта
        const reportData = fullReport[0];

        if (typeof ActPrintModule !== 'undefined') {
            ActPrintModule.printAct(reportData);
        } else {
            alert('Модуль печати Акта не загружен');
        }
    }
};

// Экспорт модуля
window.DashboardTabsReport = DashboardTabsReport;
console.log('✅ DashboardTabsReport загружен');

// После отображения
DashboardTabsReport.afterRender = function() {};
