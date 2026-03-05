<?php
/**
 * MIRA - METAR Proxy API
 * Прокси для получения METAR данных с NOAA
 * 
 * Использование:
 * GET /api/metar.php?icao=UUDD
 * GET /api/metar.php?icao=UUDD,UUWW,UUEE
 */

// Разрешаем CORS для всех доменов (можно ограничить)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Обработка preflight запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Получаем ICAO код
$icao = isset($_GET['icao']) ? trim($_GET['icao']) : '';

if (empty($icao)) {
    http_response_code(400);
    echo json_encode(['error' => 'Не указан ICAO код. Пример: ?icao=UUDD']);
    exit();
}

// Валидация ICAO (4 буквы)
$icaoList = explode(',', strtoupper($icao));
$validIcaoList = [];
foreach ($icaoList as $code) {
    $code = trim($code);
    if (preg_match('/^[A-Z]{4}$/', $code)) {
        $validIcaoList[] = $code;
    }
}

if (empty($validIcaoList)) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверный формат ICAO. Пример: UUDD или UUDD,UUWW']);
    exit();
}

$icaoParam = implode(',', $validIcaoList);

// NOAA Aviation Weather API
$noaaUrl = "https://aviationweather.gov/api/data/metar?ids={$icaoParam}&format=json&hours=2";

// Инициализация cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $noaaUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Для Beget
curl_setopt($ch, CURLOPT_USERAGENT, 'MIRA/0.2.0 (METAR Proxy)');

// Выполнение запроса
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

// Обработка ошибок
if ($curlError) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка подключения к NOAA',
        'details' => $curlError
    ]);
    exit();
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode([
        'error' => 'NOAA вернул ошибку',
        'http_code' => $httpCode
    ]);
    exit();
}

// Проверка ответа
$data = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка парсинга JSON',
        'details' => json_last_error_msg()
    ]);
    exit();
}

// Возвращаем данные
echo json_encode([
    'success' => true,
    'icao' => $icaoParam,
    'timestamp' => date('c'),
    'data' => $data,
    'count' => count($data)
]);
