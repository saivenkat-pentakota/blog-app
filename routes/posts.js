const express = require('express');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const auth = require('./auth');

const router = express.Router();

// Multer configuration for file uploads (in memory)
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extname = fileTypes.test(file.originalname.toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and GIF are allowed.'));
    }
});

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

sequelize.sync({ alter: true })
    .then(() => console.log('Database synchronized'))
    .catch(err => console.error('Database synchronization error:', err));

// Define the Post model
const Post = sequelize.define('Post', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    imageFile: {
        type: DataTypes.BLOB,
        allowNull: true,
    },
    imageFileType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    userId: { 
        type: DataTypes.INTEGER,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: 'posts',
    timestamps: true,
});

// Middleware to verify ownership
const verifyOwnership = async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.user?.id;

    try {
        const post = await Post.findByPk(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });
        if (post.userId !== userId) return res.status(403).json({ message: 'Not authorized to perform this action.' });
        next();
    } catch (err) {
        console.error('Ownership verification error:', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// Middleware for parsing JSON and URL-encoded data
router.use(express.json()); // For parsing application/json
router.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Create a post
    router.post('/', auth, upload.single('imageFile'), async (req, res) => {
        console.log('Received file:', req.file);
        console.log('Received body:', req.body);

        const { title, content, userId } = req.body;
        console.log('Title:', title);
        console.log('Content:', content);
        console.log('UserId:', userId);
        const imageFile = req.file;

        if (!title || !content || !userId) {
            return res.status(400).json({ message: 'Title, content, and userId are required.' });
        }

        try {
            const newPost = await Post.create({
                title,
                content,
                imageFile: imageFile ? imageFile.buffer : null,
                imageFileType: imageFile ? imageFile.mimetype : null,
                userId 
            });

            res.status(201).json({
                message: 'Post created successfully!',
                post: newPost
            });
        } catch (error) {
            console.error('Error creating post:', error.message || error); // Detailed error logging
            res.status(500).json({ message: 'Failed to create post. Please try again.', error: error.message || error });
        }
    });

// Route to get all posts
router.get('/', async (req, res) => {
    const { page = 1, limit = 5 } = req.query;

    try {
        const posts = await Post.findAll({
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        const totalPosts = await Post.count();
        const totalPages = Math.ceil(totalPosts / limit);

        // Convert image files to Base64
        const postsWithImages = posts.map(post => {
            if (post.imageFile) {
                post.imageFile = post.imageFile.toString('base64');
            }
            return post;
        });

        res.status(200).json({
            posts: postsWithImages,
            totalPosts,
            currentPage: parseInt(page),
            totalPages
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts. Please try again.', error: error.message });
    }
});

// Route to get all posts for the authenticated user
router.get('/userposts', auth, async (req, res) => {
    const { page = 1, limit = 5 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        const posts = await Post.findAll({
            where: { userId },
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });

        const totalPosts = await Post.count({ where: { userId } });
        const totalPages = Math.ceil(totalPosts / limit);

        // Convert image files to Base64
        const postsWithImages = posts.map(post => {
            if (post.imageFile) {
                post.imageFile = post.imageFile.toString('base64');
            }
            return post;
        });

        res.status(200).json({
            posts: postsWithImages,
            totalPosts,
            currentPage: parseInt(page),
            totalPages
        });
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts. Please try again.', error: error.message });
    }
});

// Route to get a post by ID
router.get('/:id', async (req, res) => {
    const postId = req.params.id;

    try {
        const post = await Post.findByPk(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        if (post.imageFile) {
            post.imageFile = post.imageFile.toString('base64');
        }

        res.status(200).json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post. Please try again.', error: error.message });
    }
});

// Route to update a post
router.put('/:id', auth, verifyOwnership, upload.single('imageFile'), async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const imageFile = req.file;

    try {
        const post = await Post.findByPk(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        post.title = title || post.title;
        post.content = content || post.content;
        post.imageFile = imageFile ? imageFile.buffer : post.imageFile;
        post.imageFileType = imageFile ? imageFile.mimetype : post.imageFileType;

        await post.save();

        res.status(200).json({ message: 'Post updated successfully!', post });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post. Please try again.', error: error.message });
    }
});

// Route to delete a post
router.delete('/:id', auth, verifyOwnership, async (req, res) => {
    const postId = req.params.id;

    try {
        const post = await Post.findByPk(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        await post.destroy();
        res.status(200).json({ message: 'Post deleted successfully!' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post. Please try again.', error: error.message });
    }
});

module.exports = router;
