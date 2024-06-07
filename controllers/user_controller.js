// external imports
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
// const config = require("../config/config")
const nodemailer = require("nodemailer")
const randomstring = require("randomstring");
const dataUri = require('datauri')
// const uploader = require('../utils/cloudinary')


// internal imports
const SECRET_KEY = process.env.SECRET_KEY;
const { validateInputs } = require("../validators/user_validations");

// Schema imports
const User = require("../models/user_model");
const Upload = require("../models/uploads_model")

const signup = async (req, res) => {
    try {
        const userData = req.body;
        userData.profile_pic = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
        // Validate user data
        const validationError = validateInputs(userData);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
            });
        }

        // Check if the user already exists with the provided email
        const existingUser = await User.findOne({ email: userData.email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account already exists with the provided email.",
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;

        // Create a new user
        const newUser = new User(userData);
        const savedUser = await newUser.save();

        res.status(201).json({
            success: true,
            message: "User signed up successfully!",
            user: savedUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const login = async (req, res) => {
    try {
        const userData = req.body;
        const username = userData.username;
        const password = userData.password;
        

        // validate  inputs
        const validationError = validateInputs(userData);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
            });
        }
        
        // Find the user by username
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // console.log("Hello");
        // Compare the provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password",
            });
        }

        // If the password is valid, generate a JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            SECRET_KEY,
            { expiresIn: process.env.TOKEN_EXPIRY }
        );

        res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                username: user.username,
                full_name: user.full_name,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getUserDetails = async (req, res) => {
    try {
      // Get the author ID from the request parameters
      const authorId = req.query.authorId;
  
      // Find the user by author ID
      const user = await User.findOne({ _id: authorId });
  
      // If user is found, return user details
      if (user) {
        res.status(200).json(user);
      } else {
        // If user is not found, return 404 status
        res.status(404).json({ message: "User not found" });
      }
    } catch (err) {
      // If there's any error, return 500 status
      res.status(500).json({ message: err.message });
    }
  };

// Function to initiate the password reset process
const forget_password = async (req, res) => {
    try {
        // Extracting the email from the request body
        const email = req.body.email;

        // Finding user data based on the provided email
        const userData = await User.findOne({ email: email }, { username: 1, email: 1 });

        // If user data is found
        if (userData) {
            // Generating a random string
            const randomString = randomstring.generate();

            // Updating the user's record with the generated token
            const data = await User.updateOne(
                { email: email },
                { $set: { token: randomString } }
            );



            // Sending the reset password email
            sendResetPasswordMail(userData.username, userData.email, randomString);

            // Sending a success response
            res.status(200).send({ success: true, msg: "Check mail and reset password!" });
        } else {
            // Sending a success response if email does not exist
            res.status(200).send({ success: true, msg: "Email does not exist" });
        }
    } catch (error) {
        // Handling errors and sending an error response if an exception occurs
        res.status(400).send({ success: false, msg: error.message });
    }
};

// Function for sending a reset password email
const sendResetPasswordMail = async (name, email, token) => {
    try {
        // Creating a transporter for sending emails using Gmail SMTP
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: config.emailUser,  // Your Gmail username
                pass: config.emailPassword,  // Your Gmail password
            },
        });

        // Mail options for the reset password email
        const mailOptions = {
            from: config.emailUser,  // Sender's email address
            to: email,  // Recipient's email address
            subject: "For reset password",  // Email subject
            // Email body in HTML format
            html: `
          <p>Hi ${name},</p>
          <p>Please click atharva to reset your password:</p>
          <a href=http://localhost:4200/reset_password?token=${token}>Reset password</a>
        `
        };

        // Sending the email
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                // Log an error if sending the email fails
                console.log(error);
            } else {
                // Log a success message if the email is sent successfully
                console.log("Mail Has been sent:-", info.response);
            }
        });
    } catch (error) {
        // Handling errors and sending an error response if an exception occurs
        res.status(400).send({ success: false, msg: error.message });
    }
};

const reset_password = async (req, res) => {
    try {
        // Extracting the token from the query parameters
        const token = req.query.token;
        console.log(token);


        // Finding user data based on the provided token
        const tokenData = await User.findOne({ token: token });
        console.log(tokenData);

        // If token data is found and it's not expired
        if (tokenData && !isTokenExpired(tokenData.tokenTimestamp)) {
            // Extracting the new password from the request body  
            const password = req.body.password;

            // Hashing the new password using bcrypt
            const newPass = await bcrypt.hash(password, 10);

            // Updating the user's record with the new password and clearing the token
            const userdata = await User.findByIdAndUpdate(
                { _id: tokenData._id },
                { $set: { password: newPass, token: "" } },
                { new: true }
            );

            // Sending a success response with the updated user data
            res.status(200).send({
                success: true,
                msg: "Password reset successfully",
                data: userdata,
            });
        } else {
            // Sending a success response if the link has expired or the token is invalid
            res.status(200).send({ success: true, msg: "Link Expired or Invalid Token!" });
        }
    } catch (error) {
        // Handling errors and sending an error response if an exception occurs
        res.status(400).send({ success: false, msg: error.message });
    }
};

// Function to check if the token is expired
const isTokenExpired = (timestamp) => {
    const expirationTime = 86400000;
    const currentTime = new Date().getTime();
    return (currentTime - timestamp) > expirationTime;
};

const uploadImg = async (req, res) => {
    console.log("hello");
    console.log(req.file);
    if (req.file) {
        // Extract the base64 content from the data URI
        const file = dataUri(req).content;
        // Convert the base64 string to a Buffer
        const fileBuffer = Buffer.from(file.split(',')[1], 'base64');
        
        // Use the buffer to upload the file
        return uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
            if (error) {
                return res.status(400).json({
                    message: 'Something went wrong while processing your request',
                    error: error.message,
                });
            } else {
                const image = result.url;
                return res.status(200).json({
                    message: 'Your image has been uploaded successfully to cloudinary',
                    imageurl: image
                });
            }
        }).end(fileBuffer);
    } else {
        res.status(400).json({
            message: 'Something went wrong while processing your request',
        });
    }
};

const getFilesToDownload = async (req, res) => {
    try {
        const userData = req.decoded; // Decoded user information from the token
        
        // Find all uploads associated with the user's ID
        const uploads = await Upload.find({ uploaded_for: userData.userId });

        // If no uploads are found, return a message indicating no files available
        if (!uploads || uploads.length === 0) {
            return res.status(200).json({ message: "No files available" });
        }

        // Return the list of uploads
        res.status(200).json(uploads);
    } catch (error) {
        console.error("Error fetching uploads:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


module.exports = {
    signup,
    login,
    forget_password,
    reset_password,
    getUserDetails,
    uploadImg,
    getFilesToDownload
};