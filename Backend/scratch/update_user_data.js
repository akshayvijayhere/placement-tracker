const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const DsaTopic = require("../models/DsaTopic");
const Application = require("../models/Application");

const userId = "6a3beb9084f55698925a12ee"; // Akshay

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Clear existing DSA topics for user
  await DsaTopic.deleteMany({ user: userId });
  console.log("Cleared old DSA topics.");

  // 2. Define custom DSA topics with exact solved counts & timestamps
  // Current time is June 28, 2026
  const now = Date.now();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const topicsToInsert = [
    { name: "Arrays", solved: 80, total: 80, user: userId, updatedAt: twoHoursAgo, createdAt: twoHoursAgo },
    { name: "Strings", solved: 70, total: 70, user: userId, updatedAt: fiveHoursAgo, createdAt: fiveHoursAgo },
    { name: "Linked List", solved: 30, total: 30, user: userId, updatedAt: oneDayAgo, createdAt: oneDayAgo },
    { name: "Trees", solved: 0, total: 40, user: userId, updatedAt: twoDaysAgo, createdAt: twoDaysAgo },
    { name: "Stacks", solved: 20, total: 20, user: userId, updatedAt: fourDaysAgo, createdAt: fourDaysAgo },
    { name: "Queues", solved: 20, total: 20, user: userId, updatedAt: fiveDaysAgo, createdAt: fiveDaysAgo },
    { name: "Graphs", solved: 30, total: 30, user: userId, updatedAt: sixDaysAgo, createdAt: sixDaysAgo },
    { name: "Dynamic Programming", solved: 40, total: 40, user: userId, updatedAt: sevenDaysAgo, createdAt: sevenDaysAgo },
    { name: "Heaps", solved: 10, total: 10, user: userId, updatedAt: sevenDaysAgo, createdAt: sevenDaysAgo }
  ];

  // We save them individually or bypass timestamps check by saving raw docs
  for (const t of topicsToInsert) {
    const doc = new DsaTopic(t);
    await doc.save();
    // Force updatedAt to be exactly what we set (Mongoose save() usually overwrites timestamps)
    await DsaTopic.updateOne({ _id: doc._id }, { $set: { updatedAt: t.updatedAt, createdAt: t.createdAt } });
  }
  console.log("Seeded custom DSA topics totaling 300 solved questions.");

  // 3. Update Google application status & date to match "Applied to Google, Yesterday"
  // Find Google application
  const googleApp = await Application.findOne({ user: userId, company: "Google" });
  if (googleApp) {
    await Application.updateOne(
      { _id: googleApp._id },
      {
        $set: {
          status: "Applied",
          date: "2026-06-27", // Yesterday relative to June 28
          updatedAt: oneDayAgo,
          createdAt: oneDayAgo
        }
      }
    );
    console.log("Updated Google application to Applied, dated Yesterday.");
  } else {
    // Create one if not found
    const newGoogleApp = new Application({
      company: "Google",
      role: "Software Engineer",
      pkg: "45 LPA",
      status: "Applied",
      date: "2026-06-27",
      user: userId
    });
    await newGoogleApp.save();
    await Application.updateOne({ _id: newGoogleApp._id }, { $set: { updatedAt: oneDayAgo, createdAt: oneDayAgo } });
    console.log("Created new Google application.");
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
