const mongoose = require("mongoose");
const User = require("../models/User");
const { updateStreak } = require("../utils/streakHelper");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/placementTracker";
  await mongoose.connect(uri);
  console.log("Connected to DB");

  // Create a mock user
  const tempUser = await User.create({
    name: "Streak Tester",
    email: "tester_" + Date.now() + "@test.com",
    password: "password123",
  });
  console.log("Created temp user:", tempUser.email);

  // 1. First Action
  let user = await updateStreak(tempUser._id);
  console.log("After 1st action: streak =", user.streakCount, "badges =", user.badges);

  // 2. Set last active date to yesterday (consecutive day check)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  user.lastActiveDate = yesterday;
  await user.save();

  user = await updateStreak(tempUser._id);
  console.log("After yesterday action: streak =", user.streakCount, "badges =", user.badges);

  // 3. Set streak count to 2, and last active to yesterday again to test 3-day badge
  user.streakCount = 2;
  user.lastActiveDate = yesterday;
  await user.save();

  user = await updateStreak(tempUser._id);
  console.log("After consecutive action (aiming for 3): streak =", user.streakCount, "badges =", user.badges);

  // 4. Set last active to 3 days ago (streak broken check)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  user.lastActiveDate = threeDaysAgo;
  await user.save();

  user = await updateStreak(tempUser._id);
  console.log("After broken streak action: streak =", user.streakCount, "badges =", user.badges);

  // Clean up
  await User.deleteOne({ _id: tempUser._id });
  console.log("Cleaned up temp user.");

  await mongoose.disconnect();
  console.log("Disconnected.");
}

run().catch(console.error);
