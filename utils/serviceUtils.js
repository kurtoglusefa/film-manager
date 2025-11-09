'use strict';
const db = require('../components/db.js');
const Film = require('../components/film.js');
const User = require('../components/user.js');
const Review = require('../components/review.js');
const bcrypt = require('bcrypt');


var constants = require('./constants.js');


/**
 * Service Utility functions
 */
exports.getFilmPagination = function (pageNo) {
  var pageNumber = parseInt(pageNo);
  if (isNaN(pageNumber)) pageNumber = 1;
  var size = parseInt(constants.ELEMENTS_IN_PAGE);
  var limits = [];
  if (pageNo == null) {
    pageNumber = 1;
  }
  limits.push(size * (pageNumber - 1));
  limits.push(size);
  return limits;
}

exports.createFilm = function (row) {
  var privateFilm = (row.private === 1) ? true : false;
  var favoriteFilm;
  if (row.favorite == null) favoriteFilm = undefined;
  else favoriteFilm = (row.favorite === 1) ? true : false;
  return new Film(row.fid, row.title, row.owner, privateFilm, row.watchDate, row.rating, favoriteFilm);
}

/**
 *  Review Utility functions
 */
exports.getReviewPagination = function (pageNo, filmId) {
  var pageNumber = parseInt(pageNo);
  if (isNaN(pageNumber)) pageNumber = 1;
  var size = parseInt(constants.ELEMENTS_IN_PAGE);
  var limits = [];
  limits.push(filmId);
  limits.push(filmId);
  if (pageNo == null) {
    pageNumber = 1;
  }
  limits.push(size * (pageNumber - 1));
  limits.push(size);
  return limits;
}


exports.createReview = function (row) {
  var completedReview = (row.completed === 1) ? true : false;
  return new Review(row.fid, row.rid, completedReview, row.reviewDate, row.rating, row.review);
}

/**
 * User Utility functions
 */

exports.createUser = function (row) {
  const id = row.id;
  const name = row.name;
  const email = row.email;
  const hash = row.hash;
  return new User(id, name, email, hash);
}

exports.checkPassword = function (user, password) {
  let hash = bcrypt.hashSync(password, 10);
  return bcrypt.compareSync(password, user.hash);
}

/**
 * Retrieve a user by email (for login) – includes hash for verification
 * returns { id, name, email, hash }
 */
exports.getUserByEmail = function (email) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email, hash FROM users WHERE email = ?";
    db.all(sql, [email], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);
      const row = rows[0];
      resolve({ id: row.id, name: row.name, email: row.email, hash: row.hash });
    });
  });
};
/**
 * Retrieve a user by id (for session deserialization) – NO hash
 * returns { id, name, email }
 */
exports.getUserById = function (id) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email FROM users WHERE id = ?";
    db.all(sql, [id], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);
      resolve({ id: rows[0].id, name: rows[0].name, email: rows[0].email });
    });
  });
};
// --- User Utility functions (REPLACE this whole block) ---

/**
 * API-safe user object (no hash)
 */
exports.createUser = function (row) {
  return new User(row.id, row.name, row.email /* no hash */);
};

/**
 * Retrieve a user by email for authentication.
 * Returns minimal fields **including hash** for bcrypt check.
 */
exports.getUserByEmail = function (email) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email, hash FROM users WHERE email = ?";
    db.all(sql, [email], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);
      const row = rows[0];
      resolve({ id: row.id, name: row.name, email: row.email, hash: row.hash });
    });
  });
};

/**
 * Retrieve a user by id (for session deserialization) – NO hash
 */
exports.getUserById = function (id) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email FROM users WHERE id = ?";
    db.all(sql, [id], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);
      return resolve({ id: rows[0].id, name: rows[0].name, email: rows[0].email });
    });
  });
};

/**
 * Compare plaintext vs stored bcrypt hash
 */
exports.checkPassword = async function (user, password) {
  if (!user || !user.hash) return false;
  return bcrypt.compare(password, user.hash);
};
