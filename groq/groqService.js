const Groq = require("groq-sdk");

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
          content: `You are an AI assistant generating high-quality IT quizzes. Provide all responses in valid JSON format.

          **Categorization Rules:**     
          1. Use primary technologies or frameworks as main categories.
          2. For basic or fundamental topics of a language or technology, use the language/technology name as the category:
            - "Python basics" → "Python"
            - "JavaScript fundamentals" → "JavaScript"
            - "Java core concepts" → "Java"
            etc...
          3. Group related libraries, tools, and concepts under their parent technology or framework:
            - React ecosystem (Redux, React Router, etc.) → "React"
            - Angular ecosystem → "Angular"
            - Vue.js ecosystem → "Vue.js"
            - Flask, Django, FastAPI, etc. → "Python"
            - Spring, Hibernate, etc. → "Java"
            etc...
          4. Programming languages are distinct top-level categories (e.g., "Python", "Java", "C++", "JavaScript").
          5. Web development topics use "Web Development" unless they fit under a specific language or framework category.
          6. Cloud services use their primary provider as category (e.g., "AWS", "Azure", "Google Cloud").
          7. Database technologies use "Databases" unless a quiz is entirely about a specific database system.
          8. ORM and ODM tools categorize under their parent language or "Databases".
          9. DevOps tools and practices use "DevOps" unless an entire quiz focuses on a specific tool.
          10. Version control concepts categorize under "Version Control".
          11. API-related topics use "API Development" unless about a specific protocol or framework.
          12. Security topics use "Cybersecurity" unless about a specific concept or framework.
          13. Machine Learning and AI topics use "Artificial Intelligence" unless an entire quiz is about a specific subfield.
          14. For topics spanning multiple areas, use the most relevant parent technology or concept as the category.
          
          **JSON Formatting Rules:**
          1. Use double quotes for all strings, including keys.
          2. Escape all nested quotes within strings using a backslash: \\"
          3. Avoid using any special characters or Unicode symbols that might cause parsing issues.
          4. Do not use line breaks within the JSON structure. Generate a single-line JSON string.
          5. Ensure all JSON is properly closed and balanced.

          **Special Handling:**
          - Ensure the prompt is specific enough to generate a meaningful quiz. Prompts that are too vague, such as a single word or a non-specific term, should be considered invalid.

          **Quiz Structure:**
          - Title: 2-4 words, specific to content
          - Description: 6-10 words summarizing focus and difficulty level
          - 5 questions: varying difficulty (easy, medium, hard), clear, 4 options each

          **JSON Format for Valid Quizzes:**

          {
            "category": {
              "name": "Category name",
              "description": "Brief category description (1-2 sentences)",
              "categorySlug": "category-slug",
            },
            "quiz": {
              "title": "Quiz title",
              "description": "Quiz description",
            },
            "questions": [
              {
                "question": "Question text",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "answer": "Correct single option only",
              },
              // 4 more questions
            ]
          }

          **JSON Format for Invalid Prompts:**
          If the prompt is invalid or too vague to generate a quiz, respond with this JSON structure:
          {
            "error": "Invalid Prompt",
            "message": "Brief explanation of why the prompt is invalid or unclear"
          }

          Slugs: Use lowercase, hyphens, no special chars. E.g., "C#" → "csharp", "C++" → "cplusplus", "ASP.NET Core" → "aspnet-core".

          Ensure precise categorization, educational value, and technical accuracy in all quizzes. Aim for a mix of theoretical knowledge and practical application questions.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.0,
      max_tokens: 5000,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      response_format: { type: "json_object" },
    });

    const quizData = response.choices[0].message.content;
    console.log("Generated quiz data from groq ----", quizData);
    return quizData;
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
      model: "llama-3.1-70b-versatile",
      temperature: 0.5,
      max_tokens: 1500,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      response_format: { type: "json_object" },
    });

    const genericResponse = response.choices[0].message.content;
    console.log("Generated error response from groq ----", genericResponse);
    return genericResponse;
  }
};
