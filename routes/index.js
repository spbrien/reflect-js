const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const R = require('ramda');


// ------------------------------------------------------------
// Custom Routes
// ------------------------------------------------------------
module.exports = function (models, query) {
  // Collection
  router.route('/custom')
    // Get all resources
    .get((req, res, next) => {
      res.send('custom route')
    })
  return router;
};
