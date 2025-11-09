'use strict';

const utils = require('../utils/writer.js');
const Public = require('../service/PublicService');

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

/**
 * GET /api/films/public/{filmId}
 */
module.exports.apiFilmsPublicFilmIdGET = async function apiFilmsPublicFilmIdGET(req, res, next, filmId) {
  try {
    const id = toInt(filmId);
    if (id === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);

    const film = await Public.apiFilmsPublicFilmIdGET(id);
    return utils.writeJson(res, film, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('not found') ? 404 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * GET /api/films/public/{filmId}/reviews
 */
module.exports.apiFilmsPublicFilmIdReviewsGET = async function apiFilmsPublicFilmIdReviewsGET(req, res, next, filmId) {
  try {
    const id = toInt(filmId);
    if (id === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);

    const list = await Public.apiFilmsPublicFilmIdReviewsGET(id);
    return utils.writeJson(res, list, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('not found') ? 404 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * GET /api/films/public/{filmId}/reviews/{reviewerId}
 */
module.exports.apiFilmsPublicFilmIdReviewsReviewerIdGET = async function apiFilmsPublicFilmIdReviewsReviewerIdGET(req, res, next, filmId, reviewerId) {
  try {
    const fid = toInt(filmId);
    const rid = toInt(reviewerId);
    if (fid === undefined || rid === undefined) return utils.writeJson(res, { error: 'Invalid identifiers' }, 400);

    const review = await Public.apiFilmsPublicFilmIdReviewsReviewerIdGET(fid, rid);
    return utils.writeJson(res, review, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('not found') ? 404 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * GET /api/films/public?page=&pageSize=
 */
module.exports.apiFilmsPublicGET = async function apiFilmsPublicGET(req, res, next, page, pageSize) {
  try {
    const p = parseInt(page || req.query.page || 1, 10) || 1;
    const ps = req.query.pageSize ? parseInt(req.query.pageSize, 10) : (pageSize ? parseInt(pageSize, 10) : undefined);

    const result = await Public.apiFilmsPublicGET(p, ps);
    return utils.writeJson(res, result, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    return utils.writeJson(res, { error: msg }, 500);
  }
};
