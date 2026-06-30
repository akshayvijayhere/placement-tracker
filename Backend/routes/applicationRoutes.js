const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const { verifyToken } = require("../middleware/authMiddleware");
const { updateStreak } = require("../utils/streakHelper");

// Get all applications for the logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const apps = await Application.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Create new application
router.post("/", verifyToken, async (req, res) => {
  try {
    const { company, role, pkg, status, date } = req.body;

    if (!company || !role || !pkg || !status || !date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newApp = await Application.create({
      company,
      role,
      pkg,
      status,
      date,
      user: req.user.id,
    });

    await updateStreak(req.user.id);

    res.status(201).json(newApp);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Update application
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { company, role, pkg, status, date } = req.body;

    let app = await Application.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check ownership
    if (app.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    app = await Application.findByIdAndUpdate(
      req.params.id,
      { $set: { company, role, pkg, status, date } },
      { new: true },
    );

    await updateStreak(req.user.id);

    res.json(app);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Delete application
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check ownership
    if (app.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await app.deleteOne();
    await updateStreak(req.user.id);
    res.json({ message: "Application removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
