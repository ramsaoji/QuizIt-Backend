const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} = require("@apollo/client/core");
const fetch = require("node-fetch");
const { generateQuizWithGroq } = require("../groq/groqService");
// const { formatQuizData } = require("../utils/utils");
const {
  CREATE_CATEGORY,
  CREATE_QUIZ,
  CREATE_QUESTION,
  UPDATE_QUIZ_WITH_QUESTIONS,
  GET_CATEGORY_BY_SLUG,
  GET_QUIZ_BY_SLUG,
} = require("../graphql/queries");
const slugify = require("slugify");

const client = new ApolloClient({
  link: new HttpLink({
    uri: process.env.GQL_URL, // Your GraphQL endpoint URL from environment variables
    fetch: fetch, // Explicitly define fetch for Node.js
  }),
  cache: new InMemoryCache(),
});

const checkCategoryExists = async (categorySlug) => {
  console.log(
    `###-Init check category exists for category slug (${categorySlug})-###`
  );

  try {
    const result = await client.query({
      query: GET_CATEGORY_BY_SLUG,
      variables: { slug: categorySlug },
    });
    console.log("existing category result ---", result);

    return result.data.getCategoryBySlug;
  } catch (error) {
    console.error(`Checked for existing category - ${error}`);
    return null;
  }
};

// const checkQuizExists = async (quizTitle) => {
//   const quizSlug = slugify(quizTitle);
//   console.log(`###-Init check quiz exists for quiz slug (${quizSlug})-###`);

//   try {
//     const result = await client.query({
//       query: GET_QUIZ_BY_SLUG,
//       variables: { slug: quizSlug },
//     });
//     return result.data.getQuizBySlug;
//   } catch (error) {
//     console.error(`Checked for existing quiz - ${error.message}`);
//     return null;
//   }
// };

exports.generateQuiz = async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log("Received prompt ----", prompt);

    const quizData = await generateQuizWithGroq(prompt);

    const parsedData = await JSON.parse(quizData); // Example of fetching data

    // Check if parsedData is loaded before running the validation
    if (!parsedData) {
      console.error("parsedData is not yet loaded");
      return; // Don't proceed if the data is not ready
    }

    console.log("Parsed Data:", JSON.stringify(parsedData, null, 2)); // Check full data structure

    // Check if the response is an error message
    if (parsedData.error) {
      return res.status(400).json({
        error: parsedData.error,
        message: parsedData.message,
      });
    }

    // Perform validation
    if (
      !parsedData?.category ||
      !parsedData?.category?.categorySlug ||
      !parsedData?.quiz ||
      !Array.isArray(parsedData?.questions) ||
      parsedData?.questions.length !== 5
    ) {
      throw new Error("Invalid quiz structure received.");
    }

    // Validate each question
    parsedData?.questions?.forEach((q, index) => {
      if (
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.answer
      ) {
        throw new Error(`Invalid question structure at index ${index}`);
      }
      if (!q.options.includes(q.answer)) {
        throw new Error(`Answer not in options for question at index ${index}`);
      }
      // if (!["easy", "medium", "hard"].includes(q.difficultyLevel)) {
      //   throw new Error(
      //     `Invalid difficulty level for question at index ${index}`
      //   );
      // }
    });

    const categorySlug = parsedData?.category?.categorySlug;

    console.log("categorySlug ---", categorySlug);

    const existingCategory = await checkCategoryExists(categorySlug);

    console.log("existingCategory ---", existingCategory);

    return res.json({ ...parsedData, existingCategory });
  } catch (error) {
    console.error("Error processing quiz generation:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
