const admin = require("../firebase-config"); // Adjust the path as needed
const {
  ApolloClient,
  InMemoryCache,
  HttpLink,
} = require("@apollo/client/core");
const { setContext } = require("@apollo/client/link/context");
const fetch = require("node-fetch");
const { generateQuizWithGroq } = require("../groq/groqService");
const { GET_CATEGORY_BY_SLUG } = require("../graphql/queries");

const getApolloClient = (idToken) => {
  const httpLink = new HttpLink({
    uri: process.env.GQL_URL,
    fetch: fetch,
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: idToken ? `Bearer ${idToken}` : "",
      },
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
};

const checkCategoryExists = async (categorySlug, idToken) => {
  console.log(
    `###-Init check category exists for category slug (${categorySlug})-###`
  );
  try {
    const client = getApolloClient(idToken);
    const result = await client.query({
      query: GET_CATEGORY_BY_SLUG,
      variables: { slug: categorySlug },
    });
    console.log("existing category result ---", result);

    if (result.data && result.data.getCategoryBySlug === null) {
      console.log(`Category not found for slug: ${categorySlug}`);
      return null;
    }

    return result.data.getCategoryBySlug;
  } catch (error) {
    console.error(`Error checking for existing category:`, error);
    if (error.networkError && error.networkError.statusCode === 401) {
      console.error("Authentication failed. Please check your credentials.");
    }
    return null;
  }
};
exports.generateQuiz = async (req, res) => {
  try {
    // Log the entire request object for debugging (be careful with sensitive data)

    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("No authorization header found");
      return res.status(401).json({ error: "No authorization header" });
    }

    // Extract the token from the Authorization header
    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      console.error("No token found in authorization header");
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify the token

    try {
      await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error("Error verifying ID token:", error);
      return res
        .status(401)
        .json({ error: "Invalid token", details: error.message });
    }

    const { prompt } = req.body;
    console.log("Received prompt ----", prompt);

    const quizData = await generateQuizWithGroq(prompt);
    const parsedData = await JSON.parse(quizData);

    if (!parsedData) {
      console.error("parsedData is not yet loaded");
      return res.status(500).json({ error: "Failed to load quiz data" });
    }

    console.log("Parsed Data:", JSON.stringify(parsedData, null, 2));

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

    // Pass the token to checkCategoryExists
    const existingCategory = await checkCategoryExists(categorySlug, token);
    console.log("existingCategory ---", existingCategory);

    return res.json({ ...parsedData, existingCategory });
  } catch (error) {
    console.error("Error processing quiz generation:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};
