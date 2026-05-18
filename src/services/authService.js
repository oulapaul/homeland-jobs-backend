// ============================================
// AUTHENTICATION SERVICE
// Business logic for authentication operations
// ============================================

const bcrypt = require('bcrypt');
const { findUserByEmail, createUser, findUserById } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const { isValidEmail, isValidKenyanPhone, isValidPassword, isValidRole } = require('../utils/validationHelpers');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Register a new user
 * @param {Object} userData - {name, email, phone, password, role}
 * @returns {Object} { success, user, errors }
 */
async function registerUser(userData) {
    const { name, email, phone, password, role } = userData;
    
    const errors = [];
    
    // Validate name
    if (!name || name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    }
    
    // Validate email
    if (!email || !isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Valid email is required' });
    } else if (findUserByEmail(email.toLowerCase())) {
        errors.push({ field: 'email', message: 'Email already registered' });
    }
    
    // Validate phone (Kenyan format)
    if (!phone || !isValidKenyanPhone(phone)) {
        errors.push({ field: 'phone', message: 'Valid Kenyan phone number required (07XX or 2547XX format)' });
    }
    
    // Validate password
    if (!password || !isValidPassword(password)) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters, contain 1 uppercase letter and 1 number' });
    }
    
    // Validate role
    if (!role || !isValidRole(role)) {
        errors.push({ field: 'role', message: 'Role must be either "freelancer" or "employer"' });
    }
    
    if (errors.length > 0) {
        return { success: false, errors };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Create user
    const newUser = createUser({
        name: name.trim(),
        email: email.toLowerCase(),
        phone,
        password_hash: hashedPassword,
        role
    });
    
    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = newUser;
    
    return {
        success: true,
        user: userWithoutPassword,
        message: 'User registered successfully'
    };
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} { success, accessToken, refreshToken, error }
 */
async function loginUser(email, password) {
    if (!email || !password) {
        return {
            success: false,
            error: 'Email and password are required',
            statusCode: 400
        };
    }
    
    const user = findUserByEmail(email.toLowerCase());
    
    if (!user) {
        return {
            success: false,
            error: 'Invalid email or password',
            statusCode: 401
        };
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
        return {
            success: false,
            error: 'Invalid email or password',
            statusCode: 401
        };
    }
    
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    
    return {
        success: true,
        accessToken,
        refreshToken,
        message: 'Login successful'
    };
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} { success, accessToken, error }
 */
function refreshAccessToken(refreshToken) {
    if (!refreshToken) {
        return {
            success: false,
            error: 'Refresh token is required',
            statusCode: 400
        };
    }
    
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
        return {
            success: false,
            error: 'Invalid or expired refresh token',
            statusCode: 401
        };
    }
    
    const user = findUserById(decoded.userId);
    
    if (!user) {
        return {
            success: false,
            error: 'User not found',
            statusCode: 401
        };
    }
    
    const newAccessToken = generateAccessToken(user.id, user.role);
    
    return {
        success: true,
        accessToken: newAccessToken,
        message: 'Token refreshed successfully'
    };
}

/**
 * Get current user profile
 * @param {number} userId - User ID
 * @returns {Object} { success, user, error }
 */
function getCurrentUser(userId) {
    const user = findUserById(userId);
    
    if (!user) {
        return {
            success: false,
            error: 'User not found',
            statusCode: 404
        };
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
        success: true,
        user: userWithoutPassword
    };
}

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    getCurrentUser
};