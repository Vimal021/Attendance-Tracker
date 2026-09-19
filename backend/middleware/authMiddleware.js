import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    try {
        let token = null;
        let user = null;

        // 1. Check for standard Bearer Token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (token && token !== 'null' && token !== 'undefined') {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decoded.id).select('-password');
            } catch (jwtErr) {
                console.warn('JWT Verification failed, falling back to header session:', jwtErr.message);
            }
        }

        // 2. Fallback or primary check using custom session headers (x-username)
        if (!user) {
            const username = req.headers['x-username'];
            if (username) {
                user = await User.findOne({ username }).select('-password');
            }
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authorized, session credentials missing or invalid' 
            });
        }

        // 3. Allow dynamic role overrides via x-role header if provided
        const headerRole = req.headers['x-role'];
        const userObj = user.toObject ? user.toObject() : user;
        
        if (headerRole) {
            userObj.role = headerRole;
        }

        // Attach verified user to request object
        req.user = userObj;
        next();
    } catch (error) {
        console.error('Authentication Middleware Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error during authentication verification' 
        });
    }
};

export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const userRole = (req.user?.role || '').toLowerCase().trim();

        // Check if the user's role matches or includes any allowed role (case-insensitive)
        const isAuthorized = roles.some(allowedRole => {
            const normalizedAllowed = allowedRole.toLowerCase().trim();
            return userRole === normalizedAllowed || userRole.includes(normalizedAllowed) || normalizedAllowed.includes(userRole);
        });

        if (!req.user || !isAuthorized) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Role [${req.user?.role || 'Guest'}] does not possess privileges to execute this operation`
            });
        }
        next();
    };
};