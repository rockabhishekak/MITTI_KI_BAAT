// ============================================================
//   config/db.js  —  MongoDB Database Connection
//
//   This file connects our Node.js server to MongoDB Atlas
//   (the cloud database). We call this function once when
//   the server starts up.
// ============================================================

// "mongoose" is an npm package that makes it easy to talk
// to MongoDB from Node.js.
const mongoose = require("mongoose");

// connectDB is an async function — "async" means it can
// wait for things (like network calls) without freezing.
const connectDB = async () => {

    try {

        // mongoose.connect() opens the connection to MongoDB.
        // process.env.MONGODB_URI reads the value from your .env file.
        // Make sure you have added MONGODB_URI in your .env file!
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        // If connection works, print the host name so you know it worked.
        console.log(`MongoDB Connected: ${conn.connection.host}`);

    } catch (error) {

        // If connection fails, print the error and stop the server.
        // Common causes:
        //   - Wrong username or password in the connection string
        //   - Your IP address is not whitelisted in MongoDB Atlas
        //   - No internet connection
        console.error("MongoDB connection error:", error.message);
        process.exit(1); // Exit with failure code

    }

};

// Export the function so server.js can import and call it.
module.exports = connectDB;
