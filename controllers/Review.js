'use strict';

const utils = require('../utils/writer.js');
const Reviews = require('../service/ReviewsService');

const handleError = (res, err) => {
  const msg = typeof err === 'string' ? err : err.message || 'Internal error';
  const code =
    msg.includes('NO_FILMS') ? 404 :
    msg.includes('NO_PUBLIC_FILM') ? 404 :
    msg.includes('NO_REVIEWS') ? 404 :
    msg.includes('ALREADY_COMPLETED') ? 409 :
    msg.includes('USER_NOT_OWNER') ? 403 :
    msg.includes('USER_NOT_REVIEWER') ? 403 :
    msg.includes('EXISTING_REVIEW') ? 409 :
    500;
  return utils.writeJson(res, { error: msg }, code);
};

/** POST /api/films/:filmId/reviews  (owner only) */
module.exports.apiFilmsFilmIdReviewsPOST = async (req, res, next, body, filmId) => {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    const owner = req.user.id;

    const invitations = [{ filmId: parseInt(filmId), reviewerId: parseInt(body.reviewerId) }];
    const created = await Reviews.issueFilmReview(invitations, owner);
    return utils.writeJson(res, created, 201);
  } catch (err) {
    handleError(res, err);
  }
};

/** DELETE /api/films/:filmId/reviews/:reviewerId (owner only) */
module.exports.apiFilmsFilmIdReviewsReviewerIdDELETE = async (req, res, next, filmId, reviewerId) => {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    await Reviews.deleteSingleReview(parseInt(filmId), parseInt(reviewerId), req.user.id);
    return utils.writeJson(res, null, 204);
  } catch (err) {
    handleError(res, err);
  }
};

/** PUT /api/films/:filmId/reviews/:reviewerId (reviewer only) */
module.exports.apiFilmsFilmIdReviewsReviewerIdPUT = async (req, res, next, body, filmId, reviewerId) => {
  try {
    if (!req.user?.id) return utils.writeJson(res, { error: 'Not authenticated' }, 401);
    if (parseInt(reviewerId) !== req.user.id)
      return utils.writeJson(res, { error: 'USER_NOT_REVIEWER' }, 403);

    await Reviews.updateSingleReview(body, parseInt(filmId), parseInt(reviewerId));
    return utils.writeJson(res, { message: 'Updated' }, 200);
  } catch (err) {
    handleError(res, err);
  }
};

/** (These two public GETs are routed through controllers/Public.js already) */
module.exports.apiFilmsPublicFilmIdReviewsGET = () => {};
module.exports.apiFilmsPublicFilmIdReviewsReviewerIdGET = () => {};
