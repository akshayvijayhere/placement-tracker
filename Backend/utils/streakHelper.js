const User = require("../models/User");

/**
 * Checks and updates the user's daily activity streak.
 * @param {string} userId - The mongoose ID of the user.
 * @returns {Promise<object|null>} The updated user document or null.
 */
async function updateStreak(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Default fields if undefined
    if (user.streakCount === undefined) user.streakCount = 0;
    if (user.longestStreak === undefined) user.longestStreak = 0;
    if (!user.badges) user.badges = [];

    // Award "first-action" badge if they perform their first action
    if (!user.badges.includes("first-action")) {
      user.badges.push("first-action");
    }

    if (!user.lastActiveDate) {
      // First action ever
      user.streakCount = 1;
      user.longestStreak = Math.max(user.longestStreak, 1);
      user.lastActiveDate = new Date();
      await user.save();
      return user;
    }

    const lastActiveStr = user.lastActiveDate.toISOString().split("T")[0];

    if (lastActiveStr === todayStr) {
      // Already active today. Maintain streak, save nothing extra unless first-action was added.
      if (user.isModified("badges")) {
        await user.save();
      }
      return user;
    }

    const lastDate = new Date(lastActiveStr);
    const todayDate = new Date(todayStr);
    const diffTime = todayDate - lastDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day!
      user.streakCount += 1;
    } else {
      // Broken streak
      user.streakCount = 1;
    }

    // Update longest streak
    if (user.streakCount > user.longestStreak) {
      user.longestStreak = user.streakCount;
    }

    // Badges award check
    const badgesToAdd = [];
    if (user.streakCount >= 3 && !user.badges.includes("3-day-streak")) {
      badgesToAdd.push("3-day-streak");
    }
    if (user.streakCount >= 7 && !user.badges.includes("7-day-streak")) {
      badgesToAdd.push("7-day-streak");
    }
    if (user.streakCount >= 30 && !user.badges.includes("30-day-streak")) {
      badgesToAdd.push("30-day-streak");
    }

    if (badgesToAdd.length > 0) {
      user.badges = [...user.badges, ...badgesToAdd];
    }

    user.lastActiveDate = new Date();
    await user.save();
    return user;
  } catch (err) {
    console.error("Error in updateStreak helper:", err);
    return null;
  }
}

module.exports = { updateStreak };
