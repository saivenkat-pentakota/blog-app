const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');

// Initialize PostgreSQL connection pool with detailed configuration
const pool = new Pool({
    connectionString: process.env.DB_URL,
    connectionTimeoutMillis: 20000, // Increased timeout
    max: 20, // Adjust pool size if necessary
    idleTimeoutMillis: 30000, // Optional: Close idle connections after 30 seconds
    connectionAcquisitionTimeoutMillis: 5000, // Optional: Timeout for acquiring a connection
    ssl: { rejectUnauthorized: false } // Disable SSL validation if the server does not support it
});

const router = express.Router();

// Middleware to parse cookies
router.use(cookieParser());

// User signup
router.post('/signup', async (req, res) => {
    const { firstName, lastName, username, phone, email, password } = req.body;

    try {
        // Check if the user already exists by email or username
        const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the new user with additional fields
        const { rows: newUserRows } = await pool.query(
            `INSERT INTO users (first_name, last_name, username, phone, email, password)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [firstName, lastName, username, phone, email, hashedPassword]
        );

        const newUser = newUserRows[0];

        // Create a JWT token
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set the JWT token in cookies
        res.cookie('token', token, { httpOnly: true });
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// User login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
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

        // Set the JWT token in cookies
        res.cookie('token', token, { httpOnly: true });
        res.status(200).json({ message: 'Login successful', user });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Sample protected route
router.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({ message: `Welcome, user ${req.user.id}` });
});

module.exports = router;
