const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const router = express.Router();

// Initialize Sequelize
const sequelize = new Sequelize(
    process.env.DB_URL,
    {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
    }
);

sequelize.sync()
    .then(() => console.log('Database synchronized'))
    .catch(err => console.error('Database synchronization error:', err));

// Define the User model
const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    timestamps: true
});

// Middleware to authenticate JWT tokens
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.log('No authorization header provided');
        return res.status(401).json({ message: 'Authorization header required.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }

        req.user = user;
        next();
    });
};

// Route to register a new user
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ email, password: hashedPassword });

        res.status(201).json({ message: 'User registered successfully!', user: newUser });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Failed to register user. Please try again.', error: error.message });
    }
});

// Route to login a user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful!', token });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ message: 'Failed to login. Please try again.', error: error.message });
    }
});

// Route to get details of the currently authenticated user
router.get('/user', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Failed to fetch user details.', error: error.message });
    }
});


// Example protected route (requires authentication)
router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Failed to fetch user profile.', error: error.message });
    }
});

module.exports = router;
