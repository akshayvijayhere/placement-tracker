const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DsaTopic = require("../models/DsaTopic");
const Otp = require("../models/Otp");
const nodemailer = require("nodemailer");

// Send verification OTP to email
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate a 6-digit random numerical code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to Otp collection (upsert based on email)
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true },
    );

    const htmlContent = `
      <div style="font-family: 'Poppins', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eef2ff; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #5b5cff; margin: 0; font-size: 24px;">Placement Tracker</h2>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Confirm your email address</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 15px 0;">Hello,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0;">Thank you for signing up! Please use the following 6-digit verification code to complete your registration. This code is valid for <strong>5 minutes</strong>.</p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 32px; font-weight: 700; color: #5b5cff; letter-spacing: 5px;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `;

    // 1. First choice: Use Brevo HTTP REST API (port 443 - never blocked by cloud firewalls)
    const brevoApiKey = process.env.BREVO_API_KEY;
    const smtpUser = process.env.SMTP_USER;
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
            subject: "Email Verification Code | Placement Prep Tracker",
            htmlContent: htmlContent,
          }),
        });

        if (brevoRes.ok) {
          return res.json({
            message: "Verification email sent successfully",
          });
        } else {
          const errData = await brevoRes.json();
          throw new Error(
            errData.message || "Brevo API rejected email dispatch",
          );
        }
      } catch (brevoErr) {
        console.error(
          "Brevo HTTP API delivery failed, falling back to SMTP:",
          brevoErr.message,
        );
      }
    }

    // 2. Second choice: Standard SMTP via nodemailer
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      // Send real email using nodemailer
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === "465", // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 3000, // 3 seconds connect timeout
        greetingTimeout: 3000, // 3 seconds SMTP handshake timeout
        socketTimeout: 5000, // 5 seconds socket inactivity timeout
      });

      const mailOptions = {
        from: `"Placement Tracker" <${smtpUser}>`,
        to: email,
        subject: "Email Verification Code | Placement Prep Tracker",
        html: htmlContent,
      };

      try {
        await transporter.sendMail(mailOptions);
        res.json({ message: "Verification email sent successfully" });
      } catch (mailErr) {
        console.error("SMTP Mail Send Failed:", mailErr.message);
        res.json({
          message: `Verification code generated. (Email delivery failed: ${mailErr.message})`,
          otp,
        });
      }
    } else {
      // Fallback Developer Mode: log code to console
      console.log(`\n--------------------------------------------`);
      console.log(`[DEVELOPER MOCK EMAIL DISPATCHER]`);
      console.log(`Email Sent To: ${email}`);
      console.log(`Verification Code: ${otp}`);
      console.log(`--------------------------------------------\n`);
      res.json({
        message:
          "Verification OTP code sent (Dev Mode: Check server console logs)",
        otp,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: "Failed to dispatch verification email: " + err.message,
    });
  }
});

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({
        message: "All fields are required, including verification code",
      });
    }

    // Verify OTP first
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check if username is already taken
    if (username) {
      const usernameExists = await User.findOne({ username: username.trim() });
      if (usernameExists) {
        return res.status(400).json({ message: "Username is already taken" });
      }
    }

    // Delete verified OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      username: username ? username.trim() : "",
      email,
      password: hashedPassword,
      role: "student",
    });

    // Seed default DSA topics for the new student
    const defaultDsaTopics = [
      {
        name: "Arrays",
        easySolved: 0,
        easyTotal: 20,
        mediumSolved: 0,
        mediumTotal: 20,
        hardSolved: 0,
        hardTotal: 10,
        solved: 0,
        total: 50,
      },
      {
        name: "Strings",
        easySolved: 0,
        easyTotal: 15,
        mediumSolved: 0,
        mediumTotal: 15,
        hardSolved: 0,
        hardTotal: 10,
        solved: 0,
        total: 40,
      },
      {
        name: "Linked List",
        easySolved: 0,
        easyTotal: 10,
        mediumSolved: 0,
        mediumTotal: 15,
        hardSolved: 0,
        hardTotal: 5,
        solved: 0,
        total: 30,
      },
      {
        name: "Trees",
        easySolved: 0,
        easyTotal: 10,
        mediumSolved: 0,
        mediumTotal: 20,
        hardSolved: 0,
        hardTotal: 10,
        solved: 0,
        total: 40,
      },
      {
        name: "Stacks",
        easySolved: 0,
        easyTotal: 5,
        mediumSolved: 0,
        mediumTotal: 10,
        hardSolved: 0,
        hardTotal: 5,
        solved: 0,
        total: 20,
      },
      {
        name: "Queues",
        easySolved: 0,
        easyTotal: 5,
        mediumSolved: 0,
        mediumTotal: 10,
        hardSolved: 0,
        hardTotal: 5,
        solved: 0,
        total: 20,
      },
      {
        name: "Graphs",
        easySolved: 0,
        easyTotal: 5,
        mediumSolved: 0,
        mediumTotal: 15,
        hardSolved: 0,
        hardTotal: 10,
        solved: 0,
        total: 30,
      },
      {
        name: "Dynamic Programming",
        easySolved: 0,
        easyTotal: 5,
        mediumSolved: 0,
        mediumTotal: 20,
        hardSolved: 0,
        hardTotal: 15,
        solved: 0,
        total: 40,
      },
    ];

    await DsaTopic.insertMany(
      defaultDsaTopics.map((topic) => ({
        ...topic,
        user: user._id,
      })),
    );

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || "",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || "",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Google Auth
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Credential token is required" });
    }

    // Verify token using Google's tokeninfo API
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
    );
    if (!googleRes.ok) {
      return res
        .status(400)
        .json({ message: "Invalid Google credential token" });
    }

    const payload = await googleRes.json();

    // Check for audience (client_id) verification
    if (!payload.email_verified || payload.email_verified === "false") {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    const { email, name, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Generate a secure random password for DB requirements
      const randomPassword = require("crypto").randomBytes(16).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      // Create new user
      user = await User.create({
        name: name || "Google User",
        email,
        password: hashedPassword,
        role: "student",
        profileImage: picture || "",
      });

      // Seed default DSA topics for the new student
      const defaultDsaTopics = [
        {
          name: "Arrays",
          easySolved: 0,
          easyTotal: 20,
          mediumSolved: 0,
          mediumTotal: 20,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 50,
        },
        {
          name: "Strings",
          easySolved: 0,
          easyTotal: 15,
          mediumSolved: 0,
          mediumTotal: 15,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 40,
        },
        {
          name: "Linked List",
          easySolved: 0,
          easyTotal: 10,
          mediumSolved: 0,
          mediumTotal: 15,
          hardSolved: 0,
          hardTotal: 5,
          solved: 0,
          total: 30,
        },
        {
          name: "Trees",
          easySolved: 0,
          easyTotal: 10,
          mediumSolved: 0,
          mediumTotal: 20,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 40,
        },
        {
          name: "Stacks",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 10,
          hardSolved: 0,
          hardTotal: 5,
          solved: 0,
          total: 20,
        },
        {
          name: "Queues",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 10,
          hardSolved: 0,
          hardTotal: 5,
          solved: 0,
          total: 20,
        },
        {
          name: "Graphs",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 15,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 30,
        },
        {
          name: "Dynamic Programming",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 20,
          hardSolved: 0,
          hardTotal: 15,
          solved: 0,
          total: 40,
        },
      ];

      await DsaTopic.insertMany(
        defaultDsaTopics.map((topic) => ({
          ...topic,
          user: user._id,
        })),
      );
    } else {
      // If user exists but has no photo, update it with Google picture
      if (!user.profileImage && picture) {
        user.profileImage = picture;
        await user.save();
      }
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || "",
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Google Authentication server error: " + err.message,
    });
  }
});

// Mock Google Sign-In for Developer Testing
router.post("/google/mock", async (req, res) => {
  try {
    const email = "developer.mock@placement.com";
    const name = "Akshay Verma (Mock)";
    const picture =
      "https://ui-avatars.com/api/?name=Akshay+Verma&background=eef2ff&color=5b5cff&size=200&bold=true";

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = require("crypto").randomBytes(16).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "student",
        profileImage: picture,
      });

      // Seed default DSA topics for the mock student
      const defaultDsaTopics = [
        {
          name: "Arrays",
          easySolved: 0,
          easyTotal: 20,
          mediumSolved: 0,
          mediumTotal: 20,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 50,
        },
        {
          name: "Strings",
          easySolved: 0,
          easyTotal: 15,
          mediumSolved: 0,
          mediumTotal: 15,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 40,
        },
        {
          name: "Linked List",
          easySolved: 0,
          easyTotal: 10,
          mediumSolved: 0,
          mediumTotal: 15,
          hardSolved: 0,
          hardTotal: 5,
          solved: 0,
          total: 30,
        },
        {
          name: "Trees",
          easySolved: 0,
          easyTotal: 10,
          mediumSolved: 0,
          mediumTotal: 20,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 40,
        },
        {
          name: "Stacks",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 10,
          hardSolved: 0,
          hardTotal: 5,
          solved: 0,
          total: 20,
        },
        {
          name: "Queues",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 10,
          hardSolved: 0,
          hardTotal: 5,
          solved: 0,
          total: 20,
        },
        {
          name: "Graphs",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 15,
          hardSolved: 0,
          hardTotal: 10,
          solved: 0,
          total: 30,
        },
        {
          name: "Dynamic Programming",
          easySolved: 0,
          easyTotal: 5,
          mediumSolved: 0,
          mediumTotal: 20,
          hardSolved: 0,
          hardTotal: 15,
          solved: 0,
          total: 40,
        },
      ];

      await DsaTopic.insertMany(
        defaultDsaTopics.map((topic) => ({
          ...topic,
          user: user._id,
        })),
      );
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || "",
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Mock Google Login server error: " + err.message,
    });
  }
});

module.exports = router;
