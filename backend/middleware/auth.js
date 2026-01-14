const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists in the 'kullanicilar' table
        const [users] = await db.execute('SELECT id, adi AS username, e_mail AS email FROM kullanicilar WHERE id = ?', [decoded.userId]);

        if (!users || users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

// Authorization middleware for admin users
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
};

// Rate limiting middleware (simple implementation)
const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        
        if (!requests.has(key)) {
            requests.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const requestData = requests.get(key);
        
        if (now > requestData.resetTime) {
            requests.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        if (requestData.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later'
            });
        }
        
        requestData.count++;
        next();
    };
};

module.exports = {
    authenticateToken,
    requireAdmin,
    rateLimiter
};