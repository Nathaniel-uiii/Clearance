<?php
// change_password.php
session_start();
require_once 'db_connect.php';
require_once 'config.php';

if(empty($_SESSION['pwd_reset_user'])) {
    header('Location: login.php');
    exit;
}

$uid = (int)$_SESSION['pwd_reset_user'];

// Fetch user's id_number and username
$user_data = null;
if ($uid > 0) {
    $stmt = $conn->prepare("SELECT id_number, username FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows > 0) {
        $stmt->bind_result($id_number, $username);
        $stmt->fetch();
        $user_data = [
            'id_number' => $id_number,
            'username' => $username
        ];
    }
    $stmt->close();
}

if($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pwd = $_POST['password'] ?? '';
    $pwd2 = $_POST['confirm_password'] ?? '';
    
    if($pwd !== $pwd2) {
        $_SESSION['form_error'] = 'Passwords do not match';
        header('Location: change_password.php');
        exit;
    }
    
    if(strlen($pwd) < 8) {
        $_SESSION['form_error'] = 'Password must be at least 8 characters long';
        header('Location: change_password.php');
        exit;
    }
    
    $hash = password_hash($pwd, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->bind_param('si', $hash, $uid);
    $stmt->execute();
    
    unset($_SESSION['pwd_reset_user']);
    $_SESSION['success'] = 'Password successfully changed. Please login with your new password.';
    header('Location: login.php');
    exit;
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Change Password | PRIME.</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
<?php include 'header.php'; ?>
<div class="auth-page">
  <div class="auth-card">
    <h2>Change Password</h2>
    <p class="auth-subtitle">Create a new secure password</p>

    <!-- Progress Bar -->
    <div class="progressbar">
      <div class="progress-step">Enter ID/Email</div>
      <div class="progress-step">Security Questions</div>
      <div class="progress-step active">Reset Password</div>
    </div>

    <?php if(!empty($_SESSION['form_error'])): ?>
      <div class="form-errors"><?= htmlspecialchars($_SESSION['form_error']); unset($_SESSION['form_error']); ?></div>
    <?php endif; ?>

    <!-- Display User ID Number and Username -->
    <?php if($user_data): ?>
      <div style="background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;"><strong>Your Account Information</strong></p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">ID Number</label>
            <p style="margin: 0; font-weight: 600; color: #0f172a;"><?= htmlspecialchars($user_data['id_number']) ?></p>
          </div>
          <div>
            <label style="display: block; font-size: 11px; color: #64748b; margin-bottom: 2px;">Username</label>
            <p style="margin: 0; font-weight: 600; color: #0f172a;"><?= htmlspecialchars($user_data['username']) ?></p>
          </div>
        </div>
      </div>
    <?php endif; ?>

    <form method="post" action="change_password.php">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <label>New Password <span class="req">*</span></label>
          <div class="password-wrapper">
            <input name="password" id="password" type="password" required minlength="8" placeholder="Enter new password">
            <span class="toggle-pwd show-pwd" data-target="#password">Show</span>
          </div>
          <meter id="pwdStrength" min="0" max="4" value="0"></meter>
        </div>
        
        <div>
          <label>Confirm Password <span class="req">*</span></label>
          <div class="password-wrapper">
            <input name="confirm_password" id="confirm_password" type="password" required minlength="8" placeholder="Confirm your password">
            <span class="toggle-pwd show-pwd" data-target="#confirm_password">Show</span>
          </div>
          <div id="pwdMatch" class="match-indicator"></div>
        </div>
      </div>
      
      <div class="step-buttons">
        <a href="forgot_password.php?step=questions&user=<?= urlencode($_GET['user'] ?? '') ?>" class="back-button" style="padding: 8px 12px; text-decoration: none; border-radius: 4px;">Back</a>
        <button type="submit" id="submitBtn">Change Password</button>
      </div>
    </form>
  </div>
</div>
<?php include 'footer.php'; ?>
<script src="js/validation.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Password strength meter
    const password = document.getElementById('password');
    const meter = document.getElementById('pwdStrength');
    
    if (password && meter) {
        password.addEventListener('input', function() {
            const val = password.value;
            let score = 0;
            
            if (val.length >= 8) score++;
            if (val.match(/[a-z]/) && val.match(/[A-Z]/)) score++;
            if (val.match(/\d/)) score++;
            if (val.match(/[^a-zA-Z\d]/)) score++;
            
            meter.value = score;
        });
    }
    
    // Password match indicator
    const confirmPassword = document.getElementById('confirm_password');
    const matchIndicator = document.getElementById('pwdMatch');
    const submitBtn = document.getElementById('submitBtn');
    
    if (confirmPassword && matchIndicator && submitBtn) {
        function checkPasswordMatch() {
            const pwd = password.value;
            const confirmPwd = confirmPassword.value;
            
            if (confirmPwd === '') {
                matchIndicator.textContent = '';
                matchIndicator.className = 'match-indicator';
                submitBtn.disabled = false;
            } else if (pwd === confirmPwd) {
                matchIndicator.textContent = '✓ Passwords match';
                matchIndicator.className = 'match-indicator ok';
                submitBtn.disabled = false;
            } else {
                matchIndicator.textContent = '✗ Passwords do not match';
                matchIndicator.className = 'match-indicator bad';
                submitBtn.disabled = true;
            }
        }
        
        password.addEventListener('input', checkPasswordMatch);
        confirmPassword.addEventListener('input', checkPasswordMatch);
    }
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-pwd').forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            const target = document.querySelector(this.getAttribute('data-target'));
            if (target.type === 'password') {
                target.type = 'text';
                this.textContent = 'Hide';
            } else {
                target.type = 'password';
                this.textContent = 'Show';
            }
        });
    });
});
</script>
</body>
</html>