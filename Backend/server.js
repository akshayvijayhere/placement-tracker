require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");

// Models
const User = require("./models/User");
const Drive = require("./models/Drive");

// Routes
const authRoutes = require("./routes/authRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const dsaRoutes = require("./routes/dsaRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Database Connection
connectDB().then(() => {
  seedDefaultDrives();
});

// Seed default mock data
const seedDefaultDrives = async () => {
  try {
    // 2. Seed default recruitment drives if empty
    const drivesCount = await Drive.countDocuments();
    if (drivesCount === 0) {
      const defaultDrives = [
        {
          company: "Google",
          role: "Software Engineer",
          pkg: "₹35 LPA",
          date: "2026-07-10",
        },
        {
          company: "Microsoft",
          role: "SDE Intern",
          pkg: "₹1.2 L/mo",
          date: "2026-07-12",
        },
        {
          company: "Amazon",
          role: "SDE Intern",
          pkg: "₹80k/mo",
          date: "2026-07-15",
        },
        {
          company: "Adobe",
          role: "Software Engineer",
          pkg: "₹24 LPA",
          date: "2026-07-20",
        },
      ];
      await Drive.insertMany(defaultDrives);
      console.log("Default job drives seeded.");
    }
  } catch (err) {
    console.error("Error seeding initial database data:", err.message);
  }
};

// Route Bindings
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dsa", dsaRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);

// Config Route
app.get("/api/config/google", (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
});

// Base Route
app.get("/", (req, res) => {
  res.send("Placement Tracker API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
