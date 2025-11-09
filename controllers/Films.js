'use strict';

const utils = require('../utils/writer.js');
const Films = require('../service/FilmsService');

/**
 * Helpers
 */
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

/**
 * DELETE /api/films/{filmId}
 * Owner only (service enforces)
 */
module.exports.apiFilmsFilmIdDELETE = async function apiFilmsFilmIdDELETE(req, res, next, filmId) {
  try {
    const id = toInt(filmId);
    if (id === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);

    await Films.apiFilmsFilmIdDELETE(id, req.user?.id);
    return utils.writeJson(res, null, 204);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') || msg.includes('Forbidden') ? 403 :
          msg.includes('not found') ? 404 :
            500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * GET /api/films/{filmId}
 * If public or owner (service enforces)
 */
module.exports.apiFilmsFilmIdGET = async function apiFilmsFilmIdGET(req, res, next, filmId) {
  try {
    const id = toInt(filmId);
    if (id === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);

    const film = await Films.apiFilmsFilmIdGET(id, req.user?.id);
    return utils.writeJson(res, film, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') ? 403 :
          msg.includes('not found') ? 404 :
            500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * PUT /api/films/{filmId}
 * Body must match path id; owner only; visibility flip should be rejected (service validates)
 */
module.exports.apiFilmsFilmIdPUT = async function apiFilmsFilmIdPUT(req, res, next, body, filmId) {
  try {
    const id = toInt(filmId);
    if (id === undefined) return utils.writeJson(res, { error: 'Invalid filmId' }, 400);

    // Enforce path/body id coherence; if body lacks id, set it.
    if (body && body.id !== undefined && body.id !== id)
      return utils.writeJson(res, { error: 'Body id does not match path filmId' }, 400);
    body = body || {};
    body.id = id;

    // Never trust owner in body; bind to authenticated user
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    body.owner = req.user.id;

    const updated = await Films.apiFilmsFilmIdPUT(body, id, req.user.id);
    return utils.writeJson(res, updated, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authenticated') ? 401 :
        msg.includes('Not authorized') ? 403 :
          msg.includes('cannot change visibility') ? 400 :
            msg.includes('not found') ? 404 :
              msg.includes('conflict') ? 409 :
                400; // default to 400 for validation issues
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * GET /api/films/me?page=&pageSize=
 */
module.exports.apiFilmsMeGET = async function apiFilmsMeGET(req, res, next, page, pageSize) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    const p = toInt(page) || 1;
    const ps = toInt(pageSize); // undefined -> use default in service/utils
    const result = await Films.apiFilmsMeGET(req.user.id, p, ps);
    return utils.writeJson(res, result, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('Not authenticated') ? 401 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * POST /api/films
 * Create film; owner is current user (ignore/override body.owner)
 */
module.exports.apiFilmsPOST = async function apiFilmsPOST(req, res, next, body) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    body = body || {};
    body.owner = req.user.id; // bind to current user, prevent spoofing

    const created = await Films.apiFilmsPOST(body, req.user.id);

    // If service returns the created film with id, set Location
    if (created && created.id !== undefined) {
      res.setHeader('Location', `${created.self || `/api/films/${created.id}`}`);
      return utils.writeJson(res, created, 201);
    }
    return utils.writeJson(res, created, 201);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('validation') ? 400 :
        msg.includes('duplicate') || msg.includes('exists') ? 409 :
          msg.includes('Not authenticated') ? 401 :
            400;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * GET /api/films/reviews/me
 * Films I’m invited to review
 */
module.exports.apiFilmsReviewsMeGET = async function apiFilmsReviewsMeGET(req, res, next) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    const list = await Films.apiFilmsReviewsMeGET(req.user.id);
    return utils.writeJson(res, list, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('Not authenticated') ? 401 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};
