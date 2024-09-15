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
    unique: true,
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
});

QuizSchema.pre("save", async function (next) {
  if (this.title) {
    // Generate initial slug using slugify
    let slug = slugify(this.title, {
      lower: true, // Convert the title to lowercase
      strict: true, // Remove special characters
      replacement: "-", // Replace spaces and special characters with hyphens
    });

    // Check if the slug already exists in the database
    let slugExists = await mongoose.models.Quiz.findOne({
      slug: new RegExp(`^${slug}(-[0-9]+)?$`),
    });

    // If the slug exists, append a unique counter to the slug
    let counter = 1;
    while (slugExists) {
      slug = slugify(`${this.title}-${counter}`, {
        lower: true,
        strict: true,
        replacement: "-",
      });
      slugExists = await mongoose.models.Quiz.findOne({ slug });
      counter++;
    }

    // Set the final unique slug
    this.slug = slug;
  }

  next();
});

module.exports = mongoose.model("Quiz", QuizSchema);
