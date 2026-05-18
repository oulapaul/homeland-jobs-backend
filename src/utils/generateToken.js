// ============================================
// JWT TOKEN GENERATION
// ============================================

const jwt = require('jsonwebtoken');

function generateAccessToken(userId, role) {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

function generateRefreshToken(userId, role) {
    return jwt.sign(
        { userId, role, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
}

function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
};