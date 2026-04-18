// ============================================================
//   models/User.js  —  User Database Schema
//
//   A "schema" tells MongoDB what fields each User document
//   should have and what type of data each field holds.
//   Think of it like a form template.
// ============================================================

// Import mongoose to define the schema.
const mongoose = require("mongoose");

// bcryptjs is used to hash (scramble) passwords before saving.
// We NEVER save plain-text passwords — always hash them!
const bcrypt = require("bcryptjs");


// ----------------------------------------------------------
//   Define the shape of a User document in the database
// ----------------------------------------------------------
const userSchema = new mongoose.Schema(

    {
        // Username — must be provided and unique across all users
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,       // removes extra spaces from both ends
            minlength: [3, "Username must be at least 3 characters"]
        },

        // Email — must be provided and unique
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true   // always store email in lowercase
        },

        // Password — will be hashed before saving (see below)
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"]
        }
    },

    {
        // "timestamps: true" automatically adds two extra fields:
        //   createdAt  — when the document was first created
        //   updatedAt  — when it was last changed
        timestamps: true
    }

);


// ----------------------------------------------------------
//   Pre-save hook: Hash the password before saving
//
//   This runs automatically every time we call user.save().
//   "pre" means "run this BEFORE the actual save happens".
// ----------------------------------------------------------
userSchema.pre("save", async function (next) {

    // Only hash the password if it was newly set or changed.
    // "isModified" checks if this specific field has changed.
    if (!this.isModified("password")) {
        return next(); // skip hashing and move on
    }

    // "bcrypt.genSalt(10)" creates a random salt with complexity 10.
    // A higher number is more secure but slower. 10 is a good default.
    const salt = await bcrypt.genSalt(10);

    // Hash the plain-text password using the salt.
    // After this, the password field holds the hashed version.
    this.password = await bcrypt.hash(this.password, salt);

    next(); // tell mongoose to continue with the save

});


// ----------------------------------------------------------
//   Instance method: Compare a plain password with the hash
//
//   We call this during login to check if the entered
//   password matches what is stored in the database.
// ----------------------------------------------------------
userSchema.methods.matchPassword = async function (enteredPassword) {
    // bcrypt.compare returns true if they match, false otherwise.
    return await bcrypt.compare(enteredPassword, this.password);
};


// Create the "User" model from the schema and export it.
// mongoose will create a collection called "users" in MongoDB.
const User = mongoose.model("User", userSchema);

module.exports = User;
