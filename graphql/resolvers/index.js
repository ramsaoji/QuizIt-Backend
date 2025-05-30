// server/graphql/resolvers/index.js
const Category = require("../../models/Category");
const Quiz = require("../../models/Quiz");
const Question = require("../../models/Question");
const User = require("../../models/User");
const slugify = require("slugify");

const resolvers = {
  Query: {
    getAllCategories: async (_, __, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }

      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      if (!userDoc) {
        throw new Error("User not found");
      }

      // Find categories using the user's ObjectId
      return await Category.find({ user: userDoc._id }).populate("quizzes");
    },
    getCategoryBySlug: async (_, { slug }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      const category = await Category.findOne({ slug, user: userDoc._id });

      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    },
    getAllQuizzesByCategorySlug: async (_, { slug }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      if (!userDoc) {
        throw new Error("User not found");
      }

      const category = await Category.findOne({ slug, user: userDoc._id });
      if (!category) {
        throw new Error("Category not found");
      }
      return await Quiz.find({ category: category._id }).populate("questions");
    },
    getQuizBySlug: async (_, { slug }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }

      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      if (!userDoc) {
        throw new Error("User not found");
      }

      const quiz = await Quiz.findOne({ slug, user: userDoc._id }).populate(
        "category"
      );
      if (!quiz) {
        throw new Error("Quiz not found");
      }
      return quiz;
    },
    getCurrentUser: async (_, __, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      return await User.findOne({ uid: user.uid }).populate(
        "categories quizzes"
      );
    },
  },
  Mutation: {
    createCategory: async (
      _,
      { name, description, slug: categorySlug },
      { user }
    ) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      if (!userDoc) {
        throw new Error("User not found");
      }

      const slug = slugify(categorySlug, {
        lower: true,
        strict: true,
        replacement: "-",
      });
      const newCategory = new Category({
        name,
        description,
        slug,
        user: userDoc._id, // Add the user UID
      });
      const savedCategory = await newCategory.save();

      // Add the new category to the user's list of categories
      await User.findByIdAndUpdate(userDoc._id, {
        $push: { categories: savedCategory._id },
      });

      return savedCategory;
    },
    createQuiz: async (
      _,
      { title, description, categorySlug, questionIds },
      { user }
    ) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      if (!userDoc) {
        throw new Error("User not found");
      }
      const category = await Category.findOne({
        slug: categorySlug,
        user: userDoc._id,
      });
      if (!category) {
        throw new Error("Category not found");
      }
      const slug = slugify(title, {
        lower: true,
        strict: true,
        replacement: "-",
      });
      const newQuiz = new Quiz({
        title,
        description,
        slug,
        category: category._id,
        user: userDoc._id, // Add the user UID
        questions: questionIds || [],
      });
      const savedQuiz = await newQuiz.save();

      // Add the new quiz to the category's list of quizzes
      await Category.findByIdAndUpdate(category._id, {
        $push: { quizzes: savedQuiz._id },
      });

      // Add the new quiz to the user's list of quizzes
      await User.findByIdAndUpdate(userDoc._id, {
        $push: { quizzes: savedQuiz._id },
      });

      return savedQuiz;
    },
    createQuestion: async (
      _,
      { quizId, question, options, answer },
      { user }
    ) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      if (!userDoc) {
        throw new Error("User not found");
      }

      const quiz = await Quiz.findById(quizId);

      if (!quiz || !quiz.user.equals(userDoc._id)) {
        throw new Error("createQuestion Quiz not found or unauthorized");
      }

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
    updateQuizWithQuestions: async (_, { quizId, questionIds }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      const updatedQuiz = await Quiz.findOneAndUpdate(
        { _id: quizId, user: userDoc._id },
        { $set: { questions: questionIds } },
        { new: true }
      ).populate("questions");

      if (!updatedQuiz) {
        throw new Error("updateQuestion Quiz not found or unauthorized");
      }
      return updatedQuiz;
    },
    submitQuiz: async (_, { quizId, answers }, { user }) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      // Fetch the user document from MongoDB
      const userDoc = await User.findOne({ uid: user.uid });

      const quiz = await Quiz.findOne({
        _id: quizId,
        user: userDoc._id,
      }).populate("questions");
      if (!quiz) {
        throw new Error("Quiz not found");
      }
      let score = 0;
      const feedback = answers.map(({ questionId, selectedAnswer }) => {
        const question = quiz.questions.find(
          (q) => q._id.toString() === questionId
        );
        if (!question) {
          return {
            correctAnswer: null,
            isCorrect: false,
          };
        }
        const isCorrect = selectedAnswer === question.answer;
        if (isCorrect) score += 1;
        return {
          correctAnswer: question.answer,
          isCorrect,
        };
      });
      return { score, feedback };
    },
    registerUser: async (_, { email, displayName, uid }) => {
      try {
        console.log("Registering user with email:", email);

        // Check if user already exists in your database
        let user = await User.findOne({ email });

        if (user) {
          console.log("User already exists in database");
          return user;
        }

        // If user doesn't exist, create a new one in your database
        user = new User({
          email,
          displayName: displayName || email.split("@")[0], // Use email username as fallback
          uid,
        });

        await user.save();
        console.log("New user saved to database:", user);

        return user;
      } catch (error) {
        console.error("Failed to register user:", error.message);
        throw new Error(`Failed to register user: ${error.message}`);
      }
    },
    deleteCategory: async (_, { categoryId }, { user }) => {
      try {
        if (!user) {
          throw new Error("Authentication required");
        }

        // Find the user document
        const userDoc = await User.findOne({ uid: user.uid });
        if (!userDoc) {
          throw new Error("User not found");
        }

        console.log(
          `[DELETE CATEGORY] Starting deletion process for category ID: ${categoryId}`
        );
        console.log(`[DELETE CATEGORY] User: ${userDoc.email}`);

        // Find the category and ensure it belongs to the user
        const category = await Category.findOne({
          _id: categoryId,
          user: userDoc._id,
        });

        if (!category) {
          console.log(
            `[DELETE CATEGORY] Category not found or unauthorized: ${categoryId}`
          );
          throw new Error("Category not found or unauthorized");
        }

        console.log(
          `[DELETE CATEGORY] Found category: ${category.name} (${category.slug})`
        );

        // Find all quizzes in this category
        const quizzes = await Quiz.find({ category: categoryId });
        console.log(
          `[DELETE CATEGORY] Found ${quizzes.length} quizzes to delete`
        );

        // Delete all questions from all quizzes in this category
        for (const quiz of quizzes) {
          const deletedQuestions = await Question.deleteMany({
            quiz: quiz._id,
          });
          console.log(
            `[DELETE CATEGORY] Deleted ${deletedQuestions.deletedCount} questions from quiz: ${quiz.title}`
          );
        }

        // Delete all quizzes in this category
        const deletedQuizzes = await Quiz.deleteMany({ category: categoryId });
        console.log(
          `[DELETE CATEGORY] Deleted ${deletedQuizzes.deletedCount} quizzes`
        );

        // Remove category reference from user's categories
        await User.findByIdAndUpdate(userDoc._id, {
          $pull: { categories: categoryId },
        });
        console.log(
          `[DELETE CATEGORY] Removed category reference from user: ${userDoc.email}`
        );

        // Delete the category
        await Category.findByIdAndDelete(categoryId);
        console.log(
          `[DELETE CATEGORY] Successfully deleted category: ${category.name}`
        );

        return {
          success: true,
          message: "Category and all associated quizzes deleted successfully",
          deletedId: categoryId,
        };
      } catch (error) {
        console.error("[DELETE CATEGORY] Error:", error);
        return {
          success: false,
          message: error.message,
          deletedId: null,
        };
      }
    },
    deleteQuiz: async (_, { quizId }, { user }) => {
      try {
        if (!user) {
          throw new Error("Authentication required");
        }

        // Find the user document
        const userDoc = await User.findOne({ uid: user.uid });
        if (!userDoc) {
          throw new Error("User not found");
        }

        console.log(
          `[DELETE QUIZ] Starting deletion process for quiz ID: ${quizId}`
        );
        console.log(`[DELETE QUIZ] User: ${userDoc.email}`);

        // Find the quiz and ensure it belongs to the user
        const quiz = await Quiz.findOne({
          _id: quizId,
          user: userDoc._id,
        }).populate("category");

        if (!quiz) {
          console.log(
            `[DELETE QUIZ] Quiz not found or unauthorized: ${quizId}`
          );
          throw new Error("Quiz not found or unauthorized");
        }

        console.log(
          `[DELETE QUIZ] Found quiz: ${quiz.title} in category: ${quiz.category.name}`
        );

        // Delete all questions associated with this quiz
        const deletedQuestions = await Question.deleteMany({ quiz: quizId });
        console.log(
          `[DELETE QUIZ] Deleted ${deletedQuestions.deletedCount} questions`
        );

        // Remove quiz reference from category
        await Category.findByIdAndUpdate(quiz.category._id, {
          $pull: { quizzes: quizId },
        });
        console.log(
          `[DELETE QUIZ] Removed quiz reference from category: ${quiz.category.name}`
        );

        // Remove quiz reference from user's quizzes
        await User.findByIdAndUpdate(userDoc._id, {
          $pull: { quizzes: quizId },
        });
        console.log(
          `[DELETE QUIZ] Removed quiz reference from user: ${userDoc.email}`
        );

        // Delete the quiz
        await Quiz.findByIdAndDelete(quizId);
        console.log(`[DELETE QUIZ] Successfully deleted quiz: ${quiz.title}`);

        return {
          success: true,
          message: "Quiz and all associated questions deleted successfully",
          deletedId: quizId,
        };
      } catch (error) {
        console.error("[DELETE QUIZ] Error:", error);
        return {
          success: false,
          message: error.message,
          deletedId: null,
        };
      }
    },
  },
  Category: {
    quizzes: async (category) => await Quiz.find({ category: category._id }),
    user: async (category) => await User.findOne({ uid: category.user }),
  },
  Quiz: {
    category: async (quiz) => await Category.findById(quiz.category),
    questions: async (quiz) =>
      await Question.find({ _id: { $in: quiz.questions } }),
    user: async (quiz) => await User.findOne({ uid: quiz.user }),
  },
  Question: {
    quiz: async (question) => await Quiz.findById(question.quiz),
  },
  User: {
    categories: async (user) => await Category.find({ user: user.uid }),
    quizzes: async (user) => await Quiz.find({ user: user.uid }),
  },
};

module.exports = resolvers;

// const resolvers = {
//   Query: {
//     getAllCategories: async () => await Category.find().populate("quizzes"),
//     getCategoryBySlug: async (_, { slug }) => {
//       if (!Category) {
//         throw new Error("Category model is not available in the context");
//       }
//       try {
//         const category = await Category.findOne({ slug });
//         if (!category) {
//           throw new Error("Category not found");
//         }
//         return category;
//       } catch (error) {
//         throw new Error(`Failed to get category by slug: ${error.message}`);
//       }
//     },
//     getAllQuizzesByCategorySlug: async (_, { slug }) => {
//       const category = await Category.findOne({ slug });
//       if (!category) throw new Error("Category not found");
//       return await Quiz.find({ category: category._id }).populate("questions");
//     },
//     getQuizBySlug: async (_, { slug }) => {
//       if (!Quiz) {
//         throw new Error("Quiz model is not available in the context");
//       }
//       try {
//         const quiz = await Quiz.findOne({ slug }).populate("category");
//         if (!quiz) {
//           throw new Error("Quiz not found");
//         }
//         return quiz;
//       } catch (error) {
//         throw new Error(`Failed to get quiz by slug: ${error.message}`);
//       }
//     },
//   },
//   Mutation: {
//     createCategory: async (_, { name, description, slug: categorySlug }) => {
//       const slug = slugify(categorySlug, {
//         lower: true, // Convert the name to lowercase
//         strict: true, // Remove special characters
//         replacement: "-", // Replace spaces and special characters with hyphens
//       });
//       const newCategory = new Category({ name, description, slug });
//       return await newCategory.save();
//     },
//     createQuiz: async (_, { title, description, categorySlug }) => {
//       const category = await Category.findOne({ slug: categorySlug });
//       if (!category) throw new Error("Category not found");

//       const slug = slugify(title, {
//         lower: true, // Convert the title to lowercase
//         strict: true, // Remove special characters
//         replacement: "-", // Replace spaces and special characters with hyphens
//       });

//       const newQuiz = new Quiz({
//         title,
//         description,
//         slug,
//         category: category._id,
//         questions: [], // Initially empty
//       });
//       const savedQuiz = await newQuiz.save();
//       await Category.findByIdAndUpdate(category._id, {
//         $push: { quizzes: savedQuiz._id },
//       });
//       return savedQuiz;
//     },
//     createQuestion: async (_, { quizId, question, options, answer }) => {
//       const newQuestion = new Question({
//         quiz: quizId,
//         question,
//         options,
//         answer,
//       });
//       const savedQuestion = await newQuestion.save();
//       await Quiz.findByIdAndUpdate(quizId, {
//         $push: { questions: savedQuestion._id },
//       });
//       return savedQuestion;
//     },
//     updateQuizWithQuestions: async (_, { quizId, questionIds }) => {
//       const updatedQuiz = await Quiz.findByIdAndUpdate(
//         quizId,
//         { $set: { questions: questionIds } },
//         { new: true }
//       ).populate("questions");
//       if (!updatedQuiz) throw new Error("Quiz not found");
//       return updatedQuiz;
//     },
//     submitQuiz: async (_, { quizId, answers }) => {
//       const quiz = await Quiz.findById(quizId).populate("questions");
//       if (!quiz) throw new Error("Quiz not found");

//       let score = 0;
//       const feedback = answers.map(({ questionId, selectedAnswer }) => {
//         const question = quiz.questions.find(
//           (q) => q._id.toString() === questionId
//         );
//         if (!question)
//           return {
//             correctAnswer: null,
//             isCorrect: false,
//           };

//         const isCorrect = selectedAnswer === question.answer;
//         if (isCorrect) score += 1;

//         return {
//           correctAnswer: question.answer,
//           isCorrect,
//         };
//       });

//       return { score, feedback };
//     },
//   },
//   Category: {
//     quizzes: async (category) => await Quiz.find({ category: category._id }),
//   },
//   Quiz: {
//     category: async (quiz) => await Category.findById(quiz.category),
//     questions: async (quiz) =>
//       await Question.find({ _id: { $in: quiz.questions } }),
//   },
//   Question: {
//     quiz: async (question) => await Quiz.findById(question.quiz),
//   },
// };

// module.exports = resolvers;
