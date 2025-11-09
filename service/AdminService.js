'use strict';

/**
 * Auto-assign invitations evenly for films without invitations
 *
 * returns Map
 **/
exports.apiReviewsAuto_assignPOST = function () {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = {
      "42": [3, 5]
    };
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

