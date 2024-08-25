const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const mongoose = require('mongoose');
const Post = require('./models/Post');

const app = express();
const port = 5003;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadDir));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/blog', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Route to create a new post
app.post('/posts', upload.single('imageFile'), async (req, res) => {
    const { title, content } = req.body;
    const imageFile = req.file;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    try {
        // Determine the final image URL
        const postImageUrl = imageFile ? `/uploads/${imageFile.filename}` : '';

        const newPost = new Post({
            title,
            content,
            imageUrl: postImageUrl,  // Save the image URL if an image is uploaded
            imageFile: imageFile ? imageFile.filename : '',  // Save the filename for reference
        });

        const savedPost = await newPost.save();

        res.status(201).json({
            message: 'Post created successfully!',
            post: savedPost
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post. Please try again.' });
    }
});

// Route to get all posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts. Please try again.' });
    }
});

// Route to get a single post by ID
app.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post) {
            res.status(200).json(post);
        } else {
            res.status(404).json({ message: 'Post not found.' });
        }
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post. Please try again.' });
    }
});

// Route to update a post by ID
app.put('/posts/:id', async (req, res) => {
    try {
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (updatedPost) {
            res.status(200).json(updatedPost);
        } else {
            res.status(404).json({ message: 'Post not found.' });
        }
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post. Please try again.' });
    }
});

// Route to delete a post by ID
app.delete('/posts/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (deletedPost) {
            res.status(200).json({ message: 'Post deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Post not found.' });
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post. Please try again.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
