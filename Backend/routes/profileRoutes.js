const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Application = require("../models/Application");
const DsaTopic = require("../models/DsaTopic");
const Otp = require("../models/Otp");
const nodemailer = require("nodemailer");
const { verifyToken } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { updateStreak } = require("../utils/streakHelper");

// Get user profile details
router.get("/", verifyToken, async (req, res) => {
  try {
    // Update streak on profile fetch (daily platform activity check)
    await updateStreak(req.user.id);

    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Update user profile details
router.put("/", verifyToken, async (req, res) => {
  try {
    const { name, email, username, phone, location, college, profileImage, codingProfiles } =
      req.body;

    // Check if email is being updated and make sure it is unique
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        return res
          .status(400)
          .json({ message: "Email is already in use by another account" });
      }
    }

    const updateFields = { name, phone, college, profileImage };
    if (email) updateFields.email = email;
    if (username !== undefined) updateFields.username = username;
    if (location !== undefined) updateFields.location = location;
    if (codingProfiles !== undefined) updateFields.codingProfiles = codingProfiles;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true },
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Caching structure for coding platform statistics
const statsCache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Helper: Fetch statistics for LeetCode
async function fetchLeetcodeStats(username) {
  try {
    const response = await axios.post("https://leetcode.com/graphql", {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
            profile {
              ranking
              reputation
            }
          }
        }
      `,
      variables: { username }
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000
    });

    const user = response.data?.data?.matchedUser;
    if (!user) return null;

    const submissionStats = user.submitStatsGlobal?.acSubmissionNum || [];
    let easy = 0, medium = 0, hard = 0, total = 0;
    
    submissionStats.forEach(stat => {
      if (stat.difficulty === "Easy") easy = stat.count;
      else if (stat.difficulty === "Medium") medium = stat.count;
      else if (stat.difficulty === "Hard") hard = stat.count;
      else if (stat.difficulty === "All") total = stat.count;
    });

    return {
      totalSolved: total || (easy + medium + hard),
      easySolved: easy,
      mediumSolved: medium,
      hardSolved: hard,
      ranking: user.profile?.ranking || 0
    };
  } catch (error) {
    console.error("Leetcode stats error:", error.message);
    return null;
  }
}

// Helper: Fetch statistics for Codeforces
async function fetchCodeforcesStats(username) {
  try {
    const response = await axios.get(`https://codeforces.com/api/user.info?handles=${username}`, {
      timeout: 5000
    });
    const result = response.data?.result?.[0];
    if (!result) return null;

    return {
      rating: result.rating || 0,
      maxRating: result.maxRating || 0,
      rank: result.rank || "unrated",
      maxRank: result.maxRank || "unrated",
      avatar: result.titlePhoto || ""
    };
  } catch (error) {
    console.error("Codeforces stats error:", error.message);
    return null;
  }
}

// Helper: Fetch statistics for GitHub
async function fetchGithubStats(username) {
  try {
    const response = await axios.get(`https://api.github.com/users/${username}`, {
      headers: { "User-Agent": "Placement-Tracker" },
      timeout: 5000
    });
    const data = response.data;
    if (!data) return null;

    return {
      publicRepos: data.public_repos || 0,
      followers: data.followers || 0,
      following: data.following || 0,
      publicGists: data.public_gists || 0,
      avatarUrl: data.avatar_url || ""
    };
  } catch (error) {
    console.error("Github stats error:", error.message);
    return null;
  }
}

// Helper: Fetch statistics for GeeksforGeeks
async function fetchGfgStats(username) {
  try {
    const response = await axios.get(`https://www.geeksforgeeks.org/profile/${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 6000
    });

    const html = response.data;
    if (!html) return null;

    const scoreMatch = html.match(/(?:\\"|")score(?:\\"|")\s*:\s*([0-9]+)/);
    const solvedMatch = html.match(/(?:\\"|")total_problems_solved(?:\\"|")\s*:\s*([0-9]+)/);
    const rankMatch = html.match(/(?:\\"|")institute_rank(?:\\"|")\s*:\s*([0-9]+|(?:\\"|")[^\\"]*(?:\\"|"))/);
    const streakMatch = html.match(/(?:\\"|")pod_solved_longest_streak(?:\\"|")\s*:\s*([0-9]+)/);

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const solved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;
    const rank = rankMatch ? rankMatch[1].replace(/[\\"]/g, '') : "N/A";
    const streak = streakMatch ? parseInt(streakMatch[1], 10) : 0;

    return {
      score,
      totalSolved: solved,
      rank,
      streak
    };
  } catch (error) {
    console.error("Gfg stats error:", error.message);
    return null;
  }
}

// Get user coding statistics
router.get("/coding-stats", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const codingProfiles = user.codingProfiles || {
      leetcode: "",
      gfg: "",
      codeforces: "",
      github: ""
    };

    const cached = statsCache.get(req.user.id);
    const forceRefresh = req.query.refresh === "true";

    if (cached && !forceRefresh && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
      return res.json(cached.data);
    }

    const promises = [];
    const keys = [];

    if (codingProfiles.leetcode) {
      promises.push(fetchLeetcodeStats(codingProfiles.leetcode));
      keys.push("leetcode");
    }
    if (codingProfiles.gfg) {
      promises.push(fetchGfgStats(codingProfiles.gfg));
      keys.push("gfg");
    }
    if (codingProfiles.codeforces) {
      promises.push(fetchCodeforcesStats(codingProfiles.codeforces));
      keys.push("codeforces");
    }
    if (codingProfiles.github) {
      promises.push(fetchGithubStats(codingProfiles.github));
      keys.push("github");
    }

    const results = await Promise.all(promises);
    const stats = {};
    keys.forEach((key, idx) => {
      if (results[idx]) {
        stats[key] = results[idx];
      }
    });

    const responseData = {
      leetcode: codingProfiles.leetcode,
      gfg: codingProfiles.gfg,
      codeforces: codingProfiles.codeforces,
      github: codingProfiles.github,
      stats
    };

    // Cache the statistics
    statsCache.set(req.user.id, {
      timestamp: Date.now(),
      data: responseData
    });

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Change user password
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    // Find user (we need the password field here)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Save the new password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Delete user profile and all associated data permanently
router.delete("/", verifyToken, async (req, res) => {
  try {
    // 1. Delete user's applications
    await Application.deleteMany({ user: req.user.id });

    // 2. Delete user's DSA topics
    await DsaTopic.deleteMany({ user: req.user.id });

    // 3. Delete user account
    await User.findByIdAndDelete(req.user.id);

    res.json({ message: "Account and associated data deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
