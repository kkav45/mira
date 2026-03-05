/**
 * MIRA - Модуль печати Акта оценки метеоусловий
 * Версия: 0.1.0
 */

const ActPrintModule = {
    /**
     * Пороговые значения МДМУ
     */
    thresholds: {
        wind10m: { max: 10, unit: 'м/с' },
        wind500m: { max: 15, unit: 'м/с' },
        visibility: { min: 5, unit: 'км' },
        precip: { max: 1.4, unit: 'мм/ч' },
        tempMin: -20,
        tempMax: 40,
        icing: 'LOW',
        riskScore: { max: 3 }
    },

    /**
     * Получить форму акта
     */
    getFormHtml() {
        return `
            <div class="act-evaluation-form" id="actEvaluationForm">
                <div class="act-title">
                    АКТ ОЦЕНКИ МЕТЕОРОЛОГИЧЕСКИХ УСЛОВИЙ
                    <br>перед выполнением полёта БВС
                </div>

                <div class="act-header-row">
                    <div>Дата: «<span class="act-day">___</span>» <span class="act-month">________</span> 20<span class="act-year">__</span> г.</div>
                    <div>Время: <span class="act-time">____:____</span></div>
                </div>

                <!-- 1. Общие сведения -->
                <div class="act-section">
                    <div class="act-section-title">1. Общие сведения:</div>
                    <div class="act-field-row">
                        <span class="act-field-label">Маршрут/район:</span>
                        <span class="act-field-value" id="actRouteName">___________________________________</span>
                    </div>
                    <div class="act-field-row">
                        <span class="act-field-label">Координаты:</span>
                        <span class="act-field-value" id="actCoords">______° с.ш., ______° в.д.</span>
                    </div>
                    <div class="act-field-row">
                        <span class="act-field-label">Дата/время полёта:</span>
                        <span class="act-field-value" id="actFlightDateTime">«___» ________ 20__ г. ____:____</span>
                    </div>
                </div>

                <!-- 2. Источник информации -->
                <div class="act-section">
                    <div class="act-section-title">2. Источник информации:</div>
                    <div class="act-checkbox-group">
                        <div class="act-checkbox-item">
                            <span class="act-checkbox checked"></span>
                            <span>Система MIRA v0.1.5.0</span>
                        </div>
                        <div class="act-checkbox-item">
                            <span class="act-checkbox"></span>
                            <span>Другой: _______________________________________</span>
                        </div>
                    </div>
                </div>

                <!-- 3. Метеоусловия (прогноз MIRA) -->
                <div class="act-section">
                    <div class="act-section-title">3. Метеоусловия (прогноз MIRA):</div>
                    <table class="act-meteo-table">
                        <thead>
                            <tr>
                                <th class="param-name">Параметр</th>
                                <th class="param-value">Значение</th>
                                <th class="param-limit">МДМУ</th>
                                <th class="param-match">Соответ.</th>
                            </tr>
                        </thead>
                        <tbody id="actMeteoTableBody">
                            <!-- Заполняется через JS -->
                        </tbody>
                    </table>
                </div>

                <!-- 4. Статус по MIRA -->
                <div class="act-section">
                    <div class="act-section-title">4. Статус по MIRA:</div>
                    <div class="act-status-block" id="actStatusBlock">
                        <!-- Заполняется через JS -->
                    </div>
                </div>

                <!-- 5. Коррекция по фактическим данным -->
                <div class="act-section">
                    <div class="act-section-title">5. Коррекция по фактическим данным:</div>
                    <div class="act-checkbox-group">
                        <div class="act-checkbox-item">
                            <span class="act-checkbox"></span>
                            <span>Да (значения: ________________________________)</span>
                        </div>
                        <div class="act-checkbox-item">
                            <span class="act-checkbox checked"></span>
                            <span>Нет</span>
                        </div>
                    </div>
                </div>

                <!-- 6. Решение -->
                <div class="act-section">
                    <div class="act-section-title">6. Решение:</div>
                    <div class="act-checkbox-group" id="actDecisionBlock">
                        <!-- Заполняется через JS -->
                    </div>
                </div>

                <!-- 7. Подписи -->
                <div class="act-section act-signatures">
                    <div class="act-section-title">7. Подписи:</div>
                    <div class="act-signature-row">
                        <span>Оператор БВС:</span>
                        <span class="act-signature-line"></span>
                        <span>/ _______________</span>
                    </div>
                    <div class="act-signature-row">
                        <span>Руководитель:</span>
                        <span class="act-signature-line"></span>
                        <span>/ _______________</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Заполнить форму данными
     */
    fillFormData(reportData) {
        if (!reportData) return;

        const { route, analysisDate, segmentAnalysis, meteorology } = reportData;
        const hourly = meteorology?.hourly?.[0] || {};
        const analysis = segmentAnalysis?.[0]?.analyzed || {};
        const riskLevel = segmentAnalysis?.[0]?.riskLevel || 'low';

        // Дата и время
        const now = new Date();
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

        document.querySelectorAll('.act-day').forEach(el => {
            el.textContent = String(now.getDate()).padStart(2, '0');
        });
        document.querySelectorAll('.act-month').forEach(el => {
            el.textContent = months[now.getMonth()];
        });
        document.querySelectorAll('.act-year').forEach(el => {
            el.textContent = String(now.getFullYear()).slice(-2);
        });
        document.querySelectorAll('.act-time').forEach(el => {
            el.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        });

        // Маршрут
        const routeNameEl = document.getElementById('actRouteName');
        if (routeNameEl) {
            routeNameEl.textContent = route?.name || '___________________________________';
        }

        // Координаты
        const coordsEl = document.getElementById('actCoords');
        if (coordsEl && route?.points?.length > 0) {
            const firstPoint = route.points[0];
            const lastPoint = route.points[route.points.length - 1];
            const avgLat = ((firstPoint.lat + lastPoint.lat) / 2).toFixed(4);
            const avgLon = ((firstPoint.lon + lastPoint.lon) / 2).toFixed(4);
            coordsEl.textContent = `${avgLat}° с.ш., ${avgLon}° в.д.`;
        }

        // Дата/время полёта
        const flightDateTimeEl = document.getElementById('actFlightDateTime');
        if (flightDateTimeEl && analysisDate) {
            const flightDate = new Date(analysisDate);
            flightDateTimeEl.textContent = `«${String(flightDate.getDate()).padStart(2, '0')}» ${months[flightDate.getMonth()]} 20${String(flightDate.getFullYear()).slice(-2)} г. ${String(flightDate.getHours()).padStart(2, '0')}:${String(flightDate.getMinutes()).padStart(2, '0')}`;
        }

        // Таблица метеоусловий
        this.fillMeteoTable(hourly, analysis);

        // Статус по MIRA
        this.fillStatusBlock(riskLevel);

        // Решение
        this.fillDecisionBlock(riskLevel);
    },

    /**
     * Заполнить таблицу метеоусловий
     */
    fillMeteoTable(hourly, analysis) {
        const tbody = document.getElementById('actMeteoTableBody');
        if (!tbody) return;

        const rows = [
            {
                name: 'Ветер 10м, м/с',
                value: hourly.wind10m !== undefined ? `${hourly.wind10m.toFixed(1)}` : '—',
                limit: `≤${this.thresholds.wind10m.max}`,
                match: hourly.wind10m !== undefined && hourly.wind10m <= this.thresholds.wind10m.max
            },
            {
                name: 'Ветер 500м, м/с',
                value: hourly.wind500m !== undefined ? `${hourly.wind500m.toFixed(1)}` : '—',
                limit: `≤${this.thresholds.wind500m.max}`,
                match: hourly.wind500m !== undefined && hourly.wind500m <= this.thresholds.wind500m.max
            },
            {
                name: 'Видимость, км',
                value: hourly.visibility !== undefined ? `${hourly.visibility}` : '—',
                limit: `≥${this.thresholds.visibility.min}`,
                match: hourly.visibility !== undefined && hourly.visibility >= this.thresholds.visibility.min
            },
            {
                name: 'Осадки, мм/ч',
                value: hourly.precip !== undefined ? `${hourly.precip.toFixed(1)}` : '—',
                limit: `≤${this.thresholds.precip.max}`,
                match: hourly.precip !== undefined && hourly.precip <= this.thresholds.precip.max
            },
            {
                name: 'Температура, °C',
                value: hourly.temp2m !== undefined ? `${Math.round(hourly.temp2m)}` : '—',
                limit: `${this.thresholds.tempMin}..+${this.thresholds.tempMax}`,
                match: hourly.temp2m !== undefined && hourly.temp2m >= this.thresholds.tempMin && hourly.temp2m <= this.thresholds.tempMax
            },
            {
                name: 'Обледенение',
                value: analysis.icingRisk !== undefined ? analysis.icingRisk : '—',
                limit: this.thresholds.icing,
                match: analysis.icingRisk === 'LOW'
            },
            {
                name: 'Risk Score',
                value: analysis.riskScore !== undefined ? `${analysis.riskScore.toFixed(1)}` : '—',
                limit: `≤${this.thresholds.riskScore.max}`,
                match: analysis.riskScore !== undefined && analysis.riskScore <= this.thresholds.riskScore.max
            }
        ];

        tbody.innerHTML = rows.map(row => `
            <tr>
                <td>${row.name}</td>
                <td>${row.value}</td>
                <td>${row.limit}</td>
                <td>
                    <span class="act-checkbox ${row.match ? 'checked' : ''}"></span>
                    <span style="margin-left: 5px;">${row.match ? 'Да' : 'Нет'}</span>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Заполнить блок статуса по MIRA
     */
    fillStatusBlock(riskLevel) {
        const block = document.getElementById('actStatusBlock');
        if (!block) return;

        const statuses = {
            low: { icon: '🟢', text: 'РАЗРЕШЁН', checked: true },
            medium: { icon: '🟡', text: 'ОГРАНИЧЕН', checked: true },
            high: { icon: '🔴', text: 'ЗАПРЕЩЁН', checked: true }
        };

        block.innerHTML = Object.entries(statuses).map(([level, status]) => `
            <div class="act-status-item">
                <span class="act-checkbox ${status.checked && level === riskLevel ? 'checked' : ''}"></span>
                <span>${status.icon} ${status.text}</span>
            </div>
        `).join('');
    },

    /**
     * Заполнить блок решения
     */
    fillDecisionBlock(riskLevel) {
        const block = document.getElementById('actDecisionBlock');
        if (!block) return;

        const decisions = {
            low: { text: 'Полёт разрешён', checked: true },
            medium: { text: 'С ограничениями: _____________________________', checked: false },
            high: { text: 'Запрещён', checked: false }
        };

        block.innerHTML = Object.entries(decisions).map(([level, decision]) => `
            <div class="act-checkbox-item">
                <span class="act-checkbox ${decision.checked && level === riskLevel ? 'checked' : ''}"></span>
                <span>${decision.text}</span>
            </div>
        `).join('');
    },

    /**
     * Печать акта
     */
    printAct(reportData) {
        console.log('📄 Печать Акта оценки...');

        // Добавляем форму в документ, если её нет
        let form = document.getElementById('actEvaluationForm');
        if (!form) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = this.getFormHtml();
            form = tempContainer.firstElementChild;
            document.body.appendChild(form);
        }

        // Заполняем данными
        this.fillFormData(reportData);

        // Показываем форму
        form.classList.add('visible');

        // Добавляем класс для режима печати
        document.body.classList.add('print-act-mode');
        form.classList.add('print-mode');

        // Печать
        setTimeout(() => {
            window.print();

            // Возвращаем всё обратно
            setTimeout(() => {
                document.body.classList.remove('print-act-mode');
                form.classList.remove('print-mode');
                form.classList.remove('visible');
            }, 500);
        }, 300);
    },

    /**
     * Получить данные для акта из первого отчёта
     */
    getReportData() {
        const fullReport = typeof RouteModule !== 'undefined' && RouteModule.getFullReport
            ? RouteModule.getFullReport()
            : [];

        return fullReport?.[0] || null;
    },

    /**
     * Показать предпросмотр акта в модальном окне
     */
    showPreview() {
        const reportData = this.getReportData();

        if (!reportData) {
            alert('Нет данных для формирования акта. Проведите анализ маршрутов.');
            return null;
        }

        // Создаём или получаем форму
        let form = document.getElementById('actEvaluationForm');
        if (!form) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = this.getFormHtml();
            form = tempContainer.firstElementChild;
            document.body.appendChild(form);
        }

        // Заполняем данными
        this.fillFormData(reportData);

        // Показываем форму
        form.classList.add('visible');

        return form;
    }
};

// Экспорт модуля
window.ActPrintModule = ActPrintModule;
console.log('✅ ActPrintModule загружен');
