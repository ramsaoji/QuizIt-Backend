const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  uid: {
    type: String,
    required: true,
    unique: true, // Firebase UID, should be unique for each user
  },
  email: {
    type: String,
    required: true,
    unique: true, // User email, should also be unique
  },
  displayName: {
    type: String, // Optional display name for the user
  },
  categories: [
    {
      type: Schema.Types.ObjectId,
      ref: "Category", // Reference to categories created by the user
    },
  ],
  quizzes: [
    {
      type: Schema.Types.ObjectId,
      ref: "Quiz", // Reference to quizzes created by the user
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
