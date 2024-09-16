// models/Quiz.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const slugify = require("slugify");

const QuizSchema = new Schema({
  title: {
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
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  questions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  user: {
    type: Schema.Types.ObjectId, // Reference to the user who created the quiz
    ref: "User",
    required: true,
  },
});

// Add composite unique index to ensure the slug is unique for each user
QuizSchema.index({ slug: 1, user: 1 }, { unique: true });

// Pre-save middleware to handle slug generation
QuizSchema.pre("save", async function (next) {
  if (this.title) {
    // Generate initial slug using slugify
    let slug = slugify(this.title, {
      lower: true,
      strict: true,
      replacement: "-",
    });

    // Check if the slug already exists for the same user in the database
    let slugExists = await mongoose.models.Quiz.findOne({
      slug: new RegExp(`^${slug}(-[0-9]+)?$`),
      user: this.user, // Ensure slug uniqueness within the same user
    });

    // If the slug exists, append a unique counter to the slug
    let counter = 1;
    while (slugExists) {
      slug = slugify(`${this.title}-${counter}`, {
        lower: true,
        strict: true,
        replacement: "-",
      });
      slugExists = await mongoose.models.Quiz.findOne({
        slug,
        user: this.user,
      });
      counter++;
    }

    // Set the final unique slug
    this.slug = slug;
  }

  next();
});

module.exports = mongoose.model("Quiz", QuizSchema);
