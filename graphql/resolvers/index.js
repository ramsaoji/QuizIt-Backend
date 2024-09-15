// server/graphql/resolvers/index.js
const Category = require("../../models/Category");
const Quiz = require("../../models/Quiz");
const Question = require("../../models/Question");
const slugify = require("slugify");

const resolvers = {
  Query: {
    getAllCategories: async () => await Category.find().populate("quizzes"),
    getCategoryBySlug: async (_, { slug }) => {
      if (!Category) {
        throw new Error("Category model is not available in the context");
      }
      try {
        const category = await Category.findOne({ slug });
        if (!category) {
          throw new Error("Category not found");
        }
        return category;
      } catch (error) {
        throw new Error(`Failed to get category by slug: ${error.message}`);
      }
    },
    getAllQuizzesByCategorySlug: async (_, { slug }) => {
      const category = await Category.findOne({ slug });
      if (!category) throw new Error("Category not found");
      return await Quiz.find({ category: category._id }).populate("questions");
    },
    getQuizBySlug: async (_, { slug }) => {
      if (!Quiz) {
        throw new Error("Quiz model is not available in the context");
      }
      try {
        const quiz = await Quiz.findOne({ slug }).populate("category");
        if (!quiz) {
          throw new Error("Quiz not found");
        }
        return quiz;
      } catch (error) {
        throw new Error(`Failed to get quiz by slug: ${error.message}`);
      }
    },
  },
  Mutation: {
    createCategory: async (_, { name, description, slug: categorySlug }) => {
      const slug = slugify(categorySlug, {
        lower: true, // Convert the name to lowercase
        strict: true, // Remove special characters
        replacement: "-", // Replace spaces and special characters with hyphens
      });
      const newCategory = new Category({ name, description, slug });
      return await newCategory.save();
    },
    createQuiz: async (_, { title, description, categorySlug }) => {
      const category = await Category.findOne({ slug: categorySlug });
      if (!category) throw new Error("Category not found");

      const slug = slugify(title, {
        lower: true, // Convert the title to lowercase
        strict: true, // Remove special characters
        replacement: "-", // Replace spaces and special characters with hyphens
      });

      const newQuiz = new Quiz({
        title,
        description,
        slug,
        category: category._id,
        questions: [], // Initially empty
      });
      const savedQuiz = await newQuiz.save();
      await Category.findByIdAndUpdate(category._id, {
        $push: { quizzes: savedQuiz._id },
      });
      return savedQuiz;
    },
    createQuestion: async (_, { quizId, question, options, answer }) => {
      const newQuestion = new Question({
        quiz: quizId,
        question,
        options,
        answer,
      });
      const savedQuestion = await newQuestion.save();
      await Quiz.findByIdAndUpdate(quizId, {
        $push: { questions: savedQuestion._id },
      });
      return savedQuestion;
    },
    updateQuizWithQuestions: async (_, { quizId, questionIds }) => {
      const updatedQuiz = await Quiz.findByIdAndUpdate(
        quizId,
        { $set: { questions: questionIds } },
        { new: true }
      ).populate("questions");
      if (!updatedQuiz) throw new Error("Quiz not found");
      return updatedQuiz;
    },
    submitQuiz: async (_, { quizId, answers }) => {
      const quiz = await Quiz.findById(quizId).populate("questions");
      if (!quiz) throw new Error("Quiz not found");

      let score = 0;
      const feedback = answers.map(({ questionId, selectedAnswer }) => {
        const question = quiz.questions.find(
          (q) => q._id.toString() === questionId
        );
        if (!question)
          return {
            correctAnswer: null,
            isCorrect: false,
          };

        const isCorrect = selectedAnswer === question.answer;
        if (isCorrect) score += 1;

        return {
          correctAnswer: question.answer,
          isCorrect,
        };
      });

      return { score, feedback };
    },
  },
  Category: {
    quizzes: async (category) => await Quiz.find({ category: category._id }),
  },
  Quiz: {
    category: async (quiz) => await Category.findById(quiz.category),
    questions: async (quiz) =>
      await Question.find({ _id: { $in: quiz.questions } }),
  },
  Question: {
    quiz: async (question) => await Quiz.findById(question.quiz),
  },
};

module.exports = resolvers;
