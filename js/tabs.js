/**
 * MIRA 0.2 | Небосвод - Tabs Module
 * Логика переключения вкладок и содержимое панелей
 */

const TabsManager = {
  currentTab: 'tab-pnr',
  rightPanelOpen: false,

  // Инициализация
  init() {
    this.bindMenuEvents();
    this.bindPanelEvents();
    this.openTab('tab-pnr');
  },

  // Привязка событий меню
  bindMenuEvents() {
    document.querySelectorAll('.menu-item[data-tab]').forEach(item => {
      item.addEventListener('click', (e) => {
        const tabId = e.currentTarget.getAttribute('data-tab');
        this.openTab(tabId);
      });
    });

    document.querySelectorAll('.menu-item[data-action]').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        this.handleQuickAction(action);
      });
    });
  },

  // Привязка событий панели
  bindPanelEvents() {
    const panelToggle = document.getElementById('panel-toggle');
    const panelClose = document.getElementById('panel-close');
    const rightPanel = document.getElementById('rightPanel');

    panelToggle.addEventListener('click', () => {
      this.togglePanel();
    });

    panelClose.addEventListener('click', () => {
      this.closePanel();
    });
  },

  // Открытие вкладки
  openTab(tabId) {
    // Обновление активного пункта меню
    document.querySelectorAll('.menu-item[data-tab]').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      }
    });

    // Сохранение текущей вкладки
    this.currentTab = tabId;

    // Получение заголовка и контента
    const menuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    const title = menuItem ? menuItem.querySelector('span:last-child').textContent : '';
    
    // Обновление заголовка панели
    const panelTitle = document.getElementById('panel-title');
    if (panelTitle) {
      const icon = this.getTabIcon(tabId);
      panelTitle.innerHTML = `<i class="${icon}"></i><span>${title}</span>`;
    }

    // Генерация контента
    const content = this.getTabContent(tabId);
    const panelContent = document.getElementById('panel-content');
    if (panelContent) {
      panelContent.innerHTML = content;
      
      // Инициализация графиков после вставки контента
      setTimeout(() => this.initTabCharts(tabId), 100);
    }

    // Открытие панели
    this.openPanel();

    // Событие после открытия вкладки
    this.onTabOpened(tabId);
  },

  // Иконка для вкладки
  getTabIcon(tabId) {
    const icons = {
      'tab-pnr': 'fas fa-map-marker-alt',
      'tab-weather': 'fas fa-cloud-sun',
      'tab-profiles': 'fas fa-chart-area',
      'tab-windows': 'fas fa-clock',
      'tab-route': 'fas fa-route',
      'tab-report': 'fas fa-file-alt'
    };
    return icons[tabId] || 'fas fa-chart-line';
  },

  // Содержимое вкладок
  getTabContent(tabId) {
    switch (tabId) {
      case 'tab-pnr':
        return this.renderPNRPanel();
      case 'tab-weather':
        return this.renderWeatherPanel();
      case 'tab-profiles':
        return this.renderProfilesPanel();
      case 'tab-windows':
        return this.renderWindowsPanel();
      case 'tab-route':
        return this.renderRoutePanel();
      case 'tab-report':
        return this.renderReportPanel();
      default:
        return '<div class="text-center text-muted">Контент загружается...</div>';
    }
  },

  // Рендер панели PNR
  renderPNRPanel() {
    const mockData = MockDataGenerator.generateRouteSegments();
    const totalDistance = mockData.reduce((sum, s) => sum + s.distance, 0).toFixed(1);
    const totalEnergy = mockData.reduce((sum, s) => sum + s.energy, 0);

    return `
      <div class="panel-section">
        <div class="panel-section__title">
          <span>Расчёт точки невозврата</span>
          <span class="status-pill status-ok">Актуально</span>
        </div>
        <table class="data-table">
          <tr><td>Скорость БВС</td><td>62 км/ч</td></tr>
          <tr><td>Расход батареи</td><td>177.3 мАч/мин</td></tr>
          <tr><td>Встречный ветер</td><td>5.2 м/с</td></tr>
          <tr><td><strong>Макс. дальность</strong></td><td><strong>${totalDistance} км</strong></td></tr>
          <tr><td><strong>Время полёта</strong></td><td><strong>${Math.round(totalDistance / 62 * 60)} мин</strong></td></tr>
          <tr><td>Резерв для возврата</td><td>6 325 мАч (25%)</td></tr>
        </table>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Энергетический профиль</div>
        <div class="chart-container">
          <canvas id="chart-energy"></canvas>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Зоны безопасной посадки</div>
        <div class="panel-grid-3">
          <div class="stat-card">
            <div class="stat-card__value" style="color: #198754;">3</div>
            <div class="stat-card__label">В радиусе 50 км</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #0d6efd;">24.3</div>
            <div class="stat-card__label">До PNR (км)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #ffc107;">18</div>
            <div class="stat-card__label">Время (мин)</div>
          </div>
        </div>
      </div>
    `;
  },

  // Рендер панели метеоанализа
  renderWeatherPanel() {
    return `
      <div class="panel-section">
        <div class="panel-section__title">
          <span>Ключевые показатели</span>
          <span class="status-pill status-ok" id="weather-status">VFR</span>
        </div>
        <div class="panel-grid-3">
          <div class="stat-card">
            <div class="stat-card__value" style="color: #4299e1;" id="stat-wind-10m">6.2</div>
            <div class="stat-card__label">Ветер 10м (м/с)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #ed8936;" id="stat-wind-500m">12.1</div>
            <div class="stat-card__label">Ветер 500м (м/с)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #38a169;" id="stat-visibility">>10</div>
            <div class="stat-card__label">Видимость (км)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #9f7aea;" id="stat-temp">-8</div>
            <div class="stat-card__label">Температура (°C)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #48bb78;" id="stat-precip">0.0</div>
            <div class="stat-card__label">Осадки (мм/ч)</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #198754;" id="stat-icing">Низкий</div>
            <div class="stat-card__label">Обледенение</div>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Критические параметры</div>
        <table class="data-table">
          <tr>
            <td><i class="fas fa-wind"></i> Ветер у земли</td>
            <td><strong id="param-wind-10m">6.2 м/с</strong></td>
            <td><span class="status-pill status-ok" id="badge-wind-10m">≤10 OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-wind"></i> Ветер на 500м</td>
            <td><strong id="param-wind-500m">12.1 м/с</strong></td>
            <td><span class="status-pill status-ok" id="badge-wind-500m">≤15 OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-snowflake"></i> Обледенение</td>
            <td><strong id="param-icing">Низкий риск</strong></td>
            <td><span class="status-pill status-ok" id="badge-icing">OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-smog"></i> Туман</td>
            <td><strong id="param-fog">Не прогнозируется</strong></td>
            <td><span class="status-pill status-ok" id="badge-fog">OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-cloud-rain"></i> Осадки</td>
            <td><strong id="param-precip">0.0 мм/ч</strong></td>
            <td><span class="status-pill status-ok" id="badge-precip">≤1.4 OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-cloud"></i> Облачность</td>
            <td><strong id="param-cloud">35%</strong></td>
            <td><span class="status-pill status-ok" id="badge-cloud">OK</span></td>
          </tr>
        </table>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Временной ряд метеопараметров (24 часа)</div>
        <div class="chart-container chart-container-large">
          <canvas id="chart-time-series"></canvas>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Прогноз по часам</div>
        <div class="flight-windows" id="hourly-forecast">
          <!-- Заполняется JavaScript -->
        </div>
      </div>
    `;
  },

  // Рендер панели вертикальных профилей
  renderProfilesPanel() {
    return `
      <div class="panel-section">
        <div class="panel-section__title">Вертикальный профиль ветра</div>
        <div class="chart-container">
          <canvas id="chart-wind-profile"></canvas>
        </div>
        <div class="mt-2 text-muted" style="font-size: 12px;">
          <i class="fas fa-info-circle"></i> Данные интерполированы между уровнями давления
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Вертикальный профиль температуры</div>
        <div class="chart-container">
          <canvas id="chart-temp-profile"></canvas>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Роза ветров</div>
        <div class="chart-container">
          <canvas id="chart-wind-rose"></canvas>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Индекс турбулентности по высоте</div>
        <div class="chart-container">
          <canvas id="chart-turbulence"></canvas>
        </div>
        <table class="data-table mt-2">
          <tr><td>250-400 м</td><td><span class="status-pill status-ok">Низкий</span></td></tr>
          <tr><td>400-600 м</td><td><span class="status-pill status-ok">Низкий</span></td></tr>
          <tr><td>600-800 м</td><td><span class="status-pill status-warn">Умеренный</span></td></tr>
        </table>
      </div>
    `;
  },

  // Рендер панели временных окон
  renderWindowsPanel() {
    // Расчёт окон
    const weatherData = App.state.weatherData;
    const windows = TimeWindows.calculateWindows(weatherData);
    const grouped = TimeWindows.groupByStatus(windows);
    const bestWindows = TimeWindows.findBestWindows(windows, 5);
    const departure = TimeWindows.recommendDepartureTime(windows);

    return `
      <div class="panel-section">
        <div class="panel-section__title">
          <span>Временные окна (24 часа)</span>
          <span class="status-pill status-info">${grouped.allowed.length} благоприятных</span>
        </div>
        
        <div class="panel-grid-3 mb-2">
          <div class="stat-card">
            <div class="stat-card__value" style="color: #198754;">${grouped.allowed.length}</div>
            <div class="stat-card__label">Разрешено</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #ffc107;">${grouped.restricted.length}</div>
            <div class="stat-card__label">Ограничено</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" style="color: #dc3545;">${grouped.forbidden.length}</div>
            <div class="stat-card__label">Запрещено</div>
          </div>
        </div>

        <div class="flight-windows">
          ${windows.slice(0, 24).map(w => `
            <div class="flight-window ${w.status}" data-time="${w.startTime}" title="Рейтинг: ${w.rating}">
              <div>${TimeWindows.formatTime(w.startTime)}</div>
              <div style="font-size: 10px; opacity: 0.8;">★ ${w.rating}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">
          <i class="fas fa-star"></i>
          Лучшие окна для вылета
        </div>
        
        ${departure.recommended ? `
          <div class="stat-card mb-2" style="background: linear-gradient(135deg, #d1e7dd 0%, #badbcc 100%); border-color: #198754;">
            <div class="stat-card__value" style="color: #0f5132; font-size: 24px;">
              ${TimeWindows.formatTime(departure.startTime)} — ${TimeWindows.formatTime(departure.endTime)}
            </div>
            <div class="stat-card__label">Рекомендуемое время вылета</div>
            <div style="font-size: 12px; color: #0f5132; margin-top: 8px;">
              <i class="fas fa-check-circle"></i> ${departure.reason}<br/>
              Длительность: ${departure.duration} мин | Рейтинг: ${departure.avgRating}
            </div>
          </div>
        ` : `
          <div class="stat-card mb-2" style="background: linear-gradient(135deg, #fff3cd 0%, #ffecb5 100%); border-color: #ffc107;">
            <div class="stat-card__value" style="color: #664d03; font-size: 18px;">
              ⚠️ Нет благоприятных окон
            </div>
            <div class="stat-card__label">Рассмотрите альтернативы</div>
          </div>
        `}

        ${bestWindows.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Рейтинг</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              ${bestWindows.map(w => `
                <tr>
                  <td>${TimeWindows.formatTime(w.startTime)}</td>
                  <td><strong>★ ${w.rating}</strong></td>
                  <td><span class="status-pill status-ok">OK</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>

      <div class="panel-section">
        <div class="panel-section__title">
          <i class="fas fa-chart-line"></i>
          Динамика условий
        </div>
        <div class="chart-container">
          <canvas id="chart-windows-heatmap"></canvas>
        </div>
        <div class="mt-2 text-muted" style="font-size: 12px;">
          <i class="fas fa-info-circle"></i> 
          Тренд: ${TimeWindows.analyzeTrend(windows) === 'improving' ? '📈 Улучшение' : TimeWindows.analyzeTrend(windows) === 'worsening' ? '📉 Ухудшение' : '➡️ Стабильно'}
        </div>
      </div>
    `;
  },

  // Рендер панели маршрута
  renderRoutePanel() {
    const segments = MockDataGenerator.generateRouteSegments();

    return `
      <div class="panel-section">
        <div class="panel-section__title">
          <span>Сегменты маршрута</span>
          <span class="status-pill status-info">${segments.length} сегмента</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Сегмент</th>
              <th>Расст.</th>
              <th>Время</th>
              <th>Энергия</th>
              <th>Риск</th>
            </tr>
          </thead>
          <tbody>
            ${segments.map(s => `
              <tr>
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>${s.distance} км</td>
                <td>${s.time} мин</td>
                <td>${s.energy} мАч</td>
                <td>
                  <span class="status-pill status-${s.risk === 'low' ? 'ok' : s.risk === 'moderate' ? 'warn' : 'err'}">
                    ${s.risk === 'low' ? 'Низкий' : s.risk === 'moderate' ? 'Умеренный' : 'Высокий'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Детали маршрута</div>
        <table class="data-table">
          <tr><td>Общая длина</td><td><strong>46.3 км</strong></td></tr>
          <tr><td>Общее время</td><td><strong>45 мин</strong></td></tr>
          <tr><td>Потребление энергии</td><td><strong>8 020 мАч</strong></td></tr>
          <tr><td>Макс. удаление от старта</td><td><strong>35.2 км</strong></td></tr>
          <tr><td>Контроль связи (60 км)</td><td><span class="status-pill status-ok">В зоне</span></td></tr>
        </table>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Профиль высот</div>
        <div class="chart-container">
          <canvas id="chart-altitude-profile"></canvas>
        </div>
      </div>
    `;
  },

  // Рендер панели отчёта
  renderReportPanel() {
    return `
      <div class="panel-section">
        <div class="panel-section__title">
          <span>Чек-лист предполётной подготовки</span>
          <span class="status-pill status-warn">4/5</span>
        </div>
        <table class="data-table">
          <tr>
            <td><i class="fas fa-check-circle text-success"></i> METAR получен</td>
            <td><span class="status-pill status-ok">OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-check-circle text-success"></i> TAF сверен</td>
            <td><span class="status-pill status-ok">OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-check-circle text-success"></i> Риски оценены</td>
            <td><span class="status-pill status-ok">OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-check-circle text-success"></i> PNR рассчитан</td>
            <td><span class="status-pill status-ok">OK</span></td>
          </tr>
          <tr>
            <td><i class="fas fa-clock text-warning"></i> Подпись пилота</td>
            <td><span class="status-pill status-warn">Ожидает</span></td>
          </tr>
        </table>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Экспорт отчёта</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="exportReport('pdf')">
            <i class="fas fa-file-pdf"></i> PDF
          </button>
          <button class="btn btn-sm" onclick="exportReport('json')">
            <i class="fas fa-file-code"></i> JSON
          </button>
          <button class="btn btn-sm" onclick="exportReport('csv')">
            <i class="fas fa-file-csv"></i> CSV
          </button>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Краткий отчёт (А4)</div>
        <div style="background: var(--bg-panel-hover); padding: 12px; border-radius: var(--radius); font-size: 12px; font-family: var(--font-mono);">
          <div style="text-align: center; font-weight: 700; margin-bottom: 10px;">
            АНАЛИЗ ПОГОДНЫХ УСЛОВИЙ<br/>
            для полета БВС 13.02.2026
          </div>
          <div><strong>МАРШРУТ:</strong> 55.30°N, 66.60°E</div>
          <div><strong>СТАТУС:</strong> <span style="color: #198754;">✅ РАЗРЕШЁН</span></div>
          <div><strong>РЕКОМЕНДУЕМОЕ ВРЕМЯ:</strong> 10:25 — 10:35</div>
          <div><strong>ВЕТЕР:</strong> 4-6 м/с с запада</div>
          <div><strong>ТЕМПЕРАТУРА:</strong> -9..-7°C</div>
          <div><strong>ВИДИМОСТЬ:</strong> 10-15 км</div>
          <div><strong>ЭНЕРГЕТИКА:</strong> Запас 6 325 мАч (25%)</div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__title">Параметры аудита</div>
        <select class="btn btn-sm" style="width: 100%; margin-bottom: 10px;">
          <option>Полный аудит безопасности</option>
          <option>Комплаенс-проверка</option>
          <option>Технический аудит</option>
        </select>
        <button class="btn btn-sm btn-primary btn-block">
          <i class="fas fa-play"></i> Запустить аудит
        </button>
      </div>
    `;
  },

  // Инициализация графиков после открытия вкладки
  initTabCharts(tabId) {
    // Очистка предыдущих графиков
    ChartsManager.destroyAllCharts();
    
    switch (tabId) {
      case 'tab-pnr':
        this.initEnergyChart();
        break;
      case 'tab-weather':
        this.initTimeSeriesChart();
        break;
      case 'tab-profiles':
        this.initProfileCharts();
        break;
      case 'tab-windows':
        this.initHeatmapChart();
        break;
      case 'tab-route':
        this.initAltitudeProfileChart();
        break;
    }
  },

  // Инициализация графика энергии
  initEnergyChart() {
    const ctx = document.getElementById('chart-energy');
    if (!ctx) return;

    // Уничтожение предыдущего графика если есть
    if (ChartsManager.charts.energy) {
      ChartsManager.charts.energy.destroy();
    }

    ChartsManager.createEnergyProfileChart(ctx.getContext('2d'), {
      labels: [0, 12, 31, 46],
      remaining: [25300, 23160, 19960, 17275],
      consumption: [0, 2140, 5340, 8020],
      minReserve: [6325, 6325, 6325, 6325]
    });
  },

  // Инициализация временного ряда
  initTimeSeriesChart() {
    const ctx = document.getElementById('chart-time-series');
    if (!ctx) return;

    // Уничтожение предыдущего графика если есть
    if (ChartsManager.charts.timeSeries) {
      ChartsManager.charts.timeSeries.destroy();
    }

    // Получение данных из состояния приложения
    const weatherData = App.state.weatherData;
    
    if (weatherData && weatherData.hourly) {
      const hourly = weatherData.hourly;
      const labels = hourly.time?.slice(0, 24).map(t => t.slice(11, 16)) || [];
      const temp = hourly.temperature_2m?.slice(0, 24) || [];
      const wind = hourly.windspeed_10m?.slice(0, 24) || [];
      const humidity = hourly.relativehumidity_2m?.slice(0, 24) || [];

      ChartsManager.createTimeSeriesChart(ctx.getContext('2d'), {
        labels,
        temperature: temp,
        windSpeed: wind,
        humidity
      });
    } else {
      // Демо-данные если нет реальных
      const mockHourly = MockDataGenerator.generateHourlyData(24);
      ChartsManager.createTimeSeriesChart(ctx.getContext('2d'), {
        labels: mockHourly.time.map(t => t.slice(11, 16)),
        temperature: mockHourly.temperature_2m,
        windSpeed: mockHourly.windspeed_10m,
        humidity: mockHourly.relativehumidity_2m
      });
    }
  },

  // Инициализация профильных графиков
  initProfileCharts() {
    // Ветер
    const windCtx = document.getElementById('chart-wind-profile');
    if (windCtx) {
      ChartsManager.createWindProfileChart(windCtx.getContext('2d'), {
        altitudes: [250, 300, 400, 500, 600, 700, 800],
        windSpeed: [5.2, 6.1, 7.8, 9.2, 10.5, 11.8, 12.1]
      });
    }

    // Температура
    const tempCtx = document.getElementById('chart-temp-profile');
    if (tempCtx) {
      ChartsManager.createTemperatureProfileChart(tempCtx.getContext('2d'), {
        altitudes: [250, 300, 400, 500, 600, 700, 800],
        temperature: [-8.5, -8.2, -7.8, -7.5, -7.1, -6.8, -6.5]
      });
    }

    // Роза ветров
    const roseCtx = document.getElementById('chart-wind-rose');
    if (roseCtx) {
      ChartsManager.createWindRoseChart(roseCtx.getContext('2d'), {
        frequencies: [15, 10, 5, 8, 20, 25, 12, 5]
      });
    }

    // Турбулентность
    const turbCtx = document.getElementById('chart-turbulence');
    if (turbCtx) {
      ChartsManager.createTurbulenceChart(turbCtx.getContext('2d'), {
        labels: ['250м', '350м', '450м', '550м', '650м', '750м'],
        values: [0.0002, 0.00025, 0.00035, 0.0004, 0.00045, 0.00052]
      });
    }
  },

  // Инициализация тепловой карты
  initHeatmapChart() {
    const ctx = document.getElementById('chart-heatmap');
    if (!ctx) return;

    const windows = MockDataGenerator.generateFlightWindows().slice(0, 24);
    ChartsManager.createHeatmapChart(ctx.getContext('2d'), 
      windows.map(w => ({
        time: w.startTime.slice(11, 16),
        status: w.status
      }))
    );
  },

  // Инициализация профиля высот
  initAltitudeProfileChart() {
    const ctx = document.getElementById('chart-altitude-profile');
    if (!ctx) return;

    ChartsManager.createWindProfileChart(ctx.getContext('2d'), {
      altitudes: [0, 12, 31, 46],
      windSpeed: [500, 500, 750, 500]
    });
  },

  // Открытие/закрытие панели
  openPanel() {
    const panel = document.getElementById('rightPanel');
    if (panel && !this.rightPanelOpen) {
      panel.classList.add('open');
      this.rightPanelOpen = true;
    }
  },

  closePanel() {
    const panel = document.getElementById('rightPanel');
    if (panel && this.rightPanelOpen) {
      panel.classList.remove('open');
      this.rightPanelOpen = false;
    }
  },

  togglePanel() {
    if (this.rightPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  },

  // Быстрые действия
  handleQuickAction(action) {
    switch (action) {
      case 'landing-zones':
        alert('Показ зон безопасной посадки на карте');
        break;
      case 'forecast-72h':
        alert('Открытие прогноза на 72 часа');
        break;
      case 'flight-risks':
        alert('Анализ рисков полёта');
        break;
      case 'flight-log':
        alert('Открытие журнала полётов');
        break;
    }
  },

  // Событие после открытия вкладки
  onTabOpened(tabId) {
    console.log('Открыта вкладка:', tabId);
    // Здесь можно добавить дополнительную логику
  }
};
