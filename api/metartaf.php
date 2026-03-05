<?php
/**
 * MIRA - METARTAF.RU Proxy API
 * Прокси для получения данных с metartaf.ru
 * 
 * Использование:
 * GET /api/metartaf.php?icao=UUDD
 */

// Разрешаем CORS
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
$icao = isset($_GET['icao']) ? trim(strtoupper($_GET['icao'])) : '';

if (empty($icao) || !preg_match('/^[A-Z]{4}$/', $icao)) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверный ICAO код. Пример: UUDD']);
    exit();
}

// METARTAF.RU API
$metartafUrl = "https://metartaf.ru/{$icao}.json";

// Инициализация cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $metartafUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'MIRA/0.2.0 (METARTAF Proxy)');

// Выполнение запроса
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

// Обработка ошибок
if ($curlError) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка подключения к metartaf.ru',
        'details' => $curlError
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
    'icao' => $icao,
    'timestamp' => date('c'),
    'data' => $data
]);
