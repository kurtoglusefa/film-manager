// service/AuthService.js
'use strict';

const passport = require('passport');

/**
 * DELETE /api/sessions/current
 * Logout and destroy session
 */
exports.apiSessionsCurrentDELETE = function (req) {
  return new Promise((resolve, reject) => {
    if (!req || !req.isAuthenticated || !req.isAuthenticated()) return reject('Not authenticated');
    req.logout(() => resolve());
  });
};

/**
 * GET /api/sessions/current
 * Return current authenticated user (id,name,email)
 */
exports.apiSessionsCurrentGET = function (user) {
  return new Promise((resolve, reject) => {
    if (!user) return reject('Not authenticated');
    // user is API-safe (no hash) because it came from deserializeUser
    resolve(user);
  });
};

/**
 * POST /api/sessions
 * Login with email and password; sets connect.sid cookie
 * NOTE: controllers should pass (req, body)
 */
exports.apiSessionsPOST = function (req, body) {
  return new Promise((resolve, reject) => {
    passport.authenticate('local', (err, user) => {
      if (err) return reject(err);
      if (!user) return reject('Invalid credentials');
      req.login(user, (e) => e ? reject(e) : resolve(user));
    })(req);
  });
};

