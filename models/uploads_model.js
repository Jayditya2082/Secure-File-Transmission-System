const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema({
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  data: {
    type: String,
    required: true,
  },
  password:{
    type: String,
    required: true
  },
  uploaded_for:{
    type: String,
    required: true,
  },
  sharedDate: {
    type: Date,
    default: Date.now,
  }
});

const Upload = mongoose.model("upload_data", uploadSchema);
module.exports = Upload;
