'use strict';

const utils = require('../utils/writer.js');
const Auth = require('../service/AuthService');

/**
 * GET /api/sessions/current
 */
module.exports.apiSessionsCurrentGET = async function apiSessionsCurrentGET(req, res, next) {
  try {
    const me = await Auth.apiSessionsCurrentGET(req.user);
    return utils.writeJson(res, me, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Not authenticated');
    const code = msg.includes('Not authenticated') ? 401 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * DELETE /api/sessions/current
 */
module.exports.apiSessionsCurrentDELETE = async function apiSessionsCurrentDELETE(req, res, next) {
  try {
    await Auth.apiSessionsCurrentDELETE(req); // service can call req.logout() internally if needed
    return utils.writeJson(res, null, 204);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Internal error');
    const code = msg.includes('Not authenticated') ? 401 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};

/**
 * POST /api/sessions
 * body: { email, password }
 * Note: actual authentication can be done in the service (wrapping Passport).
 */
module.exports.apiSessionsPOST = async function apiSessionsPOST(req, res, next, body) {
  try {
    const user = await Auth.apiSessionsPOST(req, body); // let service perform passport auth and return the user
    return utils.writeJson(res, user, 200);
  } catch (err) {
    const msg = (typeof err === 'string') ? err : (err?.message || 'Invalid credentials');
    const code = msg.toLowerCase().includes('invalid') ? 401 : 500;
    return utils.writeJson(res, { error: msg }, code);
  }
};
