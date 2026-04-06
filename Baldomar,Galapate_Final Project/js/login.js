document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorCount = document.getElementById('errorCount');
    const forgotPasswordDiv = document.getElementById('forgotPasswordDiv');
    const registerLink = document.getElementById('registerLink');
    const timerDisplay = document.getElementById('timerDisplay');
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');

    // Disable browser back button
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function() {
        history.pushState(null, null, location.href);
    });

    // Initialize UI state
    initializeUIState();

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Check if user is locked out
        if (loginSecurity.isLockedOut()) {
            const remainingTime = loginSecurity.getRemainingLockoutTime();
            errorMessage.textContent = `Account locked. Please try again in ${remainingTime} seconds.`;
            timerDisplay.style.display = 'block';
            updateTimerDisplay();
            return;
        }

        const username = usernameField.value.trim();
        const password = passwordField.value.trim();

        // Basic validation
        if (!username || !password) {
            errorMessage.textContent = 'Username and password are required.';
            return;
        }

        // Disable button during submission
        loginBtn.disabled = true;

        // Send login request to server
        fetch('process_login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                errorMessage.textContent = '';
                loginSecurity.resetErrorCount();
                errorCount.textContent = '';
                forgotPasswordDiv.style.display = 'none';
                // Redirect to dashboard
                window.location.href = 'dashboard.php';
            } else {
                // Increment error count
                loginSecurity.incrementErrorCount();
                const errors = loginSecurity.getErrorCount();
                
                // Show forgot password after 2 errors
                if (errors >= 2) {
                    forgotPasswordDiv.style.display = 'block';
                }

                // Check for lockout after 3, 6, 9 errors
                if (loginSecurity.shouldLockout()) {
                    const lockoutDuration = loginSecurity.getLockoutDuration();
                    loginSecurity.setLockout(lockoutDuration);
                    errorMessage.textContent = `Too many failed attempts. Account locked for ${lockoutDuration} seconds.`;
                    timerDisplay.style.display = 'block';
                    disableLoginElements();
                    updateTimerDisplay();
                } else {
                    errorMessage.textContent = data.message || 'Invalid username or password.';
                    updateErrorCount();
                    loginBtn.disabled = false;
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            errorMessage.textContent = 'An error occurred. Please try again.';
            loginBtn.disabled = false;
        });
    });

    function updateErrorCount() {
        const count = loginSecurity.getErrorCount();
        const remaining = 3 - (count % 3);
        errorCount.textContent = `Failed attempts: ${count} (${remaining} more attempt${remaining !== 1 ? 's' : ''} before lockout)`;
    }

    function updateTimerDisplay() {
        if (!loginSecurity.isLockedOut()) {
            timerDisplay.style.display = 'none';
            enableLoginElements();
            return;
        }

        const remainingTime = loginSecurity.getRemainingLockoutTime();
        timerDisplay.textContent = `🔒 Locked out. Try again in ${remainingTime} seconds`;

        if (remainingTime > 0) {
            setTimeout(updateTimerDisplay, 1000);
        } else {
            loginSecurity.clearLockout();
            timerDisplay.style.display = 'none';
            enableLoginElements();
            errorMessage.textContent = '';
            errorCount.textContent = '';
            usernameField.value = '';
            passwordField.value = '';
        }
    }

    function disableLoginElements() {
        loginBtn.disabled = true;
        registerLink.classList.add('disabled');
    }

    function enableLoginElements() {
        loginBtn.disabled = false;
        registerLink.classList.remove('disabled');
    }

    function initializeUIState() {
        if (loginSecurity.isLockedOut()) {
            disableLoginElements();
            const remainingTime = loginSecurity.getRemainingLockoutTime();
            errorMessage.textContent = `Account locked. Please try again in ${remainingTime} seconds.`;
            timerDisplay.style.display = 'block';
            updateTimerDisplay();
        }
    }
});