<?php
session_start();
// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    $_SESSION['form_error'] = 'Please log in to access the dashboard';
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | PRIME.</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <?php include 'header.php'; ?>

    <?php if(isset($_SESSION['form_error'])): ?>
        <div class="form-errors" id="alertBox"><?= htmlspecialchars($_SESSION['form_error']); unset($_SESSION['form_error']); ?></div>
    <?php endif; ?>
    <?php if(isset($_SESSION['success'])): ?>
        <div class="form-success" id="alertBox"><?= htmlspecialchars($_SESSION['success']); unset($_SESSION['success']); ?></div>
    <?php endif; ?>

    <main class="container auth-page">
        <div class="auth-card dashboard-welcome">
            <h2>Welcome to Your Dashboard</h2>
            <p><?php 
                $fullName = trim(htmlspecialchars($_SESSION['first_name'] ?? ''));
                echo !empty($fullName) ? 'Hello, ' . $fullName : 'Hello, ' . htmlspecialchars($_SESSION['identifier']); 
            ?>!</p>
            <p>You have successfully logged in. This is your secure dashboard where you can manage your profile and settings.</p>
        </div>
    </main>

    <?php include 'footer.php'; ?>
    
    <script>
        // Disable back button
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', function () {
            history.pushState(null, null, location.href);
        });

        // Auto-dismiss alert after 5 seconds
        document.addEventListener('DOMContentLoaded', function() {
            const alertBox = document.getElementById('alertBox');
            if (alertBox) {
                setTimeout(function() {
                    alertBox.classList.add('dismiss');
                    setTimeout(function() {
                        alertBox.style.display = 'none';
                    }, 400);
                }, 5000);
            }
        });
    </script>
</body>
</html>