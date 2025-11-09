'use strict';

const utils = require('../utils/writer.js');
const Admin = require('../service/AdminService');

/**
 * POST /api/reviews/auto-assign
 * - Auth middleware should already protect this route.
 */
module.exports.apiReviewsAuto_assignPOST = async function apiReviewsAuto_assignPOST(req, res, next) {
  try {
    const actorId = req.user?.id; // who triggers the assignment (optional for auditing)
    const result = await Admin.apiReviewsAuto_assignPOST(actorId);
    return utils.writeJson(res, result, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code =
      msg.includes('Not authorized') ? 403 :
        msg.includes('Not authenticated') ? 401 :
          500;
    return utils.writeJson(res, { error: msg }, code);
  }
};
