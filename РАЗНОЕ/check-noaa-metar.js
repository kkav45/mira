/**
 * Проверка METAR для аэропортов через NOAA FTP
 * ftp://tgftp.nws.noaa.gov/data/observations/metar/stations/
 * 
 * Использование: node check-noaa-metar.js [ICAO1] [ICAO2] ...
 * Пример: node check-noaa-metar.js USUU USSS
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const NOAA_FTP = 'https://tgftp.nws.noaa.gov/data/observations/metar/stations';

// Аэропорты для проверки (по умолчанию)
const DEFAULT_AIRPORTS = ['USUU', 'USSS'];

/**
 * Получение METAR с NOAA FTP
 */
function getMetar(icao) {
    return new Promise((resolve, reject) => {
        const url = `${NOAA_FTP}/${icao}.TXT`;
        
        const req = https.get(url, { 
            timeout: 15000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/plain'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ 
                    icao,
                    status: res.statusCode, 
                    data: data.trim(),
                    url 
                });
            });
        }).on('error', reject);
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

/**
 * Парсинг METAR
 */
function parseMetar(rawText) {
    if (!rawText) return null;
    
    const lines = rawText.trim().split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1];
    
    const parts = lastLine.split(/\s+/);
    const result = {
        raw: lastLine,
        station: null,
        time: null,
        wind: null,
        visibility: null,
        weather: [],
        clouds: [],
        temperature: null,
        dewpoint: null,
        pressure: null,
        flightCategory: null
    };
    
    for (const part of parts) {
        if (/^[A-Z]{4}$/.test(part)) result.station = part;
        else if (/^\d{6}Z$/.test(part)) result.time = part;
        else if (/^\d{5,6}(MPS|KT|KMH)(G\d{2,3})?/.test(part)) {
            const match = part.match(/^(\d{3})(\d{2,3})(MPS|KT|KMH)(G\d{2,3})?/);
            if (match) {
                result.wind = {
                    direction: match[1],
                    speed: match[2],
                    unit: match[3],
                    gust: match[4] ? match[4].replace('G', '') : null
                };
            }
        }
        else if (/^(\d{4}|[0-9]+SM)$/.test(part)) result.visibility = part;
        else if (/^-?M?\d{2}\/-?M?\d{2}$/.test(part)) {
            const [temp, dew] = part.split('/');
            result.temperature = parseInt(temp.replace('M', '-'));
            result.dewpoint = parseInt(dew.replace('M', '-'));
        }
        else if (/^[QA]\d{4}$/.test(part)) result.pressure = part;
        else if (/^(FEW|SCT|BKN|OVC|CLR|NSC|NCD)\d{3}/.test(part)) {
            const match = part.match(/^(FEW|SCT|BKN|OVC|CLR|NSC|NCD)(\d{3})/);
            if (match) {
                result.clouds.push({ cover: match[1], base: match[2] });
            }
        }
        else if (/^(CAVOK|NOSIG|TEMPO|BECMG|FM|TL|AT|PROB)/.test(part)) {
            // Служебные обозначения
        }
        else if (/^[A-Z]{2,4}$/.test(part)) {
            result.weather.push(part);
        }
    }
    
    // Определение категории полётов
    const vis = result.visibility;
    const ceiling = result.clouds.filter(c => ['BKN', 'OVC'].includes(c.cover));
    const ceilingHeight = ceiling.length > 0 ? Math.min(...ceiling.map(c => parseInt(c.base))) : 999;
    
    if (vis && (vis === '9999' || parseInt(vis) >= 10) && ceilingHeight > 50) {
        result.flightCategory = 'VFR';
    } else if (ceilingHeight >= 30 && ceilingHeight <= 50) {
        result.flightCategory = 'MVFR';
    } else if (ceilingHeight > 0 && ceilingHeight < 30) {
        result.flightCategory = 'IFR';
    } else if (ceilingHeight > 0 && ceilingHeight <= 10) {
        result.flightCategory = 'LIFR';
    }
    
    return result;
}

/**
 * Основная функция
 */
async function checkAirports(airports) {
    const results = [];
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║         METAR проверка — NOAA FTP                         ║');
    console.log('║         ftp://tgftp.nws.noaa.gov/data/.../stations/       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    for (const icao of airports) {
        console.log(`\n🔍 ${icao}...`);
        
        try {
            const response = await getMetar(icao);
            
            if (response.status === 200 && response.data) {
                const parsed = parseMetar(response.data);
                results.push({ icao, success: true, data: parsed, raw: response.data });
                
                console.log(`   ✅ METAR получен`);
                console.log(`   ${parsed.raw}`);
                console.log(`   ────────────────────────────────────────`);
                console.log(`   Время:       ${parsed.time || '—'}`);
                console.log(`   Ветер:       ${parsed.wind ? `${parsed.wind.direction}° ${parsed.wind.speed}${parsed.wind.unit}${parsed.wind.gust ? ' G' + parsed.wind.gust : ''}` : '—'}`);
                console.log(`   Видимость:   ${parsed.visibility || '—'}`);
                console.log(`   Температура: ${parsed.temperature !== null ? `${parsed.temperature}°C` : '—'}`);
                console.log(`   Точка росы:  ${parsed.dewpoint !== null ? `${parsed.dewpoint}°C` : '—'}`);
                console.log(`   Давление:    ${parsed.pressure || '—'}`);
                console.log(`   Облачность:  ${parsed.clouds.length > 0 ? parsed.clouds.map(c => `${c.cover}${c.base}`).join(', ') : '—'}`);
                console.log(`   Явления:     ${parsed.weather.length > 0 ? parsed.weather.join(', ') : '—'}`);
                console.log(`   Категория:   ${parsed.flightCategory || '—'}`);
            } else {
                results.push({ icao, success: false, error: `Status ${response.status}` });
                console.log(`   ❌ Нет данных (HTTP ${response.status})`);
            }
        } catch (error) {
            results.push({ icao, success: false, error: error.message });
            console.log(`   ❌ Ошибка: ${error.message}`);
        }
    }
    
    // Сохранение результатов
    const outputFile = path.join(__dirname, `metar-results-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Результаты сохранены: ${outputFile}`);
    
    // Статистика
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`Всего: ${airports.length} | Успешно: ${success} | Ошибок: ${failed}`);
    console.log(`═══════════════════════════════════════════════════════`);
    
    return results;
}

// Запуск
const airportsToCheck = process.argv.length > 2 
    ? process.argv.slice(2).map(a => a.toUpperCase())
    : DEFAULT_AIRPORTS;

checkAirports(airportsToCheck).catch(console.error);
