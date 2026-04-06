<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$username = trim($_REQUEST['username'] ?? '');
if ($username === '') {
    echo json_encode(['ok' => false, 'error' => 'Username missing']);
    exit;
}

if (!preg_match('/^[A-Za-z0-9_.\-]{8,16}$/', $username)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid username']);
    exit;
}

$stmt = $conn->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
if (!$stmt) {
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    exit;
}
$stmt->bind_param('s', $username);
$stmt->execute();
$stmt->store_result();
$exists = $stmt->num_rows > 0;
$stmt->close();

echo json_encode(['ok' => true, 'exists' => $exists]);
exit;
?>
