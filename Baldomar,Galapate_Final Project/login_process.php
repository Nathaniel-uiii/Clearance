<?php
session_start();
require_once 'config.php';

// Debug: Check if session is working
if (session_status() !== PHP_SESSION_ACTIVE) {
    die('Session not active');
}

$identifier = trim($_POST['identifier'] ?? '');
$password = trim($_POST['password'] ?? '');

// Validation
if (empty($identifier) || empty($password)) {
    $_SESSION['form_error'] = "Please fill in all fields.";
    header('Location: login.php');
    exit();
}

// Length validation (8-16 characters)
if (strlen($identifier) < 8 || strlen($identifier) > 16) {
    $_SESSION['form_error'] = "Username/ID must be 8-16 characters long.";
    header('Location: login.php');
    exit();
}

if (strlen($password) < 8 || strlen($password) > 16) {
    $_SESSION['form_error'] = "Password must be 8-16 characters long.";
    header('Location: login.php');
    exit();
}

// Check lockout
if (!empty($_SESSION['lock_until']) && time() < $_SESSION['lock_until']) {
    $_SESSION['form_error'] = "Too many attempts. Please try again later.";
    header('Location: login.php');
    exit();
}

// Prepare statement to check if user exists and get their name
$stmt = $conn->prepare("SELECT id, password, first_name, last_name FROM users WHERE id_number = ? OR username = ? LIMIT 1");
if (!$stmt) {
    $_SESSION['form_error'] = "Database error. Please try again.";
    header('Location: login.php');
    exit();
}

$stmt->bind_param("ss", $identifier, $identifier);
$stmt->execute();

// Get result
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    // User exists, fetch the row
    $row = $result->fetch_assoc();
    $hashed_password = $row['password'] ?? '';
    $user_id = $row['id'] ?? 0;
    $first_name = $row['first_name'] ?? '';
    $last_name = $row['last_name'] ?? '';

    if (password_verify($password, $hashed_password)) {
        // Password is correct - clear failed login attempts
        if (isset($_SESSION['failed_logins'][$identifier])) {
            unset($_SESSION['failed_logins'][$identifier]);
        }

        // Set session variables
        $_SESSION['user_id'] = $user_id;
        $_SESSION['identifier'] = $identifier;
        $_SESSION['logged_in'] = true;
        
        // Store user's full name in session
        $_SESSION['first_name'] = $first_name;
        $_SESSION['last_name'] = $last_name;

        // Remove any lockout
        if (isset($_SESSION['lock_until'])) {
            unset($_SESSION['lock_until']);
        }
        if (isset($_SESSION['lockout_attempts'])) {
            unset($_SESSION['lockout_attempts']);
        }

        // Clear form error if any
        if (isset($_SESSION['form_error'])) {
            unset($_SESSION['form_error']);
        }

        $stmt->close();
        $conn->close();

        // Set success message and redirect
        $_SESSION['success'] = "Login successful! Welcome back.";
        
        // Ensure headers are not already sent
        if (headers_sent($filename, $linenum)) {
            die("Headers already sent in $filename on line $linenum. Cannot redirect to dashboard.php");
        }
        
        // Clear localStorage on successful login
        echo '<script>localStorage.removeItem("lockoutRemaining");</script>';
        
        // Force immediate redirect
        header('Location: dashboard.php');
        exit();
    } else {
        // Password is incorrect
        $stmt->close();
        
        // Set session variables for lockout tracking
        if (!isset($_SESSION['failed_logins'])) {
            $_SESSION['failed_logins'] = array();
        }
        
        $post_identifier = $_POST['identifier'] ?? '';
        
        if (!isset($_SESSION['failed_logins'][$post_identifier])) {
            $_SESSION['failed_logins'][$post_identifier] = 0;
        }
        
        // Increment only if not locked out
        if (empty($_SESSION['lock_until']) || time() > $_SESSION['lock_until']) {
            $_SESSION['failed_logins'][$post_identifier]++;
        }
        
        $failed_count = $_SESSION['failed_logins'][$post_identifier];
        
        // Determine lockout duration based on failed attempt count
        $lockout_duration = 0;
        
        if ($failed_count === 3) {
            // First 3 attempts: 15 second lockout
            $lockout_duration = 15;
        } elseif ($failed_count === 6) {
            // Next 3 attempts: 30 second lockout
            $lockout_duration = 30;
        } elseif ($failed_count >= 9) {
            // 9 or more attempts: 60 second lockout (and stays at 60)
            $lockout_duration = 60;
        }
        
        // Set lockout if we reached 3, 6, or 9+ attempts
        if ($lockout_duration > 0) {
            $_SESSION['lock_until'] = time() + $lockout_duration;
            $_SESSION['lockout_duration'] = $lockout_duration;
        }
        
        $lockout_remaining = isset($_SESSION['lock_until']) ? $_SESSION['lock_until'] - time() : 0;
        
        // Store lockout time in localStorage
        if ($lockout_remaining > 0) {
            echo '<script>localStorage.setItem("lockoutRemaining", ' . intval($lockout_remaining) . ');</script>';
        }
        
        $_SESSION['show_forgot_for'] = $post_identifier;
        $_SESSION['form_error'] = 'Invalid username or password.';
        header('Location: login.php');
        exit();
    }
} else {
    // User not found
    $stmt->close();
    
    // Set session variables for lockout tracking
    if (!isset($_SESSION['failed_logins'])) {
        $_SESSION['failed_logins'] = array();
    }
    
    $post_identifier = $_POST['identifier'] ?? '';
    
    if (!isset($_SESSION['failed_logins'][$post_identifier])) {
        $_SESSION['failed_logins'][$post_identifier] = 0;
    }
    
    // Increment only if not locked out
    if (empty($_SESSION['lock_until']) || time() > $_SESSION['lock_until']) {
        $_SESSION['failed_logins'][$post_identifier]++;
    }
    
    $failed_count = $_SESSION['failed_logins'][$post_identifier];
    
    // Determine lockout duration based on failed attempt count
    $lockout_duration = 0;
    
    if ($failed_count === 3) {
        // First 3 attempts: 15 second lockout
        $lockout_duration = 15;
    } elseif ($failed_count === 6) {
        // Next 3 attempts: 30 second lockout
        $lockout_duration = 30;
    } elseif ($failed_count >= 9) {
        // 9 or more attempts: 60 second lockout (and stays at 60)
        $lockout_duration = 60;
    }
    
    // Set lockout if we reached 3, 6, or 9+ attempts
    if ($lockout_duration > 0) {
        $_SESSION['lock_until'] = time() + $lockout_duration;
        $_SESSION['lockout_duration'] = $lockout_duration;
    }
    
    $lockout_remaining = isset($_SESSION['lock_until']) ? $_SESSION['lock_until'] - time() : 0;
    
    // Store lockout time in localStorage
    if ($lockout_remaining > 0) {
        echo '<script>localStorage.setItem("lockoutRemaining", ' . intval($lockout_remaining) . ');</script>';
    }
    
    $_SESSION['show_forgot_for'] = $post_identifier;
    $_SESSION['form_error'] = 'Invalid username or password.';
    header('Location: login.php');
    exit();
}

$conn->close();
?>