// routes/pages.js
const express = require('express');
const path = require('path');
const router = express.Router();

// Function to serve main auth page
const serveAuthPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'auth.html'));
};

// All auth-related routes serve the same HTML file
const authRoutes = ['/', '/login', '/register', '/signup', '/forgot-password', '/verify-email', '/2fa', '/backup-code'];

authRoutes.forEach(route => {
    router.get(route, serveAuthPage);
});

module.exports = router;