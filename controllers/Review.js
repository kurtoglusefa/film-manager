'use strict';

const utils = require('../utils/writer.js');
const Reviews = require('../service/ReviewsService.js');

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

/**
 * POST /api/films/{filmId}/reviews
 * Owner invites a reviewer (service enforces ownership and film visibility)
 * body: { reviewerId }
 */
module.exports.apiFilmsFilmIdReviewsPOST = async function apiFilmsFilmIdReviewsPOST(req, res, next, body, filmId) {
  try {
    const fid = toInt(filmId);
    const reviewerId = toInt(body?.reviewerId);
    if (fid === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);
    if (reviewerId === undefined) return utils.writeJson(res, { error: 'Invalid reviewerId' }, 400);
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    const created = await Reviews.apiFilmsFilmIdReviewsPOST({ reviewerId }, fid, req.user.id);
    // created should be the invitation/review resource
    if (created && created.self) res.setHeader('Location', created.self);
    return utils.writeJson(res, created, 201);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') ? 403 :
          msg.includes('not found') ? 404 :
            msg.includes('duplicate') || msg.includes('already invited') ? 409 :
              400;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * DELETE /api/films/{filmId}/reviews/{reviewerId}
 * Owner can remove invitation if not completed
 */
module.exports.apiFilmsFilmIdReviewsReviewerIdDELETE = async function apiFilmsFilmIdReviewsReviewerIdDELETE(req, res, next, filmId, reviewerId) {
  try {
    const fid = toInt(filmId);
    const rid = toInt(reviewerId);
    if (fid === undefined || rid === undefined) return utils.writeJson(res, { error: 'Invalid identifiers' }, 400);
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    await Reviews.apiFilmsFilmIdReviewsReviewerIdDELETE(fid, rid, req.user.id);
    return utils.writeJson(res, null, 204);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') ? 403 :
          msg.includes('not found') ? 404 :
            msg.includes('completed') ? 409 :
              400;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * PUT /api/films/{filmId}/reviews/{reviewerId}
 * Reviewer completes the review.
 * Enforce completed=true at controller level.
 */
module.exports.apiFilmsFilmIdReviewsReviewerIdPUT = async function apiFilmsFilmIdReviewsReviewerIdPUT(req, res, next, body, filmId, reviewerId) {
  try {
    const fid = toInt(filmId);
    const rid = toInt(reviewerId);
    if (fid === undefined || rid === undefined) return utils.writeJson(res, { error: 'Invalid identifiers' }, 400);
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    // Hard rule: body.completed must be true
    if (!body || body.completed !== true)
      return utils.writeJson(res, { error: 'completed must be true to update a review' }, 400);

    const { reviewDate, rating, review } = body;
    const updated = await Reviews.apiFilmsFilmIdReviewsReviewerIdPUT({ reviewDate, rating, review }, fid, rid, req.user.id);
    return utils.writeJson(res, updated, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') ? 403 :
          msg.includes('not found') ? 404 :
            400;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/* ----- Public mirrors (if your routing points here; else handled in Public.js) ----- */
module.exports.apiFilmsPublicFilmIdReviewsGET = async function apiFilmsPublicFilmIdReviewsGET(req, res, next, filmId) {
  try {
    const fid = toInt(filmId);
    if (fid === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);
    const list = await Reviews.apiFilmsPublicFilmIdReviewsGET(fid);
    return utils.writeJson(res, list, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('not found') ? 404 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

module.exports.apiFilmsPublicFilmIdReviewsReviewerIdGET = async function apiFilmsPublicFilmIdReviewsReviewerIdGET(req, res, next, filmId, reviewerId) {
  try {
    const fid = toInt(filmId);
    const rid = toInt(reviewerId);
    if (fid === undefined || rid === undefined) return utils.writeJson(res, { error: 'Invalid identifiers' }, 400);
    const item = await Reviews.apiFilmsPublicFilmIdReviewsReviewerIdGET(fid, rid);
    return utils.writeJson(res, item, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('not found') ? 404 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

module.exports.apiFilmsReviewsMeGET = async function apiFilmsReviewsMeGET(req, res, next) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    const list = await Reviews.apiFilmsReviewsMeGET(req.user.id);
    return utils.writeJson(res, list, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('Not authenticated') ? 401 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

module.exports.apiReviewsAuto_assignPOST = async function apiReviewsAuto_assignPOST(req, res, next) {
  try {
    const actorId = req.user?.id;
    const result = await Reviews.apiReviewsAuto_assignPOST(actorId);
    return utils.writeJson(res, result, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') ? 403 :
          500;
    return utils.writeJson(res, { error: msg }, code);
  }
};
