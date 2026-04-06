<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$email = trim($_REQUEST['email'] ?? '');
if ($email === '') {
    echo json_encode(['ok' => false, 'error' => 'Email missing']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid email']);
    exit;
}

$stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
if (!$stmt) {
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    exit;
}
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->store_result();
$exists = $stmt->num_rows > 0;
$stmt->close();

echo json_encode(['ok' => true, 'exists' => $exists]);
exit;
?>
