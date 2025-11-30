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

async function checkUserReviewPermission(userId, filmId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 1
      FROM reviews
      JOIN films ON films.id = reviews.filmId
      WHERE reviews.reviewerId = ?
        AND reviews.filmId = ?
        AND films.private = 0
      LIMIT 1
    `;
    db.get(sql, [userId, filmId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row); // true if permitted, false otherwise
      }
    });
  });
}

async function setActiveFilm(userId, filmId) {
  await db.run(`UPDATE users SET activeFilm = NULL WHERE id = ?`, [userId]);
  await db.run(`UPDATE users SET activeFilm = ? WHERE id = ?`, [filmId, userId]);
}
async function getFilmById(id) {
  return db.get(`SELECT * FROM films WHERE id = ?`, [id]);
}



module.exports = {
  uploadImg,
  uploadDir,
  checkUserReviewPermission,
  setActiveFilm,
  getFilmById
};
