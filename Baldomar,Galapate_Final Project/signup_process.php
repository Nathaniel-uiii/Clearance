<?php
require_once "config.php";

function clean($v) {
    return trim(htmlspecialchars($v, ENT_QUOTES, 'UTF-8'));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Invalid request method');
}

// Personal Information
$first_name = clean($_POST['first_name'] ?? '');
$middle_name = clean($_POST['middle_name'] ?? '');
$last_name = clean($_POST['last_name'] ?? '');
$extension = clean($_POST['extension'] ?? '');
$id_number = clean($_POST['id_number'] ?? '');
$birthdate = clean($_POST['birthdate'] ?? '');

// Address Information
$street = clean($_POST['street'] ?? '');
$barangay = clean($_POST['barangay'] ?? '');
$city = clean($_POST['city'] ?? '');
$province = clean($_POST['province'] ?? '');
$country = clean($_POST['country'] ?? '');
$zip = clean($_POST['zip'] ?? '');

// Account Information
$username = clean($_POST['username'] ?? '');
$email = clean($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$confirm_password = $_POST['confirm_password'] ?? '';

// Security Questions
$auth_a1 = clean($_POST['auth_a1'] ?? '');
$auth_a2 = clean($_POST['auth_a2'] ?? '');
$auth_a3 = clean($_POST['auth_a3'] ?? '');

// Get the actual question text selected by user (from the select dropdowns)
$question1 = clean($_POST['question1'] ?? '');
$question2 = clean($_POST['question2'] ?? '');
$question3 = clean($_POST['question3'] ?? '');

$errors = [];

// Required fields validation
$required = [
    'First Name' => $first_name,
    'Last Name' => $last_name,
    'ID Number' => $id_number,
    'Birthdate' => $birthdate,
    'Street/Purok' => $street,
    'Barangay' => $barangay,
    'City/Municipality' => $city,
    'Province' => $province,
    'Country' => $country,
    'ZIP Code' => $zip,
    'Username' => $username,
    'Email' => $email,
    'Password' => $password,
    'Confirm Password' => $confirm_password,
    'Security Answer 1' => $auth_a1,
    'Security Answer 2' => $auth_a2,
    'Security Answer 3' => $auth_a3
];

foreach ($required as $k => $v) {
    if (empty($v)) $errors[] = "$k is required.";
}

// Username validation
if (empty($username) || !preg_match('/^[A-Za-z0-9_.\-]{8,16}$/', $username)) {
    $errors[] = 'Invalid username. Use 8-16 chars: letters, numbers, underscore, dot, or dash.';
}

// Email validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format.';
}

// Password validation
if ($password !== $confirm_password) {
    $errors[] = 'Passwords do not match.';
}

// Password length bounds (align with Clearance prime-api bcrypt 72-byte limit)
if (strlen($password) < 8) {
    $errors[] = 'Password must be at least 8 characters.';
}
if (strlen($password) > 72) {
    $errors[] = 'Password must be at most 72 bytes (bcrypt limit).';
}

// ID Number format
if (!preg_match('/^[0-9]{4}-[0-9]{4}$/', $id_number)) {
    $errors[] = 'ID Number must be in format xxxx-xxxx.';
}

// ZIP Code validation
if (!preg_match('/^[0-9]{4}$/', $zip)) {
    $errors[] = 'ZIP code must be 4 digits.';
}

// Address validation: start with capital, no double spaces, no 3 consecutive identical letters
function address_valid($v, $field) {
    if (empty($v)) return "$field is required.";
    if (preg_match('/[^a-zA-Z0-9\s\-\.,\']/', $v)) return "$field contains invalid characters.";
    if (strpos($v, '  ') !== false) return "$field must not contain double spaces.";
    if (preg_match('/(.)\1{2,}/i', $v)) return "$field must not contain three (3) consecutive identical letters.";
    $first = mb_substr(trim($v), 0, 1, 'UTF-8');
    if ($first !== mb_strtoupper($first, 'UTF-8') || !preg_match('/[A-Z]/', $first)) return "$field must start with a capital letter.";
    return true;
}

$addrChecks = [
    'Street/Purok' => $street,
    'Barangay' => $barangay,
    'City/Municipality' => $city,
    'Province' => $province,
    'Country' => $country
];
foreach ($addrChecks as $label => $val) {
    $ok = address_valid($val, $label);
    if ($ok !== true) $errors[] = $ok;
}

// Age validation
$age = null;
if ($birthdate) {
    $dob = new DateTime($birthdate);
    $today = new DateTime();
    $age = $today->diff($dob)->y;
    if ($age < 18) $errors[] = 'Only legal age (18+) allowed.';
} else {
    $errors[] = 'Birthdate is required.';
}

// Name validation function
function name_valid($name, $field) {
    if (empty($name)) return true; // Skip if empty (for optional fields)
    
    if (preg_match('/[^a-zA-Z\s\-\']/', $name)) {
        return "$field contains invalid characters.";
    }
    
    if (preg_match('/[A-Z]{2,}/', $name) && strtoupper($name) === $name) {
        return "$field must not be ALL CAPS.";
    }
    
    if (strpos($name, '  ') !== false) {
        return "$field must not contain double spaces.";
    }
    
    if (preg_match('/(.)\1{2,}/i', $name)) {
        return "$field must not contain three (3) consecutive identical letters.";
    }
    
    $words = explode(' ', $name);
    foreach ($words as $w) {
        if ($w === '') continue;
        $first = mb_substr($w, 0, 1, 'UTF-8');
        $rest = mb_substr($w, 1, null, 'UTF-8');
        if ($first !== mb_strtoupper($first, 'UTF-8') || $rest !== mb_strtolower($rest, 'UTF-8')) {
            return "$field must be Capitalized properly. Example: Juan Carlo";
        }
    }
    
    return true;
}

// Validate names
foreach (['First Name' => $first_name, 'Last Name' => $last_name, 'Extension' => $extension] as $k => $v) {
    if ($v === '') continue;
    $ok = name_valid($v, $k);
    if ($ok !== true) $errors[] = $ok;
}

// Password strength
$pw_strength = 0;
if (strlen($password) >= 8) $pw_strength++;
if (preg_match('/[0-9]/', $password)) $pw_strength++;
if (preg_match('/[A-Z]/', $password)) $pw_strength++;
if (preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) $pw_strength++;
if ($pw_strength < 2) $errors[] = 'Password too weak. Use at least 8 chars, include letters and numbers.';

// Check for existing user (id_number, email or username)
if (empty($errors)) {
    $stmt = $conn->prepare('SELECT id_number FROM users WHERE id_number = ? OR email = ? OR username = ? LIMIT 1');
    $stmt->bind_param('sss', $id_number, $email, $username);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        $errors[] = 'ID Number, Email or Username already registered.';
    }
    $stmt->close();
}

// Check for existing password
if (empty($errors)) {
    // We need to get all users and verify each password hash
    $stmt = $conn->prepare('SELECT password FROM users');
    if ($stmt) {
        $stmt->execute();
        $result = $stmt->get_result();
        $passwordExists = false;
        
        while ($row = $result->fetch_assoc()) {
            if (password_verify($password, $row['password'])) {
                $passwordExists = true;
                break;
            }
        }
        
        if ($passwordExists) {
            $errors[] = 'Password already exists. Please choose a different password.';
        }
        $stmt->close();
    }
}

// Display errors
if (!empty($errors)) {
    $_SESSION['error'] = implode(' ', $errors);
    header('Location: sign.php');
    exit;
}

// Insert user into database
$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$ha1 = password_hash($auth_a1, PASSWORD_DEFAULT);
$ha2 = password_hash($auth_a2, PASSWORD_DEFAULT);
$ha3 = password_hash($auth_a3, PASSWORD_DEFAULT);

// Use the selected questions (not hardcoded)
$aq1 = $question1;
$aq2 = $question2;
$aq3 = $question3;

$ins = $conn->prepare('INSERT INTO users (
    id_number, first_name, middle_name, last_name, extension, birthdate, age,
    street, barangay, city, province, country, zip,
    email, username, password, auth_q1, auth_a1, auth_q2, auth_a2, auth_q3, auth_a3
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

$ins->bind_param(
    'ssssssssssssssssssssss',
    $id_number,
    $first_name,
    $middle_name,
    $last_name,
    $extension,
    $birthdate,
    $age,
    $street,
    $barangay,
    $city,
    $province,
    $country,
    $zip,
    $email,
    $username,
    $hashed_password,
    $aq1,
    $ha1,
    $aq2,
    $ha2,
    $aq3,
    $ha3
);

if ($ins->execute()) {
    $_SESSION['success'] = 'Registration successful! Please login.';
    header('Location: login.php');
} else {
    $_SESSION['error'] = 'Database error: ' . $conn->error;
    header('Location: sign.php');
}

$ins->close();
$conn->close();
?>