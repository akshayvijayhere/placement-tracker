const mongoose = require("mongoose");

const dsaTopicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    easySolved: {
      type: Number,
      required: true,
      default: 0,
    },
    easyTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    mediumSolved: {
      type: Number,
      required: true,
      default: 0,
    },
    mediumTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    hardSolved: {
      type: Number,
      required: true,
      default: 0,
    },
    hardTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    solved: {
      type: Number,
      required: true,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DsaTopic", dsaTopicSchema);
