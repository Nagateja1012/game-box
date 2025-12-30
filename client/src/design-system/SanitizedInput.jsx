import React from 'react';
import { sanitize, VALIDATION_TYPES } from '../utils/sanitizer';

/**
 * A secure input component that automatically sanitizes input.
 */
const SanitizedInput = ({
    value,
    onChange,
    maxLength = 50,
    allowedType = VALIDATION_TYPES.SYMBOLS,
    escapeHTML = true,
    ...props
}) => {

    const handleChange = (e) => {
        const rawValue = e.target.value;
        // Apply sanitization
        const sanitizedValue = sanitize(rawValue, {
            maxLength,
            allowedType,
            escapeHTML: false // Don't escape while typing to avoid weird UI behavior, 
            // but length and type filters will work.
            // Final escaping should happen before submission or on the server.
        });

        onChange(sanitizedValue);
    };

    return (
        <input
            {...props}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
        />
    );
};

export { VALIDATION_TYPES };
export default SanitizedInput;
