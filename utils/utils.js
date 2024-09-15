exports.extractCategoryAndTopic = (prompt) => {
  const regexPattern = /Generate a quiz on (.+) in the (.+) category\./i;
  const match = prompt.match(regexPattern);

  if (match && match.length === 3) {
    return {
      topic: match[1].trim(),
      category: match[2].trim(),
    };
  } else {
    return { error: "Invalid prompt format" };
  }
};

exports.formatQuizData = (response) => ({
  category: {
    name: response.category.name,
    description: response.category.description,
  },
  quiz: {
    title: response.quiz.title,
    description: response.quiz.description,
    categorySlug: response.quiz.categorySlug,
  },
  questions: response.questions.map(({ question, options, answer }) => ({
    question,
    options,
    answer,
  })),
});

exports.validateQuizData = (data) => {
  data.questions.forEach((q, index) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      console.warn(
        `Warning: Invalid options for question ${index + 1}. Question: "${
          q.question
        }"`
      );
      return;
    }

    if (!q.options.includes(q.answer)) {
      console.warn(
        `Warning: Answer for question ${
          index + 1
        } does not exactly match any option. Question: "${q.question}"`
      );
      const closestMatch = q.options.find((option) =>
        option.toLowerCase().includes(q.answer.toLowerCase())
      );
      if (closestMatch) {
        console.warn(`Automatically corrected to: "${closestMatch}"`);
        q.answer = closestMatch;
      }
    }
  });
  return data;
};

exports.slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};
