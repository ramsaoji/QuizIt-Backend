// server/graphql/schema/index.js
const { gql } = require("apollo-server-express");

// const typeDefs = gql`
//   type Category {
//     _id: ID!
//     name: String!
//     slug: String!
//     description: String!
//     quizzes: [Quiz]
//   }

//   type Quiz {
//     _id: ID!
//     title: String!
//     slug: String!
//     description: String!
//     category: Category
//     questions: [Question]
//   }

//   type Question {
//     _id: ID!
//     question: String!
//     options: [String!]!
//     answer: String!
//     quiz: Quiz
//   }

//   input AnswerInput {
//     questionId: ID!
//     selectedAnswer: String!
//   }

//   type QuizResult {
//     score: Int!
//     feedback: [QuestionFeedback!]!
//   }

//   type QuestionFeedback {
//     correctAnswer: String
//     isCorrect: Boolean!
//   }

//   type Query {
//     getAllCategories: [Category]
//     getCategoryBySlug(slug: String!): Category
//     getAllQuizzesByCategorySlug(slug: String!): [Quiz]
//     getQuizBySlug(slug: String!): Quiz
//   }

//   type Mutation {
//     createCategory(name: String!, description: String!, slug: String!): Category
//     createQuiz(
//       title: String!
//       description: String!
//       categorySlug: String!
//       questionIds: [ID!]
//     ): Quiz
//     createQuestion(
//       quizId: ID!
//       question: String!
//       options: [String!]!
//       answer: String!
//     ): Question
//     updateQuizWithQuestions(quizId: ID!, questionIds: [ID!]!): Quiz
//     submitQuiz(quizId: ID!, answers: [AnswerInput!]!): QuizResult!
//   }
// `;

const typeDefs = gql`
  type Category {
    _id: ID!
    name: String!
    slug: String!
    description: String!
    quizzes: [Quiz]
    user: User! # User who created the category
  }

  type Quiz {
    _id: ID!
    title: String!
    slug: String!
    description: String!
    category: Category
    questions: [Question]
    user: User! # User who created the quiz
  }

  type Question {
    _id: ID!
    question: String!
    options: [String!]!
    answer: String!
    quiz: Quiz
  }

  type User {
    _id: ID!
    uid: String! # Firebase UID
    email: String!
    displayName: String
    categories: [Category] # Categories created by the user
    quizzes: [Quiz] # Quizzes created by the user
  }

  input AnswerInput {
    questionId: ID!
    selectedAnswer: String!
  }

  type QuizResult {
    score: Int!
    feedback: [QuestionFeedback!]!
  }

  type QuestionFeedback {
    correctAnswer: String
    isCorrect: Boolean!
  }

  type DeleteResponse {
    success: Boolean!
    message: String
    deletedId: ID
  }

  type Query {
    # Fetch categories and quizzes for the logged-in user
    getAllCategories: [Category] # User-specific categories
    getCategoryBySlug(slug: String!): Category
    getAllQuizzesByCategorySlug(slug: String!): [Quiz]
    getQuizBySlug(slug: String!): Quiz

    # Firebase Auth: Get the currently logged-in user
    getCurrentUser: User
  }

  type Mutation {
    # Mutations that create data are tied to the authenticated user
    createCategory(name: String!, description: String!, slug: String!): Category

    createQuiz(
      title: String!
      description: String!
      categorySlug: String!
      questionIds: [ID!]
    ): Quiz

    createQuestion(
      quizId: ID!
      question: String!
      options: [String!]!
      answer: String!
    ): Question

    updateQuizWithQuestions(quizId: ID!, questionIds: [ID!]!): Quiz

    # Firebase Auth: User must be authenticated to submit a quiz
    submitQuiz(quizId: ID!, answers: [AnswerInput!]!): QuizResult!

    # Firebase Auth: Login and register mutation placeholders if needed
    registerUser(email: String!, displayName: String!, uid: String!): User

    deleteCategory(categoryId: ID!): DeleteResponse!

    deleteQuiz(quizId: ID!): DeleteResponse!
  }
`;

module.exports = typeDefs;
