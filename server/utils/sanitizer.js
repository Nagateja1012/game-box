/**
 * Input Sanitization Utility (Server-side)
 * Helps prevent XSS and other injection attacks by cleaning user input.
 */

const VALIDATION_TYPES = {
    ALPHABET: 'alphabet',
    ALPHANUMERIC: 'alphanumeric',
    SYMBOLS: 'symbols' // alphanumeric + common symbols
};

/**
 * Sanitizes a string based on the provided options.
 */
const sanitize = (input, options = {}) => {
    if (typeof input !== 'string') return '';

    const {
        maxLength = 50,
        allowedType = VALIDATION_TYPES.SYMBOLS,
        escapeHTML = true
    } = options;

    let cleaned = input;

    // 1. Filter by allowed type
    if (allowedType === VALIDATION_TYPES.ALPHABET) {
        cleaned = cleaned.replace(/[^a-zA-Z\s]/g, '');
    } else if (allowedType === VALIDATION_TYPES.ALPHANUMERIC) {
        cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    // 2. Enforce length
    cleaned = cleaned.substring(0, maxLength);

    // 3. Escape HTML to prevent XSS (Code Execution)
    if (escapeHTML) {
        cleaned = cleaned
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    return cleaned;
};

module.exports = {
    sanitize,
    VALIDATION_TYPES
};
