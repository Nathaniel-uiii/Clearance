<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$password = trim($_REQUEST['password'] ?? '');
if ($password === '') {
    echo json_encode(['ok' => false, 'error' => 'Password missing']);
    exit;
}

if (strlen($password) < 8 || strlen($password) > 16) {
    echo json_encode(['ok' => false, 'error' => 'Invalid password length']);
    exit;
}

// Check if password already exists in database
// We need to get all users and verify each password hash
$stmt = $conn->prepare('SELECT password FROM users');
if (!$stmt) {
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    exit;
}

$stmt->execute();
$result = $stmt->get_result();
$exists = false;
$userCount = 0;

while ($row = $result->fetch_assoc()) {
    $userCount++;
    if (password_verify($password, $row['password'])) {
        $exists = true;
        break;
    }
}

$stmt->close();

// Debug: log the result
error_log("Password check for '$password': $userCount users checked, exists: " . ($exists ? 'true' : 'false'));

echo json_encode(['ok' => true, 'exists' => $exists, 'users_checked' => $userCount]);
exit;
?>
