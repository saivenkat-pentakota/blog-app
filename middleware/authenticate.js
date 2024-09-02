const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    const authorizationHeader = req.headers['authorization'];
    
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authorizationHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        
        req.user = decoded;
        next();
    });
};

module.exports = authenticate;
