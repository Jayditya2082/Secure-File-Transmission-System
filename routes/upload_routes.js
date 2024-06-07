// external imports
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Internal imports
const UploadController = require("../controllers/upload_controller.js");
const { verifyToken } = require("../middlewares/auth.js");

// Configure Multer to specify the destination folder and file name
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/Users/atharva_zanwar/Desktop'); // Specify the destination folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Specify the file name
    }
});

const upload = multer({ storage: storage });

// Protected routes
router.use(verifyToken);

// Route to upload data with Multer middleware for file upload
router.post('/upload', upload.single('data'), UploadController.uploadData);

module.exports = router;
