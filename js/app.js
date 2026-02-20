/**
 * MIRA 0.2 | Небосвод - Main Application
 * Точка входа и инициализация приложения
 */

const App = {
  // Состояние приложения
  state: {
    initialized: false,
    missionData: null,
    weatherData: null,
    currentLocation: { lat: 55.302107, lon: 66.598778 },
    thresholds: {
      windGround: 10,
      windAltitude: 15,
      precipitation: 1.4,
      visibility: 5,
      tempDewpointDiff: 2
    }
  },

  // Инициализация приложения
  async init() {
    console.log('MIRA 0.2 | Инициализация приложения...');

    try {
      // Загрузка данных миссии (с обработкой CORS)
      await this.loadMissionData();

      // Инициализация карты
      this.initMap();

      // Инициализация вкладок
      TabsManager.init();

      // Обновление UI
      this.updateUI();

      // Привязка событий кнопок
      this.bindButtonEvents();

      // Запуск часов обновления
      this.startUpdateTime();

      // Генерация демонстрационных данных
      this.loadDemoData();

      this.state.initialized = true;
      console.log('MIRA 0.2 | Приложение инициализировано');

    } catch (error) {
      console.error('Ошибка инициализации:', error);
      // Продолжаем работу с демо-данными
      this.useDemoMode();
    }
  },

  // Режим с демо-данными (при CORS ошибке)
  useDemoMode() {
    console.log('MIRA 0.2 | Работа в демо-режиме');
    
    // Используем встроенные данные если есть
    this.state.missionData = window.MISSION_DATA || {
      mission: { name: 'Миссия «Северный»', date: '2026-02-13' },
      coordinates: {
        start: { lat: 55.302107, lon: 66.598778 },
        route: [
          { lat: 55.294118, lon: 66.074007, name: 'Начало маршрута', altitude: 500 },
          { lat: 55.275456, lon: 66.235891, name: 'КП1', altitude: 600 },
          { lat: 55.268234, lon: 66.412567, name: 'КП2', altitude: 750 },
          { lat: 55.256834, lon: 66.970183, name: 'Конец маршрута', altitude: 500 }
        ],
        landingZones: [
          { lat: 55.285, lon: 66.150, name: 'Зона посадки 1', radius: 500 },
          { lat: 55.270, lon: 66.420, name: 'Зона посадки 2', radius: 500 },
          { lat: 55.260, lon: 66.850, name: 'Зона посадки 3', radius: 500 }
        ],
        riskZones: [
          { lat: 55.280, lon: 66.300, radius: 2000, name: 'Зона турбулентности', level: 'moderate' },
          { lat: 55.265, lon: 66.700, radius: 1500, name: 'Зона ограничения', level: 'high' }
        ]
      },
      aerodrome: { name: 'Северный', icao: 'USKK', elevation: 195 },
      aircraft: { model: 'DJI M300 RTK', speed: 62, batteryCapacity: 25300 }
    };

    this.initMap();
    TabsManager.init();
    this.updateUI();
    this.bindButtonEvents();
    this.startUpdateTime();
    this.loadDemoData();
    this.state.initialized = true;
  },

  // Загрузка данных миссии
  async loadMissionData() {
    this.state.missionData = await WeatherAPI.loadMissionData();
    
    if (this.state.missionData) {
      const { start } = this.state.missionData.coordinates;
      this.state.currentLocation = { lat: start.lat, lon: start.lon };
    }
  },

  // Инициализация карты
  initMap() {
    MapManager.init('map');

    const missionData = this.state.missionData || window.MISSION_DATA;
    
    if (missionData) {
      const { coordinates, aerodrome } = missionData;

      // Добавление маршрута
      MapManager.addRoute(coordinates.route);

      // Добавление зон посадки
      MapManager.addLandingZones(coordinates.landingZones);

      // Добавление зон риска
      MapManager.addRiskZones(coordinates.riskZones);

      // Добавление аэродрома
      MapManager.addAerodromeMarker({
        name: aerodrome.name,
        icao: aerodrome.icao,
        elevation: aerodrome.elevation,
        lat: coordinates.start.lat,
        lon: coordinates.start.lon
      });

      // Добавление PNR
      MapManager.addPNR(
        { lat: coordinates.start.lat, lon: coordinates.start.lon },
        24.3
      );

      // Центрирование на точке взлёта
      MapManager.centerOn(coordinates.start.lat, coordinates.start.lon, 9);
    }
  },

  // Обновление UI
  updateUI() {
    // Обновление информации о миссии
    if (this.state.missionData) {
      const { start } = this.state.missionData.coordinates;
      const coordsEl = document.getElementById('mission-coords');
      const elevationEl = document.getElementById('mission-elevation');
      const dateEl = document.getElementById('mission-date');
      
      if (coordsEl) {
        coordsEl.textContent = `${start.lat.toFixed(2)}°N, ${start.lon.toFixed(2)}°E`;
      }
      if (elevationEl) {
        elevationEl.textContent = `${this.state.missionData.aerodrome.elevation} м`;
      }
      if (dateEl) {
        dateEl.textContent = this.formatDate(this.state.missionData.date);
      }
    }

    // Обновление времени
    this.updateTime();
  },

  // Привязка событий кнопок
  bindButtonEvents() {
    // Обновление данных
    document.getElementById('btn-refresh')?.addEventListener('click', () => {
      this.refreshData();
    });

    // Авто-загрузка
    document.getElementById('btn-auto-push')?.addEventListener('click', () => {
      this.showAutoPushOptions();
    });

    // Экспорт
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.showExportMenu();
    });

    // Сертификация
    document.getElementById('btn-certify')?.addEventListener('click', () => {
      this.openCertification();
    });

    // Редактирование миссии
    document.getElementById('btn-edit-mission')?.addEventListener('click', () => {
      this.editMission();
    });
  },

  // Показ опций авто-загрузки
  showAutoPushOptions() {
    const message = `🚀 Авто-загрузка на GitHub

Выберите действие:

1️⃣ Быстрая загрузка
   → Прямо сейчас отправить изменения

2️⃣ Настроить авто-загрузку
   → Автоматически каждые 5 минут (Планировщик)

3️⃣ Открыть репозиторий
   → https://github.com/kkav45/mira`;

    const choice = prompt(message, '1');
    
    switch (choice) {
      case '1':
        this.quickPush();
        break;
      case '2':
        this.setupAutoPush();
        break;
      case '3':
        window.open('https://github.com/kkav45/mira', '_blank');
        break;
    }
  },

  // Быстрая загрузка
  async quickPush() {
    const instructions = `📤 Быстрая загрузка на GitHub

Откройте PowerShell и выполните:

cd "d:\\! Погода\\MIRA 0.2 (небосвод)"
.\\publish-github.ps1

Или вручную:
git add .
git commit -m "Update"
git push`;

    alert(instructions);
    
    try {
      window.open('powershell.exe', '_blank');
    } catch (e) {
      console.log('Не удалось открыть PowerShell');
    }
  },

  // Настройка авто-загрузки
  setupAutoPush() {
    const instructions = `⚙️ Настройка авто-загрузки

1. Откройте PowerShell от имени администратора

2. Выполните команду:
cd "d:\\! Погода\\MIRA 0.2 (небосвод)"
.\\setup-autopush.ps1

3. Готово!
   → Загрузка каждые 5 минут
   → Лог: .auto-push.log

Для отключения:
Unregister-ScheduledTask -TaskName "MIRA Auto-Push" -Confirm:$false`;

    alert(instructions);
    
    try {
      window.open('powershell.exe', '_blank');
    } catch (e) {
      console.log('Не удалось открыть PowerShell');
    }
  },

  // Загрузка демонстрационных данных
  loadDemoData() {
    // Демонстрационные данные для прототипа
    const demoWeather = {
      wind10m: 6.2,
      wind500m: 12.1,
      visibility: 10,
      temp: -8,
      precipitation: 0.0,
      icing: 'low'
    };

    const demoPNR = {
      range: 24.3,
      time: 18,
      battery: 32
    };

    // Обновление оверлеев карты
    this.updateMapOverlays(demoWeather, demoPNR);

    // Обновление статуса полёта
    this.updateFlightStatus('allowed');
  },

  // Обновление оверлеев карты
  updateMapOverlays(weather, pnr) {
    document.getElementById('overlay-wind-10m').textContent = `${weather.wind10m} м/с`;
    document.getElementById('overlay-wind-500m').textContent = `${weather.wind500m} м/с`;
    document.getElementById('overlay-visibility').textContent = `${weather.visibility} км`;
    document.getElementById('overlay-temp').textContent = `${weather.temp}°C`;
    document.getElementById('overlay-precip').textContent = `${weather.precipitation} мм/ч`;
    
    const icingEl = document.getElementById('overlay-icing');
    icingEl.textContent = weather.icing === 'low' ? 'Низкий' : weather.icing === 'moderate' ? 'Умеренный' : 'Высокий';
    icingEl.className = `status-pill status-${weather.icing === 'low' ? 'ok' : weather.icing === 'moderate' ? 'warn' : 'err'}`;

    document.getElementById('overlay-pnr-range').textContent = `${pnr.range} км`;
    document.getElementById('overlay-pnr-time').textContent = `${pnr.time} мин`;
    document.getElementById('overlay-battery').textContent = `${pnr.battery}%`;
  },

  // Обновление статуса полёта
  updateFlightStatus(status) {
    const badge = document.getElementById('flight-status');
    const icons = {
      allowed: { class: 'status-vfr', icon: 'fa-check-circle', text: 'ПОЛЁТ РАЗРЕШЁН' },
      restricted: { class: 'status-mvfr', icon: 'fa-exclamation-circle', text: 'ОГРАНИЧЕН' },
      forbidden: { class: 'status-ifr', icon: 'fa-times-circle', text: 'ЗАПРЕЩЁН' }
    };

    const config = icons[status] || icons.allowed;
    badge.className = `status-badge ${config.class}`;
    badge.innerHTML = `<i class="fas ${config.icon}"></i><span>${config.text}</span>`;
  },

  // Обновление времени
  updateTime() {
    const now = new Date();
    const updateTimeEl = document.getElementById('update-time');
    const currentTimeEl = document.getElementById('currentTime');
    
    if (updateTimeEl) {
      updateTimeEl.textContent = this.formatTime(now);
    }
    if (currentTimeEl) {
      currentTimeEl.textContent = now.toLocaleString('ru-RU');
    }
  },

  // Запуск часов обновления
  startUpdateTime() {
    setInterval(() => this.updateTime(), 1000);
  },

  // Обновление данных
  async refreshData() {
    const btn = document.getElementById('btn-refresh');
    const originalContent = btn.innerHTML;
    
    btn.innerHTML = '<span class="spinner"></span><span>Обновление...</span>';
    btn.disabled = true;

    try {
      // Имитация загрузки данных
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Перезагрузка демонстрационных данных
      this.loadDemoData();

      console.log('Данные обновлены');
    } catch (error) {
      console.error('Ошибка обновления:', error);
      this.showError('Ошибка обновления данных');
    } finally {
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  },

  // Показ меню экспорта
  showExportMenu() {
    const formats = [
      { id: 'pdf', name: 'PDF Отчёт', icon: 'fa-file-pdf' },
      { id: 'json', name: 'JSON Данные', icon: 'fa-file-code' },
      { id: 'csv', name: 'CSV Таблица', icon: 'fa-file-csv' }
    ];

    const selected = prompt(
      'Выберите формат экспорта:\n1 - PDF\n2 - JSON\n3 - CSV',
      '1'
    );

    if (selected) {
      this.exportReport(formats[parseInt(selected) - 1]?.id || 'pdf');
    }
  },

  // Экспорт отчёта
  exportReport(format = 'pdf') {
    console.log('Экспорт в формате:', format);
    
    const report = {
      mission: this.state.missionData,
      weather: this.state.weatherData,
      timestamp: new Date().toISOString(),
      status: document.getElementById('flight-status')?.textContent || 'UNKNOWN'
    };

    switch (format) {
      case 'json':
        this.downloadJSON(report, 'mira-report.json');
        break;
      case 'csv':
        this.downloadCSV(report, 'mira-report.csv');
        break;
      case 'pdf':
        this.generatePDFReport();
        break;
    }

    this.showNotification('Отчёт экспортирован', 'success');
  },

  // Генерация PDF отчёта
  async generatePDFReport() {
    try {
      // Подготовка данных для отчёта
      const reportData = {
        missionName: this.state.missionData?.mission?.name || 'Миссия «Северный»',
        date: this.state.missionData?.mission?.date || new Date().toISOString(),
        aerodrome: this.state.missionData?.mission?.aerodrome?.name || '«Северный»',
        coordinates: this.state.missionData?.coordinates || { start: this.state.currentLocation },
        status: this.getCurrentFlightStatus(),
        weather: this.getCurrentWeatherData(),
        segments: MockDataGenerator.generateRouteSegments(),
        pnr: { distance: '24.3', time: 18, minReserve: 6325 },
        flightTime: 45,
        energyConsumption: 8020,
        batteryReserve: 6325,
        batteryReservePercent: 25,
        altitudes: { climb: 500, cruise: 750, descent: 500 },
        maxDistance: '35.2',
        recommendedTime: '10:25 — 10:35',
        summary: [
          'Полёт разрешён при соблюдении следующих условий:',
          '• Видимость не менее 5 км',
          '• Ветер на высоте не более 15 м/с',
          '• Отсутствие осадков интенсивнее 1.4 мм/ч',
          '• Минимальный запас энергии при посадке 25%'
        ],
        profiles: {
          wind: [5.2, 7.8, 9.2, 10.5, 12.1],
          temp: [-8.5, -7.8, -7.5, -7.1, -6.5],
          altitudes: [250, 400, 550, 650, 800]
        },
        energy: {
          capacity: 25300,
          consumption: 177.3,
          minReserve: 6325,
          maxFlightTime: 107
        },
        recommendations: [
          '1. Рекомендуемое время старта: 10:25 — 10:35 местного времени',
          '2. Высота выхода на маршрут: 500 м',
          '3. Крейсерская высота: 750 м (максимальная энергоэффективность)',
          '4. Контроль энергии на отметках: 27.8 км, 58 км, 75.3 км',
          '5. При ухудшении видимости менее 5 км — немедленная посадка',
          '6. Минимальное напряжение при посадке: 21.0 В (3.5 В/элемент)'
        ]
      };

      // Добавление расчётных данных
      reportData.routeLength = reportData.segments.reduce((sum, s) => sum + s.distance, 0);

      // Генерация краткого отчёта
      await PDFExporter.generateShortReport(reportData);
      
      this.showNotification('PDF отчёт сгенерирован', 'success');
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
      this.showError('Ошибка генерации PDF отчёта');
    }
  },

  // Получение текущего статуса полёта
  getCurrentFlightStatus() {
    const badge = document.getElementById('flight-status');
    if (badge?.classList.contains('status-vfr')) return 'allowed';
    if (badge?.classList.contains('status-mvfr')) return 'restricted';
    return 'forbidden';
  },

  // Получение текущих метео данных
  getCurrentWeatherData() {
    return {
      wind10m: parseFloat(document.getElementById('overlay-wind-10m')?.textContent) || 6.2,
      wind500m: parseFloat(document.getElementById('overlay-wind-500m')?.textContent) || 12.1,
      windDir10m: 240,
      temp: parseFloat(document.getElementById('overlay-temp')?.textContent) || -8,
      visibility: parseFloat(document.getElementById('overlay-visibility')?.textContent) || 10,
      precipitation: 0.0,
      icing: 0.1
    };
  },

  // Скачивание JSON
  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Скачивание CSV
  downloadCSV(data, filename) {
    // Простая реализация CSV
    const csv = 'Parameter,Value\nStatus,' + data.status + '\nDate,' + data.timestamp;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Открытие сертификации
  openCertification() {
    TabsManager.openTab('tab-report');
    this.showNotification('Перейдите к чек-листу сертификации', 'info');
  },

  // Редактирование миссии
  editMission() {
    const newCoords = prompt(
      'Введите координаты (широта, долгота):',
      `${this.state.currentLocation.lat}, ${this.state.currentLocation.lon}`
    );

    if (newCoords) {
      const [lat, lon] = newCoords.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lon)) {
        this.state.currentLocation = { lat, lon };
        MapManager.centerOn(lat, lon, 10);
        this.showNotification('Координаты обновлены', 'success');
      } else {
        this.showError('Неверный формат координат');
      }
    }
  },

  // Показ уведомления
  showNotification(message, type = 'info') {
    const container = document.getElementById('alert-container') || this.createAlertContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.appendChild(alert);
    
    setTimeout(() => {
      alert.remove();
    }, 3000);
  },

  // Показ ошибки
  showError(message) {
    this.showNotification(message, 'danger');
  },

  // Создание контейнера уведомлений
  createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alert-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:400px;';
    document.body.appendChild(container);
    return container;
  },

  // Форматирование даты
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  // Форматирование времени
  formatTime(date) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// Глобальная функция экспорта (доступна из HTML)
window.exportReport = (format) => App.exportReport(format);

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Обработка ошибок
window.addEventListener('error', (event) => {
  console.error('Глобальная ошибка:', event.error);
  App.showError('Произошла ошибка приложения');
});
