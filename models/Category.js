// models/Category.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  quizzes: [
    {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
    },
  ],
  user: {
    type: Schema.Types.ObjectId, // Reference to the user who created the category
    ref: "User",
    required: true,
  },
});

// Add composite unique index to ensure the slug is unique for each user
CategorySchema.index({ slug: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Category", CategorySchema);
