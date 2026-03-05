/**
 * Проверка доступности METAR для аэропортов через metartaf.ru API
 * (альернатива NOAA API, который недоступен)
 * 
 * API: https://metartaf.ru/{ICAO}.json
 * 
 * Использование:
 *   node check-metar-with-library.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const AIRPORTS_FILE = './airports.json';
const BACKUP_PREFIX = 'airports.backup';
const DELAY_MS = 200; // Задержка между запросами (ms) - уменьшено для скорости

/**
 * Проверка METAR через metartaf.ru API
 * @param {string} icao - ICAO код аэропорта
 * @returns {Promise<boolean>} - true если METAR доступен
 */
function checkMetarSingle(icao) {
    return new Promise((resolve, reject) => {
        const url = `https://metartaf.ru/${icao}.json`;
        
        const req = https.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    resolve(false);
                    return;
                }
                try {
                    const jsonData = JSON.parse(data);
                    const hasMetar = jsonData.metar && jsonData.metar.length > 0;
                    const hasTaf = jsonData.taf && jsonData.taf.length > 0;
                    resolve(hasMetar || hasTaf);
                } catch (e) {
                    resolve(false);
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

/**
 * Массовая проверка (последовательная для надёжности)
 * @param {string[]} icaos - Массив ICAO кодов
 * @returns {Promise<Set<string>>} - Множество доступных ICAO
 */
async function checkMetarBatch(icaos) {
    const available = new Set();
    
    for (const icao of icaos) {
        try {
            const hasData = await checkMetarSingle(icao);
            if (hasData) available.add(icao);
        } catch (e) {
            // Ошибка запроса — считаем что данных нет
        }
        await new Promise(r => setTimeout(r, DELAY_MS));
    }
    
    return available;
}

/**
 * Проверка单个 аэропорта (для совместимости)
 */
function checkSingleMetar(icao) {
    return checkMetarNOAA([icao]).then(r => r.available.includes(icao));
}

/**
 * Основная функция
 */
async function checkAllAirports() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  MIRA - Проверка доступности METAR (metartaf.ru API)      ║');
    console.log('║  Альтернатива: aviationweather.gov (недоступен)           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    // Чтение airports.json
    console.log('📁 Чтение airports.json...');
    let airportsData;
    try {
        const content = fs.readFileSync(AIRPORTS_FILE, 'utf8');
        airportsData = JSON.parse(content);
    } catch (err) {
        console.error(`❌ Ошибка чтения файла: ${err.message}`);
        process.exit(1);
    }
    
    const airports = airportsData.airports || [];
    console.log(`📊 Всего аэропортов: ${airports.length}\n`);
    
    const validAirports = [];
    const removedAirports = [];
    
    console.log('🔍 Проверка каждого аэропорта...\n');
    
    for (let i = 0; i < airports.length; i++) {
        const airport = airports[i];
        const icao = airport.icao;
        const name = airport.name || airport.city || icao;
        
        process.stdout.write(`[${String(i + 1).padStart(4, '0')}/${airports.length}] ${icao} (${name})... `);
        
        try {
            const hasMetar = await checkMetarSingle(icao);
            
            if (hasMetar) {
                console.log('✓');
                validAirports.push(airport);
            } else {
                console.log('✗');
                removedAirports.push(airport);
            }
        } catch (error) {
            console.log(`? (ошибка: ${error.message})`);
            // В случае ошибки запроса — сохраняем аэропорт
            validAirports.push(airport);
        }
        
        // Задержка между запросами
        if (i < airports.length - 1) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }
    
    // Итоги
    console.log('\n' + '═'.repeat(60));
    console.log(`📊 Результаты проверки:`);
    console.log(`   Всего:           ${airports.length}`);
    console.log(`   Есть METAR:      ${validAirports.length} (${Math.round(validAirports.length / airports.length * 100)}%)`);
    console.log(`   Нет METAR:       ${removedAirports.length} (${Math.round(removedAirports.length / airports.length * 100)}%)`);
    
    if (removedAirports.length > 0) {
        console.log('\n📋 Аэропорты без METAR (будут удалены):');
        removedAirports.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.icao} - ${a.name || a.city || 'Unknown'}`);
        });
        
        // Создание бэкапа
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFile = path.join(__dirname, `${BACKUP_PREFIX}.${timestamp}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(airportsData, null, 2));
        console.log(`\n💾 Бэкап сохранён: ${backupFile}`);
        
        // Обновление airports.json
        airportsData.airports = validAirports;
        fs.writeFileSync(AIRPORTS_FILE, JSON.stringify(airportsData, null, 2));
        console.log(`✅ Обновлён файл: ${AIRPORTS_FILE}`);
        
        // Сохранение списка удалённых
        const removedFile = path.join(__dirname, `removed-airports.${timestamp}.json`);
        fs.writeFileSync(removedFile, JSON.stringify({
            removedAt: new Date().toISOString(),
            reason: 'No METAR data available in NOAA API',
            airports: removedAirports
        }, null, 2));
        console.log(`📄 Список удалённых: ${removedFile}`);
    } else {
        console.log('\n✅ Все аэропорты имеют METAR!');
    }
    
    console.log('\n' + '═'.repeat(60));
    
    return { valid: validAirports.length, removed: removedAirports.length };
}

// Запуск
checkAllAirports()
    .then(stats => {
        console.log(`\n🎉 Завершено! Обработано: ${stats.valid + stats.removed}, удалено: ${stats.removed}`);
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Критическая ошибка:', err.message);
        process.exit(1);
    });
