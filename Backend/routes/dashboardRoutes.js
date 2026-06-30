const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const DsaTopic = require("../models/DsaTopic");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Applications stats
    const apps = await Application.find({ user: userId });
    const totalApplications = apps.length;
    const applied = apps.filter((a) => a.status === "Applied").length;
    const interview = apps.filter((a) => a.status === "Interview").length;
    const rejected = apps.filter((a) => a.status === "Rejected").length;
    const selected = apps.filter((a) => a.status === "Selected").length;
    const oa = apps.filter((a) => a.status === "OA").length;

    // Recent 4 applications
    const recentApplications = await Application.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(4);

    // DSA stats
    const dsaTopicsList = await DsaTopic.find({ user: userId });

    const dsaTotalSolved = dsaTopicsList.reduce((sum, t) => sum + t.solved, 0);
    const dsaTotalQuestions = dsaTopicsList.reduce(
      (sum, t) => sum + t.total,
      0,
    );
    const dsaProgress =
      dsaTotalQuestions > 0
        ? Math.round((dsaTotalSolved / dsaTotalQuestions) * 100)
        : 0;

    const topicsMap = {};
    dsaTopicsList.forEach((t) => {
      topicsMap[t.name] =
        t.total > 0 ? Math.round((t.solved / t.total) * 100) : 0;
    });

    const user = await User.findById(userId);

    res.json({
      totalApplications,
      applied,
      interview,
      rejected,
      selected,
      oa,
      recentApplications,
      dsaProgress: {
        solvedQuestions: dsaTotalSolved,
        totalQuestions: dsaTotalQuestions,
        percentage: dsaProgress,
        topics: topicsMap,
      },
      streak: {
        current: user ? user.streakCount || 0 : 0,
        longest: user ? user.longestStreak || 0 : 0,
        lastActive: user ? user.lastActiveDate : null,
        badges: user ? user.badges || [] : [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
