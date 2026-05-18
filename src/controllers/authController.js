// ============================================
// AUTHENTICATION CONTROLLER
// Handles register, login, refresh, me
// ============================================

const bcrypt = require('bcrypt');
const { findUserByEmail, createUser, findUserById } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const { isValidEmail, isValidKenyanPhone, isValidPassword, isValidRole } = require('../utils/validationHelpers');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// POST /api/auth/register
async function register(req, res) {
    const { name, email, phone, password, role } = req.body;
    
    // Field-level validation
    const errors = [];
    
    if (!name || name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    }
    
    if (!email || !isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Valid email is required' });
    } else if (findUserByEmail(email)) {
        errors.push({ field: 'email', message: 'Email already registered' });
    }
    
    if (!phone || !isValidKenyanPhone(phone)) {
        errors.push({ field: 'phone', message: 'Valid Kenyan phone number required (07XX or 2547XX format)' });
    }
    
    if (!password || !isValidPassword(password)) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters, contain 1 uppercase letter and 1 number' });
    }
    
    if (!role || !isValidRole(role)) {
        errors.push({ field: 'role', message: 'Role must be either "freelancer" or "employer"' });
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
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
    
    // Return user without password
    const { password_hash, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
        message: 'User registered successfully',
        user: userWithoutPassword
    });
}

// POST /api/auth/login
async function login(req, res) {
    const { email, password } = req.body;
    
    const errors = [];
    
    if (!email) {
        errors.push({ field: 'email', message: 'Email is required' });
    }
    
    if (!password) {
        errors.push({ field: 'password', message: 'Password is required' });
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', errors });
    }
    
    const user = findUserByEmail(email.toLowerCase());
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    
    res.json({
        message: 'Login successful',
        accessToken,
        refreshToken
    });
}

// POST /api/auth/refresh
function refresh(req, res) {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    const user = findUserById(decoded.userId);
    
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    
    const newAccessToken = generateAccessToken(user.id, user.role);
    
    res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken
    });
}

// GET /api/auth/me
function getMe(req, res) {
    const user = findUserById(req.user.userId);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword });
}

module.exports = { register, login, refresh, getMe };