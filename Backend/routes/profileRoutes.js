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

// Send change password OTP to logged in user's email
router.post("/send-otp", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const email = user.email;

    // Generate a 6-digit random numerical code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to Otp collection
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true },
    );

    const htmlContent = `
      <div style="font-family: 'Poppins', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eef2ff; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #5b5cff; margin: 0; font-size: 24px;">Placement Tracker</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Verify Password Change</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 15px 0;">Hello ${user.name},</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0;">Please use the following 6-digit verification code to confirm your password update request. This code is valid for <strong>5 minutes</strong>.</p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 32px; font-weight: 700; color: #5b5cff; letter-spacing: 5px;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">If you didn't request this change, please secure your account immediately.</p>
      </div>
    `;

    // Try Brevo HTTP API
    const brevoApiKey = process.env.BREVO_API_KEY;
    const smtpUser = process.env.SMTP_USER;
    let brevoErrorMsg = "";

    if (brevoApiKey) {
      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: "Placement Tracker",
              email: smtpUser || "vijayvargiyaakshay062@gmail.com",
            },
            to: [{ email: email }],
            subject: "Verify Password Change | Placement Prep Tracker",
            htmlContent: htmlContent,
          }),
        });

        if (brevoRes.ok) {
          return res.json({
            message: "Verification code sent to your email",
          });
        } else {
          const errData = await brevoRes.json();
          brevoErrorMsg = errData.message || JSON.stringify(errData);
          throw new Error(brevoErrorMsg);
        }
      } catch (brevoErr) {
        console.error(
          "Brevo Change Password OTP delivery failed:",
          brevoErr.message,
        );
        brevoErrorMsg = brevoErr.message;
      }
    }

    // Try Nodemailer SMTP
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === "465",
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
      });

      const mailOptions = {
        from: `"Placement Tracker" <${smtpUser}>`,
        to: email,
        subject: "Verify Password Change | Placement Prep Tracker",
        html: htmlContent,
      };

      try {
        await transporter.sendMail(mailOptions);
        return res.json({ message: "Verification code sent to your email" });
      } catch (mailErr) {
        console.error("SMTP Change Password OTP Send Failed:", mailErr.message);
        return res.json({
          message: `Verification code generated. (Email delivery failed. SMTP: ${mailErr.message}${brevoErrorMsg ? `, Brevo: ${brevoErrorMsg}` : ""})`,
          otp,
        });
      }
    } else {
      return res.json({
        message: `Verification OTP code sent. (Dev Mode: Check server console logs${brevoErrorMsg ? `. Brevo error: ${brevoErrorMsg}` : ""})`,
        otp,
      });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Change user password
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, otp } = req.body;

    if (!currentPassword || !newPassword || !otp) {
      return res.status(400).json({
        message: "All fields are required, including verification code",
      });
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

    // Verify OTP first
    const otpRecord = await Otp.findOne({ email: user.email, otp });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    // Delete verified OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

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
