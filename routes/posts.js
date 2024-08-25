const express = require('express');
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Route to create a new post
router.post('/', upload.single('imageFile'), async (req, res) => {
    const { title, content } = req.body;
    const imageFile = req.file ? req.file.filename : '';

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    const newPost = new Post({
        title,
        content,
        imageFile
    });

    try {
        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
    } catch (err) {
        res.status(500).json({ error: 'Unable to create post' });
    }
});

// Route to get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to get a single post by ID
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to update a post by ID
router.put('/:id', async (req, res) => {
    try {
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (updatedPost) {
            res.json(updatedPost);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to delete a post by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (deletedPost) {
            res.json({ message: 'Post deleted successfully' });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
