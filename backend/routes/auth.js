// ============================================================
//   routes/auth.js  —  Authentication Routes
//
//   This file handles three routes:
//     POST  /api/auth/signup   — Register a new user
//     POST  /api/auth/signin   — Login an existing user
//     GET   /api/auth/profile  — Get logged-in user's info
//                                (protected — needs a token)
// ============================================================

const express = require("express");
const router = express.Router();

// express-rate-limit prevents someone from sending too many
// requests in a short time (e.g. brute-force password guessing).
const rateLimit = require("express-rate-limit");

// Limit each IP to 10 auth requests per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
    max: 10,
    message: { message: "Too many requests from this IP, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

// Import the User model we created in models/User.js
const User = require("../models/User");

// jsonwebtoken creates and verifies JWT tokens.
// A JWT (JSON Web Token) is like a digital ID card the user
// keeps after logging in, and sends back with each request.
const jwt = require("jsonwebtoken");


// ----------------------------------------------------------
//   Helper: Generate a JWT token for a given user ID
//
//   process.env.JWT_SECRET  — the secret key from .env
//   expiresIn: "7d"         — token is valid for 7 days
// ----------------------------------------------------------
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};


// ----------------------------------------------------------
//   Helper Middleware: Protect routes — verify JWT token
//
//   The browser must send the token in the request header:
//   Authorization: Bearer <token>
//
//   If the token is missing or wrong, we block the request.
// ----------------------------------------------------------
const protect = (req, res, next) => {

    // Read the Authorization header
    const authHeader = req.headers.authorization;

    // Check if header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    // Extract just the token part (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    try {

        // Verify the token using our secret key.
        // If it is valid, "decoded" will contain { id: userId, iat, exp }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the user ID to the request so the next handler can use it
        req.userId = decoded.id;

        next(); // continue to the actual route handler

    } catch (error) {
        return res.status(401).json({ message: "Not authorized, token is invalid or expired" });
    }

};


// ==========================================================
//   ROUTE 1 — POST /api/auth/signup
//   Register a new user
//
//   Expected request body (JSON):
//   {
//     "username": "john",
//     "email": "john@example.com",
//     "password": "secret123"
//   }
// ==========================================================
router.post("/signup", authLimiter, async (req, res) => {

    // Destructure the fields from the request body
    const { username, email, password } = req.body;

    // Basic validation — make sure all fields are present
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    // Ensure each field is a plain string to prevent NoSQL injection.
    // An attacker could send { "email": { "$gt": "" } } to bypass queries.
    if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Invalid input format" });
    }

    try {

        // Check if a user with this email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered" });
        }

        // Create and save the new user.
        // The password will be automatically hashed by the pre-save hook
        // we defined in models/User.js — we don't hash it manually here.
        const user = await User.create({ username, email, password });

        // Respond with the new user's basic info and a token
        res.status(201).json({
            message: "Account created successfully!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token: generateToken(user._id)
        });

    } catch (error) {
        // Handle duplicate key errors (e.g. username already taken)
        if (error.code === 11000) {
            return res.status(400).json({ message: "Username or email already exists" });
        }
        res.status(500).json({ message: "Server error: " + error.message });
    }

});


// ==========================================================
//   ROUTE 2 — POST /api/auth/signin
//   Login an existing user
//
//   Expected request body (JSON):
//   {
//     "email": "john@example.com",
//     "password": "secret123"
//   }
// ==========================================================
router.post("/signin", authLimiter, async (req, res) => {

    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" });
    }

    // Ensure inputs are plain strings to prevent NoSQL injection
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Invalid input format" });
    }

    try {

        // Find the user by email in the database (normalise to lowercase)
        const user = await User.findOne({ email: email.toLowerCase() });

        // If no user found with this email
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Use the matchPassword method from models/User.js to compare passwords
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Login successful — send back user info and token
        res.status(200).json({
            message: "Login successful!",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
    }

});


// ==========================================================
//   ROUTE 3 — GET /api/auth/profile
//   Get the logged-in user's profile  (PROTECTED ROUTE)
//
//   The client must send the JWT token in the header:
//   Authorization: Bearer <token>
// ==========================================================
router.get("/profile", authLimiter, protect, async (req, res) => {

    try {

        // req.userId was set by the "protect" middleware above
        // .select("-password") means "return everything EXCEPT the password"
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });

    } catch (error) {
        res.status(500).json({ message: "Server error: " + error.message });
    }

});


module.exports = router;
