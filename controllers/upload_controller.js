// Schema imports
const Upload = require("../models/uploads_model");
const User = require("../models/user_model");
const path = require("path")

//upload data api
const uploadData = async (req, res) => {
    try {
        const userData = req.decoded; // Decoded user information from the token

        console.log(userData);
        // Extract data from request body or query parameters
        const { password, uploaded_for } = req.body;

        // Check if the user with the provided uploaded_for ID exists
        const user = await User.findById(uploaded_for);
        // if (!user) {
        //     return res.status(400).json({ error: "User not found" });
        // }


        // Create a new Upload instance
        const newUpload = new Upload({
            uploaded_by: userData.userId,
            data: req.file.path, // Use the path of the uploaded file as data
            password,
            uploaded_for: user._id, // Use the user's ID as reference
        });

        console.log("path:" + req.file.path );
        // Save the new upload to the database
        const savedUpload = await newUpload.save();

        res.status(201).json(savedUpload); // Return the saved upload data
    } catch (error) {
        console.error("Error saving upload:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    uploadData
};
