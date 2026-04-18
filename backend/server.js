// ============================================================
//   server.js  —  Main Entry Point for the Node.js Server
//
//   HOW TO RUN THIS SERVER:
//   Step 1: Open a terminal and navigate to the "backend" folder:
//           cd backend
//   Step 2: Install all packages (only needed once):
//           npm install
//   Step 3: Create a ".env" file by copying ".env.example":
//           cp .env.example .env
//           Then open .env and fill in your MongoDB URI and JWT secret.
//   Step 4: Start the server:
//           npm start          (normal mode)
//           npm run dev        (auto-restarts when you save changes)
//   Step 5: Open your browser and go to:
//           http://localhost:5000
// ============================================================


// ----------------------------------------------------------
//   Load environment variables from the .env file.
//   This must be the FIRST thing we do so that all other
//   files can read process.env.PORT, process.env.MONGODB_URI, etc.
// ----------------------------------------------------------
require("dotenv").config();

// Express is the web framework we use to create the server
// and define routes (like pages/endpoints on the server).
const express = require("express");

// cors allows the frontend (HTML/JS) to make requests to this
// backend even though they are on different ports.
// Without this, the browser would block the requests.
const cors = require("cors");

// Import our database connection function
const connectDB = require("./config/db");

// Import our authentication routes
const authRoutes = require("./routes/auth");


// ----------------------------------------------------------
//   Connect to MongoDB
//   Call this once — it stays connected for the whole session.
// ----------------------------------------------------------
connectDB();


// ----------------------------------------------------------
//   Create the Express application
// ----------------------------------------------------------
const app = express();


// ----------------------------------------------------------
//   Middleware
//   Middleware runs on EVERY request before the route handler.
// ----------------------------------------------------------

// Enable CORS — allows the HTML frontend to talk to this server
app.use(cors());

// Parse incoming JSON request bodies
// (so we can read req.body in our routes)
app.use(express.json());


// ----------------------------------------------------------
//   Basic Routes
// ----------------------------------------------------------

// Home route — just a welcome message to test the server
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to Mitti Ki Baat API 🌱",
        status: "Server is running",
        routes: {
            signup: "POST /api/auth/signup",
            signin: "POST /api/auth/signin",
            profile: "GET  /api/auth/profile  (requires token)"
        }
    });
});

// Health check route — useful to quickly verify the server is alive
// Open http://localhost:5000/health in your browser to check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Server is healthy and running!"
    });
});


// ----------------------------------------------------------
//   Authentication Routes
//   All auth routes will be prefixed with /api/auth
//   Examples:
//     POST http://localhost:5000/api/auth/signup
//     POST http://localhost:5000/api/auth/signin
//     GET  http://localhost:5000/api/auth/profile
// ----------------------------------------------------------
app.use("/api/auth", authRoutes);


// ----------------------------------------------------------
//   Handle 404 — Route Not Found
//   If none of the above routes matched, send a 404 response.
// ----------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});


// ----------------------------------------------------------
//   Start the Server
//   process.env.PORT reads from the .env file.
//   If PORT is not set in .env, we fall back to 5000.
// ----------------------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🌱  Mitti Ki Baat server is running on http://localhost:${PORT}`);
    console.log(`    Health check: http://localhost:${PORT}/health`);
    console.log(`    Auth API:     http://localhost:${PORT}/api/auth\n`);
});
