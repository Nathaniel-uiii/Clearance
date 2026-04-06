<?php
// header.php - Dynamic header based on user session and current page
$current_page = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html>
<head>
    <script src="js/security.js" defer></script>
</head>
<body>
<header class="site-header">
    <div class="container">
        <h1 class="prospect-name">PRIME.</h1>
        <nav class="top-nav">
            <?php if(isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true): ?>
                <!-- Logged in user - show Dashboard and Logout -->
                <a href="logout.php">Log Out</a>
            <?php else: ?>
                <?php if($current_page == 'login.php'): ?>
                    <!-- On login page - show Home and Register -->
                    <a href="home.php" class="<?= $current_page == 'home.php' ? 'active' : '' ?>">Home</a>
                    <a href="sign.php" class="<?= $current_page == 'sign.php' ? 'active' : '' ?>">Register</a>
                <?php elseif($current_page == 'sign.php'): ?>
                    <!-- On register page - show Home and Login -->
                    <a href="home.php" class="<?= $current_page == 'home.php' ? 'active' : '' ?>">Home</a>
                    <a href="login.php" class="<?= $current_page == 'login.php' ? 'active' : '' ?>">Log In</a>
                <?php else: ?>
                    <!-- On home page - show Login and Register -->
                    <a href="login.php" class="<?= $current_page == 'login.php' ? 'active' : '' ?>">Log In</a>
                    <a href="sign.php" class="<?= $current_page == 'sign.php' ? 'active' : '' ?>">Register</a>
                <?php endif; ?>
            <?php endif; ?>
        </nav>
    </div>
</header>