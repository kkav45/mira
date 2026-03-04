/**
 * MIRA - Простой HTTP сервер для тестирования METAR/TAF
 * Запускает локальный веб-сервер с CORS заголовками
 * 
 * Использование:
 *   node server.js
 *   или
 *   npx http-server -p 8080 --cors
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Парсинг URL
    let filePath = req.url === '/' ? '/test-metar-taf.html' : req.url;
    
    // Удаляем query параметры
    const queryIndex = filePath.indexOf('?');
    if (queryIndex !== -1) {
        filePath = filePath.substring(0, queryIndex);
    }
    
    // Полная путь к файлу
    const fullPath = path.join(__dirname, filePath);
    
    // Проверка на выход за пределы директории
    if (!fullPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // Получение расширения файла
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Чтение и отправка файла
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Файл не найден: ' + filePath);
            } else {
                res.writeHead(500);
                res.end('Ошибка сервера: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   MIRA - METAR/TAF Тестовый сервер                        ║
║                                                           ║
║   Сервер запущен: http://localhost:${PORT}                 ║
║                                                           ║
║   Доступные страницы:                                     ║
║   • http://localhost:${PORT}/test-metar-taf.html           ║
║                                                           ║
║   Нажмите Ctrl+C для остановки                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
    console.log(`\n🌐 Откройте в браузере: http://localhost:${PORT}/test-metar-taf.html\n`);
});
