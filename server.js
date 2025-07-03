require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const mongoose = require("mongoose");
const { ApolloServer } = require("apollo-server-express");
const cors = require("cors");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const quizRoutes = require("./routes/quizRoutes");
const verifyToken = require("./middleware/verifyToken");

const app = express();
const PORT = process.env.PORT || 5000;

// Log NODE_ENV to check if it's correctly set
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("ALLOWED_ORIGINS:", process.env.ALLOWED_ORIGINS);

// Middleware for parsing JSON
app.use(express.json());

// Parse ALLOWED_ORIGINS environment variable
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
};

// Use CORS middleware
app.use(cors(corsOptions));

// Log incoming requests
app.use((req, res, next) => {
  console.log(
    `Incoming request from ${req.headers.origin || "unknown origin"}`
  );
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Service is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Apply token verification middleware
app.use(verifyToken);

// Use the verifyToken middleware for the API routes
app.use("/api", verifyToken, quizRoutes); // Apply verifyToken before quizRoutes

// Initialize ApolloServer with the schema, resolvers, and introspection setting
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
  playground: process.env.NODE_ENV !== "production",
  context: ({ req }) => ({
    user: req.user, // Pass authenticated user to context
  }),
});

const startServer = async () => {
  await server.start();
  server.applyMiddleware({ app });

  const mongoURI = process.env.MONGO_URI;

  console.log("MongoDB URI from environment variables:", mongoURI);

  if (!mongoURI) {
    console.error("MongoDB URI is not defined in environment variables.");
    process.exit(1);
  }

  mongoose
    .connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });

  app.listen(PORT, () => {
    const baseUrl =
      process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    console.log(`Server is running on ${baseUrl}${server.graphqlPath}`);
  });
};

startServer();
