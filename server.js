require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadDir));

// Import the post routes
const postRoutes = require('./posts');
app.use('/posts', postRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
