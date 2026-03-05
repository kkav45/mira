/**
 * MIRA Dashboard Module
 * Модальное окно на весь экран с 7 вкладками
 * Версия: 0.3.0 (добавлена вкладка METAR/TAF)
 */

const DashboardModule = {
    isOpen: false,
    activeTab: 'meteo',

    /**
     * Вкладки дашборда
     */
    tabs: [
        { id: 'meteo',     label: 'Метеопрогноз',  icon: 'fa-cloud-sun',    enabled: true },
        { id: 'metar-taf', label: 'METAR/TAF',     icon: 'fa-plane-departure', enabled: true },
        { id: 'ground',    label: 'Сидя на земле', icon: 'fa-flag',         enabled: true },
        { id: 'flight',    label: 'В полёте',      icon: 'fa-plane',        enabled: true },
        { id: 'segments',  label: 'Сегменты',      icon: 'fa-map',          enabled: false },
        { id: 'energy',    label: 'Энергия',       icon: 'fa-battery-three-quarters', enabled: false },
        { id: 'report',    label: 'Отчёт',         icon: 'fa-file-pdf',     enabled: true }
    ],

    /**
     * Инициализация дашборда
     */
    init() {
        this.renderTabs();
        this.bindEvents();
        this.updateButtonState();
        console.log('✅ DashboardModule инициализирован');
    },

    /**
     * Отрисовка вкладок
     */
    renderTabs() {
        const tabsContainer = document.getElementById('dashboardTabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = this.tabs.map(tab => `
            <button class="dashboard-tab ${tab.id === this.activeTab ? 'active' : ''}"
                    data-tab="${tab.id}"
                    ${!tab.enabled ? 'disabled' : ''}>
                <i class="fas ${tab.icon}"></i>
                <span>${tab.label}</span>
            </button>
        `).join('');
    },

    /**
     * Открытие дашборда
     */
    open() {
        const modal = document.getElementById('dashboardModal');
        if (!modal) return;

        modal.classList.add('active');
        this.isOpen = true;

        // Блокировка прокрутки body
        document.body.style.overflow = 'hidden';

        // Обновление вкладок
        this.updateTabsAvailability();
        this.switchTab(this.activeTab);

        console.log('✅ Дашборд открыт');
    },

    /**
     * Закрытие дашборда
     */
    close() {
        const modal = document.getElementById('dashboardModal');
        if (!modal) return;

        modal.classList.remove('active');
        this.isOpen = false;

        // Восстановление прокрутки body
        document.body.style.overflow = '';

        console.log('❌ Дашборд закрыт');
    },

    /**
     * Переключение вкладки
     */
    switchTab(tabId) {
        // Проверка доступности вкладки
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab || !tab.enabled) {
            console.warn(`⚠️ Вкладка ${tabId} недоступна`);
            return;
        }

        this.activeTab = tabId;

        // Обновление UI вкладок
        document.querySelectorAll('.dashboard-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });

        // Рендер контента вкладки
        this.renderTabContent(tabId);
    },

    /**
     * Рендер контента вкладки
     */
    renderTabContent(tabId) {
        const body = document.getElementById('dashboardBody');
        if (!body) return;

        switch (tabId) {
            case 'meteo':
                body.innerHTML = DashboardTabsMeteo.render();
                DashboardTabsMeteo.afterRender();
                break;
            case 'metar-taf':
                body.innerHTML = DashboardTabsMetarTaf.render();
                DashboardTabsMetarTaf.afterRender();
                break;
            case 'ground':
                body.innerHTML = DashboardTabsGround.render();
                DashboardTabsGround.afterRender();
                break;
            case 'flight':
                body.innerHTML = DashboardTabsFlight.render();
                DashboardTabsFlight.afterRender();
                break;
            case 'segments':
                body.innerHTML = DashboardTabsSegments.render();
                DashboardTabsSegments.afterRender();
                break;
            case 'energy':
                body.innerHTML = DashboardTabsEnergy.render();
                DashboardTabsEnergy.afterRender();
                break;
            case 'report':
                body.innerHTML = DashboardTabsReport.render();
                DashboardTabsReport.afterRender();
                break;
        }
    },

    /**
     * Обновление доступности вкладок
     */
    updateTabsAvailability() {
        // Получаем состояние из глобальных данных
        const hasMeteoData = typeof WeatherModule !== 'undefined' && WeatherModule.cachedData && Object.keys(WeatherModule.cachedData).length > 0;
        const hasSegments = typeof RouteModule !== 'undefined' && RouteModule.segments && RouteModule.segments.length > 0;
        const hasGroundData = this.getGroundObservations().length > 0;
        const hasFlightData = this.getFlightObservations().length > 0;
        const hasEnergyData = typeof EnergyModule !== 'undefined' && EnergyModule.result !== null;

        // Обновляем состояние вкладок
        this.tabs.forEach(tab => {
            switch (tab.id) {
                case 'meteo':
                    tab.enabled = hasMeteoData || hasSegments;
                    break;
                case 'ground':
                    tab.enabled = true; // Всегда доступна для ручного ввода
                    break;
                case 'flight':
                    tab.enabled = true; // Всегда доступна для ручного ввода
                    break;
                case 'segments':
                    tab.enabled = hasSegments;
                    break;
                case 'energy':
                    tab.enabled = hasEnergyData;
                    break;
                case 'report':
                    tab.enabled = true; // Всегда доступна
                    break;
            }
        });

        this.renderTabs();
    },

    /**
     * Получить наземные наблюдения
     */
    getGroundObservations() {
        if (typeof PilotObservationsModule === 'undefined') return [];
        if (typeof PilotObservationsModule.getGroundObservations === 'function') {
            return PilotObservationsModule.getGroundObservations();
        }
        // Fallback: фильтруем все наблюдения
        const all = typeof PilotObservationsModule.getAll === 'function'
            ? PilotObservationsModule.getAll()
            : [];
        return all.filter(obs => obs.type === 'ground');
    },

    /**
     * Получить наблюдения в полёте
     */
    getFlightObservations() {
        if (typeof PilotObservationsModule === 'undefined') return [];
        if (typeof PilotObservationsModule.getFlightObservations === 'function') {
            return PilotObservationsModule.getFlightObservations();
        }
        // Fallback: фильтруем все наблюдения
        const all = typeof PilotObservationsModule.getAll === 'function'
            ? PilotObservationsModule.getAll()
            : [];
        return all.filter(obs => obs.type === 'flight');
    },

    /**
     * Обновление состояния кнопки "ДАШБОРД"
     */
    updateButtonState() {
        const button = document.getElementById('dashboardButton');
        if (!button) return;

        const hasMeteoData = typeof WeatherModule !== 'undefined' && WeatherModule.cachedData && Object.keys(WeatherModule.cachedData).length > 0;
        const hasSegments = typeof RouteModule !== 'undefined' && RouteModule.segments && RouteModule.segments.length > 0;
        const hasGroundData = this.getGroundObservations().length > 0;

        const hasData = hasMeteoData || hasSegments || hasGroundData;

        if (hasData) {
            button.disabled = false;
            button.classList.remove('disabled');
            button.classList.add('active');
            console.log('✅ Кнопка ДАШБОРД активна');
        } else {
            button.disabled = true;
            button.classList.add('disabled');
            button.classList.remove('active');
            console.log('❌ Кнопка ДАШБОРД неактивна');
        }
    },

    /**
     * Привязка событий
     */
    bindEvents() {
        // Делегирование событий для вкладок
        const tabsContainer = document.getElementById('dashboardTabs');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', (e) => {
                const tabBtn = e.target.closest('.dashboard-tab');
                if (tabBtn && !tabBtn.disabled) {
                    this.switchTab(tabBtn.dataset.tab);
                }
            });
        }
    }
};

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DashboardModule.init());
} else {
    DashboardModule.init();
}
