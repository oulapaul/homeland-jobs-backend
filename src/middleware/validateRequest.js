// ============================================
// INPUT VALIDATION MIDDLEWARE
// Validates request body against a schema
// ============================================

function validateRequest(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (!value || value.toString().trim() === '')) {
                errors.push({ field, message: `${field} is required` });
                continue;
            }

            if (value && rules.type && typeof value !== rules.type) {
                errors.push({ field, message: `${field} must be of type ${rules.type}` });
            }

            if (value && rules.minLength && value.length < rules.minLength) {
                errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
            }

            if (value && rules.maxLength && value.length > rules.maxLength) {
                errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
            }

            if (value && rules.pattern && !rules.pattern.test(value)) {
                errors.push({ field, message: rules.patternMessage || `${field} format is invalid` });
            }

            if (value && rules.min && value < rules.min) {
                errors.push({ field, message: `${field} must be at least ${rules.min}` });
            }

            if (value && rules.max && value > rules.max) {
                errors.push({ field, message: `${field} must be at most ${rules.max}` });
            }

            if (rules.custom) {
                const customError = rules.custom(value);
                if (customError) {
                    errors.push({ field, message: customError });
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                errors
            });
        }

        next();
    };
}

module.exports = { validateRequest };