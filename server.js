require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 5000; 

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadDir));

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://blog-client-mptr.onrender.com',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));




// Import and use the post routes
const postRoutes = require('./routes/posts');
app.use('/posts', postRoutes);

// Integration of authRoutes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message || err); 
    res.status(500).json({ error: 'Server Error', details: err.message || 'An error occurred' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
