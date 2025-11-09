'use strict';

const utils = require('../utils/writer.js');
const Films = require('../service/FilmsService');
const Reviews = require('../service/ReviewsService');

const handleError = (res, err) => {
  const msg = typeof err === 'string' ? err : err.message || 'Internal error';
  const code =
    msg.includes('NO_FILMS') ? 404 :
    msg.includes('NO_PUBLIC_FILM') ? 404 :
    msg.includes('NO_REVIEWS') ? 404 :
    500;
  return utils.writeJson(res, { error: msg }, code);
};

/** GET /api/films/public?page&pageSize */
module.exports.apiFilmsPublicGET = async (req, res, next, page, pageSize) => {
  try {
    const items = await Films.getPublicFilms(page);
    const total = await Films.getPublicFilmsTotal();
    return utils.writeJson(res, { total, items }, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/** GET /api/films/public/:filmId */
module.exports.apiFilmsPublicFilmIdGET = async (req, res, next, filmId) => {
  try {
    const film = await Films.getSinglePublicFilm(filmId);
    return utils.writeJson(res, film, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/** GET /api/films/public/:filmId/reviews */
module.exports.apiFilmsPublicFilmIdReviewsGET = async (req, res, next, filmId) => {
  try {
    const items = await Reviews.getFilmReviews(undefined, filmId);
    return utils.writeJson(res, items, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/** GET /api/films/public/:filmId/reviews/:reviewerId */
module.exports.apiFilmsPublicFilmIdReviewsReviewerIdGET = async (req, res, next, filmId, reviewerId) => {
  try {
    const review = await Reviews.getSingleReview(filmId, reviewerId);
    return utils.writeJson(res, review, 200);
  } catch (err) {
    handleError(res, err);
  }
};
