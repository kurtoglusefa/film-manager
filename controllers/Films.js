'use strict';

const utils = require('../utils/writer.js');
const FilmsService = require('../service/FilmsService');

// Helper for consistent error responses
const handleError = (res, err) => {
  const msg = typeof err === 'string' ? err : err.message || 'Internal error';
  const code =
    msg.includes('NO_FILMS') ? 404 :
      msg.includes('USER_NOT_OWNER') ? 403 :
        msg.includes('NO_PUBLIC_FILM') ? 404 :
          msg.includes('NO_PRIVATE_FILM') ? 404 :
            msg.includes('validation') ? 400 :
              500;
  return utils.writeJson(res, { error: msg }, code);
};

/**
 * GET /api/films/me
 * Get all films owned by the logged-in user (private ones)
 */
module.exports.apiFilmsMeGET = async function apiFilmsMeGET(req, res, next, page, pageSize) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    const list = await FilmsService.getPrivateFilms(req.user.id, page);
    const total = await FilmsService.getPrivateFilmsTotal(req.user.id);
    return utils.writeJson(res, { total, items: list }, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * GET /api/films/reviews/me
 * Films I’m invited to review
 */
module.exports.apiFilmsReviewsMeGET = async function apiFilmsReviewsMeGET(req, res, next) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    const list = await FilmsService.getInvitedFilms(req.user.id, 1);
    const total = await FilmsService.getInvitedFilmsTotal(req.user.id);
    return utils.writeJson(res, { total, items: list }, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * POST /api/films
 * Create new film (owner = current user)
 */
module.exports.apiFilmsPOST = async function apiFilmsPOST(req, res, next, body) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    const film = await FilmsService.createFilm(body, req.user.id);
    res.setHeader('Location', `/api/films/${film.id}`);
    return utils.writeJson(res, film, 201);
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * GET /api/films/:filmId
 * Retrieve single film (public or owner)
 */
module.exports.apiFilmsFilmIdGET = async function apiFilmsFilmIdGET(req, res, next, filmId) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);

    // Try private first, then public
    try {
      const film = await FilmsService.getSinglePrivateFilm(filmId, req.user.id);
      return utils.writeJson(res, film, 200);
    } catch (err1) {
      const film = await FilmsService.getSinglePublicFilm(filmId);
      return utils.writeJson(res, film, 200);
    }
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * PUT /api/films/:filmId
 * Update existing film (owner only)
 */
module.exports.apiFilmsFilmIdPUT = async function apiFilmsFilmIdPUT(req, res, next, body, filmId) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    const id = parseInt(filmId);
    body.id = id;

    // Determine private/public based on body/private flag
    if (body.private) {
      await FilmsService.updateSinglePrivateFilm(body, id, req.user.id);
    } else {
      await FilmsService.updateSinglePublicFilm(body, id, req.user.id);
    }

    return utils.writeJson(res, { message: 'Updated' }, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * DELETE /api/films/:filmId
 * Delete film (owner only)
 */
module.exports.apiFilmsFilmIdDELETE = async function apiFilmsFilmIdDELETE(req, res, next, filmId) {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    const id = parseInt(filmId);

    // Check type before delete
    const film = await FilmsService.getSinglePublicFilm(id)
      .catch(() => null);

    if (film && film.private === false)
      await FilmsService.deleteSinglePublicFilm(id, req.user.id);
    else
      await FilmsService.deleteSinglePrivateFilm(id, req.user.id);

    return utils.writeJson(res, null, 204);
  } catch (err) {
    handleError(res, err);
  }
};
