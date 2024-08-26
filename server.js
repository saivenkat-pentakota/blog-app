require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000; // Default to 5000 if PORT is not set

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
    origin: 'https://blog-client-mptr.onrender.com', // Adjust to match your client's deployed origin
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadDir));

// Import and use the post routes
const postRoutes = require('./routes/posts');
app.use('/posts', postRoutes);

// Import and use the auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message || err); // Log server errors with message
    res.status(500).json({ error: 'Server Error', details: err.message || 'An error occurred' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
