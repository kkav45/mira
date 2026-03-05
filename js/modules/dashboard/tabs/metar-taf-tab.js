/**
 * Вкладка дашборда: METAR/TAF АНАЛИЗ 🛩️
 * Отображение фактических данных с аэропортов в радиусе 500 км
 * Версия: 1.0.0
 */

const DashboardTabsMetarTaf = {
    /**
     * Радиус поиска аэропортов (км)
     */
    searchRadiusKm: 500,

    /**
     * Максимальный возраст METAR (минут)
     */
    maxMetarAgeMinutes: 60,

    /**
     * Найденные аэропорты с данными
     */
    airportsWithData: [],

    /**
     * Центр поиска (координаты)
     */
    searchCenter: null,

    /**
     * Состояние загрузки
     */
    hasLoaded: false,

    /**
     * Параметры фильтрации
     */
    filter: {
        showOnlyCurrent: false,  // Только актуальные (< 60 мин)
        showOnlyWithTaf: false   // Только с TAF
    },

    /**
     * Параметры сортировки
     */
    sort: {
        by: 'distance',  // 'distance' | 'age' | 'wind' | 'temp'
        order: 'asc'     // 'asc' | 'desc'
    },

    /**
     * Применить фильтрацию и сортировку
     */
    applyFiltersAndSort(airports) {
        let filtered = [...airports];

        // Фильтрация
        if (this.filter.showOnlyCurrent) {
            filtered = filtered.filter(a => a.metar && a.metarAge < this.maxMetarAgeMinutes);
        }
        if (this.filter.showOnlyWithTaf) {
            filtered = filtered.filter(a => a.taf !== null);
        }

        // Сортировка
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (this.sort.by) {
                case 'distance':
                    comparison = (a.distance || 9999) - (b.distance || 9999);
                    break;
                case 'age':
                    comparison = (a.metarAge || 999) - (b.metarAge || 999);
                    break;
                case 'wind':
                    comparison = (a.metar?.windSpeed || 0) - (b.metar?.windSpeed || 0);
                    break;
                case 'temp':
                    comparison = (a.metar?.temp || 0) - (b.metar?.temp || 0);
                    break;
            }

            return this.sort.order === 'asc' ? comparison : -comparison;
        });

        return filtered;
    },

    /**
     * Установить фильтр
     */
    setFilter(filterType, value) {
        this.filter[filterType] = value;
        this.render();
    },

    /**
     * Установить сортировку
     */
    setSort(sortBy) {
        if (this.sort.by === sortBy) {
            // Переключение порядка
            this.sort.order = this.sort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort.by = sortBy;
            this.sort.order = 'asc';
        }
        this.render();
    },

    /**
     * Рендер контента вкладки
     */
    render() {
        // Проверяем наличие данных METAR
        const hasMetarData = this.airportsWithData && this.airportsWithData.length > 0;

        if (!hasMetarData) {
            return this.renderPlaceholder();
        }

        return this.renderContent();
    },

    /**
     * Заглушка при отсутствии данных
     */
    renderPlaceholder() {
        const centerPoint = this.getCenterPoint();

        return `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-plane-departure" style="color: #667eea;"></i>
                    METAR/TAF Анализ
                </div>
                <div style="padding: 40px; text-align: center; color: #718096;">
                    <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 16px; margin-bottom: 24px;">
                        Данные METAR/TAF не загружены
                    </p>
                    <p style="font-size: 14px; margin-bottom: 32px; color: #a0aec0;">
                        Для отображения данных выполните анализ маршрута<br>
                        или укажите координаты точки поиска
                    </p>
                    ${centerPoint ? `
                        <button class="btn btn-primary" onclick="DashboardTabsMetarTaf.loadMetarData()">
                            <i class="fas fa-sync-alt"></i>
                            Загрузить METAR для ближайших аэропортов
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Получить центральную точку для поиска
     */
    getCenterPoint() {
        // Пробуем получить из routeAnalysisData (последний analysed маршрут)
        if (typeof RouteModule !== 'undefined' && RouteModule.routeAnalysisData) {
            // Берём последний маршрут с данными анализа
            const routeIds = Object.keys(RouteModule.routeAnalysisData);
            if (routeIds.length > 0) {
                const lastRouteId = routeIds[routeIds.length - 1];
                const routeData = RouteModule.routeAnalysisData[lastRouteId];
                
                // Получаем первый сегмент для координат
                if (routeData.segments && routeData.segments.length > 0) {
                    const segment = routeData.segments[0];
                    
                    // Пробуем разные форматы хранения координат
                    let lat, lon, name;
                    
                    if (segment.center) {
                        // Формат route.js: { points, center, distance }
                        lat = segment.center.lat;
                        lon = segment.center.lon;
                        name = 'Центр сегмента';
                    } else if (segment.startLat) {
                        // Формат с явными координатами
                        lat = segment.startLat;
                        lon = segment.startLon;
                        name = segment.startName || 'Начало сегмента';
                    } else if (segment.points && segment.points.length > 0) {
                        // Берём первую точку из points
                        const point = segment.points[0];
                        lat = point.lat || point[1];
                        lon = point.lon || point[0];
                        name = 'Первая точка сегмента';
                    }
                    
                    if (lat !== undefined && lon !== undefined) {
                        return { lat, lon, name };
                    }
                }
            }
        }

        // Пробуем получить из карты
        if (typeof MapModule !== 'undefined' && MapModule.map) {
            try {
                const center = MapModule.map.getView().getCenter();
                if (center) {
                    const lonlat = ol.proj.toLonLat(center);
                    return {
                        lat: lonlat[1],
                        lon: lonlat[0],
                        name: 'Центр карты'
                    };
                }
            } catch (e) {
                console.warn('⚠️ Не удалось получить координаты из карты:', e);
            }
        }

        // По умолчанию (Москва)
        return {
            lat: 55.7558,
            lon: 37.6173,
            name: 'Москва (по умолчанию)'
        };
    },

    /**
     * Загрузка METAR данных для ближайших аэропортов
     */
    async loadMetarData() {
        const center = this.getCenterPoint();
        this.searchCenter = center;

        console.log('🔍 Загрузка METAR для точки:', center);

        // Показываем индикатор загрузки
        this.showLoading();

        try {
            // Получаем METAR через MetarTafModule
            if (typeof MetarTafModule !== 'undefined') {
                const result = await MetarTafModule.getMetarForPoint(
                    center.lat,
                    center.lon,
                    this.searchRadiusKm
                );

                this.airportsWithData = result.airports || [];

                console.log(`✅ Загружено METAR для ${this.airportsWithData.length} аэропортов`);
            } else {
                // Если модуль не загружен, используем заглушку
                console.warn('⚠️ MetarTafModule не доступен');
                this.airportsWithData = [];
            }

            // Перерисовываем вкладку
            this.render();

        } catch (error) {
            console.error('❌ Ошибка загрузки METAR:', error);
            this.showError(error.message);
        }
    },

    /**
     * Показать индикатор загрузки
     */
    showLoading() {
        const body = document.getElementById('dashboardBody');
        if (!body) return;

        body.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-plane-departure" style="color: #667eea;"></i>
                    METAR/TAF Анализ
                </div>
                <div style="padding: 60px; text-align: center;">
                    <div class="spinner" style="
                        display: inline-block;
                        width: 50px;
                        height: 50px;
                        border: 4px solid #e2e8f0;
                        border-top-color: #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                    <p style="margin-top: 20px; color: #718096;">
                        Загрузка данных METAR/TAF...
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Показать ошибку
     */
    showError(message) {
        const body = document.getElementById('dashboardBody');
        if (!body) return;

        body.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-plane-departure" style="color: #667eea;"></i>
                    METAR/TAF Анализ
                </div>
                <div style="padding: 40px; text-align: center; color: #e53e3e;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p style="font-size: 16px;">Ошибка загрузки данных</p>
                    <p style="font-size: 14px; color: #718096; margin-top: 8px;">${message}</p>
                    <button class="btn btn-primary" style="margin-top: 20px;" onclick="DashboardTabsMetarTaf.loadMetarData()">
                        <i class="fas fa-sync-alt"></i>
                        Повторить
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Основной контент вкладки
     */
    renderContent() {
        const airports = this.applyFiltersAndSort(this.airportsWithData);
        const center = this.searchCenter || this.getCenterPoint();

        // Разделяем на актуальные и устаревшие
        const currentAirports = airports.filter(a => a.metar && a.metarAge < this.maxMetarAgeMinutes);
        const oldAirports = airports.filter(a => a.metar && a.metarAge >= this.maxMetarAgeMinutes);

        // Статистика
        const stats = {
            total: this.airportsWithData.length,
            current: currentAirports.length,
            withMetar: this.airportsWithData.filter(a => a.metar).length,
            withTaf: this.airportsWithData.filter(a => a.taf).length,
            old: oldAirports.length
        };

        // Индикаторы активной сортировки
        const sortIcons = {
            distance: this.sort.by === 'distance' ? (this.sort.order === 'asc' ? ' ↑' : ' ↓') : '',
            age: this.sort.by === 'age' ? (this.sort.order === 'asc' ? ' ↑' : ' ↓') : '',
            wind: this.sort.by === 'wind' ? (this.sort.order === 'asc' ? ' ↑' : ' ↓') : '',
            temp: this.sort.by === 'temp' ? (this.sort.order === 'asc' ? ' ↑' : ' ↓') : ''
        };

        return `
            <!-- Заголовок и статистика -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">
                    <i class="fas fa-plane-departure" style="color: #667eea;"></i>
                    METAR/TAF Анализ
                </div>
                <div class="dashboard-card-subtitle" style="margin-top: 8px; color: #718096; font-size: 14px;">
                    <i class="fas fa-map-marker-alt"></i>
                    Точка поиска: ${center.name} (${center.lat.toFixed(4)}, ${center.lon.toFixed(4)})
                    • Радиус: ${this.searchRadiusKm} км
                </div>

                <!-- Статистика -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 20px;">
                    ${this.renderStatCard('Всего аэропортов', stats.total, 'fa-airport', '#667eea')}
                    ${this.renderStatCard('Актуальные METAR', stats.current, 'fa-check-circle', '#38a169')}
                    ${this.renderStatCard('Устаревшие METAR', stats.old, 'fa-clock', '#dd6b20')}
                    ${this.renderStatCard('Есть TAF', stats.withTaf, 'fa-calendar-alt', '#805ad5')}
                </div>

                <!-- Фильтры и сортировка -->
                <div style="display: flex; gap: 16px; margin-top: 20px; flex-wrap: wrap; align-items: center;">
                    <!-- Фильтры -->
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 13px; color: #718096; font-weight: 600;">Фильтры:</span>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" 
                                   ${this.filter.showOnlyCurrent ? 'checked' : ''} 
                                   onchange="DashboardTabsMetarTaf.setFilter('showOnlyCurrent', this.checked)">
                            <span style="font-size: 13px;">Только актуальные</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" 
                                   ${this.filter.showOnlyWithTaf ? 'checked' : ''} 
                                   onchange="DashboardTabsMetarTaf.setFilter('showOnlyWithTaf', this.checked)">
                            <span style="font-size: 13px;">Только с TAF</span>
                        </label>
                    </div>

                    <!-- Сортировка -->
                    <div style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
                        <span style="font-size: 13px; color: #718096; font-weight: 600;">Сортировка:</span>
                        <button class="btn btn-secondary" 
                                onclick="DashboardTabsMetarTaf.setSort('distance')"
                                style="padding: 6px 12px; font-size: 12px;">
                            Расстояние${sortIcons.distance}
                        </button>
                        <button class="btn btn-secondary" 
                                onclick="DashboardTabsMetarTaf.setSort('age')"
                                style="padding: 6px 12px; font-size: 12px;">
                            Время${sortIcons.age}
                        </button>
                        <button class="btn btn-secondary" 
                                onclick="DashboardTabsMetarTaf.setSort('wind')"
                                style="padding: 6px 12px; font-size: 12px;">
                            Ветер${sortIcons.wind}
                        </button>
                        <button class="btn btn-secondary" 
                                onclick="DashboardTabsMetarTaf.setSort('temp')"
                                style="padding: 6px 12px; font-size: 12px;">
                            Температура${sortIcons.temp}
                        </button>
                    </div>
                </div>

                <!-- Кнопки действий -->
                <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="DashboardTabsMetarTaf.loadMetarData()">
                        <i class="fas fa-sync-alt"></i>
                        Обновить
                    </button>
                    ${currentAirports.length > 0 ? `
                        <button class="btn btn-secondary" onclick="DashboardTabsMetarTaf.exportMetarJSON()">
                            <i class="fas fa-download"></i>
                            Экспорт JSON
                        </button>
                        <button class="btn btn-secondary" onclick="DashboardTabsMetarTaf.printMetarReport()">
                            <i class="fas fa-print"></i>
                            Печать
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Предупреждения -->
            ${this.renderWarnings(airports)}

            <!-- Графики -->
            ${currentAirports.length > 0 ? this.renderCharts(currentAirports) : ''}

            <!-- Таблица аэропортов -->
            ${currentAirports.length > 0 ? `
                <div class="dashboard-card">
                    <div class="dashboard-card-title">
                        <i class="fas fa-list" style="color: #667eea;"></i>
                        Аэропорты (${currentAirports.length} из ${this.airportsWithData.length})
                    </div>
                    <div class="metar-table-container" style="overflow-x: auto;">
                        <table class="metar-table">
                            <thead>
                                <tr>
                                    <th>Аэропорт</th>
                                    <th style="cursor: pointer;" onclick="DashboardTabsMetarTaf.setSort('distance')">
                                        Расстояние${sortIcons.distance}
                                    </th>
                                    <th style="cursor: pointer;" onclick="DashboardTabsMetarTaf.setSort('age')">
                                        Время (UTC)${sortIcons.age}
                                    </th>
                                    <th>Ветер</th>
                                    <th>Видимость</th>
                                    <th>Погода</th>
                                    <th>Облачность</th>
                                    <th style="cursor: pointer;" onclick="DashboardTabsMetarTaf.setSort('temp')">
                                        Температура${sortIcons.temp}
                                    </th>
                                    <th>Давление</th>
                                    <th>Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${currentAirports.map((airport, index) => this.renderMetarRow(airport, index)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}

            <!-- Карточки с подробными данными -->
            ${currentAirports.length > 0 ? `
                <div class="dashboard-cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));">
                    ${currentAirports.slice(0, 6).map(airport => this.renderAirportCard(airport)).join('')}
                </div>
            ` : ''}

            <!-- Устаревшие данные -->
            ${oldAirports.length > 0 ? `
                <div class="dashboard-card">
                    <div class="dashboard-card-title">
                        <i class="fas fa-exclamation-triangle" style="color: #dd6b20;"></i>
                        Устаревшие данные METAR (> ${this.maxMetarAgeMinutes} мин)
                    </div>
                    <div style="padding: 20px; background: #fffaf0; border-left: 4px solid #dd6b20; border-radius: 4px; margin-top: 12px;">
                        <p style="color: #718096; font-size: 14px;">
                            Следующие аэропорты имеют устаревшие данные METAR. Используйте с осторожностью.
                        </p>
                        <ul style="margin-top: 12px; color: #4a5568; font-size: 14px;">
                            ${oldAirports.map(a => `<li>${a.icao} — ${a.name || a.city} (${Math.round(a.metarAge)} мин)</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : ''}

            <!-- Нет данных -->
            ${currentAirports.length === 0 && oldAirports.length === 0 ? `
                <div class="dashboard-card">
                    <div style="padding: 40px; text-align: center; color: #718096;">
                        <i class="fas fa-cloud-sun" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <p style="font-size: 16px;">
                            Нет данных METAR в радиусе ${this.searchRadiusKm} км
                        </p>
                        <p style="font-size: 14px; margin-top: 8px; color: #a0aec0;">
                            Попробуйте увеличить радиус поиска или выбрать другую точку
                        </p>
                    </div>
                </div>
            ` : ''}
        `;
    },

    /**
     * Карточка статистики
     */
    renderStatCard(label, value, icon, color) {
        return `
            <div style="
                padding: 16px;
                background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%);
                border-radius: 12px;
                border: 1px solid ${color}30;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas ${icon}" style="font-size: 24px; color: ${color};"></i>
                    <div>
                        <div style="font-size: 24px; font-weight: 700; color: #2d3748;">${value}</div>
                        <div style="font-size: 12px; color: #718096;">${label}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Строка таблицы METAR
     */
    renderMetarRow(airport, index) {
        const metar = airport.metar || {};
        const ageClass = airport.metarAge < 30 ? 'status-good' : 'status-warning';

        return `
            <tr>
                <td>
                    <div style="font-weight: 600; color: #2d3748;">${airport.icao}</div>
                    <div style="font-size: 12px; color: #718096;">${airport.name || airport.city || ''}</div>
                </td>
                <td>
                    <div style="color: #2d3748;">${Math.round(airport.distance)} км</div>
                    <div style="font-size: 11px; color: #718096;">${airport.bearing ? this.getBearingText(airport.bearing) : ''}</div>
                </td>
                <td>
                    <div style="font-family: monospace; color: #2d3748;">${metar.observationTime ? this.formatObservationTime(metar.observationTime) : '—'}</div>
                    <div style="font-size: 11px; color: #718096;">${Math.round(airport.metarAge)} мин назад</div>
                </td>
                <td>
                    <div style="color: #2d3748;">${metar.windDir || '—'}° @ ${metar.windSpeed || 0} м/с</div>
                    ${metar.windGust ? `<div style="font-size: 11px; color: #dd6b20;">Порывы: ${metar.windGust} м/с</div>` : ''}
                </td>
                <td>
                    <div style="color: #2d3748;">${this.formatVisibility(metar.visibility)}</div>
                </td>
                <td>
                    <div style="color: #2d3748;">${metar.weather || '—'}</div>
                </td>
                <td>
                    <div style="color: #2d3748;">${this.formatClouds(metar.clouds)}</div>
                </td>
                <td>
                    <div style="color: #2d3748;">${metar.temp || '—'}°C</div>
                    ${metar.dewpoint !== undefined ? `<div style="font-size: 11px; color: #718096;">Td: ${metar.dewpoint}°C</div>` : ''}
                </td>
                <td>
                    <div style="color: #2d3748;">${metar.qnh || '—'} гПа</div>
                    ${metar.qnh ? `<div style="font-size: 11px; color: #718096;">${Math.round(metar.qnh * 0.750062)} мм рт.ст.</div>` : ''}
                </td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <span class="badge badge-${ageClass}">
                            ${airport.metarAge < 30 ? '✓ Актуально' : '⚠ Устарело'}
                        </span>
                        ${typeof MapModule !== 'undefined' ? `
                            <button class="btn btn-secondary" 
                                    onclick="DashboardTabsMetarTaf.showAirportOnMap(${airport.latitude}, ${airport.longitude}, '${airport.icao}')"
                                    style="padding: 4px 8px; font-size: 11px;"
                                    title="Показать на карте">
                                <i class="fas fa-map-marker-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Показать аэропорт на карте
     */
    showAirportOnMap(lat, lon, icao) {
        if (typeof MapModule === 'undefined' || !MapModule.map) {
            console.warn('⚠️ Карта недоступна');
            return;
        }

        // Центрирование карты
        const center = ol.proj.fromLonLat([lon, lat]);
        MapModule.map.getView().setCenter(center);
        MapModule.map.getView().setZoom(10);

        // Добавление маркера (если есть функция)
        if (typeof MapModule.addAirportMarker === 'function') {
            MapModule.addAirportMarker(icao, lat, lon);
        }

        console.log(`📍 ${icao} показан на карте: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        
        // Закрытие дашборда (опционально)
        // DashboardModule.close();
    },

    /**
     * Рендер предупреждений
     */
    renderWarnings(airports) {
        const warnings = [];

        // Проверка: все данные устарели
        const allOld = airports.length > 0 && airports.every(a => !a.metar || a.metarAge >= this.maxMetarAgeMinutes);
        if (allOld) {
            warnings.push({
                type: 'error',
                icon: 'fa-exclamation-triangle',
                color: '#e53e3e',
                bg: '#fff5f5',
                text: 'Все данные METAR устарели (> 60 минут). Используйте с осторожностью.'
            });
        }

        // Проверка: нет данных
        const noData = airports.length > 0 && airports.every(a => !a.metar);
        if (noData) {
            warnings.push({
                type: 'error',
                icon: 'fa-times-circle',
                color: '#e53e3e',
                bg: '#fff5f5',
                text: 'Нет данных METAR для найденных аэропортов.'
            });
        }

        // Проверка: опасные явления
        const dangerousAirports = airports.filter(a => {
            const metar = a.metar || {};
            return (metar.windSpeed && metar.windSpeed > 15) || 
                   (metar.visibility && metar.visibility < 1000) ||
                   (metar.weather && metar.weather.toLowerCase().includes('гроза')) ||
                   (metar.weather && metar.weather.toLowerCase().includes('ливень'));
        });

        if (dangerousAirports.length > 0) {
            warnings.push({
                type: 'warning',
                icon: 'fa-exclamation-circle',
                color: '#dd6b20',
                bg: '#fffaf0',
                text: `Опасные явления на ${dangerousAirports.length} аэропорт(а)х: сильный ветер, низкая видимость, гроза.`
            });
        }

        // Проверка: сильный ветер
        const highWind = airports.filter(a => a.metar?.windSpeed && a.metar.windSpeed > 10);
        if (highWind.length > 0 && !dangerousAirports.length) {
            warnings.push({
                type: 'info',
                icon: 'fa-wind',
                color: '#d69e2e',
                bg: '#fffff0',
                text: `Сильный ветер (> 10 м/с) на ${highWind.length} аэропорт(а)х.`
            });
        }

        if (warnings.length === 0) return '';

        return `
            <div style="margin-top: 20px;">
                ${warnings.map(w => `
                    <div style="
                        padding: 16px;
                        background: ${w.bg};
                        border-left: 4px solid ${w.color};
                        border-radius: 4px;
                        margin-bottom: 12px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    ">
                        <i class="fas ${w.icon}" style="color: ${w.color}; font-size: 20px;"></i>
                        <span style="color: ${w.color}; font-weight: 600;">${w.text}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Рендер графиков (Plotly)
     */
    renderCharts(airports) {
        // Подготовка данных для графиков
        const chartData = airports.slice(0, 8).map((airport, index) => {
            const metar = airport.metar || {};
            const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea'];
            
            return {
                icao: airport.icao,
                name: airport.name || airport.city || airport.icao,
                distance: Math.round(airport.distance),
                temp: metar.temp !== null ? metar.temp : null,
                wind: metar.windSpeed !== null ? metar.windSpeed : null,
                windDir: metar.windDir,
                dewpoint: metar.dewpoint,
                pressure: metar.qnh,
                color: colors[index % colors.length],
                metarAge: Math.round(airport.metarAge)
            };
        }).filter(d => d.temp !== null || d.wind !== null);

        if (chartData.length === 0) return '';

        const airportNames = chartData.map(d => `${d.icao}\n(${d.distance}км)`);
        const tempData = chartData.map(d => d.temp);
        const windData = chartData.map(d => d.wind);
        const dewpointData = chartData.map(d => d.dewpoint);

        return `
            <!-- Графики сравнения аэропортов -->
            <div class="dashboard-cards-grid" style="grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); margin-top: 20px;">
                <div class="dashboard-card" style="grid-column: span 2;">
                    <div class="dashboard-card-title">
                        <i class="fas fa-chart-line" style="color: #667eea;"></i>
                        Температура по аэропортам
                    </div>
                    <div id="metarTempChart" style="height: 350px;"></div>
                </div>
                
                <div class="dashboard-card" style="grid-column: span 2;">
                    <div class="dashboard-card-title">
                        <i class="fas fa-wind" style="color: #667eea;"></i>
                        Ветер по аэропортам
                    </div>
                    <div id="metarWindChart" style="height: 350px;"></div>
                </div>

                ${dewpointData.some(d => d !== null) ? `
                <div class="dashboard-card" style="grid-column: span 2;">
                    <div class="dashboard-card-title">
                        <i class="fas fa-tint" style="color: #667eea;"></i>
                        Температура и точка росы
                    </div>
                    <div id="metarTempDewpointChart" style="height: 350px;"></div>
                </div>
                ` : ''}
            </div>

            <script>
                // График температуры
                (function() {
                    const trace = {
                        x: ${JSON.stringify(airportNames)},
                        y: ${JSON.stringify(tempData)},
                        type: 'bar',
                        marker: {
                            color: ${JSON.stringify(chartData.map(d => d.color))},
                            line: { color: '#667eea', width: 2 }
                        },
                        text: ${JSON.stringify(tempData.map(t => t + '°C'))},
                        textposition: 'outside',
                        hoverinfo: 'text',
                        hovertext: ${JSON.stringify(chartData.map(d => 
                            `<b>${d.icao}</b><br>` +
                            `${d.name}<br>` +
                            `Расстояние: ${d.distance} км<br>` +
                            `Возраст: ${d.metarAge} мин<br>` +
                            `Температура: ${d.temp}°C`
                        ))}
                    };

                    const layout = {
                        margin: { t: 30, b: 80, l: 50, r: 30 },
                        xaxis: { 
                            title: 'Аэропорт (расстояние)',
                            tickangle: -45,
                            tickfont: { size: 10 }
                        },
                        yaxis: { 
                            title: 'Температура (°C)',
                            zeroline: true,
                            zerolinecolor: '#e2e8f0'
                        },
                        showlegend: false,
                        hovermode: 'closest'
                    };

                    const config = { 
                        responsive: true, 
                        displayModeBar: false,
                        scrollZoom: false
                    };

                    Plotly.newPlot('metarTempChart', [trace], layout, config);
                })();

                // График ветра
                (function() {
                    const trace = {
                        x: ${JSON.stringify(airportNames)},
                        y: ${JSON.stringify(windData)},
                        type: 'scatter',
                        mode: 'lines+markers',
                        line: { 
                            color: '#667eea', 
                            width: 3,
                            shape: 'spline'
                        },
                        marker: { 
                            size: 10,
                            color: ${JSON.stringify(chartData.map(d => d.color))},
                            symbol: 'circle'
                        },
                        text: ${JSON.stringify(windData.map(w => w + ' м/с'))},
                        textposition: 'top center',
                        hoverinfo: 'text',
                        hovertext: ${JSON.stringify(chartData.map(d => 
                            `<b>${d.icao}</b><br>` +
                            `${d.name}<br>` +
                            `Расстояние: ${d.distance} км<br>` +
                            `Возраст: ${d.metarAge} мин<br>` +
                            `Ветер: ${d.wind} м/с<br>` +
                            `Направление: ${d.windDir}°`
                        ))}
                    };

                    const layout = {
                        margin: { t: 30, b: 80, l: 50, r: 30 },
                        xaxis: { 
                            title: 'Аэропорт (расстояние)',
                            tickangle: -45,
                            tickfont: { size: 10 }
                        },
                        yaxis: { 
                            title: 'Ветер (м/с)',
                            zeroline: true,
                            zerolinecolor: '#e2e8f0'
                        },
                        showlegend: false,
                        hovermode: 'closest'
                    };

                    const config = { 
                        responsive: true, 
                        displayModeBar: false,
                        scrollZoom: false
                    };

                    Plotly.newPlot('metarWindChart', [trace], layout, config);
                })();

                // График температуры и точки росы
                ${dewpointData.some(d => d !== null) ? `
                (function() {
                    const traceTemp = {
                        x: ${JSON.stringify(airportNames)},
                        y: ${JSON.stringify(tempData)},
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Температура',
                        line: { color: '#f093fb', width: 3 },
                        marker: { size: 10 },
                        hoverinfo: 'text',
                        hovertext: ${JSON.stringify(chartData.map(d => `Температура: ${d.temp}°C`))}
                    };

                    const traceDewpoint = {
                        x: ${JSON.stringify(airportNames)},
                        y: ${JSON.stringify(dewpointData)},
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Точка росы',
                        line: { color: '#4facfe', width: 3, dash: 'dash' },
                        marker: { size: 10, symbol: 'diamond' },
                        hoverinfo: 'text',
                        hovertext: ${JSON.stringify(chartData.map(d => `Точка росы: ${d.dewpoint}°C`))}
                    };

                    const layout = {
                        margin: { t: 30, b: 80, l: 50, r: 30 },
                        xaxis: { 
                            title: 'Аэропорт',
                            tickangle: -45,
                            tickfont: { size: 10 }
                        },
                        yaxis: { 
                            title: 'Температура (°C)',
                            zeroline: true,
                            zerolinecolor: '#e2e8f0'
                        },
                        showlegend: true,
                        legend: { x: 0, y: 1 },
                        hovermode: 'closest'
                    };

                    const config = { 
                        responsive: true, 
                        displayModeBar: false,
                        scrollZoom: false
                    };

                    Plotly.newPlot('metarTempDewpointChart', [traceTemp, traceDewpoint], layout, config);
                })();
                ` : ''}
            </script>
        `;
    },

    /**
     * Карточка аэропорта с подробными данными
     */
    renderAirportCard(airport) {
        const metar = airport.metar || {};
        const taf = airport.taf || null;

        return `
            <div class="dashboard-card" style="border-left: 4px solid #667eea;">
                <div class="dashboard-card-title" style="justify-content: space-between;">
                    <span>
                        <i class="fas fa-airport" style="color: #667eea;"></i>
                        ${airport.icao}
                    </span>
                    <span style="font-size: 12px; color: #718096;">${Math.round(airport.distance)} км</span>
                </div>
                <div style="font-size: 13px; color: #718096; margin-bottom: 16px;">
                    ${airport.name || airport.city || ''}
                </div>

                <!-- METAR -->
                <div style="background: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 11px; color: #718096; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-clock"></i> METAR ${Math.round(airport.metarAge)} мин назад</span>
                        <span class="badge badge-${airport.metarAge < 30 ? 'status-good' : 'status-warning'}">
                            ${airport.metarAge < 30 ? 'актуально' : 'устарело'}
                        </span>
                    </div>
                    <div style="font-family: 'Courier New', monospace; font-size: 12px; color: #2d3748; line-height: 1.6; word-break: break-word;">
                        ${metar.raw || 'Нет данных'}
                    </div>
                </div>

                <!-- TAF (если есть) -->
                ${taf ? `
                    <div style="background: #faf5ff; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #718096; margin-bottom: 8px;">
                            <i class="fas fa-calendar-alt"></i> TAF
                        </div>
                        <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #2d3748; line-height: 1.5; word-break: break-word; max-height: 100px; overflow-y: auto;">
                            ${taf.raw || 'Нет данных'}
                        </div>
                    </div>
                ` : ''}

                <!-- Основные параметры -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    ${this.renderParamItem('Ветер', `${metar.windDir || '—'}° @ ${metar.windSpeed || 0} м/с`, 'fa-wind')}
                    ${this.renderParamItem('Видимость', this.formatVisibility(metar.visibility), 'fa-eye')}
                    ${this.renderParamItem('Температура', `${metar.temp || '—'}°C`, 'fa-thermometer-half')}
                    ${this.renderParamItem('Давление', `${metar.qnh || '—'} гПа`, 'fa-tachometer-alt')}
                </div>

                <!-- Роза ветров (мини) -->
                ${metar.windDir !== undefined && metar.windSpeed > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; color: #718096; margin-bottom: 8px;">
                            <i class="fas fa-compass"></i> Направление ветра
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 50px; height: 50px; position: relative;">
                                <svg viewBox="0 0 50 50" style="width: 100%; height: 100%;">
                                    <circle cx="25" cy="25" r="23" fill="none" stroke="#e2e8f0" stroke-width="1"/>
                                    <line x1="25" y1="2" x2="25" y2="10" stroke="#667eea" stroke-width="2"/>
                                    <line x1="25" y1="40" x2="25" y2="48" stroke="#e2e8f0" stroke-width="1"/>
                                    <line x1="2" y1="25" x2="10" y2="25" stroke="#e2e8f0" stroke-width="1"/>
                                    <line x1="40" y1="25" x2="48" y2="25" stroke="#e2e8f0" stroke-width="1"/>
                                    <line x1="25" y1="25" x2="${25 + 18 * Math.sin(metar.windDir * Math.PI / 180)}" y2="${25 + 18 * Math.cos(metar.windDir * Math.PI / 180)}" stroke="#667eea" stroke-width="3" marker-end="url(#arrowhead)"/>
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="#667eea"/>
                                        </marker>
                                    </defs>
                                </svg>
                            </div>
                            <div>
                                <div style="font-size: 18px; font-weight: 700; color: #2d3748;">${metar.windDir}°</div>
                                <div style="font-size: 12px; color: #718096;">${this.getBearingText(metar.windDir)}</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Элемент параметра
     */
    renderParamItem(label, value, icon) {
        return `
            <div style="padding: 8px; background: #edf2f7; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <i class="fas ${icon}" style="font-size: 10px; color: #718096;"></i>
                    <span style="font-size: 10px; color: #718096;">${label}</span>
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #2d3748; word-break: break-word;">${value}</div>
            </div>
        `;
    },

    /**
     * Форматирование времени наблюдения
     */
    formatObservationTime(isoString) {
        if (!isoString) return '—';

        const date = new Date(isoString);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');

        return `${day}.${month} ${hours}:${minutes} UTC`;
    },

    /**
     * Форматирование видимости
     */
    formatVisibility(vis) {
        if (vis === undefined || vis === null) return '—';

        if (vis >= 10000) return '≥10 км';
        if (vis >= 5000) return `${(vis / 1000).toFixed(1)} км`;
        if (vis >= 1000) return `${(vis / 1000).toFixed(1)} км`;
        return `${vis} м`;
    },

    /**
     * Форматирование облачности
     */
    formatClouds(clouds) {
        if (!clouds || clouds.length === 0) return 'Ясно';

        if (Array.isArray(clouds)) {
            return clouds.map(c => {
                const coverage = c.coverage || '';
                const height = c.height ? `${Math.round(c.height / 30.48)}000 футов` : '';
                return `${coverage}${height ? ' ' + height : ''}`;
            }).join(', ');
        }

        return clouds;
    },

    /**
     * Текстовое описание румба
     */
    getBearingText(degrees) {
        const directions = [
            'С', 'ССВ', 'СВ', 'ВСВ', 'В', 'ЮЮВ', 'ЮВ', 'ЮЮВ',
            'Ю', 'ЮЮЗ', 'ЮЗ', 'ЗЮЗ', 'З', 'СЗЗ', 'СЗ', 'ССЗ'
        ];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    },

    /**
     * Экспорт данных в JSON
     */
    exportMetarJSON() {
        const data = {
            timestamp: new Date().toISOString(),
            searchCenter: this.searchCenter,
            searchRadiusKm: this.searchRadiusKm,
            airports: this.airportsWithData.map(a => ({
                icao: a.icao,
                name: a.name,
                city: a.city,
                latitude: a.latitude,
                longitude: a.longitude,
                distance: Math.round(a.distance),
                bearing: a.bearing,
                metar: a.metar,
                metarAge: Math.round(a.metarAge),
                taf: a.taf
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metar-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('✅ METAR данные экспортированы в JSON');
    },

    /**
     * Печать отчёта
     */
    printMetarReport() {
        const printWindow = window.open('', '_blank');

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>METAR/TAF Отчёт - MIRA</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #667eea; }
                    .airport { margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
                    .metar { font-family: 'Courier New', monospace; background: #f7fafc; padding: 10px; border-radius: 4px; }
                    .param { display: inline-block; margin-right: 20px; color: #4a5568; }
                </style>
            </head>
            <body>
                <h1>METAR/TAF Отчёт</h1>
                <p>Дата: ${new Date().toLocaleString('ru-RU')}</p>
                <p>Точка поиска: ${this.searchCenter?.name || '—'} (${this.searchCenter?.lat.toFixed(4)}, ${this.searchCenter?.lon.toFixed(4)})</p>
                <p>Радиус: ${this.searchRadiusKm} км</p>

                <h2>Аэропорты</h2>
                ${this.airportsWithData.filter(a => a.metar).map(a => `
                    <div class="airport">
                        <h3>${a.icao} — ${a.name || a.city}</h3>
                        <p>Расстояние: ${Math.round(a.distance)} км</p>
                        <div class="metar">METAR: ${a.metar.raw || 'Нет данных'}</div>
                        <p style="margin-top: 10px;">
                            <span class="param">🌡️ ${a.metar.temp}°C</span>
                            <span class="param">💨 ${a.metar.windDir}° @ ${a.metar.windSpeed} м/с</span>
                            <span class="param">👁️ ${this.formatVisibility(a.metar.visibility)}</span>
                            <span class="param">📊 ${a.metar.qnh} гПа</span>
                        </p>
                    </div>
                `).join('')}
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();
    },

    /**
     * После рендеринга
     */
    afterRender() {
        // Автоматическая загрузка при первом открытии
        if (!this.hasLoaded && this.airportsWithData.length === 0) {
            this.hasLoaded = true;
            console.log('🔄 Автоматическая загрузка METAR...');
            setTimeout(() => this.loadMetarData(), 500);
        }
        
        console.log('✅ Вкладка METAR/TAF отрисована');
    },

    /**
     * Инициализация (вызывается при загрузке страницы)
     */
    init() {
        console.log('✅ DashboardTabsMetarTaf инициализирован');
    }
};

// Экспорт модуля
if (typeof window !== 'undefined') {
    window.DashboardTabsMetarTaf = DashboardTabsMetarTaf;
    
    // Автоинициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DashboardTabsMetarTaf.init());
    } else {
        DashboardTabsMetarTaf.init();
    }
}
