/**
 * Проверка погоды через Open-Meteo API
 * Альтернатива NOAA когда FTP недоступен
 * 
 * Документация: https://open-meteo.com/
 */

const https = require('https');

// Аэропорты
const AIRPORTS = {
    'USSS': { name: 'Екатеринбург (Кольцово)', lat: 56.7431, lon: 60.8027 },
    'USUU': { name: 'Курган', lat: 55.4753, lon: 65.4156 },
    'UUEE': { name: 'Москва (Шереметьево)', lat: 55.9726, lon: 37.4146 },
    'ULLI': { name: 'Санкт-Петербург (Пулково)', lat: 59.8003, lon: 30.2625 }
};

/**
 * Запрос к Open-Meteo API
 */
function getWeather(lat, lon) {
    return new Promise((resolve, reject) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,visibility&timezone=auto`;
        
        https.get(url, {
            timeout: 15000,
            headers: { 'User-Agent': 'MIRA-Meteorology/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error('JSON parse error'));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Расшифровка WMO кодов погоды
 */
function decodeWeatherCode(code) {
    const codes = {
        0: 'Ясно',
        1: 'Преимущественно ясно',
        2: 'Переменная облачность',
        3: 'Пасмурно',
        45: 'Туман',
        48: 'Туман с инеем',
        51: 'Морось: лёгкая',
        53: 'Морось: умеренная',
        55: 'Морось: плотная',
        61: 'Дождь: слабый',
        63: 'Дождь: умеренный',
        65: 'Дождь: сильный',
        66: 'Переохлаждённый дождь: слабый',
        67: 'Переохлаждённый дождь: сильный',
        71: 'Снег: слабый',
        73: 'Снег: умеренный',
        75: 'Снег: сильный',
        77: 'Снежные зёрна',
        80: 'Ливень: слабый',
        81: 'Ливень: умеренный',
        82: 'Ливень: сильный',
        85: 'Снежный ливень: слабый',
        86: 'Снежный ливень: сильный',
        95: 'Гроза',
        96: 'Гроза с градом',
        99: 'Гроза с сильным градом'
    };
    return codes[code] || `Неизвестно (${code})`;
}

/**
 * Основная функция
 */
async function checkWeather() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         Погода — Open-Meteo API                           ║');
    console.log('║         https://api.open-meteo.com/                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    for (const [icao, airport] of Object.entries(AIRPORTS)) {
        console.log(`\n🛫 ${airport.name} (${icao})`);
        console.log(`   Координаты: ${airport.lat}°N, ${airport.lon}°E`);
        
        try {
            const data = await getWeather(airport.lat, airport.lon);
            const current = data.current;
            
            console.log(`   ────────────────────────────────────────`);
            console.log(`   Время:       ${current.time.replace('T', ' ')}`);
            console.log(`   Температура: ${current.temperature_2m}°C`);
            console.log(`   Влажность:   ${current.relative_humidity_2m}%`);
            console.log(`   Погода:      ${decodeWeatherCode(current.weather_code)}`);
            console.log(`   Ветер:       ${current.wind_speed_10m} м/с, ${current.wind_direction_10m}°`);
            console.log(`   Видимость:   ${current.visibility ? `${current.visibility / 1000} км` : '—'}`);
            
        } catch (error) {
            console.log(`   ❌ Ошибка: ${error.message}`);
        }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
}

checkWeather().catch(console.error);
