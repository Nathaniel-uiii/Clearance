/**
 * Shared rules aligned with Clearance prime-api (FastAPI) + prime-next conventions.
 * Load before js/validation.js
 */
(function (global) {
  var MAX_PASSWORD_BYTES = 72;

  function utf8ByteLength(s) {
    return new TextEncoder().encode(s).length;
  }

  /** Same shape as browser type=email; matches prime-api EmailStr usage in practice. */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * @returns {string|null} Error message or null if OK.
   */
  function validatePasswordForPrimeApi(password) {
    if (!password) return "Password is required";
    var bytes = utf8ByteLength(password);
    if (bytes < 8) return "Password must be at least 8 characters";
    if (bytes > MAX_PASSWORD_BYTES) {
      return (
        "Password must be at most " +
        MAX_PASSWORD_BYTES +
        " bytes (bcrypt limit). Use a shorter password or fewer emoji/special characters."
      );
    }
    return null;
  }

  global.PRIME_VALIDATION = {
    MAX_PASSWORD_BYTES: MAX_PASSWORD_BYTES,
    utf8ByteLength: utf8ByteLength,
    isValidEmail: isValidEmail,
    validatePasswordForPrimeApi: validatePasswordForPrimeApi,
  };
})(typeof window !== "undefined" ? window : this);
