const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const router = express.Router();

// ✅ User Registration
router.post('/register', async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        const [userExists] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (userExists.length) return res.status(400).json({ error: "Email already in use" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (fullName, email, password) VALUES (?, ?, ?)", [fullName, email, hashedPassword]);

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// ✅ User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.status(400).json({ error: "Invalid Credentials" });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid Credentials" });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;
