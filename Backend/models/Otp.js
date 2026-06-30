const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // TTL index: Automatically deletes document after 300 seconds (5 minutes)
  },
});

module.exports = mongoose.model("Otp", OtpSchema);
