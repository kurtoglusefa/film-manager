'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // keep original filename for simplicity
    cb(null, file.originalname);
  }
});

const uploadImg = multer({ storage }).single('image');

module.exports = {
  uploadImg,
  uploadDir,
};
