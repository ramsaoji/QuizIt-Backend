const Groq = require("groq-sdk");
const { determineCategory } = require("../utils/categoryMapper");

const groqClient = new Groq();

exports.generateQuizWithGroq = async (prompt) => {
  // Determine if the prompt is suitable for quiz generation
  const isQuizPrompt =
    prompt.includes("question") ||
    (prompt.length > 3 &&
      /^[\s\S]+$/.test(prompt) && // Matches any character including symbols
      prompt.trim().split(/\s+/).length > 1);

  if (isQuizPrompt) {
    // Generate a quiz
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI assistant specialized in generating high-quality IT and programming quizzes only. You must validate all prompts to ensure they are IT-related before generating content. All responses must be provided in valid JSON format.

          **Category Assignment Rules:**
          1. ALWAYS use the most specific, relevant technology or concept as the main category
          2. For programming languages and frameworks:
             - Use the core language name as category (e.g., "JavaScript", "Python", "Java")
             - Include ALL related features, frameworks, and concepts under that language
             - Examples:
               * "JavaScript" category includes: ES6, Node.js, React, Angular, TypeScript, closures, promises
               * "Python" category includes: Django, Flask, NumPy, Pandas
               * "Java" category includes: Spring, Hibernate, JPA, Maven
          3. For other technologies:
             - Use the primary technology name (e.g., "MongoDB", "Docker", "Git")
             - Be consistent with casing and naming
          4. For general concepts:
             - Use broad category only if topic doesn't fit under specific technology
             - Examples: "Web Development", "DevOps", "Databases", "Security"

          **Category Structure in Response:**
          {
            "category": {
              "name": "Primary technology or concept name (e.g., JavaScript, Python, MongoDB)",
              "slug": "lowercase-hyphenated-name (e.g., javascript, python, mongodb)",
              "description": "Brief description of the category scope"
            }
          }

          **Quiz Structure:**
          - Title: 2-4 words, specific to content
          - Description: 6-10 words summarizing focus and difficulty level
          - 5 questions: varying difficulty (easy, medium, hard), clear, 4 options each
        
          **Complete Response Format:**
          {
            "category": {
              "name": "Category name",
              "slug": "category-slug",
              "description": "Category description"
            },
            "quiz": {
              "title": "Quiz title",
              "description": "Quiz description"
            },
            "questions": [
              {
                "question": "Question text",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "answer": "Correct single option only"
              }
            ]
          }
        
          **Error Response Format:**
          {
            "error": "Invalid Prompt",
            "message": "Brief explanation of why the prompt is invalid or unclear"
          }
        
          **Important Notes:**
          1. ALWAYS categorize related topics under their primary technology
          2. BE CONSISTENT with category names across similar topics
          3. USE SPECIFIC technology names instead of general categories when possible
          4. MAINTAIN the same category for related concepts (e.g., all JavaScript concepts under JavaScript)
          5. SLUGIFY category names: lowercase, hyphens for spaces, remove special characters`,
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

    const quizData = response.choices[0].message.content;
    const parsedQuizData = JSON.parse(quizData);

    // If it's a valid quiz (not an error response), add the category
    if (!parsedQuizData.error) {
      const category = determineCategory(
        parsedQuizData.quiz.title,
        parsedQuizData.quiz.description
      );
      parsedQuizData.category = category;
    }

    console.log(
      "Generated quiz data from groq ---",
      JSON.stringify(parsedQuizData)
    );
    return JSON.stringify(parsedQuizData);
  } else {
    // Generate a generic response or error message from groq
    const response = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI assistant providing responses based on the given prompt. If the prompt is not about generating IT quizzes, provide an appropriate response or an error message. Ensure clarity and relevance in your response.
          
          **JSON Format for Invalid Prompts:**
          If the prompt is invalid or too vague to generate a quiz, respond with this JSON structure:
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
    console.log("Generated error response from groq ---", genericResponse);
    return genericResponse;
  }
};
