/**
 * MIRA - METAR/TAF Module
 * Получение и парсинг авиационных метеорологических данных
 * Источник: NOAA Aviation Weather API
 * 
 * Документация API: https://aviationweather.gov/api
 */

const MetarTafModule = {
    /**
     * Базовый URL NOAA Aviation Weather API
     * Используем CORS-прокси для обхода ограничений
     */
    API_BASE: 'https://aviationweather.gov/api/data',

    /**
     * METARTAF.RU API - основной источник для РФ
     * Прямой доступ без CORS проблем
     */
    METARTAF_BASE: 'https://metartaf.ru',

    /**
     * CORS прокси (альтернативные варианты)
     */
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://thingproxy.freeboard.io/fetch/',
        'https://proxy.cors.sh/',
        'https://cors-anywhere.herokuapp.com/',
        'https://cors.bridged.cc/'
    ],

    /**
     * Альтернативный API с CORS поддержкой
     * CheckWX API - бесплатный тариф: 50 запросов/день
     */
    CHECKWX_API: 'https://api.checkwx.com/metar',

    /**
     * API ключ для CheckWX (опционально)
     * Зарегистрируйтесь на https://www.checkwx.com/api для получения ключа
     */
    CHECKWX_API_KEY: '',

    /**
     * Приоритет источников (первый - основной)
     */
    SOURCE_PRIORITY: ['metartaf', 'noaa', 'checkwx'],

    /**
     * База аэропортов
     */
    airportsDB: null,

    /**
     * Список аэропортов доступных на METARTAF.RU
     * Обновляется автоматически при первом запросе
     */
    metartafAirports: new Set([
        // Основные аэропорты России (будет дополнено)
        'UUEE', 'UUDD', 'UUWW', 'UUBW', // Москва
        'ULLI', // Санкт-Петербург
        'UWKD', // Казань
        'UWKE', // Бегишево (Набережные Челны)
        'URSS', // Сочи
        'URKK', // Краснодар
        'USPP', // Пермь
        'USSS', // Екатеринбург
        'UNNT', // Новосибирск
        'USTR', // Тюмень
        'UNKL', // Красноярск
        'UHWW', // Владивосток
        'UHHH', // Хабаровск
        'UIII', // Иркутск
        'UWUU', // Уфа
        'UWWW', // Самара
        'URMM', // Минеральные Воды
        'URRP', // Ростов-на-Дону
        'USCC', // Челябинск
        'UUOB', // Белгород
        'UUOO', // Воронеж
        'UMKK', // Калининград
        'ULMM', // Мурманск
        'ULAA', // Архангельск
        'UEEE', // Якутск
        'UERR', // Мирный
        'UOOO', // Норильск
        'UHPP', // Петропавловск-Камчатский
        'UHSS', // Южно-Сахалинск
        'UHMM'  // Магадан
    ]),

    /**
     * Проверка доступности аэропорта на METARTAF.RU
     */
    isMetartafAirport(icao) {
        return this.metartafAirports.has(icao.toUpperCase());
    },
    
    /**
     * Добавление аэропорта в список METARTAF.RU (при успешном запросе)
     */
    addMetartafAirport(icao) {
        this.metartafAirports.add(icao.toUpperCase());
        console.log(`✅ ${icao} добавлен в список METARTAF.RU`);
    },
    
    /**
     * Кэш данных
     */
    cache: {
        metar: {},
        taf: {},
        airports: null
    },

    /**
     * Инициализация модуля
     */
    async init() {
        console.log('✅ MetarTafModule инициализирован');
        this.loadCache();
        await this.loadAirportsDB();
    },

    /**
     * Загрузка базы аэропортов
     */
    async loadAirportsDB() {
        try {
            // Проверяем кэш
            const cached = this.cache.airports;
            if (cached && cached.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000) {
                this.airportsDB = cached.data;
                console.log('📥 База аэропортов загружена из кэша:', this.airportsDB.length, 'аэропортов');
                return;
            }

            // Загружаем из файла
            console.log('📡 Загрузка базы аэропортов...');
            const response = await fetch('airports.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.airportsDB = data.airports || [];
            
            // Кэшируем на 7 дней
            this.cache.airports = {
                data: this.airportsDB,
                timestamp: Date.now()
            };
            
            console.log('✅ База аэропортов загружена:', this.airportsDB.length, 'аэропортов');
        } catch (error) {
            console.error('❌ Ошибка загрузки базы аэропортов:', error.message);
            // Используем резервный список
            this.airportsDB = this.getBackupAirports();
        }
    },

    /**
     * Резервный список аэропортов (если airports.json недоступен)
     */
    getBackupAirports() {
        return [
            { icao: 'UUDD', name: 'Домодедово', city: 'Москва', latitude: 55.4088, longitude: 37.9063 },
            { icao: 'UUEE', name: 'Шереметьево', city: 'Москва', latitude: 55.9726, longitude: 37.4146 },
            { icao: 'UUWW', name: 'Внуково', city: 'Москва', latitude: 55.5915, longitude: 37.2615 },
            { icao: 'ULLI', name: 'Пулково', city: 'Санкт-Петербург', latitude: 59.8003, longitude: 30.2625 },
            { icao: 'URSS', name: 'Сочи', city: 'Сочи', latitude: 43.4492, longitude: 39.9566 },
            { icao: 'URKK', name: 'Пашковский', city: 'Краснодар', latitude: 45.0347, longitude: 39.1705 },
            { icao: 'USPP', name: 'Большое Савино', city: 'Пермь', latitude: 57.9145, longitude: 56.0212 },
            { icao: 'USSS', name: 'Кольцово', city: 'Екатеринбург', latitude: 56.7431, longitude: 60.8027 },
            { icao: 'UNNT', name: 'Толмачёво', city: 'Новосибирск', latitude: 55.0126, longitude: 82.6507 }
        ];
    },

    /**
     * Загрузка из кэша
     */
    loadCache() {
        try {
            const cached = localStorage.getItem('mira_metar_taf_cache');
            if (cached) {
                this.cache = JSON.parse(cached);
                console.log('📥 METAR/TAF кэш загружен');
            }
        } catch (e) {
            console.error('Ошибка загрузки кэша METAR/TAF:', e);
        }
    },

    /**
     * Сохранение в кэш
     */
    saveCache() {
        try {
            localStorage.setItem('mira_metar_taf_cache', JSON.stringify(this.cache));
        } catch (e) {
            console.error('Ошибка сохранения кэша METAR/TAF:', e);
        }
    },

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache = { metar: {}, taf: {} };
        this.saveCache();
        console.log('🗑️ METAR/TAF кэш очищен');
    },

    // ============================================
    // METAR функции
    // ============================================

    /**
     * Получить METAR для аэропорта
     * @param {string} icao - ICAO код аэропорта (например, UUDD)
     * @returns {Promise<Object>} - Распарсенные METAR данные
     */
    async getMetar(icao) {
        const cacheKey = icao.toUpperCase();

        // Проверка кэша (15 минут)
        const cached = this.cache.metar[cacheKey];
        if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
            console.log(`📥 METAR из кэша: ${cacheKey}`);
            return cached.data;
        }

        // Пробуем разные источники по приоритету
        let data = null;

        // 1. METARTAF.RU - основной источник для РФ (только если аэропорт доступен)
        if (this.isMetartafAirport(cacheKey)) {
            try {
                data = await this.fetchMetarMetartaf(cacheKey);
                // Успешно - добавляем в список
                this.addMetartafAirport(cacheKey);
            } catch (e) {
                console.warn(`METARTAF.RU failed for ${cacheKey}:`, e.message);
                // Не удалось - возможно аэропорта нет в базе
            }
        } else {
            console.log(`ℹ️ ${cacheKey} не в списке METARTAF.RU, пропускаем`);
        }

        // 2. CheckWX API (если есть ключ)
        if (!data && this.CHECKWX_API_KEY) {
            try {
                data = await this.fetchMetarCheckWX(cacheKey);
            } catch (e) {
                console.warn('CheckWX API failed, trying NOAA with proxy:', e.message);
            }
        }

        // 3. NOAA через CORS-прокси
        if (!data) {
            data = await this.fetchMetarNOAAWithProxy(cacheKey);
        }

        if (!data || data.length === 0) {
            throw new Error('METAR не найден');
        }

        // Парсим первый (последний по времени) METAR
        const rawMetar = typeof data[0] === 'string' ? data[0] : data[0].rawOb;
        const parsed = this.parseMetar(rawMetar);
        
        // Сохраняем в кэш
        this.cache.metar[cacheKey] = {
            data: parsed,
            timestamp: Date.now(),
            raw: rawMetar
        };
        this.saveCache();

        return parsed;
    },

    /**
     * Получить METAR через CheckWX API
     */
    async fetchMetarCheckWX(icao) {
        const url = `${this.CHECKWX_API}/${icao}`;
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-Key': this.CHECKWX_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`CheckWX HTTP ${response.status}`);
        }
        
        const result = await response.json();
        return result.data || [];
    },

    /**
     * Получить METAR через METARTAF.RU
     * Парсинг HTML страницы аэропорта
     */
    async fetchMetarMetartaf(icao) {
        const url = `${this.METARTAF_BASE}/${icao}`;

        // Список CORS-прокси (по порядку)
        const proxyServices = [
            // Пытаемся сделать прямой запрос (некоторые браузеры разрешают)
            { name: 'direct', url: url, direct: true },
            // Альтернативные прокси
            { name: 'allorigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
            { name: 'corsproxy', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
            { name: 'thingproxy', url: `https://thingproxy.freeboard.io/fetch/${url}` },
            { name: 'proxybridge', url: `https://proxybridge.zuplo.io/?url=${encodeURIComponent(url)}` },
            // Локальный прокси (если есть)
            { name: 'local', url: `/api/metartaf/${icao}`, local: true }
        ];

        // Пытаемся через каждый прокси по очереди
        for (const proxy of proxyServices) {
            try {
                console.log(`🔍 METARTAF.RU: Запрос для ${icao} через ${proxy.name}`);
                
                const response = await fetch(proxy.url, {
                    timeout: 10000,
                    headers: proxy.direct ? {
                        'Accept': 'application/json',
                        'User-Agent': 'MIRA/0.2.0'
                    } : {}
                });

                if (!response.ok) {
                    throw new Error(`${proxy.name} HTTP ${response.status}`);
                }

                const html = await response.text();
                
                // Проверка на пустой ответ
                if (html.length < 50) {
                    throw new Error(`${proxy.name}: Пустой ответ`);
                }

                console.log(`📄 METARTAF.RU: Успешно (${proxy.name}), размер: ${html.length} байт`);

                // Проверка на 404 (аэропорт не найден)
                if (html.includes('404') && (html.includes('не найден') || html.includes('Not Found'))) {
                    throw new Error(`Аэропорт ${icao} не найден на METARTAF.RU`);
                }

                // Парсим HTML для извлечения METAR и TAF
                const metarRaw = this.extractMetarFromHtml(html);
                const tafRaw = this.extractTafFromHtml(html);

                console.log(`📝 METARTAF.RU: METAR извлечён: ${metarRaw ? '✅' : '❌'}, TAF: ${tafRaw ? '✅' : '❌'}`);
                if (metarRaw) console.log(`   METAR: ${metarRaw.substring(0, 80)}...`);
                if (tafRaw) console.log(`   TAF: ${tafRaw.substring(0, 80)}...`);

                if (!metarRaw && !tafRaw) {
                    throw new Error('Не удалось извлечь METAR/TAF из HTML');
                }

                // Возвращаем массив сырых данных
                const result = [];
                if (metarRaw) result.push({ rawOb: metarRaw });
                if (tafRaw) result.push({ rawTAF: tafRaw });

                return result;
            } catch (error) {
                console.warn(`⚠️ ${proxy.name} не удался: ${error.message}`);
                // Продолжаем следующую попытку
            }
        }
        
        // Все прокси не удались
        throw new Error('Все CORS-прокси не доступны. Попробуйте позже или используйте локальный сервер.');
    },
    
    /**
     * Извлечь METAR из HTML metartaf.ru
     */
    extractMetarFromHtml(html) {
        // Вариант 1: Ищем полный METAR в тексте
        // Формат: METAR UUUU DDHHMMZ ...
        const metarMatch = html.match(/(METAR\s+[A-Z]{4}\s+\d{6}Z\s+[^\n<]+)/i);
        if (metarMatch) {
            return metarMatch[1].trim();
        }
        
        // Вариант 2: Поиск по паттерну аэропорт + время + погода
        const airportTimeMatch = html.match(/([A-Z]{4}\s+\d{6}Z\s+(?:[A-Z0-9\s\/\-]+?))(?:NOSIG|RMK|$)/i);
        if (airportTimeMatch) {
            return 'METAR ' + airportTimeMatch[1].trim();
        }
        
        // Вариант 3: Поиск в data-атрибутах
        const dataMetarMatch = html.match(/data-metar=["']([^"']+)["']/i);
        if (dataMetarMatch) {
            return dataMetarMatch[1].trim();
        }
        
        // Вариант 4: Поиск в JSON объекте (если есть)
        const jsonMatch = html.match(/"metar"\s*:\s*"([^"]+)"/i);
        if (jsonMatch) {
            return jsonMatch[1].replace(/\\n/g, ' ').trim();
        }
        
        // Вариант 5: Поиск после слова "METAR" в тексте
        const afterMetarMatch = html.match(/METAR\s+([A-Z]{4}\s+\d{6}Z\s+[A-Z0-9\s\/\-]+)/i);
        if (afterMetarMatch) {
            return 'METAR ' + afterMetarMatch[1].trim();
        }
        
        return null;
    },
    
    /**
     * Извлечь TAF из HTML metartaf.ru
     */
    extractTafFromHtml(html) {
        // Вариант 1: Ищем полный TAF в тексте
        const tafMatch = html.match(/(TAF\s+[A-Z]{4}\s+\d{6}Z\s+\d{4}\/\d{4}\s+[^\n<]+)/i);
        if (tafMatch) {
            return tafMatch[1].trim();
        }
        
        // Вариант 2: Поиск по паттерну TAF с периодами
        const tafPattern = html.match(/(TAF\s+[A-Z]{4}\s+\d{6}Z\s+\d{4}\/\d{4}\s+(?:[\s\S]{1,500}?))(?:<|$)/i);
        if (tafPattern) {
            return tafPattern[1].trim();
        }
        
        // Вариант 3: Поиск в data-атрибутах
        const dataTafMatch = html.match(/data-taf=["']([^"']+)["']/i);
        if (dataTafMatch) {
            return dataTafMatch[1].trim();
        }
        
        // Вариант 4: Поиск в JSON объекте
        const jsonMatch = html.match(/"taf"\s*:\s*"([^"]+)"/i);
        if (jsonMatch) {
            return jsonMatch[1].replace(/\\n/g, ' ').trim();
        }
        
        // Вариант 5: Поиск после слова "TAF" в тексте
        const afterTafMatch = html.match(/TAF\s+([A-Z]{4}\s+\d{6}Z\s+\d{4}\/\d{4}\s+[\s\S]{1,300}?)(?:<|$)/i);
        if (afterTafMatch) {
            return 'TAF ' + afterTafMatch[1].trim();
        }
        
        return null;
    },

    /**
     * Получить METAR через NOAA с CORS-прокси
     */
    async fetchMetarNOAAWithProxy(icao) {
        const url = `${this.API_BASE}/metar?ids=${icao}&format=raw`;
        
        // Пробуем каждый прокси по очереди
        for (const proxy of this.CORS_PROXIES) {
            try {
                console.log(`🔄 Попытка через прокси: ${proxy.substring(0, 40)}...`);
                const proxyUrl = proxy + encodeURIComponent(url);
                
                const response = await fetch(proxyUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Proxy HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log(`✅ Прокси сработал: ${proxy.substring(0, 30)}...`);
                return data;
            } catch (error) {
                console.warn(`Прокси не сработал: ${proxy.substring(0, 30)}... - ${error.message}`);
                // Пробуем следующий
            }
        }
        
        throw new Error('Все CORS-прокси не сработали');
    },

    /**
     * Получить METAR для нескольких аэропортов
     * @param {string[]} icaoList - Массив ICAO кодов
     * @returns {Promise<Object[]>} - Массив распарсенных METAR
     */
    async getMetarBulk(icaoList) {
        const results = [];
        
        for (const icao of icaoList) {
            try {
                const metar = await this.getMetar(icao);
                results.push({ icao, ...metar, error: null });
            } catch (error) {
                results.push({ icao, error: error.message });
            }
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    },

    /**
     * Парсинг METAR кода
     * @param {string} raw - Сырой METAR код
     * @returns {Object} - Распарсенные данные
     */
    parseMetar(raw) {
        const result = {
            raw: raw,
            icao: null,
            time: null,
            wind: {
                speed: 0,      // м/с
                direction: 0,  // градусы
                gust: null,    // м/с
                variable: false
            },
            visibility: {
                meters: 9999,  // метры
                km: 10         // километры
            },
            clouds: [],        // массив облаков
            temperature: null, // °C
            dewpoint: null,    // °C
            pressure: {
                hpa: null,     // гПа
                mmHg: null     // мм рт.ст.
            },
            weather: [],       // погодные явления
            flightCategory: null, // VFR/MVFR/IFR/LIFR
            remarks: null
        };

        // Удаляем METAR из начала и разбиваем на части
        let parts = raw.replace(/^METAR\s*/, '').trim().split(/\s+/);
        
        // ICAO код
        result.icao = parts[0];

        // Время наблюдения (DDHHMMZ)
        const timeMatch = parts[1]?.match(/(\d{2})(\d{2})(\d{2})Z/);
        if (timeMatch) {
            result.time = {
                day: parseInt(timeMatch[1]),
                hour: parseInt(timeMatch[2]),
                minute: parseInt(timeMatch[3]),
                utc: true
            };
        }

        // Ветер
        const windIndex = parts.findIndex(p => /^(\d{5}|VRB)/.test(p));
        if (windIndex !== -1) {
            const windStr = parts[windIndex];
            
            if (windStr.startsWith('VRB')) {
                result.wind.variable = true;
                result.wind.speed = parseInt(windStr.substring(3, 5)) * 0.514444; // узлы → м/с
            } else {
                result.wind.direction = parseInt(windStr.substring(0, 3)) * 10; // десятки градусов
                result.wind.speed = parseInt(windStr.substring(3, 5)) * 0.514444; // узлы → м/с
                
                // Порывы
                const gustMatch = windStr.match(/G(\d{2})/);
                if (gustMatch) {
                    result.wind.gust = parseInt(gustMatch[1]) * 0.514444;
                }
            }
            
            // Округляем до 1 знака
            result.wind.speed = Math.round(result.wind.speed * 10) / 10;
            if (result.wind.gust) {
                result.wind.gust = Math.round(result.wind.gust * 10) / 10;
            }
        }

        // Видимость
        const visIndex = parts.findIndex(p => /^(\d{4}|CAVOK|\/\/\/\/)$/i.test(p));
        if (visIndex !== -1) {
            const visStr = parts[visIndex].toUpperCase();
            
            if (visStr === 'CAVOK') {
                result.visibility.meters = 10000;
                result.visibility.km = 10;
            } else if (visStr === '////') {
                result.visibility.meters = 0;
                result.visibility.km = 0;
            } else if (visStr === '9999') {
                result.visibility.meters = 10000;
                result.visibility.km = 10;
            } else {
                // Видимость в метрах (4 цифры)
                const vis = parseInt(visStr) * 1000;
                result.visibility.meters = vis;
                result.visibility.km = Math.round(vis / 1000 * 10) / 10;
            }
        }

        // Облачность
        const cloudCodes = ['FEW', 'SCT', 'BKN', 'OVC', 'VV'];
        parts.forEach((part, i) => {
            const cloudMatch = part.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})/);
            if (cloudMatch) {
                result.clouds.push({
                    coverage: cloudMatch[1],
                    baseFeet: parseInt(cloudMatch[2]) * 100,
                    baseMeters: Math.round(parseInt(cloudMatch[2]) * 100 * 0.3048)
                });
            }
        });

        // Температура и точка росы
        const tempIndex = parts.findIndex(p => /^(-?\d{2})\/(-?\d{2}|\/\/)$/.test(p));
        if (tempIndex !== -1) {
            const tempStr = parts[tempIndex];
            const tempParts = tempStr.split('/');
            
            if (tempParts[0] !== '//') {
                result.temperature = parseInt(tempParts[0]);
            }
            
            if (tempParts[1] !== '//' && tempParts[1] !== undefined) {
                result.dewpoint = parseInt(tempParts[1]);
            }
        }

        // Давление (QNH)
        const pressureIndex = parts.findIndex(p => /^Q\d{4}$/.test(p));
        if (pressureIndex !== -1) {
            const qnh = parseInt(parts[pressureIndex].substring(1)); // гПа
            result.pressure.hpa = qnh;
            result.pressure.mmHg = Math.round(qnh * 0.750062);
        }

        // Погодные явления
        const weatherCodes = {
            '-RA': 'Слабый дождь',
            'RA': 'Дождь',
            '+RA': 'Сильный дождь',
            '-SN': 'Слабый снег',
            'SN': 'Снег',
            '+SN': 'Сильный снег',
            '-DZ': 'Слабая морось',
            'DZ': 'Морось',
            '+DZ': 'Сильная морось',
            'TS': 'Гроза',
            'VCSH': 'Ливни в окрестностях',
            'FG': 'Туман',
            'BR': 'Дымка',
            'HZ': 'Мгла',
            'DU': 'Пыль',
            'SA': 'Песок',
            'GR': 'Град',
            'GS': 'Мелкий град',
            'PL': 'Ледяной дождь',
            'UP': 'Неизвестные осадки',
            'SQ': 'Шквал',
            'FC': 'Торнадо/смерч'
        };

        parts.forEach(part => {
            // Ищем коды погоды
            for (const [code, description] of Object.entries(weatherCodes)) {
                if (part.includes(code)) {
                    result.weather.push({
                        code: code,
                        description: description,
                        intensity: code.startsWith('+') ? 'strong' : code.startsWith('-') ? 'light' : 'moderate'
                    });
                }
            }
        });

        // Категория полётов (VFR/MVFR/IFR/LIFR)
        result.flightCategory = this.calculateFlightCategory(
            result.visibility.km,
            result.clouds
        );

        // Замечания (REMARKS)
        const remarksIndex = parts.findIndex(p => p === 'RMK');
        if (remarksIndex !== -1) {
            result.remarks = parts.slice(remarksIndex + 1).join(' ');
        }

        return result;
    },

    /**
     * Расчёт категории полётов
     * @param {number} visibility - Видимость в км
     * @param {Array} clouds - Массив облаков
     * @returns {string} - VFR/MVFR/IFR/LIFR
     */
    calculateFlightCategory(visibility, clouds) {
        // Находим нижнюю границу значительной облачности (BKN или OVC)
        let ceiling = null;
        for (const cloud of clouds) {
            if (['BKN', 'OVC', 'VV'].includes(cloud.coverage)) {
                ceiling = cloud.baseFeet;
                break;
            }
        }

        // LIFR: видимость < 1.6 км ИЛИ потолок < 500 футов
        if (visibility < 1.6 || (ceiling && ceiling < 500)) {
            return 'LIFR';
        }

        // IFR: видимость 1.6-4.8 км ИЛИ потолок 500-1000 футов
        if (visibility < 4.8 || (ceiling && ceiling >= 500 && ceiling < 1000)) {
            return 'IFR';
        }

        // MVFR: видимость 4.8-8 км ИЛИ потолок 1000-3000 футов
        if (visibility < 8 || (ceiling && ceiling >= 1000 && ceiling < 3000)) {
            return 'MVFR';
        }

        // VFR: видимость ≥ 8 км и потолок ≥ 3000 футов
        return 'VFR';
    },

    // ============================================
    // TAF функции
    // ============================================

    /**
     * Получить TAF для аэропорта
     * @param {string} icao - ICAO код аэропорта
     * @returns {Promise<Object>} - Распарсенные TAF данные
     */
    async getTaf(icao) {
        const cacheKey = icao.toUpperCase();

        // Проверка кэша (30 минут)
        const cached = this.cache.taf[cacheKey];
        if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
            console.log(`📥 TAF из кэша: ${cacheKey}`);
            return cached.data;
        }

        // Пробуем разные источники по приоритету
        let data = null;

        // 1. METARTAF.RU - основной источник для РФ (только если аэропорт доступен)
        if (this.isMetartafAirport(cacheKey)) {
            try {
                data = await this.fetchMetarMetartaf(cacheKey);
                // Успешно - добавляем в список
                this.addMetartafAirport(cacheKey);
            } catch (e) {
                console.warn(`METARTAF.RU failed for ${cacheKey}:`, e.message);
            }
        } else {
            console.log(`ℹ️ ${cacheKey} не в списке METARTAF.RU, пропускаем`);
        }

        // 2. CheckWX API (если есть ключ)
        if (!data && this.CHECKWX_API_KEY) {
            try {
                data = await this.fetchTafCheckWX(cacheKey);
            } catch (e) {
                console.warn('CheckWX API failed, trying NOAA with proxy:', e.message);
            }
        }

        // 3. NOAA через CORS-прокси
        if (!data) {
            data = await this.fetchTafNOAAWithProxy(cacheKey);
        }

        if (!data || data.length === 0) {
            throw new Error('TAF не найден');
        }

        // Парсим TAF - источник может быть разный
        let rawTaf;
        if (typeof data[0] === 'string') {
            rawTaf = data[0];
        } else if (data[0].rawTAF) {
            rawTaf = data[0].rawTAF;
        } else if (data[1] && data[1].rawTAF) {
            // TAF может быть вторым элементом (после METAR)
            rawTaf = data[1].rawTAF;
        } else {
            throw new Error('Не удалось извлечь TAF');
        }
        
        const parsed = this.parseTaf(rawTaf);

        // Сохраняем в кэш
        this.cache.taf[cacheKey] = {
            data: parsed,
            timestamp: Date.now(),
            raw: rawTaf
        };
        this.saveCache();

        return parsed;
    },

    /**
     * Получить TAF через CheckWX API
     */
    async fetchTafCheckWX(icao) {
        const url = `https://api.checkwx.com/taf/${icao}`;
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-API-Key': this.CHECKWX_API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`CheckWX HTTP ${response.status}`);
        }
        
        const result = await response.json();
        return result.data || [];
    },

    /**
     * Получить TAF через NOAA с CORS-прокси
     */
    async fetchTafNOAAWithProxy(icao) {
        const url = `${this.API_BASE}/taf?ids=${icao}&format=raw`;
        
        // Пробуем каждый прокси по очереди
        for (const proxy of this.CORS_PROXIES) {
            try {
                console.log(`🔄 Попытка через прокси: ${proxy.substring(0, 40)}...`);
                const proxyUrl = proxy + encodeURIComponent(url);
                
                const response = await fetch(proxyUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Proxy HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log(`✅ Прокси сработал: ${proxy.substring(0, 30)}...`);
                return data;
            } catch (error) {
                console.warn(`Прокси не сработал: ${proxy.substring(0, 30)}... - ${error.message}`);
                // Пробуем следующий
            }
        }
        
        throw new Error('Все CORS-прокси не сработали');
    },

    /**
     * Парсинг TAF кода
     * @param {string} raw - Сырой TAF код
     * @returns {Object} - Распарсенные данные
     */
    parseTaf(raw) {
        const result = {
            raw: raw,
            icao: null,
            issueTime: null,
            validTime: {
                from: null,
                to: null
            },
            forecast: [] // массив периодов прогноза
        };

        // Удаляем TAF из начала
        let tafText = raw.replace(/^TAF\s*/, '').trim();
        
        // ICAO код (первое слово)
        const parts = tafText.split(/\s+/);
        result.icao = parts[0];

        // Время выпуска (DDHHMMZ)
        const issueMatch = parts[1]?.match(/(\d{2})(\d{2})(\d{2})Z/);
        if (issueMatch) {
            result.issueTime = {
                day: parseInt(issueMatch[1]),
                hour: parseInt(issueMatch[2]),
                minute: parseInt(issueMatch[3]),
                utc: true
            };
        }

        // Срок действия (DDHH/DDHH)
        const validMatch = parts[2]?.match(/(\d{2})(\d{2})\/(\d{2})(\d{2})/);
        if (validMatch) {
            result.validTime = {
                from: {
                    day: parseInt(validMatch[1]),
                    hour: parseInt(validMatch[2]),
                    utc: true
                },
                to: {
                    day: parseInt(validMatch[3]),
                    hour: parseInt(validMatch[4]),
                    utc: true
                }
            };
        }

        // Парсим периоды прогноза
        result.forecast = this.parseTafPeriods(tafText);

        return result;
    },

    /**
     * Парсинг периодов TAF
     * @param {string} tafText - Текст TAF
     * @returns {Array} - Массив периодов
     */
    parseTafPeriods(tafText) {
        const periods = [];
        
        // Разбиваем на периоды по ключевым словам
        const periodKeywords = ['FM', 'TEMPO', 'BECMG', 'PROB'];
        
        // Находим все позиции ключевых слов
        let currentPosition = 0;
        const markers = [];
        
        for (const keyword of periodKeywords) {
            let index = tafText.indexOf(` ${keyword}`);
            while (index !== -1) {
                markers.push({ index, keyword });
                index = tafText.indexOf(` ${keyword}`, index + 1);
            }
        }
        
        // Сортируем по позиции
        markers.sort((a, b) => a.index - b.index);
        
        // Базовый период (до первого маркера)
        const basePeriod = {
            type: 'BASE',
            time: { from: null, to: null },
            wind: { speed: 0, direction: 0, gust: null },
            visibility: { km: 10 },
            weather: [],
            clouds: [],
            probability: null
        };
        
        // Парсим базовый период
        const baseEnd = markers.length > 0 ? markers[0].index : tafText.length;
        const baseText = tafText.substring(0, baseEnd);
        this.parseTafPeriodData(baseText, basePeriod);
        periods.push(basePeriod);
        
        // Парсим остальные периоды
        for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            const nextMarker = markers[i + 1];
            
            const periodStart = marker.index;
            const periodEnd = nextMarker ? nextMarker.index : tafText.length;
            const periodText = tafText.substring(periodStart, periodEnd);
            
            const period = {
                type: marker.keyword,
                time: { from: null, to: null },
                wind: { ...basePeriod.wind },
                visibility: { ...basePeriod.visibility },
                weather: [],
                clouds: [],
                probability: null
            };
            
            // Парсим данные периода
            this.parseTafPeriodData(periodText, period);
            periods.push(period);
        }
        
        return periods;
    },

    /**
     * Парсинг данных периода TAF
     * @param {string} periodText - Текст периода
     * @param {Object} period - Объект периода для заполнения
     */
    parseTafPeriodData(periodText, period) {
        const parts = periodText.split(/\s+/);
        
        // Время (FMDDHHMM или TEMPO DDHH/DDHH)
        for (const part of parts) {
            // FM (FROM)
            const fmMatch = part.match(/^FM(\d{2})(\d{2})(\d{2})$/);
            if (fmMatch) {
                period.time.from = {
                    day: parseInt(fmMatch[1]),
                    hour: parseInt(fmMatch[2]),
                    minute: parseInt(fmMatch[3]),
                    utc: true
                };
            }
            
            // TEMPO/BECMG время
            const tempoMatch = part.match(/^(\d{2})(\d{2})\/(\d{2})(\d{2})$/);
            if (tempoMatch && !period.time.from) {
                period.time.from = {
                    day: parseInt(tempoMatch[1]),
                    hour: parseInt(tempoMatch[2]),
                    utc: true
                };
                period.time.to = {
                    day: parseInt(tempoMatch[3]),
                    hour: parseInt(tempoMatch[4]),
                    utc: true
                };
            }
            
            // PROB30/PROB40
            const probMatch = part.match(/^PROB(\d{2})$/);
            if (probMatch) {
                period.probability = parseInt(probMatch[1]);
            }
        }
        
        // Ветер
        const windPart = parts.find(p => /^(\d{5}|VRB)/.test(p));
        if (windPart) {
            if (windPart.startsWith('VRB')) {
                period.wind.variable = true;
                period.wind.speed = parseInt(windPart.substring(3, 5)) * 0.514444;
            } else {
                period.wind.direction = parseInt(windPart.substring(0, 3)) * 10;
                period.wind.speed = parseInt(windPart.substring(3, 5)) * 0.514444;
                
                const gustMatch = windPart.match(/G(\d{2})/);
                if (gustMatch) {
                    period.wind.gust = parseInt(gustMatch[1]) * 0.514444;
                }
            }
            period.wind.speed = Math.round(period.wind.speed * 10) / 10;
            if (period.wind.gust) {
                period.wind.gust = Math.round(period.wind.gust * 10) / 10;
            }
        }
        
        // Видимость
        const visPart = parts.find(p => /^(\d{4}|CAVOK|9999)$/i.test(p));
        if (visPart) {
            if (visPart === 'CAVOK' || visPart === '9999') {
                period.visibility.km = 10;
            } else {
                period.visibility.km = parseInt(visPart) / 1000;
            }
        }
        
        // Погодные явления
        const weatherCodes = {
            '-RA': 'Слабый дождь',
            'RA': 'Дождь',
            '+RA': 'Сильный дождь',
            '-SN': 'Слабый снег',
            'SN': 'Снег',
            '+SN': 'Сильный снег',
            'TS': 'Гроза',
            'VCSH': 'Ливни в окрестностях',
            'FG': 'Туман',
            'BR': 'Дымка'
        };
        
        parts.forEach(part => {
            for (const [code, description] of Object.entries(weatherCodes)) {
                if (part.includes(code)) {
                    period.weather.push({
                        code: code,
                        description: description
                    });
                }
            }
        });
        
        // Облачность
        const cloudCodes = ['FEW', 'SCT', 'BKN', 'OVC', 'VV'];
        parts.forEach(part => {
            const cloudMatch = part.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})/);
            if (cloudMatch) {
                period.clouds.push({
                    coverage: cloudMatch[1],
                    baseFeet: parseInt(cloudMatch[2]) * 100,
                    baseMeters: Math.round(parseInt(cloudMatch[2]) * 100 * 0.3048)
                });
            }
        });
    },

    /**
     * Конвертация TAF в почасовые данные (для интеграции с MIRA)
     * @param {Object} taf - Распарсенный TAF
     * @returns {Array} - Массив почасовых данных
     */
    tafToHourly(taf) {
        const hourly = [];
        
        if (!taf.validTime.from || !taf.forecast.length) {
            return hourly;
        }
        
        // Определяем диапазон часов
        const startDay = taf.validTime.from.day;
        const startHour = taf.validTime.from.hour;
        const endDay = taf.validTime.to.day;
        const endHour = taf.validTime.to.hour;
        
        // Генерируем часы (упрощённо - в рамках одного дня)
        for (let hour = startHour; hour < 24; hour++) {
            // Находим соответствующий период
            const period = this.findTafPeriodForHour(taf.forecast, hour);
            
            if (period) {
                hourly.push({
                    time: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), startDay, hour)).toISOString(),
                    wind10m: period.wind.speed,
                    windDir: period.wind.direction,
                    windGust: period.wind.gust,
                    visibility: period.visibility.km,
                    weather: period.weather,
                    clouds: period.clouds,
                    source: 'TAF'
                });
            }
        }
        
        return hourly;
    },

    /**
     * Найти период TAF для указанного часа
     * @param {Array} forecasts - Массив периодов
     * @param {number} hour - Час (0-23)
     * @returns {Object|null} - Период или null
     */
    findTafPeriodForHour(forecasts, hour) {
        // Ищем период FM (FROM) для этого часа
        for (const forecast of forecasts) {
            if (forecast.type === 'BASE' || forecast.type === 'FM') {
                if (forecast.time.from && forecast.time.from.hour <= hour) {
                    return forecast;
                }
            }
        }
        return forecasts[0] || null;
    },

    // ============================================
    // Утилиты
    // ============================================

    /**
     * Форматирование METAR для отображения
     * @param {Object} metar - Распарсенный METAR
     * @returns {string} - Форматированный текст
     */
    formatMetar(metar) {
        const lines = [];
        
        lines.push(`🛫 ${metar.icao} — ${metar.time?.hour.toString().padStart(2, '0')}:${metar.time?.minute.toString().padStart(2, '0')} UTC`);
        lines.push('');
        
        // Ветер
        let windText = `💨 Ветер: ${metar.wind.speed} м/с`;
        if (metar.wind.direction) {
            windText += ` (${metar.wind.direction}°)`;
        }
        if (metar.wind.gust) {
            windText += `, порывы ${metar.wind.gust} м/с`;
        }
        if (metar.wind.variable) {
            windText = '💨 Ветер: переменный';
        }
        lines.push(windText);
        
        // Видимость
        lines.push(`👁️ Видимость: ${metar.visibility.km} км`);
        
        // Облачность
        if (metar.clouds.length > 0) {
            const cloudText = metar.clouds.map(c => {
                const coverage = {
                    'FEW': 'Мало',
                    'SCT': 'Разрежённая',
                    'BKN': 'Значительная',
                    'OVC': 'Сплошная',
                    'VV': 'Вертикальная видимость'
                }[c.coverage] || c.coverage;
                return `${coverage} (${c.baseMeters} м)`;
            }).join(', ');
            lines.push(`☁️ Облачность: ${cloudText}`);
        } else {
            lines.push('☀️ Ясно');
        }
        
        // Температура
        if (metar.temperature !== null) {
            lines.push(`🌡️ Температура: ${metar.temperature}°C`);
        }
        if (metar.dewpoint !== null) {
            lines.push(`💧 Точка росы: ${metar.dewpoint}°C`);
        }
        
        // Давление
        if (metar.pressure.hpa) {
            lines.push(`📊 Давление: ${metar.pressure.hpa} гПа (${metar.pressure.mmHg} мм рт.ст.)`);
        }
        
        // Погодные явления
        if (metar.weather.length > 0) {
            const weatherText = metar.weather.map(w => w.description).join(', ');
            lines.push(`🌦️ Явления: ${weatherText}`);
        }
        
        // Категория полётов
        const categoryColors = {
            'VFR': '🟢',
            'MVFR': '🟡',
            'IFR': '🟠',
            'LIFR': '🔴'
        };
        lines.push('');
        lines.push(`${categoryColors[metar.flightCategory] || '⚪'} ${metar.flightCategory || 'Не определено'}`);
        
        return lines.join('\n');
    },

    /**
     * Форматирование TAF для отображения
     * @param {Object} taf - Распарсенный TAF
     * @returns {string} - Форматированный текст
     */
    formatTaf(taf) {
        const lines = [];
        
        lines.push(`🛫 ${taf.icao}`);
        lines.push(`📅 Выпущен: ${taf.issueTime?.hour.toString().padStart(2, '0')}:${taf.issueTime?.minute.toString().padStart(2, '0')} UTC`);
        lines.push(`⏰ Действует: ${taf.validTime.from?.day.toString().padStart(2, '0')}${taf.validTime.from?.hour.toString().padStart(2, '0')}Z - ${taf.validTime.to?.day.toString().padStart(2, '0')}${taf.validTime.to?.hour.toString().padStart(2, '0')}Z`);
        lines.push('');
        
        taf.forecast.forEach((period, index) => {
            const typeIcons = {
                'BASE': '📋',
                'FM': '➡️',
                'TEMPO': '⚡',
                'BECMG': '🔄',
                'PROB': '❓'
            };
            
            const icon = typeIcons[period.type] || '•';
            let periodText = `${icon} `;
            
            if (period.probability) {
                periodText += `Вероятность ${period.probability}%: `;
            }
            
            if (period.time.from) {
                periodText += `${period.time.from.hour.toString().padStart(2, '0')}:00`;
                if (period.time.to) {
                    periodText += `-${period.time.to.hour.toString().padStart(2, '0')}:00`;
                }
                periodText += ' — ';
            }
            
            periodText += `${period.wind.speed} м/с`;
            if (period.wind.gust) {
                periodText += `, порывы ${period.wind.gust} м/с`;
            }
            periodText += `, видимость ${period.visibility.km} км`;
            
            if (period.weather.length > 0) {
                periodText += `, ${period.weather.map(w => w.description).join(', ')}`;
            }
            
            if (period.clouds.length > 0) {
                periodText += `, ${period.clouds.map(c => c.coverage).join(', ')}`;
            }
            
            lines.push(periodText);
        });
        
        return lines.join('\n');
    },

    /**
     * Поиск ближайших аэропортов с METAR/TAF по координатам
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @param {number} radiusKm - Радиус поиска (км)
     * @returns {Promise<Array>} - Массив аэропортов
     */
    async findNearbyAirports(lat, lon, radiusKm = 100) {
        // Ждём загрузки базы аэропортов если нужно
        if (!this.airportsDB) {
            await this.loadAirportsDB();
        }

        // Расчёт расстояния (формула гаверсинусов)
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Радиус Земли в км
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        // Расчёт пеленга (bearing) от точки до аэропорта
        const getBearing = (lat1, lon1, lat2, lon2) => {
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
            const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                      Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
            const bearing = Math.atan2(y, x) * 180 / Math.PI;
            return (bearing + 360) % 360;
        };

        // Фильтруем и сортируем по расстоянию
        const nearby = this.airportsDB
            .map(apt => ({
                icao: apt.icao,
                iata: apt.iata || null,
                name: apt.name,
                city: apt.city,
                latitude: apt.latitude,
                longitude: apt.longitude,
                distance: Math.round(getDistance(lat, lon, apt.latitude, apt.longitude) * 10) / 10,
                bearing: Math.round(getBearing(lat, lon, apt.latitude, apt.longitude))
            }))
            .filter(apt => apt.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance);

        console.log(`🔍 Найдено ${nearby.length} аэропортов в радиусе ${radiusKm} км`);

        return nearby;
    },

    /**
     * Поиск аэропорта по ICAO коду в базе
     * @param {string} icao - ICAO код
     * @returns {Object|null} - Аэропорт или null
     */
    findAirportByIcao(icao) {
        if (!this.airportsDB) {
            return null;
        }
        
        const upperIcao = icao.toUpperCase();
        return this.airportsDB.find(apt => apt.icao?.toUpperCase() === upperIcao) || null;
    },

    /**
     * Поиск аэропортов по городу
     * @param {string} city - Название города
     * @returns {Array} - Массив аэропортов
     */
    findAirportsByCity(city) {
        if (!this.airportsDB) {
            return [];
        }

        const lowerCity = city.toLowerCase();
        return this.airportsDB.filter(apt =>
            apt.city?.toLowerCase().includes(lowerCity)
        );
    },

    /**
     * Получить METAR для ближайших аэропортов в точке
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @param {number} radiusKm - Радиус поиска (км), по умолчанию 500
     * @param {number} maxCount - Максимум аэропортов, по умолчанию 12
     * @returns {Promise<Object>} - Результат с аэропортами и данными
     */
    async getMetarForPoint(lat, lon, radiusKm = 500, maxCount = 12) {
        console.log(`🔍 Запрос METAR для точки (${lat.toFixed(4)}, ${lon.toFixed(4)}), радиус ${radiusKm} км`);

        // 1. Находим ближайшие аэропорты
        const nearby = await this.findNearbyAirports(lat, lon, radiusKm);

        if (nearby.length === 0) {
            return {
                success: false,
                error: `Аэропорты не найдены в радиусе ${radiusKm} км`,
                airports: []
            };
        }

        // 2. Получаем METAR для каждого аэропорта (с ограничением параллельности)
        const airports = await this.getMetarBatch(nearby.slice(0, maxCount));

        // 3. Фильтруем те, где есть хоть какие-то данные
        const airportsWithData = airports.filter(a => a.metar || a.taf);

        // 4. Считаем статистику
        const currentMetars = airportsWithData.filter(a => a.metar && a.metarAge < 60);
        const oldMetars = airportsWithData.filter(a => a.metar && a.metarAge >= 60);

        console.log(`✅ Загружено METAR: ${airportsWithData.length} (актуальных: ${currentMetars.length}, устаревших: ${oldMetars.length})`);

        return {
            success: true,
            searchCenter: { lat, lon },
            searchRadiusKm: radiusKm,
            totalAirports: nearby.length,
            airports: airportsWithData,
            stats: {
                current: currentMetars.length,
                old: oldMetars.length,
                withTaf: airportsWithData.filter(a => a.taf).length
            }
        };
    },

    /**
     * Пакетное получение METAR для нескольких аэропортов
     * @param {Array} airports - Массив аэропортов
     * @param {number} maxParallel - Максимум параллельных запросов
     * @returns {Promise<Array>} - Аэропорты с данными METAR/TAF
     */
    async getMetarBatch(airports, maxParallel = 3) {
        const results = [];
        const queue = [...airports];
        const inProgress = new Map();

        return new Promise((resolve) => {
            const processNext = () => {
                if (queue.length === 0 && inProgress.size === 0) {
                    resolve(results);
                    return;
                }

                while (inProgress.size < maxParallel && queue.length > 0) {
                    const airport = queue.shift();
                    const promise = this.getMetarWithAge(airport.icao)
                        .then(result => {
                            results.push({
                                ...airport,
                                metar: result.metar,
                                metarAge: result.age,
                                taf: result.taf
                            });
                            inProgress.delete(airport.icao);
                            processNext();
                        })
                        .catch(error => {
                            console.warn(`⚠️ Ошибка METAR для ${airport.icao}:`, error.message);
                            results.push({
                                ...airport,
                                metar: null,
                                metarAge: null,
                                taf: null
                            });
                            inProgress.delete(airport.icao);
                            processNext();
                        });
                    inProgress.set(airport.icao, promise);
                }
            };

            processNext();
        });
    },

    /**
     * Получить METAR с возрастом данных
     * @param {string} icao - ICAO код
     * @returns {Promise<Object>} - { metar, age, taf }
     */
    async getMetarWithAge(icao) {
        const cacheKey = icao.toUpperCase();

        // Проверка кэша METAR
        let metar = null;
        let metarAge = null;

        const cachedMetar = this.cache.metar[cacheKey];
        if (cachedMetar && Date.now() - cachedMetar.timestamp < 60 * 60 * 1000) {
            metar = cachedMetar.data;
            metarAge = (Date.now() - cachedMetar.timestamp) / 60000; // минут
            console.log(`📥 METAR из кэша: ${cacheKey} (${Math.round(metarAge)} мин)`);
        } else {
            // Запрос нового METAR
            try {
                metar = await this.getMetar(cacheKey);
                const cached = this.cache.metar[cacheKey];
                if (cached) {
                    metarAge = (Date.now() - cached.timestamp) / 60000;
                }
            } catch (error) {
                console.warn(`❌ METAR не найден для ${cacheKey}`);
            }
        }

        // Проверка кэша TAF
        let taf = null;
        const cachedTaf = this.cache.taf[cacheKey];
        if (cachedTaf && Date.now() - cachedTaf.timestamp < 6 * 60 * 60 * 1000) {
            taf = cachedTaf.data;
            console.log(`📥 TAF из кэша: ${cacheKey}`);
        } else {
            // Запрос нового TAF
            try {
                taf = await this.getTaf(cacheKey);
            } catch (error) {
                // TAF может отсутствовать - это нормально
            }
        }

        return { metar, age: metarAge, taf };
    }
};

// Инициализация при загрузке
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MetarTafModule.init();
        });
    } else {
        MetarTafModule.init();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetarTafModule;
}

console.log('✅ MetarTafModule загружен');
