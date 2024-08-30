const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');

// Initialize PostgreSQL connection pool with detailed configuration
const pool = new Pool({
    connectionString: process.env.DB_URL,
    connectionTimeoutMillis: 20000,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionAcquisitionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
});

const router = express.Router();

// Middleware to parse cookies
router.use(cookieParser());

// Helper function for async error handling
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// User signup
router.post('/signup', 
    // Validate email and password
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check if the user already exists by email 
        const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the new user
        const { rows: newUserRows } = await pool.query(
            `INSERT INTO users (email, password)
             VALUES ($1, $2) RETURNING *`,
            [email, hashedPassword]
        );

        const newUser = newUserRows[0];

        // Create a JWT token
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set the JWT token in cookies with secure options
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    })
);

// User login
router.post('/login',
    // Validate email and password
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password cannot be empty'),
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Create a JWT token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set the JWT token in cookies with secure options
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
        res.status(200).json({ message: 'Login successful', user });
    })
);

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired, please log in again' });
        }
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Sample protected route
router.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Welcome, user ${req.user.id}` });
});

module.exports = router;
