const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Application = require("../models/Application");
const DsaTopic = require("../models/DsaTopic");
const Otp = require("../models/Otp");
const nodemailer = require("nodemailer");
const { verifyToken } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");

// Get user profile details
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Update user profile details
router.put("/", verifyToken, async (req, res) => {
  try {
    const { name, email, username, phone, location, college, profileImage } =
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
