const express = require('express');
const multer = require('multer');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const router = express.Router();

// Multer configuration for file uploads (in memory)
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }  // Limit file size to 5MB
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
        type: DataTypes.BLOB('long'), 
        allowNull: true,
    },
    imageFileType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: 'posts',
    timestamps: true,
});

// Route to create a new post
router.post('/', upload.single('imageFile'), async (req, res) => {
    const { title, content } = req.body;
    const imageFile = req.file;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    try {
        const newPost = await Post.create({
            title,
            content,
            imageFile: imageFile ? imageFile.buffer : null,
            imageFileType: imageFile ? imageFile.mimetype : null
        });

        res.status(201).json({
            message: 'Post created successfully!',
            post: newPost
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post. Please try again.', error: error.message });
    }
});

// Route to get all posts with pagination
router.get('/', async (req, res) => {
    const { page = 1, limit = 5 } = req.query;

    try {
        const posts = await Post.findAll({
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        const totalPosts = await Post.count();
        const totalPages = Math.ceil(totalPosts / limit);

        res.status(200).json({
            posts,
            totalPosts,
            currentPage: parseInt(page),
            totalPages
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts. Please try again.', error: error.message });
    }
});

// Route to get a single post by ID
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (post) {
            res.status(200).json(post);
        } else {
            res.status(404).json({ message: 'Post not found.' });
        }
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post. Please try again.', error: error.message });
    }
});

// Route to update a post by ID
router.put('/:id', upload.single('imageFile'), async (req, res) => {
    try {
        const updatedPost = await Post.findByPk(req.params.id);
        if (updatedPost) {
            const { title, content } = req.body;
            const imageFile = req.file;

            if (!title || !content) {
                return res.status(400).json({ message: 'Title and content are required.' });
            }

            await updatedPost.update({
                title,
                content,
                imageFile: imageFile ? imageFile.buffer : updatedPost.imageFile,
                imageFileType: imageFile ? imageFile.mimetype : updatedPost.imageFileType
            });

            res.status(200).json(updatedPost);
        } else {
            res.status(404).json({ message: 'Post not found.' });
        }
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post. Please try again.', error: error.message });
    }
});

// Route to delete a post by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByPk(req.params.id);
        if (deletedPost) {
            await deletedPost.destroy();
            res.status(200).json({ message: 'Post deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Post not found.' });
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post. Please try again.', error: error.message });
    }
});

module.exports = router;
