// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// Verifies token and attaches user to req.user
// ============================================

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Missing or invalid Authorization header. Use Bearer token.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Token is empty'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Please log in again'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please refresh your token'
            });
        }
        return res.status(500).json({
            error: 'Authentication error',
            message: 'Internal server error'
        });
    }
}

module.exports = requireAuth;