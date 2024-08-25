const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../path-to-sequelize-instance'); 

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
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ''
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }
}, {
    tableName: 'posts',
    timestamps: true, 
});

module.exports = Post;
