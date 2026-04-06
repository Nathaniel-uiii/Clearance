<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$id_number = trim($_REQUEST['id_number'] ?? '');
if ($id_number === '') {
    echo json_encode(['ok' => false, 'error' => 'ID Number missing']);
    exit;
}

// basic format validation
if (!preg_match('/^[0-9]{4}-[0-9]{4}$/', $id_number)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid format']);
    exit;
}

$stmt = $conn->prepare('SELECT id FROM users WHERE id_number = ? LIMIT 1');
if (!$stmt) {
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    exit;
}
$stmt->bind_param('s', $id_number);
$stmt->execute();
$stmt->store_result();
$exists = $stmt->num_rows > 0;
$stmt->close();

echo json_encode(['ok' => true, 'exists' => $exists]);
exit;
?>
