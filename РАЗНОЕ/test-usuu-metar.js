/**
 * Проверка METAR для Кургана (USUU) через NOAA FTP
 * https://tgftp.nws.noaa.gov/data/observations/metar/stations/USUU.TXT
 */

const https = require('https');
const fs = require('fs');

const ICAO = 'USUU';
const NOAA_FTP = 'https://tgftp.nws.noaa.gov/data/observations/metar/stations';

function getMetar(icao) {
    return new Promise((resolve, reject) => {
        const url = `${NOAA_FTP}/${icao}.TXT`;
        console.log(`📡 Запрос: ${url}`);
        
        https.get(url, { 
            timeout: 15000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/plain'
            }
        }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                console.log(`↪️  Редирект: ${res.headers.location}`);
                https.get(res.headers.location, { timeout: 10000 }, (r) => {
                    let data = '';
                    r.on('data', c => data += c);
                    r.on('end', () => resolve({ status: r.statusCode, data }));
                }).on('error', reject);
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        }).on('error', reject);
    });
}

function parseMetar(rawText) {
    // Пример: METAR USUU 041200Z 26005MPS 9999 FEW020 SCT100 M02/M08 Q1020 NOSIG
    const parts = rawText.trim().split(/\s+/);
    
    const result = {
        raw: rawText.trim(),
        station: null,
        time: null,
        wind: null,
        visibility: null,
        weather: [],
        clouds: [],
        temperature: null,
        dewpoint: null,
        pressure: null
    };
    
    for (const part of parts) {
        // Станция
        if (/^[A-Z]{4}$/.test(part)) {
            result.station = part;
        }
        // Время (041200Z)
        else if (/^\d{6}Z$/.test(part)) {
            result.time = part;
        }
        // Ветер (26005MPS, 26005MPS 240V300)
        else if (/^\d{5}(MPS|KT|KMH)/.test(part)) {
            const dir = part.substring(0, 3);
            const speed = part.substring(3, 5);
            const unit = part.match(/(MPS|KT|KMH)/)[1];
            result.wind = { direction: dir, speed, unit };
        }
        // Видимость (9999, 10SM, 0200)
        else if (/^(\d{4}|[0-9]+SM)$/.test(part)) {
            result.visibility = part;
        }
        // Температура/точка росы (M02/M08, 05/02)
        else if (/^-?M?\d{2}\/-?M?\d{2}$/.test(part)) {
            const [temp, dew] = part.split('/');
            result.temperature = temp.replace('M', '-');
            result.dewpoint = dew.replace('M', '-');
        }
        // Давление (Q1020, A3012)
        else if (/^[QA]\d{4}$/.test(part)) {
            result.pressure = part;
        }
        // Облачность (FEW020, SCT100, BKN030, OVC050)
        else if (/^(FEW|SCT|BKN|OVC|CLR|NSC|NCD)\d{3}(\/[A-Z]{3})?/.test(part)) {
            result.clouds.push(part);
        }
        // Погодные явления (RA, SN, TSRA, FZRA, BR, FG)
        else if (/^[A-Z]{2,4}$/.test(part) && !['NOSIG', 'TEMPO', 'BECMG', 'FM', 'TL', 'AT'].includes(part)) {
            result.weather.push(part);
        }
    }
    
    return result;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('           METAR для Кургана (USUU)');
    console.log('═══════════════════════════════════════════════════════\n');
    
    try {
        const response = await getMetar(ICAO);
        
        console.log(`\n📊 Статус HTTP: ${response.status}`);
        console.log(`📄 Данные:\n${response.data}`);
        
        if (response.status === 200 && response.data) {
            const lines = response.data.trim().split('\n').filter(l => l.trim());
            const lastMetar = lines[lines.length - 1];
            
            console.log('\n───────────────────────────────────────────────────');
            console.log('Последний METAR:');
            console.log('───────────────────────────────────────────────────');
            console.log(lastMetar);
            
            const parsed = parseMetar(lastMetar);
            console.log('\n───────────────────────────────────────────────────');
            console.log('Расшифровка:');
            console.log('───────────────────────────────────────────────────');
            console.log(`Станция:     ${parsed.station}`);
            console.log(`Время:       ${parsed.time}`);
            console.log(`Ветер:       ${parsed.wind ? `${parsed.wind.direction}° ${parsed.wind.speed}${parsed.wind.unit}` : '—'}`);
            console.log(`Видимость:   ${parsed.visibility || '—'}`);
            console.log(`Температура: ${parsed.temperature ? `${parsed.temperature}°C` : '—'}`);
            console.log(`Точка росы:  ${parsed.dewpoint ? `${parsed.dewpoint}°C` : '—'}`);
            console.log(`Давление:    ${parsed.pressure || '—'}`);
            console.log(`Облачность:  ${parsed.clouds.length > 0 ? parsed.clouds.join(', ') : '—'}`);
            console.log(`Явления:     ${parsed.weather.length > 0 ? parsed.weather.join(', ') : '—'}`);
        } else {
            console.log('\n❌ METAR не найден для USUU');
        }
    } catch (error) {
        console.log(`\n❌ Ошибка: ${error.message}`);
        console.log('\n💡 Совет: Проверьте доступность NOAA FTP сервера');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
}

main();
