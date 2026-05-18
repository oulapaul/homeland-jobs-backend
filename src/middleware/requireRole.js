// ============================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// Restricts access to specific user roles
// ============================================

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'You must be logged in to access this resource'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
                requiredRoles: allowedRoles
            });
        }

        next();
    };
}

module.exports = requireRole;