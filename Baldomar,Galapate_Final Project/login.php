<?php require_once 'config.php'; ?>
<?php
// Calculate remaining lockout time (if any)
$lockout_remaining = 0;
$failed_count = 0;
$show_forgot_password = false;

if (!empty($_SESSION['lock_until'])) {
    $now = time();
    $lockout_remaining = max(0, $_SESSION['lock_until'] - $now);
}

// Get failed login count from session
if (isset($_SESSION['failed_logins'])) {
    $identifier = $_SESSION['show_forgot_for'] ?? '';
    if (isset($_SESSION['failed_logins'][$identifier])) {
        $failed_count = $_SESSION['failed_logins'][$identifier];
        // Show forgot password after 2 failed attempts
        if ($failed_count >= 2) {
            $show_forgot_password = true;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Login | PRIME.</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="js/primeValidationCore.js" defer></script>
    <script src="js/validation.js" defer></script>
    <script src="js/security.js" defer></script>
</head>
<body>
<?php include 'header.php'; ?>

<!-- Fixed position alert - does not affect layout -->
<?php if(isset($_SESSION['form_error'])): ?>
    <div class="form-errors" id="alertBox"><?= htmlspecialchars($_SESSION['form_error']); unset($_SESSION['form_error']); ?></div>
<?php endif; ?>
<?php if(isset($_SESSION['success'])): ?>
    <div class="form-success" id="alertBox"><?= htmlspecialchars($_SESSION['success']); unset($_SESSION['success']); ?></div>
<?php endif; ?>

<main class="container auth-page">
    <div class="auth-card">
        <h2>Login</h2>
        <p class="auth-subtitle">Welcome back. Please sign in to continue.</p>

        <form id="loginForm" method="post" action="login_process.php" novalidate>
            <div>
                <label>ID Number or Username <span class="req">*</span></label>
                <input type="text" name="identifier" id="login_identifier" placeholder="Enter ID or Username" required <?php if ($lockout_remaining > 0) echo 'disabled'; ?>>
            </div>
            
            <div>
                <label>Password <span class="req">*</span></label>
                <div class="password-wrapper">
                    <input type="password" name="password" id="login_password" required placeholder="Enter your password" <?php if ($lockout_remaining > 0) echo 'disabled'; ?>>
                    <span class="toggle-pwd-icon" onclick="togglePasswordIcon('login_password', this)">👁️</span>
                </div>
            </div>

            <div class="remember-me-wrapper">
                <input type="checkbox" name="remember_me" id="remember_me" <?php if ($lockout_remaining > 0) echo 'disabled'; ?>>
                <label for="remember_me" class="remember-me-label">Remember me</label>
            </div>

            <button type="submit" id="loginBtn" <?php if ($lockout_remaining > 0) echo 'disabled'; ?>>Log in</button>
            <div id="errorCount" style="font-size: 12px; margin-top: 8px; text-align: center; color: #f57c00; <?php echo ($lockout_remaining > 0 || $failed_count < 2) ? 'display: none;' : ''; ?>">
                Failed attempts: <?= $failed_count; ?> (<?= 3 - ($failed_count % 3); ?> more before lockout)
            </div>
            <div id="lockoutMessage" style="color: var(--error); font-size: 12px; margin-top: 10px; text-align: center; display: <?php echo ($lockout_remaining > 0) ? 'block' : 'none'; ?>;">
                Too many attempts. Please try again in <span id="lockoutTimer"><?= $lockout_remaining; ?></span>s
            </div>
        </form>

        <div class="auth-links">
            <?php if ($show_forgot_password): ?>
            <div id="forgotPasswordDiv" style="display: block;">
                <p><a class="muted-link" href="forgot_password.php">Forgot Password? Reset Here</a></p>
            </div>
            <?php else: ?>
            <div id="forgotPasswordDiv" style="display: none;">
                <p><a class="muted-link" href="forgot_password.php">Forgot Password? Reset Here</a></p>
            </div>
            <?php endif; ?>
            <p>Don't have an account? 
                <a class="muted-link" href="sign.php" id="registerLink" <?php if ($lockout_remaining > 0) echo 'style="pointer-events: none; opacity: 0.5; cursor: not-allowed;"'; ?>>Register</a>
            </p>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>

<script>
// Pass lockout status to global variable
const lockoutActive = <?php echo ($lockout_remaining > 0) ? 'true' : 'false'; ?>;
const lockoutRemaining = <?php echo $lockout_remaining; ?>;

// Disable browser back button
history.pushState(null, null, location.href);
window.addEventListener('popstate', function() {
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

    // Disable register button in header when lockout is active
    if (lockoutActive) {
        disableHeaderRegisterButton();
    }
});

// Disable register button in header
function disableHeaderRegisterButton() {
    const headerRegisterBtn = document.querySelector('.top-nav a[href="sign.php"]');
    if (headerRegisterBtn) {
        headerRegisterBtn.style.pointerEvents = 'none';
        headerRegisterBtn.style.opacity = '0.5';
        headerRegisterBtn.style.cursor = 'not-allowed';
        headerRegisterBtn.title = 'Too many login attempts. Please try again later.';
    }
}

// Re-enable register button in header
function enableHeaderRegisterButton() {
    const headerRegisterBtn = document.querySelector('.top-nav a[href="sign.php"]');
    if (headerRegisterBtn) {
        headerRegisterBtn.style.pointerEvents = 'auto';
        headerRegisterBtn.style.opacity = '1';
        headerRegisterBtn.style.cursor = 'pointer';
        headerRegisterBtn.title = '';
    }
}

// Lockout countdown timer
<?php if ($lockout_remaining > 0): ?>
    let remainingTime = <?= $lockout_remaining; ?>;
    const timerEl = document.getElementById('lockoutTimer');
    const loginBtn = document.getElementById('loginBtn');
    const registerLink = document.getElementById('registerLink');
    const forgotPasswordDiv = document.getElementById('forgotPasswordDiv');
    const identifierInput = document.getElementById('login_identifier');
    const passwordInput = document.getElementById('login_password');
    const rememberMeCheckbox = document.getElementById('remember_me');

    // Disable all interactive elements
    loginBtn.disabled = true;
    identifierInput.disabled = true;
    passwordInput.disabled = true;
    rememberMeCheckbox.disabled = true;
    registerLink.style.pointerEvents = 'none';
    registerLink.style.opacity = '0.5';
    registerLink.style.cursor = 'not-allowed';

    function updateTimer() {
        if (remainingTime > 0) {
            timerEl.textContent = remainingTime;
            remainingTime--;
            setTimeout(updateTimer, 1000);
        } else {
            // Re-enable all elements after lockout expires
            loginBtn.disabled = false;
            identifierInput.disabled = false;
            passwordInput.disabled = false;
            rememberMeCheckbox.disabled = false;
            registerLink.style.pointerEvents = 'auto';
            registerLink.style.opacity = '1';
            registerLink.style.cursor = 'pointer';
            enableHeaderRegisterButton();
            const msg = document.getElementById('lockoutMessage');
            if (msg) msg.style.display = 'none';
            forgotPasswordDiv.style.display = 'none';
        }
    }
    updateTimer();
<?php endif; ?>

function togglePasswordIcon(fieldId, iconElement) {
    const field = document.getElementById(fieldId);
    if (field.type === 'password') {
        field.type = 'text';
        iconElement.textContent = '👁️‍🗨️';
    } else {
        field.type = 'password';
        iconElement.textContent = '👁️';
    }
}
</script>
</body>
</html>