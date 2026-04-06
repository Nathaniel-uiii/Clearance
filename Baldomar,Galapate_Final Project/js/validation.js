document.addEventListener('DOMContentLoaded', function() {
    var PV = typeof window !== 'undefined' && window.PRIME_VALIDATION ? window.PRIME_VALIDATION : null;

    // Name validation function
function validateName(name, fieldName) {
    if (name.trim() === '') {
        return fieldName + ' is required';
    }
    
    // Check for special characters
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(name)) {
        return fieldName + ' contains invalid characters';
    }
    
    // Check for double spaces
    if (/\s{2,}/.test(name)) {
        return fieldName + ' must not contain double spaces';
    }
    
    // Check for three consecutive identical letters
    if (/(.)\1{2,}/i.test(name)) {
        return fieldName + ' must not contain three consecutive identical letters';
    }
    
    // Check for all caps
    if (name === name.toUpperCase() && name.length > 1) {
        return fieldName + ' must not be ALL CAPS';
    }
    
    // SIMPLIFIED: Check proper capitalization - only check first character of the entire name
    const trimmedName = name.trim();
    if (trimmedName.length > 0) {
        const firstChar = trimmedName.charAt(0);
        if (firstChar !== firstChar.toUpperCase()) {
            return fieldName + ' must start with capital letter. Example: Juan';
        }
    }
    
    return true;
}

    // Generic debounce helper used for server-side uniqueness checks
    function debounce(fn, delay) {
        let t;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Real-time name validation
    // Middle name is optional — only validate first and last names on blur
    const nameFields = ['first_name', 'last_name'];
    nameFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                const fieldName = this.getAttribute('name').replace('_', ' ');
                const validation = validateName(this.value, fieldName);
                
                if (validation !== true) {
                    this.classList.add('input-error-field');
                    // Show error message
                    let errorElement = this.parentElement.querySelector('.field-error');
                    if (!errorElement) {
                        errorElement = document.createElement('div');
                        errorElement.className = 'field-error';
                        this.parentElement.appendChild(errorElement);
                    }
                    errorElement.textContent = validation;
                } else {
                    this.classList.remove('input-error-field');
                    const errorElement = this.parentElement.querySelector('.field-error');
                    if (errorElement) errorElement.remove();
                }
            });
        }
    });
    
        // Fallback: ensure optional middle name cannot trigger stale/cached listeners
        // Replace the middle name field node to strip any previously-attached event listeners
        const middleField = document.getElementById('middle_name');
        if (middleField && middleField.parentNode) {
            const middleClone = middleField.cloneNode(true);
            middleField.parentNode.replaceChild(middleClone, middleField);
            // Clear any existing error UI if present
            middleClone.classList.remove('input-error-field');
            const existingErr = middleClone.parentElement.querySelector('.field-error');
            if (existingErr) existingErr.remove();
        }

    // ID Number format validation
    const idField = document.getElementById('id_number');
    if (idField) {
        // (uses top-level debounce helper)

        async function checkIdExists(value, element) {
            // clear any previous dataset flags while checking
            delete element.dataset.exists;
            if (!value || !/^[0-9]{4}-[0-9]{4}$/.test(value)) {
                // invalid format: show format error
                element.classList.add('input-error-field');
                let errorElement = element.parentElement.querySelector('.field-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'field-error';
                    element.parentElement.appendChild(errorElement);
                }
                errorElement.textContent = 'ID Number must be in format xxxx-xxxx';
                return;
            }

            // remove format error before server check
            element.classList.remove('input-error-field');
            const oldErr = element.parentElement.querySelector('.field-error');
            if (oldErr) oldErr.remove();

            try {
                const res = await fetch('check_id.php?id_number=' + encodeURIComponent(value), {cache: 'no-store'});
                const data = await res.json();
                if (data.ok) {
                    if (data.exists) {
                        element.dataset.exists = '1';
                        element.classList.add('input-error-field');
                        let errorElement = element.parentElement.querySelector('.field-error');
                        if (!errorElement) {
                            errorElement = document.createElement('div');
                            errorElement.className = 'field-error';
                            element.parentElement.appendChild(errorElement);
                        }
                        errorElement.textContent = 'ID Number already registered';
                    } else {
                        element.dataset.exists = '0';
                        element.classList.remove('input-error-field');
                        const err = element.parentElement.querySelector('.field-error');
                        if (err) err.remove();
                    }
                }
            } catch (e) {
                // network error — don't block user, but clear any exists flag
                delete element.dataset.exists;
            }
        }

        const debouncedCheck = debounce(function() { checkIdExists(this.value.trim(), this); }, 450);
        idField.addEventListener('input', debouncedCheck);
        idField.addEventListener('blur', function() { checkIdExists(this.value.trim(), this); });
    }

    // Username uniqueness check
    const usernameField = document.getElementById('username');
    if (usernameField) {
        async function checkUsernameExists(value, element) {
            delete element.dataset.exists;
            if (!value || !/^[A-Za-z0-9_.\-]{8,16}$/.test(value)) {
                // invalid format — show format error
                element.classList.add('input-error-field');
                let errorElement = element.parentElement.querySelector('.field-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'field-error';
                    element.parentElement.appendChild(errorElement);
                }
                errorElement.textContent = 'Username must be 8-16 characters';
                return;
            }
            element.classList.remove('input-error-field');
            const oldErr = element.parentElement.querySelector('.field-error');
            if (oldErr) oldErr.remove();

            try {
                const res = await fetch('check_username.php?username=' + encodeURIComponent(value), {cache: 'no-store'});
                const data = await res.json();
                if (data.ok) {
                    if (data.exists) {
                        element.dataset.exists = '1';
                        element.classList.add('input-error-field');
                        let errorElement = element.parentElement.querySelector('.field-error');
                        if (!errorElement) {
                            errorElement = document.createElement('div');
                            errorElement.className = 'field-error';
                            element.parentElement.appendChild(errorElement);
                        }
                        errorElement.textContent = 'Username already taken';
                    } else {
                        element.dataset.exists = '0';
                        element.classList.remove('input-error-field');
                        const err = element.parentElement.querySelector('.field-error');
                        if (err) err.remove();
                    }
                }
            } catch (e) {
                delete element.dataset.exists;
            }
        }

        const debouncedUsername = debounce(function() { checkUsernameExists(this.value.trim(), this); }, 450);
        usernameField.addEventListener('input', debouncedUsername);
        usernameField.addEventListener('blur', function() { checkUsernameExists(this.value.trim(), this); });
    }

    // Age validation
    const birthdateField = document.getElementById('birthdate');
    if (birthdateField) {
        birthdateField.addEventListener('change', function() {
            const birthDate = new Date(this.value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            
            if (age < 18) {
                this.classList.add('input-error-field');
                let errorElement = this.parentElement.querySelector('.field-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'field-error';
                    this.parentElement.appendChild(errorElement);
                }
                errorElement.textContent = 'Must be 18 years or older';
            } else {
                this.classList.remove('input-error-field');
                const errorElement = this.parentElement.querySelector('.field-error');
                if (errorElement) errorElement.remove();
            }
        });
    }

    // Email validation + uniqueness check
    const emailField = document.getElementById('email');
    if (emailField) {
        async function checkEmailExists(value, element) {
            delete element.dataset.exists;
            var emailOk = value && (PV ? PV.isValidEmail(value) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
            if (!emailOk) {
                element.classList.add('input-error-field');
                let errorElement = element.parentElement.querySelector('.field-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'field-error';
                    element.parentElement.appendChild(errorElement);
                }
                errorElement.textContent = 'Please enter a valid email address';
                return;
            }

            element.classList.remove('input-error-field');
            const oldErr = element.parentElement.querySelector('.field-error');
            if (oldErr) oldErr.remove();

            try {
                const res = await fetch('check_email.php?email=' + encodeURIComponent(value), {cache: 'no-store'});
                const data = await res.json();
                if (data.ok) {
                    if (data.exists) {
                        element.dataset.exists = '1';
                        element.classList.add('input-error-field');
                        let errorElement = element.parentElement.querySelector('.field-error');
                        if (!errorElement) {
                            errorElement = document.createElement('div');
                            errorElement.className = 'field-error';
                            element.parentElement.appendChild(errorElement);
                        }
                        errorElement.textContent = 'Email already registered';
                    } else {
                        element.dataset.exists = '0';
                        element.classList.remove('input-error-field');
                        const err = element.parentElement.querySelector('.field-error');
                        if (err) err.remove();
                    }
                }
            } catch (e) {
                delete element.dataset.exists;
            }
        }

        const debouncedEmail = debounce(function() { checkEmailExists(this.value.trim(), this); }, 450);
        emailField.addEventListener('input', debouncedEmail);
        emailField.addEventListener('blur', function() { checkEmailExists(this.value.trim(), this); });
    }

    // Address fields (blur) — was incorrectly nested inside email fetch; must always register
    function validateAddressFormat(value) {
        if (!value || !value.trim()) return 'This field is required';
        const v = value.trim();
        if (/[^A-Za-z0-9\s\-\.,']/.test(v)) return 'Contains invalid characters';
        if (/\s{2,}/.test(v)) return 'Must not contain double spaces';
        if (/(.)\1{2,}/i.test(v)) return 'Must not contain three consecutive identical letters';
        const firstChar = v.charAt(0);
        if (firstChar !== firstChar.toUpperCase() || !/[A-Z]/.test(firstChar)) return 'Must start with a capital letter';
        return true;
    }

    ['street', 'barangay', 'city', 'province', 'country'].forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', function () {
            const res = validateAddressFormat(this.value);
            if (res !== true) {
                this.classList.add('input-error-field');
                let err = this.parentElement.querySelector('.field-error');
                if (!err) {
                    err = document.createElement('div');
                    err.className = 'field-error';
                    this.parentElement.appendChild(err);
                }
                err.textContent = res;
            } else {
                this.classList.remove('input-error-field');
                const err = this.parentElement.querySelector('.field-error');
                if (err) err.remove();
            }
        });
    });

    // Password uniqueness check
    const passwordField = document.getElementById('password');
    if (passwordField) {
        function showPasswordFormatError(element, message) {
            element.classList.add('input-error-field');
            let errorElement = element.parentElement.querySelector('.field-error');
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                element.parentElement.appendChild(errorElement);
            }
            errorElement.textContent = message;
        }

        function clearPasswordFormatError(element) {
            const err = element.parentElement.querySelector('.field-error');
            if (err && err.textContent !== 'Password already exists') {
                element.classList.remove('input-error-field');
                err.remove();
            }
        }

        passwordField.addEventListener('blur', function () {
            const v = this.value;
            if (!v) return;
            if (PV) {
                const perr = PV.validatePasswordForPrimeApi(v);
                if (perr) {
                    showPasswordFormatError(this, perr);
                    return;
                }
            } else if (v.length < 8) {
                showPasswordFormatError(this, 'Password must be at least 8 characters');
                return;
            }
            clearPasswordFormatError(this);
        });

        async function checkPasswordExists(value, element) {
            delete element.dataset.passwordExists;
            if (!value) return;
            if (PV) {
                if (PV.validatePasswordForPrimeApi(value) !== null) return;
            } else if (value.length < 8) {
                return;
            }

            try {
                const res = await fetch('check_password.php?password=' + encodeURIComponent(value), {cache: 'no-store'});
                const data = await res.json();
                if (data.ok) {
                    if (data.exists) {
                        element.dataset.passwordExists = '1';
                        element.classList.add('input-error-field');
                        let errorElement = element.parentElement.querySelector('.field-error');
                        if (!errorElement) {
                            errorElement = document.createElement('div');
                            errorElement.className = 'field-error';
                            element.parentElement.appendChild(errorElement);
                        }
                        errorElement.textContent = 'Password already exists';
                    } else {
                        element.dataset.passwordExists = '0';
                        // Only clear error if it's a password existence error
                        const existingError = element.parentElement.querySelector('.field-error');
                        if (existingError && existingError.textContent === 'Password already exists') {
                            element.classList.remove('input-error-field');
                            existingError.remove();
                        }
                    }
                }
            } catch (e) {
                delete element.dataset.passwordExists;
            }
        }

        const debouncedPassword = debounce(function() { checkPasswordExists(this.value.trim(), this); }, 200);
        passwordField.addEventListener('input', debouncedPassword);
        passwordField.addEventListener('blur', function() { checkPasswordExists(this.value.trim(), this); });
    }

    // Login form validation (identifier: ID xxxx-xxxx or username 8–16 chars; password: prime-api byte rules)
    const loginIdentifier = document.getElementById('login_identifier');
    const loginPassword = document.getElementById('login_password');

    function validateLoginIdentifier(value) {
        if (!value || value.trim() === '') {
            return 'Username/ID is required';
        }
        const v = value.trim();
        const idOk = /^[0-9]{4}-[0-9]{4}$/.test(v);
        const userOk = /^[A-Za-z0-9_.\-]{8,16}$/.test(v);
        if (!idOk && !userOk) {
            return 'Enter ID (xxxx-xxxx) or username (8–16 letters, numbers, _ . -)';
        }
        return true;
    }

    function validateLoginPasswordField(value) {
        if (!value || value.trim() === '') {
            return 'Password is required';
        }
        if (PV) {
            var bytes = PV.utf8ByteLength(value);
            if (bytes > PV.MAX_PASSWORD_BYTES) {
                return 'Password exceeds ' + PV.MAX_PASSWORD_BYTES + ' bytes';
            }
        }
        return true;
    }

    if (loginIdentifier) {
        loginIdentifier.addEventListener('blur', function() {
            const validation = validateLoginIdentifier(this.value);
            
            if (validation !== true) {
                this.classList.add('input-error-field');
                let errorElement = this.parentElement.querySelector('.field-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'field-error';
                    this.parentElement.appendChild(errorElement);
                }
                errorElement.textContent = validation;
            } else {
                this.classList.remove('input-error-field');
                const errorElement = this.parentElement.querySelector('.field-error');
                if (errorElement) errorElement.remove();
            }
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('blur', function() {
            const validation = validateLoginPasswordField(this.value);
            
            if (validation !== true) {
                this.classList.add('input-error-field');
                let errorElement = this.parentElement.querySelector('.field-error');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'field-error';
                    this.parentElement.appendChild(errorElement);
                }
                errorElement.textContent = validation;
            } else {
                this.classList.remove('input-error-field');
                const errorElement = this.parentElement.querySelector('.field-error');
                if (errorElement) errorElement.remove();
            }
        });
    }
});