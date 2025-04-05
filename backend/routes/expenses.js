const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const token = req.header("Authorization").split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid Token" });
  }
};

router.post("/expenses", authenticate, async (req, res) => {
  const { title, amount, category, description, date } = req.body;
  const userId = req.user.id;

  try {
    await db.execute(
      "INSERT INTO expenses (user_id, title, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, title, amount, category, description, date]
    );
    res.json({ message: "Expense added successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/expenses", authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    const [expenses] = await db.execute("SELECT * FROM expenses WHERE user_id = ?", [userId]);
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
