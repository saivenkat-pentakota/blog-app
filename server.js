require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = process.env.PORT ;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// server.js
app.use(cors({
    origin: 'https://blog-client-mptr.onrender.com', // Adjust to match your client's deployed origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

  

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadDir));

// Import the post routes
const postRoutes = require('./routes/posts');
app.use('/posts', postRoutes);

// Import the auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
    console.error('Server Error:', err); // Log server errors
    res.status(500).send('Server Error');
  });

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
