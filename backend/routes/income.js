router.post("/income", authenticate, async (req, res) => {
    const { title, amount, date } = req.body;
    const userId = req.user.id;
  
    try {
      await db.execute(
        "INSERT INTO income (user_id, title, amount, date) VALUES (?, ?, ?, ?)",
        [userId, title, amount, date]
      );
      res.json({ message: "Income added successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  router.get("/income", authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
      const [income] = await db.execute("SELECT * FROM income WHERE user_id = ?", [userId]);
      res.json(income);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  module.exports = router;
  