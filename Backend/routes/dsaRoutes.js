const express = require("express");
const router = express.Router();
const DsaTopic = require("../models/DsaTopic");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");
const { updateStreak } = require("../utils/streakHelper");
const axios = require("axios");

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

    let finalEasyTotal = Number(easyTotal);
    let finalMediumTotal = Number(mediumTotal);
    let finalHardTotal = Number(hardTotal);

    if (Number(easySolved) > finalEasyTotal) finalEasyTotal = Number(easySolved);
    if (Number(mediumSolved) > finalMediumTotal) finalMediumTotal = Number(mediumSolved);
    if (Number(hardSolved) > finalHardTotal) finalHardTotal = Number(hardSolved);

    const solved =
      Number(easySolved) + Number(mediumSolved) + Number(hardSolved);
    const total = finalEasyTotal + finalMediumTotal + finalHardTotal;

    const newTopic = await DsaTopic.create({
      name,
      easySolved: Number(easySolved),
      easyTotal: finalEasyTotal,
      mediumSolved: Number(mediumSolved),
      mediumTotal: finalMediumTotal,
      hardSolved: Number(hardSolved),
      hardTotal: finalHardTotal,
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

    let finalEasyTotal = Number(easyTotal);
    let finalMediumTotal = Number(mediumTotal);
    let finalHardTotal = Number(hardTotal);

    if (Number(easySolved) > finalEasyTotal) finalEasyTotal = Number(easySolved);
    if (Number(mediumSolved) > finalMediumTotal) finalMediumTotal = Number(mediumSolved);
    if (Number(hardSolved) > finalHardTotal) finalHardTotal = Number(hardSolved);

    const solved =
      Number(easySolved) + Number(mediumSolved) + Number(hardSolved);
    const total = finalEasyTotal + finalMediumTotal + finalHardTotal;

    topic = await DsaTopic.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name,
          easySolved: Number(easySolved),
          easyTotal: finalEasyTotal,
          mediumSolved: Number(mediumSolved),
          mediumTotal: finalMediumTotal,
          hardSolved: Number(hardSolved),
          hardTotal: finalHardTotal,
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

// Sync LeetCode Solved Counts to DSA Tracker Topics
router.post("/sync-leetcode", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const leetcodeUsername = user.codingProfiles?.leetcode;
    if (!leetcodeUsername) {
      return res.status(400).json({
        message: "Please link your LeetCode username in your profile settings first.",
      });
    }

    // Call LeetCode GraphQL API for skillStats
    const response = await axios.post(
      "https://leetcode.com/graphql",
      {
        query: `
        query skillStats($username: String!) {
          matchedUser(username: $username) {
            tagProblemCounts {
              advanced {
                tagName
                tagSlug
                problemsSolved
              }
              intermediate {
                tagName
                tagSlug
                problemsSolved
              }
              fundamental {
                tagName
                tagSlug
                problemsSolved
              }
            }
          }
        }
      `,
        variables: { username: leetcodeUsername },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        timeout: 8000,
      },
    );

    const matchedUser = response.data?.data?.matchedUser;
    if (!matchedUser || !matchedUser.tagProblemCounts) {
      return res.status(400).json({
        message:
          "Could not retrieve LeetCode statistics for the username: " +
          leetcodeUsername,
      });
    }

    const counts = matchedUser.tagProblemCounts;
    const tagList = [
      ...(counts.fundamental || []),
      ...(counts.intermediate || []),
      ...(counts.advanced || []),
    ];

    // Build map of tag slug to solved count
    const tagSolvedMap = {};
    tagList.forEach((t) => {
      tagSolvedMap[t.tagSlug] = t.problemsSolved;
    });

    // Tag mapping of LeetCode slugs to our topic names
    const topicMapping = {
      array: "Arrays",
      string: "Strings",
      "linked-list": "Linked List",
      tree: "Trees",
      "binary-tree": "Trees",
      stack: "Stacks",
      queue: "Queues",
      graph: "Graphs",
      "dynamic-programming": "Dynamic Programming",
    };

    // Find all active DSA topics for the user
    const userTopics = await DsaTopic.find({ user: userId });

    // Update each topic solved count
    const updatePromises = [];
    const syncedData = {};

    userTopics.forEach((topic) => {
      // Find keys in topicMapping that target this topic name (case-insensitive)
      const matchingSlugs = Object.keys(topicMapping).filter(
        (slug) => topicMapping[slug].toLowerCase() === topic.name.toLowerCase(),
      );

      // Sum the solved counts from LeetCode for these matching slugs
      let totalSolvedFromLeetcode = 0;
      matchingSlugs.forEach((slug) => {
        if (tagSolvedMap[slug] !== undefined) {
          totalSolvedFromLeetcode += tagSolvedMap[slug];
        }
      });

      // If the sum is positive and greater than the currently logged solved count, let's update it!
      if (totalSolvedFromLeetcode > topic.solved) {
        const diff = totalSolvedFromLeetcode - topic.solved;
        topic.easySolved += diff;
        topic.solved =
          topic.easySolved + topic.mediumSolved + topic.hardSolved;
        if (topic.easySolved > topic.easyTotal) {
          topic.easyTotal = topic.easySolved;
        }
        topic.total = topic.easyTotal + topic.mediumTotal + topic.hardTotal;
        updatePromises.push(topic.save());
        syncedData[topic.name] = totalSolvedFromLeetcode;
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      await updateStreak(userId);
    }

    res.json({
      message: "Successfully synced LeetCode solved count!",
      syncedCount: Object.keys(syncedData).length,
      syncedData,
    });
  } catch (err) {
    res.status(500).json({ message: "Sync error: " + err.message });
  }
});

module.exports = router;
