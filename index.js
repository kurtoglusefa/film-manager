'use strict';

const addFormats = require('ajv-formats');

const path = require('path');
const http = require('http');
const cors = require('cors');
const oas3Tools = require('oas3-tools');
const { Validator, ValidationError } = require('express-json-validator-middleware');
const session = require('express-session');
const passport = require('passport'); // strategies registered by ./passport-config
require('./passport-config');         // sets up LocalStrategy + (de)serialize

const serverPort = 3001;

/* ---------------------------- Swagger bootstrap ---------------------------- */
const expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'));
const app = expressAppConfig.getApp();

/* ------------------------------- Middlewares ------------------------------- */
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(session({
  secret: "shhhhh... it's a secret!",  // replace in real deployments
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,  // set true when serving over HTTPS
    // maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.use(require('express').json());   // parse JSON bodies

app.use(passport.initialize());
app.use(passport.session());

/* ----------------------- Auth verification middleware ---------------------- */
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authorized' });
};

/* ---------------------------- JSON Validator (AJV) ------------------------- */
const validator = new Validator({
  allErrors: true,
  coerceTypes: true,
  removeAdditional: 'failing',
});
addFormats(validator.ajv);
const validate = validator.validate;

/* ----------------------- Draft-07 schemas for bodies ----------------------- */
/** POST /api/films
 * No id, no owner. Extras allowed only if private=true.
 */
const filmCreateSchema = {
  $id: 'film.create.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1 },
    private: { type: 'boolean' },
    watchDate: { type: 'string', format: 'date' },
    rating: { type: 'integer', minimum: 0, maximum: 10 },
    favorite: { type: 'boolean', default: false }
  },
  required: ['title', 'private'],
  allOf: [
    {
      if: { properties: { private: { const: true } }, required: ['private'] },
      then: {}, // extras allowed
      else: {
        not: {
          anyOf: [
            { required: ['watchDate'] },
            { required: ['rating'] },
            { required: ['favorite'] }
          ]
        }
      }
    }
  ]
};

/** PUT /api/films/{filmId}
 * id present (we’ll enforce equality with path), owner comes from session (not body).
 */
const filmUpdateSchema = {
  $id: 'film.update.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'integer' },
    title: { type: 'string', minLength: 1 },
    private: { type: 'boolean' },
    watchDate: { type: 'string', format: 'date' },
    rating: { type: 'integer', minimum: 0, maximum: 10 },
    favorite: { type: 'boolean', default: false }
  },
  required: ['id', 'title', 'private'],
  allOf: [
    {
      if: { properties: { private: { const: true } }, required: ['private'] },
      then: {}, // extras allowed
      else: {
        not: {
          anyOf: [
            { required: ['watchDate'] },
            { required: ['rating'] },
            { required: ['favorite'] }
          ]
        }
      }
    }
  ]
};

const reviewInviteSchema = {
  $id: 'review.invite.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: ['reviewerId'],
  properties: {
    reviewerId: { type: 'integer' }
  }
};

const reviewCompletedSchema = {
  $id: 'review.completed.schema.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: ['completed', 'reviewDate', 'rating', 'review'],
  properties: {
    completed: { type: 'boolean', const: true },
    reviewDate: { type: 'string', format: 'date' },
    rating: { type: 'integer', minimum: 0, maximum: 10 },
    review: { type: 'string', maxLength: 1000 }
  }
};

/* -------------------------------- Controllers ------------------------------ */
const AuthCtl = require('./controllers/Auth.js');
const PublicCtl = require('./controllers/Public.js');
const FilmsCtl = require('./controllers/Films.js');
const ReviewCtl = require('./controllers/Review.js');
const AdminCtl = require('./controllers/Admin.js');

/* ---------------------------------- Routes --------------------------------- */
/** AUTH */
app.post('/api/sessions', (req, res, next) =>
  AuthCtl.apiSessionsPOST(req, res, next, req.body)
);

app.get('/api/sessions/current', (req, res, next) =>
  AuthCtl.apiSessionsCurrentGET(req, res, next)
);

app.delete('/api/sessions/current', isLoggedIn, (req, res, next) =>
  AuthCtl.apiSessionsCurrentDELETE(req, res, next)
);

/** PUBLIC FILMS */
app.get('/api/films/public', (req, res, next) =>
  PublicCtl.apiFilmsPublicGET(req, res, next, req.query.page, req.query.pageSize)
);

app.get('/api/films/public/:filmId', (req, res, next) =>
  PublicCtl.apiFilmsPublicFilmIdGET(req, res, next, req.params.filmId)
);

app.get('/api/films/public/:filmId/reviews', (req, res, next) =>
  PublicCtl.apiFilmsPublicFilmIdReviewsGET(req, res, next, req.params.filmId)
);

app.get('/api/films/public/:filmId/reviews/:reviewerId', (req, res, next) =>
  PublicCtl.apiFilmsPublicFilmIdReviewsReviewerIdGET(req, res, next, req.params.filmId, req.params.reviewerId)
);

/** AUTHENTICATED FILMS */
app.get('/api/films/me', isLoggedIn, (req, res, next) =>
  FilmsCtl.apiFilmsMeGET(req, res, next, req.query.page, req.query.pageSize)
);

app.get('/api/films/reviews/me', isLoggedIn, (req, res, next) =>
  FilmsCtl.apiFilmsReviewsMeGET(req, res, next)
);

app.post(
  '/api/films',
  isLoggedIn,
  validate({ body: filmCreateSchema }),
  (req, res, next) => FilmsCtl.apiFilmsPOST(req, res, next, req.body)
);

app.get('/api/films/:filmId', isLoggedIn, (req, res, next) =>
  FilmsCtl.apiFilmsFilmIdGET(req, res, next, req.params.filmId)
);

app.put(
  '/api/films/:filmId',
  isLoggedIn,
  validate({ body: filmUpdateSchema }),
  (req, res, next) => FilmsCtl.apiFilmsFilmIdPUT(req, res, next, req.body, req.params.filmId)
);

app.delete('/api/films/:filmId', isLoggedIn, (req, res, next) =>
  FilmsCtl.apiFilmsFilmIdDELETE(req, res, next, req.params.filmId)
);

/** REVIEW INVITATIONS (AUTH) */
app.post(
  '/api/films/:filmId/reviews',
  isLoggedIn,
  validate({ body: reviewInviteSchema }),
  (req, res, next) => ReviewCtl.apiFilmsFilmIdReviewsPOST(req, res, next, req.body, req.params.filmId)
);

app.put(
  '/api/films/:filmId/reviews/:reviewerId',
  isLoggedIn,
  validate({ body: reviewCompletedSchema }),
  (req, res, next) => ReviewCtl.apiFilmsFilmIdReviewsReviewerIdPUT(req, res, next, req.body, req.params.filmId, req.params.reviewerId)
);

app.delete(
  '/api/films/:filmId/reviews/:reviewerId',
  isLoggedIn,
  (req, res, next) => ReviewCtl.apiFilmsFilmIdReviewsReviewerIdDELETE(req, res, next, req.params.filmId, req.params.reviewerId)
);

/** OPTIONAL ADMIN */
app.post('/api/reviews/auto-assign', isLoggedIn, (req, res, next) =>
  AdminCtl.apiReviewsAuto_assignPOST(req, res, next)
);

/* ------------------------ AJV validation error handler --------------------- */
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: 'ValidationError', details: err.validationErrors });
  }
  next(err);
});

/* --------------------------------- Server ---------------------------------- */
http.createServer(app).listen(serverPort, function () {
  console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
  console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});
