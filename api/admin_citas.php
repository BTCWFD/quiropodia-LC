<?php
// api/admin_citas.php
require_once __DIR__ . '/database.php';

// Auth credentials
$adminConfig = require __DIR__ . '/../admin_config.php';
$expectedUser = $adminConfig['user'];
$expectedHash = $adminConfig['hash'];

$user = $_SERVER['PHP_AUTH_USER'] ?? '';
$pass = $_SERVER['PHP_AUTH_PW'] ?? '';

if ($user !== $expectedUser || !password_verify($pass, $expectedHash)) {
    header('WWW-Authenticate: Basic realm="Admin Area"');
    http_response_code(401);
    echo "Authentication required.";
    exit;
}

header('Content-Type: application/json');

$date = $_GET['date'] ?? null;
if (is_array($date)) {
    $date = $date[0];
}

try {
    if ($date) {
        $stmt = $pdo->prepare("SELECT * FROM citas WHERE date = ? ORDER BY time ASC");
        $stmt->execute([$date]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM citas ORDER BY date ASC, time ASC");
        $stmt->execute();
    }
    
    $bookings = $stmt->fetchAll();
    
    // Cast sqlite ID column to int or string
    foreach ($bookings as &$b) {
        $b['id'] = (int)$b['id'];
    }
    
    echo json_encode($bookings);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
