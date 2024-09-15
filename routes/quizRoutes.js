const express = require("express");
const router = express.Router();
const { generateQuiz } = require("../controllers/quizController"); // Ensure this path is correct

router.post("/generate-quiz", generateQuiz);

module.exports = router;
