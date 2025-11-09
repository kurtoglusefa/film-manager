'use strict';


/**
 * Get a single public film
 *
 * filmId Integer 
 * returns FilmPublic
 **/
exports.apiFilmsPublicFilmIdGET = function (filmId) {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = "";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * List reviews of a public film
 *
 * filmId Integer 
 * returns List
 **/
exports.apiFilmsPublicFilmIdReviewsGET = function (filmId) {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = ["", ""];
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Get a single review of a public film
 *
 * filmId Integer 
 * reviewerId Integer 
 * returns ReviewCompletedOrPending
 **/
exports.apiFilmsPublicFilmIdReviewsReviewerIdGET = function (filmId, reviewerId) {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = "";
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * List public films (paginated)
 *
 * page Integer 1-based page index (optional)
 * pageSize Integer Items per page (optional)
 * returns PaginatedFilms
 **/
exports.apiFilmsPublicGET = function (page, pageSize) {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = {
      "totalItems": 0,
      "pageSize": 1,
      "links": {
        "next": "http://example.com/aeiou",
        "last": "http://example.com/aeiou",
        "prev": "http://example.com/aeiou",
        "self": "http://example.com/aeiou",
        "first": "http://example.com/aeiou"
      },
      "page": 1,
      "items": ["", ""]
    };
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

