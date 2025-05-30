const Groq = require("groq-sdk");

const groqClient = new Groq();

// Single fallback category for critical errors only
const BASE_CATEGORIES = {
  webdev: {
    name: "Web Development",
    categorySlug: "webdev",
    description: "Web Development fundamentals and technologies",
  },
};

async function determineCategoryDynamically(prompt) {
  try {
    // Ask the model to analyze the prompt and determine the most appropriate category
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a technology categorization expert. Your task is to analyze the given prompt and determine the most specific and appropriate category.

          Categorization Guidelines:
          1. ALWAYS use the most specific technology or framework as the category
             - Framework-specific features belong to that framework's category (e.g., "React Props" → React category)
             - Language features belong to that language's category (e.g., "JavaScript Promises" → JavaScript category)
             - Tools and platforms get their own categories (e.g., "Docker Containers" → Docker category)
          
          2. Category Structure Rules:
             - Name: Use the official/common name of the technology (e.g., "React", "Vue.js", "Django")
             - Slug: Lowercase, hyphenated version of the name (e.g., "react", "vue-js", "django")
             - Description: Clear, concise explanation focusing on the main purpose/use case
          
          3. Specificity Rules:
             - For framework features (e.g., "React Context", "Vue Router"), use the framework as the category
             - For language features (e.g., "Python Generators"), use the language as the category
             - For standalone tools (e.g., "Docker", "Kubernetes"), use the tool as the category
          
          Return ONLY a JSON object in this exact format:
          {
            "name": "The specific technology/framework name",
            "categorySlug": "technology-slug",
            "description": "Clear description of the technology and its purpose"
          }

          Examples of correct categorization:
          - "React Props" → { "name": "React", "categorySlug": "react", "description": "A JavaScript library for building user interfaces" }
          - "Vue Router" → { "name": "Vue.js", "categorySlug": "vue-js", "description": "A progressive JavaScript framework for building user interfaces" }
          - "Python Decorators" → { "name": "Python", "categorySlug": "python", "description": "A high-level programming language known for its simplicity" }
          
          IMPORTANT:
          - DO NOT create subcategories (e.g., "React Props" should be "React" category)
          - DO NOT create quiz-specific categories (e.g., "React Interview Questions")
          - ALWAYS use the main technology/framework name as the category`,
        },
        {
          role: "user",
          content: `Analyze this topic and determine the most specific and appropriate category: ${prompt}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    let categoryData = JSON.parse(response.choices[0].message.content);
    console.log("Dynamically determined category:", categoryData);

    // Validate the category structure
    if (
      !categoryData.name ||
      !categoryData.categorySlug ||
      !categoryData.description
    ) {
      console.warn(
        "Invalid category structure from dynamic determination, using fallback"
      );
      return BASE_CATEGORIES.webdev;
    }

    // Clean up the category slug to ensure it's properly formatted
    categoryData.categorySlug = categoryData.categorySlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return categoryData;
  } catch (error) {
    console.error("Error in dynamic category determination:", error);
    // Fallback to a safe default if something goes wrong
    return BASE_CATEGORIES.webdev;
  }
}

exports.generateQuizWithGroq = async (prompt) => {
  try {
    // Determine if the prompt is suitable for quiz generation
    const isQuizPrompt =
      prompt.includes("question") ||
      (prompt.length > 3 &&
        /^[\s\S]+$/.test(prompt) && // Matches any character including symbols
        prompt.trim().split(/\s+/).length > 1);

    if (isQuizPrompt) {
      console.log("Generating quiz for prompt:", prompt);

      // Dynamically determine the category
      const category = await determineCategoryDynamically(prompt);
      console.log("Using category:", category);

      // Generate a quiz
      const response = await groqClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in generating high-quality IT and programming quizzes only. You must validate all prompts to ensure they are IT-related before generating content. All responses must be provided in valid JSON format.

          **Category Assignment Rules:**
          1. Use the pre-determined category provided in the example format
          2. Focus questions on the specific technology or concept indicated by the category
          3. Ensure questions are relevant to the category's scope
          4. Maintain consistent difficulty level within the quiz

          **Complete Response Format:**
          {
            "category": ${JSON.stringify(category, null, 2)},
            "quiz": {
              "title": "${category.name} Quiz",
              "description": "Test your knowledge of ${category.name}"
            },
            "questions": [
              {
                "question": "Question text",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "answer": "Option 1"
              }
            ]
          }
        
          **Error Response Format:**
          {
            "error": "Invalid Prompt",
            "message": "Brief explanation of why the prompt is invalid or unclear"
          }
        
          **Important Notes:**
          1. USE THE EXACT category structure provided above
          2. ALWAYS return EXACTLY 5 questions in the questions array
          3. Each question MUST have exactly 4 options
          4. The answer MUST be one of the options
          5. Questions should be specific to ${category.name}
          6. Questions should be challenging but fair
          7. Include a mix of concept understanding and practical application questions`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.0,
        max_tokens: 5000,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        response_format: { type: "json_object" },
      });

      console.log(
        "Raw response from Groq:",
        response.choices[0].message.content
      );

      const quizData = response.choices[0].message.content;

      // Parse the response to ensure it's valid JSON
      let parsedData;
      try {
        parsedData = JSON.parse(quizData);
        console.log(
          "Successfully parsed quiz data:",
          JSON.stringify(parsedData, null, 2)
        );
      } catch (error) {
        console.error("Failed to parse quiz data:", error);
        return JSON.stringify({
          error: "Invalid Response",
          message: "Failed to parse quiz data from model response",
        });
      }

      // Validate the response structure
      if (!parsedData) {
        console.error("Quiz data is null or undefined");
        return JSON.stringify({
          error: "Invalid Response",
          message: "Quiz data is missing",
        });
      }

      if (parsedData.error) {
        console.log("Model returned an error response:", parsedData.error);
        return JSON.stringify(parsedData);
      }

      // Validate required fields
      if (!parsedData.category || !parsedData.quiz || !parsedData.questions) {
        console.error("Missing required fields in response:", parsedData);
        return JSON.stringify({
          error: "Invalid Response",
          message:
            "Response is missing required fields (category, quiz, or questions)",
        });
      }

      // Ensure the category matches our dynamically determined category
      parsedData.category = category;

      // Validate questions array
      if (
        !Array.isArray(parsedData.questions) ||
        parsedData.questions.length !== 5
      ) {
        console.error("Invalid questions array:", parsedData.questions);
        return JSON.stringify({
          error: "Invalid Response",
          message: "Questions must be an array with exactly 5 questions",
        });
      }

      // Validate each question
      for (let i = 0; i < parsedData.questions.length; i++) {
        const q = parsedData.questions[i];
        if (
          !q.question ||
          !Array.isArray(q.options) ||
          q.options.length !== 4 ||
          !q.answer ||
          !q.options.includes(q.answer)
        ) {
          console.error(`Invalid question at index ${i}:`, q);
          return JSON.stringify({
            error: "Invalid Response",
            message: `Question ${i + 1} is invalid or missing required fields`,
          });
        }
      }

      // If we get here, the response is valid
      console.log("Validation passed, returning quiz data");
      return JSON.stringify(parsedData);
    }

    // Generate a generic response or error message from groq
    console.log("Generating generic response for non-quiz prompt");
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI assistant providing responses based on the given prompt. If the prompt is not about generating IT quizzes, provide an appropriate response or an error message. Ensure clarity and relevance in your response.
        
          **Error Response Format:**
          {
            "error": "Invalid Prompt",
            "message": "Brief explanation of why the prompt is invalid or unclear"
          }
          `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 1500,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      response_format: { type: "json_object" },
    });

    const genericResponse = response.choices[0].message.content;

    // Parse and stringify to ensure valid JSON
    const parsedGenericResponse = JSON.parse(genericResponse);
    console.log("Generated generic response:", parsedGenericResponse);
    return JSON.stringify(parsedGenericResponse);
  } catch (error) {
    console.error("Error in generateQuizWithGroq:", error);
    return JSON.stringify({
      error: "Processing Error",
      message: "Failed to generate quiz. Please try again.",
      details: error.message,
    });
  }
};
