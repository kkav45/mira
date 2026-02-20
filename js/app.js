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

      // Добавление маршрута (если есть)
      if (coordinates?.route) {
        MapManager.addRoute(coordinates.route);
      }

      // Добавление зон посадки (если есть)
      if (coordinates?.landingZones) {
        MapManager.addLandingZones(coordinates.landingZones);
      }

      // Добавление зон риска (если есть)
      if (coordinates?.riskZones) {
        MapManager.addRiskZones(coordinates.riskZones);
      }

      // Центрирование на стартовой точке
      const startLat = coordinates?.start?.lat || 55.30;
      const startLon = coordinates?.start?.lon || 66.60;
      
      MapManager.centerOn(startLat, startLon, 9);

      // Обновление полей ввода координат
      const latInput = document.getElementById('input-lat');
      const lonInput = document.getElementById('input-lon');
      if (latInput) latInput.value = startLat.toFixed(4);
      if (lonInput) lonInput.value = startLon.toFixed(4);

      // Обновление заголовка
      this.updateHeaderCoords(startLat, startLon);
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

    // Анализ по координатам
    document.getElementById('btn-analyze')?.addEventListener('click', () => {
      this.analyzeCoordinates();
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

  // Анализ координат
  async analyzeCoordinates() {
    const lat = parseFloat(document.getElementById('input-lat')?.value);
    const lon = parseFloat(document.getElementById('input-lon')?.value);

    if (isNaN(lat) || isNaN(lon)) {
      this.showError('Введите корректные координаты');
      return;
    }

    // Обновление координат в заголовке
    this.updateHeaderCoords(lat, lon);

    // Центрирование карты
    MapManager.centerOn(lat, lon, 10);

    // Добавление маркера
    MapManager.features.points.clear();
    MapManager.addAerodromeMarker({
      name: 'Точка анализа',
      lat: lat,
      lon: lon,
      elevation: 0
    });

    // Запрос высоты
    let elevation = 0;
    try {
      elevation = await WeatherAPI.fetchElevation(lat, lon);
      document.getElementById('click-elevation').textContent = `${elevation} м`;
    } catch (e) {
      console.warn('Не удалось получить высоту');
    }

    // Загрузка реальных метеоданных
    await this.loadWeatherData(lat, lon, elevation);
  },

  // Загрузка метеоданных
  async loadWeatherData(lat, lon, elevation) {
    this.showNotification('Загрузка метеоданных...', 'info');
    this.updateFlightStatus('restricted');

    try {
      // Запрос к Open-Meteo на 24 часа
      const weatherData = await WeatherAPI.fetchMeteoData(lat, lon, 0, 24);
      
      // Обработка данных
      this.state.weatherData = weatherData;
      this.state.currentLocation = { lat, lon };

      // Анализ данных
      const analysis = this.analyzeWeatherData(weatherData, elevation);
      
      // Обновление UI
      this.updateWeatherUI(analysis);
      
      this.showNotification('Анализ завершён', 'success');
      this.updateFlightStatus(analysis.status);
      
    } catch (error) {
      console.error('Ошибка загрузки метеоданных:', error);
      // Используем демо-данные при ошибке
      this.loadDemoData();
      this.showNotification('Используются демо-данные (API недоступен)', 'warning');
    }
  },

  // Анализ метеоданных
  analyzeWeatherData(weatherData, elevation) {
    const hourly = weatherData.hourly;
    if (!hourly) {
      console.warn('Нет почасовых данных');
      return this.getEmptyAnalysis();
    }

    // Получение первого доступного часа
    const timeIndex = 0;
    
    // Извлечение параметров
    const temp = hourly.temperature_2m?.[timeIndex] || -8;
    const humidity = hourly.relativehumidity_2m?.[timeIndex] || 70;
    const windSpeed = hourly.windspeed_10m?.[timeIndex] || 5;
    const windDir = hourly.winddirection_10m?.[timeIndex] || 240;
    const precipitation = hourly.precipitation?.[timeIndex] || 0;
    const visibility = hourly.visibility?.[timeIndex] || 10000;
    const cloudCover = hourly.cloudcover?.[timeIndex] || 30;
    const dewpoint = hourly.dewpoint_2m?.[timeIndex] || -12;

    // Расчёт индексов
    const icingRisk = WeatherCalculations.calculateIcingRisk(temp, humidity, precipitation);
    const fogProb = WeatherCalculations.calculateFogProbability(temp, dewpoint, humidity, windSpeed);
    const cloudBase = WeatherCalculations.calculateCloudBase(temp, dewpoint);

    // Оценка безопасности
    const conditions = {
      wind: windSpeed,
      visibility: visibility / 1000, // км
      precipitation,
      temp,
      dewpoint,
      humidity,
      icing: icingRisk,
      fog: fogProb
    };

    const assessment = WeatherCalculations.assessFlightSafety(conditions);
    const status = WeatherCalculations.getFlightStatus(conditions);

    return {
      status,
      rating: assessment.rating,
      weather: {
        temp,
        humidity,
        windSpeed,
        windDir,
        precipitation,
        visibility: visibility / 1000,
        cloudCover,
        cloudBase,
        icingRisk,
        fogProb
      },
      hourly: {
        temp: hourly.temperature_2m?.slice(0, 24) || [],
        wind: hourly.windspeed_10m?.slice(0, 24) || [],
        precip: hourly.precipitation?.slice(0, 24) || [],
        time: hourly.time?.slice(0, 24).map(t => t.slice(11, 16)) || []
      }
    };
  },

  // Пустой анализ (при ошибке)
  getEmptyAnalysis() {
    return {
      status: 'restricted',
      rating: '0.50',
      weather: {
        temp: -8,
        humidity: 70,
        windSpeed: 5,
        windDir: 240,
        precipitation: 0,
        visibility: 10,
        cloudCover: 30,
        cloudBase: 500,
        icingRisk: 0.1,
        fogProb: 0.2
      },
      hourly: {
        temp: [],
        wind: [],
        precip: [],
        time: []
      }
    };
  },

  // Обновление UI с данными анализа
  updateWeatherUI(analysis) {
    const { weather } = analysis;

    // Обновление оверлеев
    const overlayData = {
      wind10m: weather.windSpeed.toFixed(1),
      wind500m: (weather.windSpeed * 1.5).toFixed(1),
      visibility: weather.visibility.toFixed(1),
      temp: weather.temp.toFixed(0),
      precipitation: weather.precipitation.toFixed(1),
      icing: weather.icingRisk < 0.3 ? 'low' : weather.icingRisk < 0.6 ? 'moderate' : 'high'
    };

    const pnrData = {
      range: '24.3',
      time: '18',
      battery: '32'
    };

    this.updateMapOverlays(overlayData, pnrData);

    // Обновление статусов в правой панели
    this.updatePanelStatus(analysis);
  },

  // Обновление статусов в панели
  updatePanelStatus(analysis) {
    // Обновление бейджей в таблице критических параметров
    const badges = {
      wind10m: document.getElementById('badge-wind-10m'),
      wind500m: document.getElementById('badge-wind-500m'),
      icing: document.getElementById('badge-icing'),
      fog: document.getElementById('badge-fog'),
      precip: document.getElementById('badge-precip')
    };

    const { weather } = analysis;

    if (badges.wind10m) {
      badges.wind10m.className = `status-pill status-${weather.windSpeed <= 10 ? 'ok' : weather.windSpeed <= 15 ? 'warn' : 'err'}`;
      badges.wind10m.textContent = weather.windSpeed <= 10 ? '≤10 OK' : weather.windSpeed <= 15 ? '10-15' : '>15';
    }

    if (badges.wind500m) {
      const wind500 = weather.windSpeed * 1.5;
      badges.wind500m.className = `status-pill status-${wind500 <= 15 ? 'ok' : wind500 <= 20 ? 'warn' : 'err'}`;
      badges.wind500m.textContent = wind500 <= 15 ? '≤15 OK' : wind500 <= 20 ? '15-20' : '>20';
    }

    if (badges.icing) {
      badges.icing.className = `status-pill status-${weather.icingRisk <= 0.3 ? 'ok' : weather.icingRisk <= 0.6 ? 'warn' : 'err'}`;
      badges.icing.textContent = weather.icingRisk <= 0.3 ? 'OK' : weather.icingRisk <= 0.6 ? 'Умеренный' : 'Высокий';
    }

    if (badges.fog) {
      badges.fog.className = `status-pill status-${weather.fogProb <= 0.7 ? 'ok' : 'warn'}`;
      badges.fog.textContent = weather.fogProb <= 0.7 ? 'OK' : 'Риск';
    }

    if (badges.precip) {
      badges.precip.className = `status-pill status-${weather.precipitation <= 1.4 ? 'ok' : weather.precipitation <= 2.5 ? 'warn' : 'err'}`;
      badges.precip.textContent = weather.precipitation <= 1.4 ? '≤1.4 OK' : weather.precipitation <= 2.5 ? '1.4-2.5' : '>2.5';
    }

    // Обновление числовых значений
    this.updateNumericValues(weather);
  },

  // Обновление числовых значений
  updateNumericValues(weather) {
    const values = {
      'param-wind-10m': `${weather.windSpeed.toFixed(1)} м/с`,
      'param-wind-500m': `${(weather.windSpeed * 1.5).toFixed(1)} м/с`,
      'param-temp': `${weather.temp.toFixed(0)}°C`,
      'param-visibility': `${weather.visibility.toFixed(1)} км`,
      'param-precip': `${weather.precipitation.toFixed(1)} мм/ч`,
      'param-icing': weather.icingRisk < 0.3 ? 'Низкий риск' : weather.icingRisk < 0.6 ? 'Умеренный' : 'Высокий',
      'param-fog': weather.fogProb > 0.7 ? 'Вероятен' : 'Не прогнозируется',
      'param-cloud': `${weather.cloudCover.toFixed(0)}%`
    };

    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    // Обновление статистики
    this.updateStats(weather);
  },

  // Обновление статистики
  updateStats(weather) {
    const stats = {
      'stat-wind-10m': weather.windSpeed.toFixed(1),
      'stat-wind-500m': (weather.windSpeed * 1.5).toFixed(1),
      'stat-temp': weather.temp.toFixed(0),
      'stat-visibility': weather.visibility.toFixed(0),
      'stat-precip': weather.precipitation.toFixed(1)
    };

    Object.entries(stats).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  },

  // Обновление координат в заголовке
  updateHeaderCoords(lat, lon) {
    const coordsEl = document.getElementById('header-coords');
    if (coordsEl) {
      coordsEl.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
    }
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

    // Добавление векторов ветра (демо)
    this.addDemoWindVectors();

    // Добавление тепловой карты рисков (демо)
    this.addDemoRiskHeatmap();
  },

  // Добавление демо-векторов ветра
  addDemoWindVectors() {
    const windVectors = [
      { lat: 55.35, lon: 66.20, speed: 5.2, direction: 240, altitude: 10 },
      { lat: 55.30, lon: 66.40, speed: 7.8, direction: 250, altitude: 10 },
      { lat: 55.25, lon: 66.60, speed: 6.1, direction: 245, altitude: 10 },
      { lat: 55.32, lon: 66.80, speed: 9.5, direction: 255, altitude: 10 },
      { lat: 55.28, lon: 67.00, speed: 8.2, direction: 250, altitude: 10 }
    ];

    MapManager.addWindVectors(windVectors);
  },

  // Добавление демо-тепловой карты рисков
  addDemoRiskHeatmap() {
    const riskData = [
      { lat: 55.30, lon: 66.30, risk: 0.2, radius: 5000 }, // низкий риск
      { lat: 55.28, lon: 66.50, risk: 0.5, radius: 5000 }, // умеренный
      { lat: 55.26, lon: 66.70, risk: 0.3, radius: 5000 }, // низкий
      { lat: 55.32, lon: 66.90, risk: 0.7, radius: 5000 }  // высокий
    ];

    MapManager.addRiskHeatmap(riskData);
  },

  // Обновление оверлеев карты
  updateMapOverlays(weather, pnr) {
    const overlayWind10m = document.getElementById('overlay-wind-10m');
    const overlayWind500m = document.getElementById('overlay-wind-500m');
    const overlayVisibility = document.getElementById('overlay-visibility');
    const overlayTemp = document.getElementById('overlay-temp');
    const overlayPrecip = document.getElementById('overlay-precip');
    const overlayIcing = document.getElementById('overlay-icing');
    const overlayPnrRange = document.getElementById('overlay-pnr-range');
    const overlayPnrTime = document.getElementById('overlay-pnr-time');
    const overlayBattery = document.getElementById('overlay-battery');

    if (overlayWind10m) overlayWind10m.textContent = `${weather.wind10m} м/с`;
    if (overlayWind500m) overlayWind500m.textContent = `${weather.wind500m} м/с`;
    if (overlayVisibility) overlayVisibility.textContent = `${weather.visibility} км`;
    if (overlayTemp) overlayTemp.textContent = `${weather.temp}°C`;
    if (overlayPrecip) overlayPrecip.textContent = `${weather.precipitation} мм/ч`;
    
    if (overlayIcing) {
      overlayIcing.textContent = weather.icing === 'low' ? 'Низкий' : weather.icing === 'moderate' ? 'Умеренный' : 'Высокий';
      overlayIcing.className = `status-pill status-${weather.icing === 'low' ? 'ok' : weather.icing === 'moderate' ? 'warn' : 'err'}`;
    }

    if (overlayPnrRange) overlayPnrRange.textContent = `${pnr.range} км`;
    if (overlayPnrTime) overlayPnrTime.textContent = `${pnr.time} мин`;
    if (overlayBattery) overlayBattery.textContent = `${pnr.battery}%`;
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
      // Генерация краткого отчёта с реальными данными
      await ReportDataPrep.generateQuickReport();
      
      this.showNotification('PDF отчёт сгенерирован', 'success');
    } catch (error) {
      console.error('Ошибка генерации PDF:', error);
      this.showError('Ошибка генерации PDF отчёта');
    }
  },

  // Генерация полного PDF отчёта
  async generateFullPDFReport() {
    try {
      await ReportDataPrep.generateFullReport();
      this.showNotification('Полный PDF отчёт сгенерирован', 'success');
    } catch (error) {
      console.error('Ошибка генерации полного PDF:', error);
      this.showError('Ошибка генерации полного PDF отчёта');
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
