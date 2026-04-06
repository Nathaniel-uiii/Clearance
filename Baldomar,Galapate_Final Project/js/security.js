// Disable right-click context menu
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
    return false;
});

// Disable keyboard shortcuts for developer tools
document.addEventListener('keydown', function(event) {
    // Disable F12 (Developer Tools)
    if (event.key === 'F12') {
        event.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+I (Inspect Element)
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+C (Inspect Element - alternative)
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+J (Console)
    if (event.ctrlKey && event.shiftKey && event.key === 'J') {
        event.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+K (Console - Firefox)
    if (event.ctrlKey && event.shiftKey && event.key === 'K') {
        event.preventDefault();
        return false;
    }
    
    // Disable Ctrl+U (View Page Source)
    if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        return false;
    }
});

// Disable right-click on images
document.addEventListener('dragstart', function(event) {
    if (event.target.tagName === 'IMG') {
        event.preventDefault();
        return false;
    }
});

// Disable text selection on certain elements
document.addEventListener('selectstart', function(event) {
    if (event.target.tagName === 'BODY') {
        event.preventDefault();
        return false;
    }
});

const loginSecurity = {
    // Error tracking
    errorCountKey: 'loginErrorCount',
    lockoutTimeKey: 'loginLockoutTime',

    // Get current error count
    getErrorCount: function() {
        return parseInt(localStorage.getItem(this.errorCountKey) || 0);
    },

    // Increment error count
    incrementErrorCount: function() {
        const count = this.getErrorCount();
        localStorage.setItem(this.errorCountKey, count + 1);
    },

    // Reset error count
    resetErrorCount: function() {
        localStorage.removeItem(this.errorCountKey);
    },

    // Check if should lockout (after 3, 6, 9 errors)
    shouldLockout: function() {
        const count = this.getErrorCount();
        return count % 3 === 0 && count > 0;
    },

    // Get lockout duration based on error count
    getLockoutDuration: function() {
        const count = this.getErrorCount();
        const level = Math.ceil(count / 3);

        if (level === 1) {
            return 15; // First 3 errors: 15 seconds
        } else if (level === 2) {
            return 30; // Next 3 errors: 30 seconds
        } else {
            return 60; // Third set of 3 errors: 60 seconds
        }
    },

    // Set lockout
    setLockout: function(duration) {
        const lockoutEndTime = Date.now() + (duration * 1000);
        localStorage.setItem(this.lockoutTimeKey, lockoutEndTime);
    },

    // Check if currently locked out
    isLockedOut: function() {
        const lockoutTime = localStorage.getItem(this.lockoutTimeKey);
        if (!lockoutTime) {
            return false;
        }

        const now = Date.now();
        if (now < parseInt(lockoutTime)) {
            return true;
        }

        // Lockout has expired
        localStorage.removeItem(this.lockoutTimeKey);
        return false;
    },

    // Get remaining lockout time in seconds
    getRemainingLockoutTime: function() {
        const lockoutTime = localStorage.getItem(this.lockoutTimeKey);
        if (!lockoutTime) {
            return 0;
        }

        const remaining = Math.ceil((parseInt(lockoutTime) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
    },

    // Clear lockout
    clearLockout: function() {
        localStorage.removeItem(this.lockoutTimeKey);
    }
};

// Sample login function
function login(username, password) {
    // Replace with your own authentication logic
    if (username === 'admin' && password === 'password') {
        return {"success": true};
    } else {
        // Increment error count on failed login
        loginSecurity.incrementErrorCount();
        
        // Check and handle lockout
        if (loginSecurity.shouldLockout()) {
            const duration = loginSecurity.getLockoutDuration();
            loginSecurity.setLockout(duration);
            const remainingTime = loginSecurity.getRemainingLockoutTime();
            return {"success": false, "message": `Invalid credentials. Too many attempts. Please try again in ${remainingTime} seconds.`};
        }
        
        return {"success": false, "message": "Invalid credentials"};
    }
}
