// server/graphql/schema/index.js
const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Category {
    _id: ID!
    name: String!
    slug: String!
    description: String!
    quizzes: [Quiz]
  }

  type Quiz {
    _id: ID!
    title: String!
    slug: String!
    description: String!
    category: Category
    questions: [Question]
  }

  type Question {
    _id: ID!
    question: String!
    options: [String!]!
    answer: String!
    quiz: Quiz
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

  type Query {
    getAllCategories: [Category]
    getCategoryBySlug(slug: String!): Category
    getAllQuizzesByCategorySlug(slug: String!): [Quiz]
    getQuizBySlug(slug: String!): Quiz
  }

  type Mutation {
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
    submitQuiz(quizId: ID!, answers: [AnswerInput!]!): QuizResult!
  }
`;

module.exports = typeDefs;
