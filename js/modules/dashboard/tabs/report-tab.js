/**
 * Вкладка дашборда: ОТЧЁТ 📄
 * Формирование и экспорт PDF-отчёта
 */

const DashboardTabsReport = {
    selectedSections: {
        meteo: true,
        segments: true,
        ground: true,
        flight: true,
        energy: true,
        charts: true
    },

    render() {
        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-file-pdf" style="color: #f56565;"></i>
                    Формирование отчёта PDF
                </div>

                <!-- Разделы отчёта -->
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 600; color: #2d3748; margin-bottom: 12px;">
                        <i class="fas fa-list"></i> Разделы отчёта
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                        ${this.renderCheckbox('meteo', 'Метеопрогноз (Open-Meteo)', 'fa-cloud-sun')}
                        ${this.renderCheckbox('segments', 'Таблица по сегментам', 'fa-map')}
                        ${this.renderCheckbox('ground', 'Наблюдения "Сидя на земле"', 'fa-flag')}
                        ${this.renderCheckbox('flight', 'Наблюдения "В полёте"', 'fa-plane')}
                        ${this.renderCheckbox('energy', 'Энергорасчёт', 'fa-battery-three-quarters')}
                        ${this.renderCheckbox('charts', 'Графики Plotly', 'fa-chart-line')}
                    </div>
                </div>

                <!-- Кнопки действий -->
                <div style="display: flex; gap: 12px;">
                    <button class="dashboard-back-btn" onclick="DashboardTabsReport.generateReport()" style="flex: 1; justify-content: center;">
                        <i class="fas fa-clipboard-list"></i> Сформировать отчёт
                    </button>
                    <button class="dashboard-back-btn" onclick="DashboardTabsReport.downloadPDF()" style="flex: 1; justify-content: center;">
                        <i class="fas fa-download"></i> Скачать PDF
                    </button>
                </div>
            </div>

            <!-- Предпросмотр -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-eye" style="color: #667eea;"></i>
                    Предпросмотр
                </div>
                <div id="dashboardReportPreview" style="background: #f7fafc; padding: 20px; border-radius: 10px; min-height: 200px;">
                    ${this.renderPreview()}
                </div>
            </div>

            <!-- Статистика -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-chart-pie" style="color: #48bb78;"></i>
                    Статистика данных
                </div>
                <div class="dashboard-energy-cards">
                    ${this.renderStatCard('Часов прогноза', this.getForecastHoursCount(), 'fa-clock')}
                    ${this.renderStatCard('Сегментов', this.getSegmentsCount(), 'fa-map')}
                    ${this.renderStatCard('Наблюдений', this.getObservationsCount(), 'fa-clipboard-list')}
                    ${this.renderStatCard('Статус', this.getEnergyStatus(), 'fa-battery-full')}
                </div>
            </div>
        `;
    },

    renderCheckbox(id, label, icon) {
        const checked = this.selectedSections[id] ? 'checked' : '';
        return `
            <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #f7fafc; border-radius: 8px; cursor: pointer;">
                <input type="checkbox" id="reportSection_${id}" ${checked} onchange="DashboardTabsReport.toggleSection('${id}')" style="width: 18px; height: 18px;">
                <i class="fas ${icon}" style="color: #667eea;"></i>
                <span style="font-size: 13px; font-weight: 500; color: #2d3748;">${label}</span>
            </label>
        `;
    },

    renderStatCard(label, value, icon) {
        return `
            <div class="dashboard-energy-card">
                <div class="dashboard-energy-card-icon">${icon}</div>
                <div class="dashboard-energy-card-value">${value}</div>
                <div class="dashboard-energy-card-label">${label}</div>
            </div>
        `;
    },

    renderPreview() {
        const sections = [];

        if (this.selectedSections.meteo) sections.push('🌤️ Метеопрогноз');
        if (this.selectedSections.segments) sections.push('🗺️ Сегменты');
        if (this.selectedSections.ground) sections.push('🚩 Сидя на земле');
        if (this.selectedSections.flight) sections.push('✈️ В полёте');
        if (this.selectedSections.energy) sections.push('🔋 Энергия');
        if (this.selectedSections.charts) sections.push('📈 Графики');

        if (sections.length === 0) {
            return '<p style="color: #718096; text-align: center;">Выберите разделы для формирования отчёта</p>';
        }

        return `
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${sections.map(s => `
                    <span style="padding: 8px 14px; background: white; border-radius: 8px; font-size: 13px; border: 1px solid #e2e8f0;">${s}</span>
                `).join('')}
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
                <i class="fas fa-info-circle"></i> Отчёт будет сформирован из ${sections.length} раздел(а/ов)
            </div>
        `;
    },

    toggleSection(sectionId) {
        this.selectedSections[sectionId] = !this.selectedSections[sectionId];

        // Обновление предпросмотра
        const preview = document.getElementById('dashboardReportPreview');
        if (preview) {
            preview.innerHTML = this.renderPreview();
        }

        // Обновление статистики
        this.updateStats();
    },

    getForecastHoursCount() {
        const data = typeof WeatherModule !== 'undefined' && WeatherModule.data
            ? WeatherModule.data
            : null;
        return data && data.hourly ? data.hourly.length : 0;
    },

    getSegmentsCount() {
        const segments = typeof RouteModule !== 'undefined' && RouteModule.segments
            ? RouteModule.segments
            : [];
        return segments.length;
    },

    getObservationsCount() {
        const pilotObs = typeof PilotObservationsModule !== 'undefined'
            ? PilotObservationsModule
            : null;

        if (!pilotObs) return 0;

        const ground = pilotObs.getGroundObservations ? pilotObs.getGroundObservations().length : 0;
        const flight = pilotObs.getFlightObservations ? pilotObs.getFlightObservations().length : 0;

        return ground + flight;
    },

    getEnergyStatus() {
        const energy = typeof EnergyModule !== 'undefined' && EnergyModule.result
            ? EnergyModule.result
            : null;

        if (!energy) return '—';

        const statusMap = {
            allowed: '✅ Разрешён',
            warning: '⚠️ Ограничения',
            forbidden: '❌ Запрещён'
        };

        return statusMap[energy.status] || '—';
    },

    updateStats() {
        // Обновление статистики
        const stats = [
            { id: 'reportStat1', value: this.getForecastHoursCount() },
            { id: 'reportStat2', value: this.getSegmentsCount() },
            { id: 'reportStat3', value: this.getObservationsCount() },
            { id: 'reportStat4', value: this.getEnergyStatus() }
        ];

        stats.forEach(stat => {
            const el = document.getElementById(stat.id);
            if (el) {
                el.textContent = stat.value;
            }
        });
    },

    generateReport() {
        console.log('📋 Формирование отчёта...', this.selectedSections);

        // Вызов существующей функции экспорта
        if (typeof PdfExportModule !== 'undefined') {
            PdfExportModule.generatePDF(this.selectedSections);
            showToast('✅ Отчёт сформирован');
        } else {
            showToast('⚠️ Модуль экспорта не загружен');
        }
    },

    downloadPDF() {
        console.log('💾 Скачивание PDF...');

        if (typeof PdfExportModule !== 'undefined') {
            PdfExportModule.downloadPDF();
            showToast('✅ PDF загружен');
        } else {
            showToast('⚠️ Модуль экспорта не загружен');
        }
    },

    afterRender() {
        this.updateStats();
    }
};

// Helper function (если не определена)
if (typeof showToast === 'undefined') {
    function showToast(message) {
        console.log('📢', message);
        alert(message);
    }
}
