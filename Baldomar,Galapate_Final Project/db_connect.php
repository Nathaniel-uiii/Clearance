<?php
// db_connect.php - reuse this include where DB access is required
$host = 'localhost';
$db   = 'grino_db';
$user = 'root';
$pass = ''; // set your MySQL root password if any

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
$conn->set_charset('utf8mb4');
?>