import express from "express";
import User from "../models/User.js";

const router = express.Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (name.length < 3) {
        return res.status(400).json({ message: "Name should be at least 3 characters." });
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password should be at least 6 characters." });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered. Please login." });
        }

        const user = await User.create({ name, email, password });
        return res.status(201).json({
            message: "Registration successful",
            user: { email: user.email, name: user.name }
        });
    } catch {
        return res.status(500).json({ message: "Could not register right now." });
    }
});

router.post("/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        return res.json({
            message: "Login successful",
            token: `mkb-${Date.now()}`,
            user: { email: user.email, name: user.name }
        });
    } catch {
        return res.status(500).json({ message: "Login service unavailable." });
    }
});

export default router;
