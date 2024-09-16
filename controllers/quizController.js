const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} = require("@apollo/client/core");
const fetch = require("node-fetch");
const { generateQuizWithGroq } = require("../groq/groqService");
const { GET_CATEGORY_BY_SLUG } = require("../graphql/queries");

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

exports.generateQuiz = async (req, res) => {
  try {
    // Access the authenticated user
    const user = req.user;
    const { prompt } = req.body;

    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    console.log("Received prompt ----", prompt);

    const quizData = await generateQuizWithGroq(prompt);

    const parsedData = await JSON.parse(quizData); // Example of fetching data

    // Check if parsedData is loaded before running the validation
    if (!parsedData) {
      console.error("parsedData is not yet loaded");
      return res.status(500).json({ error: "Failed to load quiz data" });
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
