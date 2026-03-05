const fs = require('fs');

const AIRPORTS_FILE = './airports.json';
const CONCURRENT = 5; // Одновременно 5 запросов

async function checkMetarAvailability(icao) {
    try {
        const response = await fetch(`http://metartaf.ru/${icao}.json`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) return false;
        
        const data = await response.json();
        return (data.metar && data.metar.length > 0) || (data.taf && data.taf.length > 0);
    } catch (e) {
        return false;
    }
}

async function processBatch(batch) {
    const results = await Promise.all(batch.map(async (airport) => {
        const hasMetar = await checkMetarAvailability(airport.icao);
        return { airport, hasMetar };
    }));
    return results;
}

async function checkAllAirports() {
    console.log('Loading airports...');
    
    let airportsData;
    try {
        const content = fs.readFileSync(AIRPORTS_FILE, 'utf8').replace(/^\uFEFF/, '');
        airportsData = JSON.parse(content);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
    
    const airports = airportsData.airports || [];
    console.log(`Total: ${airports.length}\n`);
    
    const valid = [];
    const removed = [];
    
    // Разбиваем на батчи
    for (let i = 0; i < airports.length; i += CONCURRENT) {
        const batch = airports.slice(i, Math.min(i + CONCURRENT, airports.length));
        const results = await processBatch(batch);
        
        for (const result of results) {
            const { airport, hasMetar } = result;
            const name = airport.name || airport.city || airport.icao;
            
            if (hasMetar) {
                console.log(`[${i + removed.length + valid.length + 1}/${airports.length}] ${airport.icao} (${name})... OK`);
                valid.push(airport);
            } else {
                console.log(`[${i + removed.length + valid.length + 1}/${airports.length}] ${airport.icao} (${name})... NO`);
                removed.push(airport);
            }
        }
        
        // Небольшая задержка между батчами
        if (i + CONCURRENT < airports.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Checked: ${airports.length}`);
    console.log(`Has METAR/TAF: ${valid.length}`);
    console.log(`No METAR/TAF: ${removed.length}`);
    
    if (removed.length > 0) {
        console.log('\nRemoved airports:');
        removed.forEach(a => console.log(`  - ${a.icao} (${a.name || a.city})`));
        
        const backup = `airports.backup.${Date.now()}.json`;
        fs.writeFileSync(backup, JSON.stringify({ airports }, null, 2));
        console.log(`\nBackup: ${backup}`);
        
        airportsData.airports = valid;
        fs.writeFileSync(AIRPORTS_FILE, JSON.stringify(airportsData, null, 2));
        console.log(`Updated: ${AIRPORTS_FILE}`);
    } else {
        console.log('\nAll airports have METAR/TAF!');
    }
}

checkAllAirports().catch(console.error);
