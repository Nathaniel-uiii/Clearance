<?php
require_once 'config.php';

function clean($v) {
    return trim(htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'));
}

$errors = [];
$success = '';
$id_value = '';
$username = '';
$questions = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    if (isset($_POST['lookup'])) {
        $id = clean($_POST['id_number'] ?? '');
        $id_value = $id;

        if ($id === '') {
            $errors[] = 'ID Number is required.';
        } elseif (!preg_match('/^[0-9]{4}-[0-9]{4}$/', $id)) {
            $errors[] = 'ID Number must be in format xxxx-xxxx.';
        } else {
            $stmt = $conn->prepare('SELECT username, auth_q1, auth_q2, auth_q3 FROM users WHERE id_number = ? LIMIT 1');
            if ($stmt) {
                $stmt->bind_param('s', $id);
                $stmt->execute();
                $stmt->store_result();
                if ($stmt->num_rows === 1) {
                    $stmt->bind_result($uname, $q1, $q2, $q3);
                    $stmt->fetch();
                    $username = $uname;
                    $questions = [
                        'a1' => $q1,
                        'a2' => $q2,
                        'a3' => $q3
                    ];
                } else {
                    $errors[] = 'No user found with that ID Number.';
                }
                $stmt->close();
            } else {
                $errors[] = 'Database error.';
            }
        }
    }

    if (isset($_POST['verify'])) {
        // Verify security answers only, then redirect to change_password.php
        $id = clean($_POST['id_number'] ?? '');
        $id_value = $id;
        $a1 = trim($_POST['a1'] ?? '');
        $a2 = trim($_POST['a2'] ?? '');
        $a3 = trim($_POST['a3'] ?? '');

        if ($id === '') $errors[] = 'ID Number is required.';
        if ($a1 === '' || $a2 === '' || $a3 === '') $errors[] = 'All authentication answers are required.';

        if (empty($errors)) {
            // fetch hashed answers and user id
            $stmt = $conn->prepare('SELECT id, auth_a1, auth_a2, auth_a3 FROM users WHERE id_number = ? LIMIT 1');
            if ($stmt) {
                $stmt->bind_param('s', $id);
                $stmt->execute();
                $stmt->store_result();
                if ($stmt->num_rows !== 1) {
                    $errors[] = 'User not found.';
                } else {
                    $stmt->bind_result($uid, $ha1, $ha2, $ha3);
                    $stmt->fetch();
                    if (!password_verify($a1, $ha1) || !password_verify($a2, $ha2) || !password_verify($a3, $ha3)) {
                        $errors[] = 'Authentication answers do not match.';
                    } else {
                        // answers verified — set session and redirect to change password page
                        $_SESSION['pwd_reset_user'] = (int)$uid;
                        header('Location: change_password.php');
                        exit;
                    }
                }
                $stmt->close();
            } else {
                $errors[] = 'Database error.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Prime. - Forgot Password</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<?php include 'header.php'; ?>

<?php if (!empty($errors)): ?>
    <div class="form-errors" id="alertBox">
        <?php foreach ($errors as $e): ?>
            <?php echo htmlspecialchars($e, ENT_QUOTES, 'UTF-8'); ?>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php if ($success): ?>
    <div class="form-success" id="alertBox">
        <?php echo $success; ?>
    </div>
<?php endif; ?>

<main class="container auth-page">
    <div class="auth-card">
        <h2>Forgot Password</h2>
        <p class="auth-subtitle">Enter your ID Number and answer the questions to reset your password.</p>

        <form method="post" action="forgot_password.php" class="auth-form">
            <?php if (empty($questions)): ?>
                <div>
                    <label for="id_number">ID Number <span class="req">*</span></label>
                    <input id="id_number" type="text" name="id_number" placeholder="xxxx-xxxx" required value="<?php echo htmlspecialchars($id_value, ENT_QUOTES, 'UTF-8'); ?>">
                </div>
                <button type="submit" name="lookup">Lookup</button>
            <?php else: ?>
                <!-- Display ID Number and Username -->
                <div class="verification-info">
                    <div class="verification-header">Your Account Information</div>
                    <div class="verification-grid">
                        <div class="verification-field">
                            <div class="verification-label">ID Number</div>
                            <div class="verification-value"><?php echo htmlspecialchars($id_value, ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                        <div class="verification-field">
                            <div class="verification-label">Username</div>
                            <div class="verification-value"><?php echo htmlspecialchars($username, ENT_QUOTES, 'UTF-8'); ?></div>
                        </div>
                    </div>
                </div>

                <input type="hidden" name="id_number" value="<?php echo htmlspecialchars($id_value, ENT_QUOTES, 'UTF-8'); ?>">
                
                <div style="margin-top: 16px;">
                    <label><?php echo htmlspecialchars($questions['a1'], ENT_QUOTES, 'UTF-8'); ?> <span class="req">*</span></label>
                    <input type="text" name="a1" placeholder="Your answer" required>
                </div>

                <div>
                    <label><?php echo htmlspecialchars($questions['a2'], ENT_QUOTES, 'UTF-8'); ?> <span class="req">*</span></label>
                    <input type="text" name="a2" placeholder="Your answer" required>
                </div>

                <div>
                    <label><?php echo htmlspecialchars($questions['a3'], ENT_QUOTES, 'UTF-8'); ?> <span class="req">*</span></label>
                    <input type="text" name="a3" placeholder="Your answer" required>
                </div>

                <button type="submit" name="verify">Verify Answers</button>
            <?php endif; ?>
        </form>

        <div class="auth-links">
            <p>Remembered it? <a class="muted-link" href="login.php">Back to login</a></p>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>

<script>
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

<style>
/* Verification Info Display - Card Style */
.verification-info {
  background: #f0f7ff;
  border: 1px solid #cfe9ff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.verification-header {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.verification-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.verification-field {
  display: flex;
  flex-direction: column;
}

.verification-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.verification-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e3a5f;
}

@media (max-width: 768px) {
  .verification-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>