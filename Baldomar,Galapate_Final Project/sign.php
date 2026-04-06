<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Register | PRIME.</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="js/primeValidationCore.js" defer></script>
    <script src="js/appointmentSchedule.js" defer></script>
    <script src="js/validation.js" defer></script>
</head>
<body>
    <?php include 'header.php'; ?>

    <main class="container auth-page">
        <div class="auth-card">
            <h2>Create Account</h2>
            <p class="auth-subtitle">Join PRIME. today and secure your identity</p>

            <?php if(isset($_SESSION['error'])): ?>
                <div class="form-errors">
                    <?php 
                    echo htmlspecialchars($_SESSION['error']); 
                    unset($_SESSION['error']);
                    ?>
                </div>
            <?php endif; ?>

            <!-- Progress Bar -->
            <div class="progressbar">
                <div class="progress-step active" id="step1-indicator">Personal Info</div>
                <div class="progress-step" id="step2-indicator">Address Info</div>
                <div class="progress-step" id="step3-indicator">Account Info</div>
                <div class="progress-step" id="step4-indicator">Security Questions</div>
            </div>

            <form id="registerForm" action="signup_process.php" method="post" novalidate>
                
                <!-- Step 1: Personal Information -->
                <div class="form-step active" id="step1">
                    <div class="form-step-content">
                        <fieldset>
                            <legend>Personal Information</legend>
                            <div class="form-grid">
                                <div>
                                    <label>ID Number <span class="req">*</span></label>
                                    <input type="text" name="id_number" id="id_number" placeholder="xxxx-xxxx" required
                                           pattern="[0-9]{4}-[0-9]{4}" title="Format: 4 digits - 4 digits (e.g., 2025-0001)">
                                    <div class="help-text">Format: 4 digits - 4 digits (e.g., 2025-0001)</div>
                                </div>
                                <div>
                                    <label>First Name <span class="req">*</span></label>
                                    <input type="text" name="first_name" id="first_name" required placeholder="Juan"
                                           pattern="[A-Za-z\s\-']+" title="Only letters, spaces, hyphens, and apostrophes allowed">
                                </div>
                                <!-- Middle Name - Optional but with validation -->
                                <div>
                                    <label>Middle Name <span class="opt">optional</span></label>
                                    <input type="text" name="middle_name" id="middle_name" placeholder="Manuel"
                                           pattern="[A-Za-z\s\-']*" title="Only letters, spaces, hyphens, and apostrophes allowed">
                                </div>
                                <div>
                                    <label>Last Name <span class="req">*</span></label>
                                    <input type="text" name="last_name" id="last_name" required placeholder="Dela Cruz"
                                           pattern="[A-Za-z\s\-']+" title="Only letters, spaces, hyphens, and apostrophes allowed">
                                </div>
                                <div>
                                    <label>Extension <span class="opt">optional</span></label>
                                    <select name="extension" id="extension">
                                        <option value="">None</option>
                                        <option value="I">I</option>
                                        <option value="II">II</option>
                                        <option value="III">III</option>
                                        <option value="IV">IV</option>
                                        <option value="V">V</option>
                                        <option value="JR">JR</option>
                                        <option value="SR">SR</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Birthdate <span class="req">*</span></label>
                                    <input type="date" name="birthdate" id="birthdate" required max="<?php echo date('Y-m-d', strtotime('-18 years')); ?>">
                                    <div class="help-text">Must be 18 years or older</div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    
                    <div class="step-buttons">
                        <div></div>
                        <button type="button" onclick="nextStep(2)">Next →</button>
                    </div>
                </div>

                <!-- Step 2: Address Information -->
                <div class="form-step" id="step2">
                    <div class="form-step-content">
                        <fieldset>
                            <legend>Address Information</legend>
                            <div class="form-grid">
                                <div>
                                    <label>Street/Purok <span class="req">*</span></label>
                                    <input type="text" name="street" id="street" required 
                                           pattern="[A-Za-z0-9\s\-\.,]+" title="Only letters, numbers, spaces, hyphens, commas, and periods allowed">
                                </div>
                                <div>
                                    <label>Barangay <span class="req">*</span></label>
                                    <input type="text" name="barangay" id="barangay" required
                                           pattern="[A-Za-z\s\-]+" title="Only letters, spaces, and hyphens allowed">
                                </div>
                                <div>
                                    <label>City/Municipality <span class="req">*</span></label>
                                    <input type="text" name="city" id="city" required
                                           pattern="[A-Za-z\s\-]+" title="Only letters, spaces, and hyphens allowed">
                                </div>
                                <div>
                                    <label>Province <span class="req">*</span></label>
                                    <input type="text" name="province" id="province" required
                                           pattern="[A-Za-z\s\-]+" title="Only letters, spaces, and hyphens allowed">
                                </div>
                                <div>
                                    <label>Country <span class="req">*</span></label>
                                    <input type="text" name="country" id="country" value="Philippines" required
                                           pattern="[A-Za-z\s\-]+" title="Only letters, spaces, and hyphens allowed">
                                </div>
                                <div>
                                    <label>ZIP Code <span class="req">*</span></label>
                                    <input type="text" name="zip" id="zip" required
                                           pattern="[0-9]{4}" title="4-digit ZIP code required">
                                    <div class="help-text">4-digit ZIP code (e.g., 8605)</div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    
                    <div class="step-buttons">
                        <button type="button" onclick="prevStep(1)">← Back</button>
                        <button type="button" onclick="nextStep(3)">Next →</button>
                    </div>
                </div>

                <!-- Step 3: Account Information -->
                <div class="form-step" id="step3">
                    <div class="form-step-content">
                        <fieldset>
                            <legend>Account Information</legend>
                            <div class="form-grid">
                                <div>
                                    <label>Email <span class="req">*</span></label>
                                    <input type="email" name="email" id="email" required placeholder="example@email.com">
                                </div>
                                <div>
                                    <label>Username <span class="req">*</span></label>
                     <input type="text" name="username" id="username" required placeholder="john_doe_2024"
                         pattern="[A-Za-z0-9_.\-]{8,16}" minlength="8" maxlength="16" title="Username: 8-16 characters; letters, numbers, underscore, dot, dash allowed">
                                </div>
                                <div>
                                    <label>Password <span class="req">*</span></label>
                                    <div class="password-wrapper">
                                        <input type="password" name="password" id="password" required minlength="8" maxlength="128" placeholder="Min. 8 characters, max 72 bytes" title="Matches Clearance API: max 72 UTF-8 bytes (bcrypt)">
                                        <span class="toggle-pwd" onclick="togglePassword('password')">Show</span>
                                    </div>
                                    <meter id="pwdStrength" min="0" max="4" value="0"></meter>
                                    <div id="pwdText" class="help-text">Password strength: Very weak</div>
                                </div>
                                <div>
                                    <label>Re-enter Password <span class="req">*</span></label>
                                    <div class="password-wrapper">
                                        <input type="password" name="confirm_password" id="confirm_password" required minlength="8" maxlength="128" placeholder="Confirm password">
                                        <span class="toggle-pwd" onclick="togglePassword('confirm_password')">Show</span>
                                    </div>
                                    <div id="pwdMatch" class="match-indicator"></div>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    
                    <div class="step-buttons">
                        <button type="button" onclick="prevStep(2)">← Back</button>
                        <button type="button" onclick="nextStep(4)">Next →</button>
                    </div>
                </div>

                <!-- Step 4: Security Questions -->
                <div class="form-step1" id="step4">
                    <div class="form-step-content1">
                        <fieldset>
                            <legend>Security Questions</legend>
                            <p class="help-text1">These questions will help verify your identity if you forget your password.</p>
                            <div class="form-grid1">
                                <div class="span-2 security-question-group1">
                                    <label>Security Question 1 <span class="req1">*</span></label>
                                    <select name="question1" required>
                                        <option value="Who is your best friend in Elementary?">Who is your best friend in Elementary?</option>
                                        <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                                        <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                                    </select>
                                    <input type="text" name="auth_a1" placeholder="Your answer" required>
                                </div>
                                <div class="span-2 security-question-group1">
                                    <label>Security Question 2 <span class="req1">*</span></label>
                                    <select name="question2" required>
                                        <option value="What is the name of your favorite pet?">What is the name of your favorite pet?</option>
                                        <option value="What is your favorite book?">What is your favorite book?</option>
                                        <option value="What city were you born in?">What city were you born in?</option>
                                    </select>
                                    <input type="text" name="auth_a2" placeholder="Your answer" required>
                                </div>
                                <div class="span-2 security-question-group1">
                                    <label>Security Question 3 <span class="req1">*</span></label>
                                    <select name="question3" required>
                                        <option value="Who is your favorite teacher in high school?">Who is your favorite teacher in high school?</option>
                                        <option value="What is your favorite food?">What is your favorite food?</option>
                                        <option value="What was your childhood nickname?">What was your childhood nickname?</option>
                                    </select>
                                    <input type="text" name="auth_a3" placeholder="Your answer" required>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    
                    <div class="step-buttons">
                        <button type="button" onclick="prevStep(3)">← Back</button>
                        <button type="submit" id="registerBtn">Create Account</button>
                    </div>
                </div>
            </form>

            <p class="auth-subtitle login-prompt">
                Already have an account? <a class="muted-link" href="login.php">Log in here</a>
            </p>
        </div>
    </main>

    <?php include 'footer.php'; ?>

    <script>
        let currentStep = 1;

        function showStep(step) {
            document.querySelectorAll('.form-step').forEach(stepEl => {
                stepEl.classList.remove('active');
            });
            
            document.getElementById(`step${step}`).classList.add('active');
            
            document.querySelectorAll('.progress-step').forEach((indicator, index) => {
                indicator.classList.remove('active', 'completed');
                if (index + 1 < step) {
                    indicator.classList.add('completed');
                } else if (index + 1 === step) {
                    indicator.classList.add('active');
                }
            });
            
            currentStep = step;
        }

        function nextStep(step) {
            if (validateStep(currentStep)) {
                showStep(step);
            }
        }

        function prevStep(step) {
            showStep(step);
        }

        function primePasswordValidationMessage(pw) {
            if (typeof TextEncoder === 'undefined') return null;
            const enc = new TextEncoder().encode(pw || '');
            if (enc.length < 8) return 'Password must be at least 8 characters';
            if (enc.length > 72) {
                return 'Password must be at most 72 bytes (bcrypt limit). Use fewer characters or avoid long multi-byte symbols.';
            }
            return null;
        }

        function validateStep(step) {
            let isValid = true;
            
            if (step === 1) {
                // Personal info validation
                const fields = [
                    {id: 'first_name', name: 'First name'},
                    {id: 'last_name', name: 'Last name'},
                    {id: 'id_number', name: 'ID Number'},
                    {id: 'birthdate', name: 'Birthdate'}
                ];
                
                fields.forEach(field => {
                    const element = document.getElementById(field.id);
                    if (!element.value.trim()) {
                        showFieldError(element, `${field.name} is required`);
                        isValid = false;
                    } else {
                        clearFieldError(element);
                    }
                });

                // Name capitalization validation
                const firstName = document.getElementById('first_name');
                const lastName = document.getElementById('last_name');
                const middleName = document.getElementById('middle_name');

                function validateNameCapitalization(nameField, fieldName) {
                    if (!nameField.value.trim()) return true; // skip if empty
                    const name = nameField.value.trim();
                    
                    // Check if all uppercase
                    if (name === name.toUpperCase() && /[A-Z]/.test(name)) {
                        return `${fieldName} must not be ALL CAPS`;
                    }
                    
                    // Check proper capitalization (first letter uppercase, rest lowercase per word)
                    const words = name.split(/\s+/);
                    for (let word of words) {
                        if (word.length === 0) continue;
                        const first = word.charAt(0);
                        const rest = word.slice(1);
                        if (first !== first.toUpperCase() || (rest && rest !== rest.toLowerCase())) {
                            return `${fieldName} must be Capitalized properly. Example: Juan`;
                        }
                    }
                    return true;
                }

                // Validate first name
                const firstNameError = validateNameCapitalization(firstName, 'First name');
                if (firstNameError !== true) {
                    showFieldError(firstName, firstNameError);
                    isValid = false;
                }

                // Validate last name
                const lastNameError = validateNameCapitalization(lastName, 'Last name');
                if (lastNameError !== true) {
                    showFieldError(lastName, lastNameError);
                    isValid = false;
                }
                
                // Validate middle name (optional but if filled, validate format)
                if (middleName && middleName.value.trim()) {
                    const middleNameValue = middleName.value.trim();
                    
                    // Check for numbers
                    if (/[0-9]/.test(middleNameValue)) {
                        showFieldError(middleName, 'Middle name must not contain numbers');
                        isValid = false;
                    } 
                    // Check for invalid special characters (allow only letters, spaces, hyphens, apostrophes)
                    else if (!/^[A-Za-z\s\-']+$/.test(middleNameValue)) {
                        showFieldError(middleName, 'Middle name contains invalid characters');
                        isValid = false;
                    } else {
                        clearFieldError(middleName);
                    }
                } else if (middleName) {
                    clearFieldError(middleName);
                }
                
                // ID Number format validation
                const idNumber = document.getElementById('id_number');
                if (idNumber.value && !/^[0-9]{4}-[0-9]{4}$/.test(idNumber.value)) {
                    showFieldError(idNumber, 'ID Number must be in format xxxx-xxxx');
                    isValid = false;
                }
                // Client-side uniqueness check result (set by js/validation.js)
                if (idNumber && idNumber.dataset && idNumber.dataset.exists === '1') {
                    showFieldError(idNumber, 'ID Number already registered');
                    isValid = false;
                } else if (idNumber && idNumber.dataset && idNumber.dataset.exists === '0') {
                    // clear any previous error if server reported not exists
                    clearFieldError(idNumber);
                }
                
                // Age validation
                const birthdate = document.getElementById('birthdate');
                if (birthdate.value) {
                    const birthDate = new Date(birthdate.value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    if (age < 18) {
                        showFieldError(birthdate, 'Must be 18 years or older');
                        isValid = false;
                    }
                }
            }
            
            if (step === 2) {
                // Address validation
                const addressFields = [
                    {id: 'street', name: 'Street/Purok'},
                    {id: 'barangay', name: 'Barangay'},
                    {id: 'city', name: 'City/Municipality'},
                    {id: 'province', name: 'Province'},
                    {id: 'country', name: 'Country'},
                    {id: 'zip', name: 'ZIP Code'}
                ];
                
                addressFields.forEach(field => {
                    const element = document.getElementById(field.id);
                    if (!element.value.trim()) {
                        showFieldError(element, `${field.name} is required`);
                        isValid = false;
                    } else {
                        clearFieldError(element);
                    }
                });
                
                // Additional address format checks: must start with capital, no double spaces, no 3 consecutive identical letters
                function addrFormatError(value, fieldLabel) {
                    const v = value.trim();
                    if (/[^A-Za-z0-9\s\-\.,']/.test(v)) return `${fieldLabel} contains invalid characters`;
                    if (/\s{2,}/.test(v)) return `${fieldLabel} must not contain double spaces`;
                    if (/(.)\1{2,}/i.test(v)) return `${fieldLabel} must not contain three consecutive identical letters`;
                    const first = v.charAt(0);
                    if (first !== first.toUpperCase() || !/[A-Z]/.test(first)) return `${fieldLabel} must start with a capital letter`;
                    return true;
                }

                ['street','barangay','city','province','country'].forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    const err = addrFormatError(el.value, el.getAttribute('name') || id);
                    if (err !== true) {
                        showFieldError(el, err);
                        isValid = false;
                    } else {
                        clearFieldError(el);
                    }
                });

                // ZIP code validation
                const zip = document.getElementById('zip');
                if (zip.value && !/^[0-9]{4}$/.test(zip.value)) {
                    showFieldError(zip, 'ZIP code must be 4 digits');
                    isValid = false;
                }
            }
            
            if (step === 3) {
                // Account info validation
                const username = document.getElementById('username');
                const email = document.getElementById('email');
                const password = document.getElementById('password');
                const confirmPassword = document.getElementById('confirm_password');
                
                // Username validation
                if (!username || !username.value.trim() || username.value.length < 8 || username.value.length > 16 || !/^[A-Za-z0-9_.\-]{8,16}$/.test(username.value)) {
                    showFieldError(username || email, 'Valid username is required (8-16 chars)');
                    isValid = false;
                } else {
                    clearFieldError(username);
                }

                if (!email.value.trim() || !isValidEmail(email.value)) {
                    showFieldError(email, 'Valid email is required');
                    isValid = false;
                } else {
                    clearFieldError(email);
                }

                // Uniqueness checks set by js/validation.js
                if (username && username.dataset && username.dataset.exists === '1') {
                    showFieldError(username, 'Username already taken');
                    isValid = false;
                } else if (username && username.dataset && username.dataset.exists === '0') {
                    clearFieldError(username);
                }

                if (email && email.dataset && email.dataset.exists === '1') {
                    showFieldError(email, 'Email already registered');
                    isValid = false;
                } else if (email && email.dataset && email.dataset.exists === '0') {
                    clearFieldError(email);
                }

                // Password uniqueness check
                if (password && password.dataset && password.dataset.passwordExists === '1') {
                    showFieldError(password, 'Password already exists');
                    isValid = false;
                } else if (password && password.dataset && password.dataset.passwordExists === '0') {
                    const existingError = password.parentElement.querySelector('.field-error');
                    if (existingError && existingError.textContent === 'Password already exists') {
                        clearFieldError(password);
                    }
                }
                
                const pwMsg = primePasswordValidationMessage(password.value);
                if (pwMsg) {
                    showFieldError(password, pwMsg);
                    isValid = false;
                } else {
                    clearFieldError(password);
                }
                
                if (password.value !== confirmPassword.value) {
                    showFieldError(confirmPassword, 'Passwords do not match');
                    isValid = false;
                } else {
                    clearFieldError(confirmPassword);
                }
            }

            if (step === 4) {
                // Security questions answers validation
                const a1 = document.querySelector('input[name="auth_a1"]');
                const a2 = document.querySelector('input[name="auth_a2"]');
                const a3 = document.querySelector('input[name="auth_a3"]');

                if (!a1 || !a2 || !a3) {
                    isValid = false;
                } else {
                    if (!a1.value.trim()) {
                        showFieldError(a1, 'Answer to question 1 is required');
                        isValid = false;
                    } else {
                        clearFieldError(a1);
                    }
                    if (!a2.value.trim()) {
                        showFieldError(a2, 'Answer to question 2 is required');
                        isValid = false;
                    } else {
                        clearFieldError(a2);
                    }
                    if (!a3.value.trim()) {
                        showFieldError(a3, 'Answer to question 3 is required');
                        isValid = false;
                    } else {
                        clearFieldError(a3);
                    }
                }
            }
            
            return isValid;
        }

        function showFieldError(field, message) {
            field.classList.add('input-error-field');
            const existingError = field.parentElement.querySelector('.field-error');
            if (existingError) existingError.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.style.color = 'var(--error)';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '-10px';
            errorDiv.style.marginBottom = '10px';
            errorDiv.textContent = message;
            field.parentElement.appendChild(errorDiv);
        }

        function clearFieldError(field) {
            field.classList.remove('input-error-field');
            const existingError = field.parentElement.querySelector('.field-error');
            if (existingError) existingError.remove();
        }

        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        function togglePassword(fieldId) {
            const field = document.getElementById(fieldId);
            const toggle = field.parentElement.querySelector('.toggle-pwd');
            if (field.type === 'password') {
                field.type = 'text';
                toggle.textContent = 'Hide';
            } else {
                field.type = 'password';
                toggle.textContent = 'Show';
            }
        }

        // Password strength meter
        document.getElementById('password')?.addEventListener('input', function() {
            const password = this.value;
            const meter = document.getElementById('pwdStrength');
            const text = document.getElementById('pwdText');
            
            let score = 0;
            if (password.length >= 8) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[0-9]/.test(password)) score++;
            if (/[^A-Za-z0-9]/.test(password)) score++;
            
            meter.value = score;
            
            const descriptions = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
            const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#16a34a'];
            
            text.textContent = `Password strength: ${descriptions[score]}`;
            text.style.color = colors[score];
        });

        // Password match indicator
        document.getElementById('confirm_password')?.addEventListener('input', function() {
            const password = document.getElementById('password').value;
            const confirmPassword = this.value;
            const matchIndicator = document.getElementById('pwdMatch');
            
            if (confirmPassword === '') {
                matchIndicator.textContent = '';
                matchIndicator.className = 'match-indicator';
            } else if (password === confirmPassword) {
                matchIndicator.textContent = '✓ Passwords match';
                matchIndicator.className = 'match-indicator ok';
            } else {
                matchIndicator.textContent = '✗ Passwords do not match';
                matchIndicator.className = 'match-indicator bad';
            }
        });

        // Real-time password validation
        document.getElementById('password')?.addEventListener('blur', function() {
            const msg = primePasswordValidationMessage(this.value);
            if (msg) {
                showFieldError(this, msg);
            } else {
                clearFieldError(this);
            }
        });

        document.getElementById('password')?.addEventListener('input', function() {
            if (!primePasswordValidationMessage(this.value)) {
                clearFieldError(this);
            }
        });

        // Final form submit validation: validate all steps before submitting
        document.getElementById('registerForm')?.addEventListener('submit', function(e) {
            // Validate every step in order; show first invalid step
            for (let s = 1; s <= 4; s++) {
                if (!validateStep(s)) {
                    e.preventDefault();
                    showStep(s);
                    // focus first invalid input in that step
                    const firstErr = document.querySelector('#step' + s + ' .input-error-field');
                    if (firstErr) firstErr.focus();
                    return false;
                }
            }
            // all steps valid — allow submit
            return true;
        });
    </script>
</body>
</html>