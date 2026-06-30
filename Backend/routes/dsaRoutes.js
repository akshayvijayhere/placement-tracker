const express = require("express");
const router = express.Router();
const DsaTopic = require("../models/DsaTopic");
const { verifyToken } = require("../middleware/authMiddleware");
const { updateStreak } = require("../utils/streakHelper");

// Get all DSA topics for logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const topics = await DsaTopic.find({ user: req.user.id });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Create a new topic
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      name,
      easySolved,
      easyTotal,
      mediumSolved,
      mediumTotal,
      hardSolved,
      hardTotal,
    } = req.body;

    if (
      !name ||
      easySolved === undefined ||
      easyTotal === undefined ||
      mediumSolved === undefined ||
      mediumTotal === undefined ||
      hardSolved === undefined ||
      hardTotal === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const topicExists = await DsaTopic.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") },
      user: req.user.id,
    });
    if (topicExists) {
      return res.status(400).json({ message: "Topic already exists" });
    }

    const solved =
      Number(easySolved) + Number(mediumSolved) + Number(hardSolved);
    const total = Number(easyTotal) + Number(mediumTotal) + Number(hardTotal);

    const newTopic = await DsaTopic.create({
      name,
      easySolved: Number(easySolved),
      easyTotal: Number(easyTotal),
      mediumSolved: Number(mediumSolved),
      mediumTotal: Number(mediumTotal),
      hardSolved: Number(hardSolved),
      hardTotal: Number(hardTotal),
      solved,
      total,
      user: req.user.id,
    });

    await updateStreak(req.user.id);

    res.status(201).json(newTopic);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Update a topic progress
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const {
      name,
      easySolved,
      easyTotal,
      mediumSolved,
      mediumTotal,
      hardSolved,
      hardTotal,
    } = req.body;

    let topic = await DsaTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    if (topic.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const solved =
      Number(easySolved) + Number(mediumSolved) + Number(hardSolved);
    const total = Number(easyTotal) + Number(mediumTotal) + Number(hardTotal);

    topic = await DsaTopic.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          easySolved: Number(easySolved),
          easyTotal: Number(easyTotal),
          mediumSolved: Number(mediumSolved),
          mediumTotal: Number(mediumTotal),
          hardSolved: Number(hardSolved),
          hardTotal: Number(hardTotal),
          solved,
          total,
        },
      },
      { new: true },
    );

    await updateStreak(req.user.id);

    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Delete a topic
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const topic = await DsaTopic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    if (topic.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await topic.deleteOne();
    await updateStreak(req.user.id);
    res.json({ message: "Topic removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
