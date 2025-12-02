'use strict';

const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3');
const dbPath = path.join(__dirname, 'database', 'databaseV2.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to DB at', dbPath);
  }
});
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const uploadImg = multer({ storage }).single('image');

// Check if a user has permission to review a specific film
async function checkUserReviewPermission (userId, filmId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT 1 FROM reviews WHERE filmId = ? AND reviewerId = ?';
    db.get(sql, [filmId, userId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
};

// Get the currently active film for a user (if any)
exports.getActiveFilmForUser = function (userId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT filmId FROM reviews WHERE reviewerId = ? AND active = 1';
    db.get(sql, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.filmId : null);
    });
  });
};
// Get the user who currently has this film active (if any)
exports.getActiveUserForFilm = function (filmId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT u.id, u.name
      FROM reviews r JOIN users u ON r.reviewerId = u.id
      WHERE r.filmId = ? AND r.active = 1
    `;
    db.get(sql, [filmId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

// Used on startup to publish the status of every public film
exports.listAllPublicFilmsSelectionStatus = function () {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT f.id AS filmId, f.title, u.id AS userId, u.name AS userName
      FROM films f
      LEFT JOIN reviews r ON f.id = r.filmId AND r.active = 1
      LEFT JOIN users u ON r.reviewerId = u.id
      WHERE f.private = 0
      ORDER BY f.id
    `;
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

// Enforce: a film can be active for at most one user at a time
exports.setActiveFilm = function (userId, filmId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Is this film already active for some *other* user?
      const checkSql = 'SELECT reviewerId FROM reviews WHERE filmId = ? AND active = 1';
      db.get(checkSql, [filmId], (err, row) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }

        if (row && row.reviewerId !== userId) {
          db.run('ROLLBACK');
          return reject({ code: 'FILM_ALREADY_ACTIVE_FOR_ANOTHER_USER' });
        }

        // Clear previous active film of this user (any film)
        const clearSql = 'UPDATE reviews SET active = 0 WHERE reviewerId = ?';
        db.run(clearSql, [userId], (err2) => {
          if (err2) {
            db.run('ROLLBACK');
            return reject(err2);
          }

          // Set this (film,user) pair as active
          const setSql = 'UPDATE reviews SET active = 1 WHERE filmId = ? AND reviewerId = ?';
          db.run(setSql, [filmId, userId], function (err3) {
            if (err3) {
              db.run('ROLLBACK');
              return reject(err3);
            }

            db.run('COMMIT', (err4) => {
              if (err4) return reject(err4);
              resolve();
            });
          });
        });
      });
    });
  });
};

// user selects film as active
// returns true if OK, false if the film is already active for another user
function setActiveFilm(userId, filmId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1) Check if film is already active for another user
      db.get(
        `SELECT reviewerId
         FROM reviews
         WHERE filmId = ? AND active = 1`,
        [filmId],
        (err, row) => {
          if (err) return reject(err);

          if (row && row.reviewerId !== userId) {
            // someone else already has this film active
            return resolve(false);
          }

          // 2) Clear previous active film for this user
          db.run(
            `UPDATE reviews
             SET active = 0
             WHERE reviewerId = ?`,
            [userId],
            function (err2) {
              if (err2) return reject(err2);

              // 3) Set this film as active for this user
              db.run(
                `UPDATE reviews
                 SET active = 1
                 WHERE filmId = ? AND reviewerId = ?`,
                [filmId, userId],
                function (err3) {
                  if (err3) return reject(err3);
                  // if no row was updated, either no invitation exists
                  // (but that should be checked before), or it's fine
                  return resolve(true);
                }
              );
            }
          );
        }
      );
    });
  });
}

async function getFilmById(id) {
  return db.get(`SELECT * FROM films WHERE id = ?`, [id]);
}

/**
 * Return, for every PUBLIC film, its current selection status:
 *  - status: 'active'  if some reviewer has it active (reviews.active = 1)
 *  - status: 'inactive' if no one has it active
 * If active, also returns userId and userName of the reviewer.
 */
function listAllPublicFilmsSelectionStatus() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        f.id AS filmId,
        CASE
          WHEN r.reviewerId IS NOT NULL THEN 'active'
          ELSE 'inactive'
        END AS status,
        r.reviewerId AS userId,
        u.name AS userName
      FROM films f
      LEFT JOIN reviews r
        ON f.id = r.filmId AND r.active = 1
      LEFT JOIN users u
        ON u.id = r.reviewerId
      WHERE f.private = 0
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const result = rows.map(row => ({
        filmId: row.filmId,
        status: row.status,          // 'active' | 'inactive'
        userId: row.userId || null,  // only meaningful if status === 'active'
        userName: row.userName || null,
      }));

      resolve(result);
    });
  });
}


module.exports = {
  uploadImg,
  uploadDir,
  checkUserReviewPermission,
  setActiveFilm,
  getFilmById,
  listAllPublicFilmsSelectionStatus
};
