require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const auth = require('./routes/auth');
const postRoutes = require('./routes/posts');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 5000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve static files from the "uploads" directory with security headers
app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res) => {
        res.set('Content-Security-Policy', "default-src 'self'");
        res.set('X-Content-Type-Options', 'nosniff');
    }
}));

// Set up multer storage configuration with file type and size validation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Images Only!')); // Update to use Error object
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security middleware with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"]
        }
    },
    crossOriginEmbedderPolicy: false // Adjust based on your needs
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://blog-client-mptr.onrender.com',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Trust proxy to correctly handle `X-Forwarded-For` header for rate limiting
app.set('trust proxy', true);

// Rate limiting for API routes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Import and use the routes
app.use('/posts', postRoutes);

app.use('/auth', authRoutes);

// Define the router for test-auth route
const router = express.Router(); // Initialize the router
router.get('/test-auth', auth, (req, res) => {
    res.json({ userId: req.user.id });
});
app.use('/api', router); // Use the router

// Error handling middleware
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message || err); // Log the error for debugging

    // Set status code, default to 500 if not provided
    const statusCode = err.statusCode || 500;

    // Define the error response object
    const errorResponse = {
        error: statusCode === 500 ? 'Server Error' : 'Request Error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    };

    // Send the response
    res.status(statusCode).json(errorResponse);
});


// Start the server with graceful shutdown support
const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Graceful shutdown
const shutdown = () => {
    server.close(() => {
        console.log('Process terminated');
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
