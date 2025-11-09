const serviceUtils = require('./utils/serviceUtils.js');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  try {
    const user = await serviceUtils.getUserById(id);
    return cb(null, user || false);
  } catch (e) { return cb(e); }
});

passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password', session: true },
  async (email, password, done) => {
    try {
      const user = await serviceUtils.getUserByEmail(email);   // ← uses hash now
      if (!user) return done(null, false, { message: 'Unauthorized access.' });
      const ok = await serviceUtils.checkPassword(user, password);
      if (!ok) return done(null, false, { message: 'Unauthorized access.' });
      delete user.hash;
      return done(null, user); // {id,name,email}
    } catch (err) {
      return done(err);
    }
  }
));

module.exports = passport;
