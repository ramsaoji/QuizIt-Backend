const { gql } = require("@apollo/client/core");

// Get Queries
exports.GET_CATEGORY_BY_SLUG = gql`
  query GetCategoryBySlug($slug: String!) {
    getCategoryBySlug(slug: $slug) {
      _id
      name
      description
      slug
    }
  }
`;

exports.GET_QUIZ_BY_SLUG = gql`
  query GetQuizBySlug($slug: String!) {
    getQuizBySlug(slug: $slug) {
      _id
      title
      description
      slug
      category {
        _id
        slug
      }
    }
  }
`;

// Mutation Querires
exports.CREATE_CATEGORY = gql`
  mutation CreateCategory($name: String!, $description: String!) {
    createCategory(name: $name, description: $description) {
      _id
      name
      description
      slug
    }
  }
`;

exports.CREATE_QUIZ = gql`
  mutation CreateQuiz(
    $title: String!
    $description: String!
    $categorySlug: String!
  ) {
    createQuiz(
      title: $title
      description: $description
      categorySlug: $categorySlug
    ) {
      _id
      title
      description
      slug
    }
  }
`;

exports.CREATE_QUESTION = gql`
  mutation CreateQuestion(
    $quizId: ID!
    $question: String!
    $options: [String!]!
    $answer: String!
  ) {
    createQuestion(
      quizId: $quizId
      question: $question
      options: $options
      answer: $answer
    ) {
      _id
      question
      options
      answer
      quiz {
        _id
        title
      }
    }
  }
`;

exports.UPDATE_QUIZ_WITH_QUESTIONS = gql`
  mutation UpdateQuizWithQuestions($quizId: ID!, $questionIds: [ID!]!) {
    updateQuizWithQuestions(quizId: $quizId, questionIds: $questionIds) {
      _id
      title
      questions {
        _id
        question
      }
    }
  }
`;
