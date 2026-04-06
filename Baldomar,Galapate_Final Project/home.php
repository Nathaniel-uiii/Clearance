<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home | PRIME.</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<style>
    /* Home Hero Section - Better Spacing */
.hero-section {
  text-align: center;
}

.hero-section h1 {
  font-size: 32px;
  font-weight: 800;
  color: #1e3a5f;
  margin: 0 0 12px 0;
  letter-spacing: -1px;
  line-height: 1.2;
}

.hero-section p {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 20px 0;
  line-height: 1.6;
  font-weight: 500;
}

.hero-section div {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 0;
}

.hero-section button {
  padding: 11px 26px !important;
  font-size: 13px !important;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%) !important;
  color: #fff;
  box-shadow: 0 3px 10px rgba(14, 165, 233, 0.2);
  margin: 0 !important;
}

.hero-section button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(14, 165, 233, 0.25);
}

.hero-section a {
  text-decoration: none;
}

/* Auth Card - Adjusted for home page */
.auth-card {
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(200, 220, 240, 0.5);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.auth-card h2 {
  margin: 0 0 10px 0;
  color: #1e3a5f;
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.auth-card > p.auth-subtitle {
  color: #64748b;
  margin: 0 0 20px 0;
  font-size: 13px;
  text-align: center;
  line-height: 1.5;
}

/* Form spacing - tighter */
form > div {
  margin-bottom: 12px;
}

form input, form select, form button, form textarea {
  display: block;
  width: 100%;
  padding: 10px 12px;
  margin: 0;
  box-sizing: border-box;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid #ddd;
  background: #f8f9fa;
  color: #333;
  transition: all 0.3s;
}

form label {
  font-weight: 600;
  font-size: 12px;
  margin-bottom: 5px;
  display: block;
  color: #1e3a5f;
}

/* Button - compact */
button, .btn, input[type="submit"] {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
  border: none;
  padding: 11px 16px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s;
  box-shadow: 0 3px 10px rgba(14, 165, 233, 0.2);
  margin: 4px 0 0 0;
}

button:hover, .btn:hover, input[type="submit"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(14, 165, 233, 0.25);
}

/* Auth links - compact */
.auth-links {
  text-align: center;
  margin-top: 12px;
  font-size: 12px;
}

.auth-links p {
  margin: 6px 0;
  color: #1e3a5f;
}

.muted-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
  font-size: 12px;
}

.muted-link:hover {
  text-decoration: underline;
}

/* Remember Me Checkbox */
.remember-me-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 0;
}

.remember-me-wrapper input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  cursor: pointer;
  accent-color: var(--primary);
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f8f9fa;
}

.remember-me-wrapper input[type="checkbox"]:hover {
  border-color: var(--primary);
}

.remember-me-wrapper input[type="checkbox"]:checked {
  background: var(--primary);
  border-color: var(--primary);
}

.remember-me-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 0;
  user-select: none;
}

.remember-me-label:hover {
  color: var(--primary);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .auth-card {
    padding: 28px 20px;
    max-width: 100%;
  }

  .hero-section h1 {
    font-size: 24px;
  }

  .hero-section p {
    font-size: 13px;
    margin-bottom: 16px;
  }

  .hero-section button {
    padding: 10px 20px !important;
    font-size: 12px !important;
  }

  .auth-card h2 {
    font-size: 24px;
  }

  .auth-card > p.auth-subtitle {
    font-size: 12px;
  }
}
</style>
<body>
    <?php include 'header.php'; ?>

    <?php if(isset($_SESSION['form_error'])): ?>
        <div class="form-errors" id="alertBox"><?= htmlspecialchars($_SESSION['form_error']); unset($_SESSION['form_error']); ?></div>
    <?php endif; ?>
    <?php if(isset($_SESSION['success'])): ?>
        <div class="form-success" id="alertBox"><?= htmlspecialchars($_SESSION['success']); unset($_SESSION['success']); ?></div>
    <?php endif; ?>

    <main class="container auth-page">
        <div class="auth-card">
            <div class="hero-section">
                <h1>Welcome to PRIME.</h1>
                <p>Your secure platform for identity management and authentication</p>
                
                <?php if(isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true): ?>
                    <div>
                        <a href="dashboard.php" style="text-decoration: none;">
                            <button>Go to Dashboard</button>
                        </a>
                    </div>
                <?php else: ?>
                    <div>
                        <a href="login.php" style="text-decoration: none;">
                            <button>Log In</button>
                        </a>
                        <a href="sign.php" style="text-decoration: none;">
                            <button style="background: linear-gradient(135deg, var(--success) 0%, #15803d 100%);" id="homeRegisterBtn">Register</button>
                        </a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </main>

    <?php include 'footer.php'; ?>

    <script>
        // Check if lockout is active
        const lockoutRemaining = localStorage.getItem('lockoutRemaining');
        
        if (lockoutRemaining && parseInt(lockoutRemaining) > 0) {
            disableHomeRegisterButton();
            startLockoutTimer();
        }

        function disableHomeRegisterButton() {
            const homeRegisterBtn = document.getElementById('homeRegisterBtn');
            const headerRegisterBtn = document.querySelector('.top-nav a[href="sign.php"]');
            
            if (homeRegisterBtn) {
                homeRegisterBtn.style.pointerEvents = 'none';
                homeRegisterBtn.style.opacity = '0.5';
                homeRegisterBtn.style.cursor = 'not-allowed';
            }
            
            if (headerRegisterBtn) {
                headerRegisterBtn.style.pointerEvents = 'none';
                headerRegisterBtn.style.opacity = '0.5';
                headerRegisterBtn.style.cursor = 'not-allowed';
                headerRegisterBtn.title = 'Too many login attempts. Please try again later.';
            }
        }

        function enableHomeRegisterButton() {
            const homeRegisterBtn = document.getElementById('homeRegisterBtn');
            const headerRegisterBtn = document.querySelector('.top-nav a[href="sign.php"]');
            
            if (homeRegisterBtn) {
                homeRegisterBtn.style.pointerEvents = 'auto';
                homeRegisterBtn.style.opacity = '1';
                homeRegisterBtn.style.cursor = 'pointer';
            }
            
            if (headerRegisterBtn) {
                headerRegisterBtn.style.pointerEvents = 'auto';
                headerRegisterBtn.style.opacity = '1';
                headerRegisterBtn.style.cursor = 'pointer';
                headerRegisterBtn.title = '';
            }
        }

        function startLockoutTimer() {
            let remaining = parseInt(lockoutRemaining);
            const timer = setInterval(() => {
                remaining--;
                localStorage.setItem('lockoutRemaining', remaining);
                
                if (remaining <= 0) {
                    clearInterval(timer);
                    localStorage.removeItem('lockoutRemaining');
                    enableHomeRegisterButton();
                }
            }, 1000);
        }

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