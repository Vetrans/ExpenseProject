const express = require("express");
const mysql = require("mysql2");

const router = express.Router();

// MySQL Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Hrishabh@123",
    database: "expense_management",
});

// User Onboarding Route
router.post("/onboarding", async (req, res) => {
    const { fullName, email, age, profession, monthlyIncome, currency, expenseCategories } = req.body;

    if (!fullName || !email || !age || !profession || !monthlyIncome || !currency || !expenseCategories) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    try {
        // Find User ID
        const [user] = await db.promise().query("SELECT id FROM users WHERE email = ?", [email]);

        if (user.length === 0) {
            return res.status(400).json({ error: "User not found!" });
        }

        const userId = user[0].id;

        // Save Onboarding Data
        await db
            .promise()
            .query(
                "INSERT INTO user_profiles (userId, age, profession, monthlyIncome, currency, expenseCategories) VALUES (?, ?, ?, ?, ?, ?)",
                [userId, age, profession, monthlyIncome, currency, JSON.stringify(expenseCategories)]
            );

        res.status(201).json({ message: "Onboarding data saved successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Server error!" });
    }
});

module.exports = router;
