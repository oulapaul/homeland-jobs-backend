// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
}

// Kenyan phone validation (07XX or 2547XX format)
function isValidKenyanPhone(phone) {
    const phoneRegex = /^(07\d{8}|2547\d{8})$/;
    return phoneRegex.test(phone);
}

// Password validation: min 8 chars, at least 1 number, 1 uppercase
function isValidPassword(password) {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
}

// Role validation
function isValidRole(role) {
    return ['freelancer', 'employer'].includes(role);
}

// Budget validation
function isValidBudget(budget) {
    return typeof budget === 'number' && budget > 0;
}

// Category validation (simplified for assessment)
const validCategories = [
    'Frontend', 'Backend', 'Full Stack', 'Mobile', 
    'DevOps', 'Data Science', 'Design', 'Security', 'Management'
];

function isValidCategory(category) {
    return validCategories.includes(category);
}

const validLocations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Remote'];

function isValidLocation(location) {
    return validLocations.includes(location);
}

module.exports = {
    isValidEmail,
    isValidKenyanPhone,
    isValidPassword,
    isValidRole,
    isValidBudget,
    isValidCategory,
    isValidLocation,
    validCategories,
    validLocations
};