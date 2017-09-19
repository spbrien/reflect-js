const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const { _debug } = require('../lib/utils')

const R = require('ramda');


// ------------------------------------------------------------
// Custom Routes
// ------------------------------------------------------------
module.exports = function (models, query) {
  // Collection
  router.route('/custom')
    // Get all resources
    .get((req, res, next) => {
      // Example of a custom query with the query builder
      // Has support for rolling back transactions
      // You have to parse the results yourself
      // Look at the code in lib/query for more info

      // ----------------------------------------------
      // const customQuery = query.custom('TableName')
      // custom.limit(2).run().then((results) => {
      //   _debug(results)
      // })
      // ----------------------------------------------

      // Example of a raw query
      // Has support for rolling back transactions
      // You have to parse the results yourself
      // Look at the code in lib/query for more info

      // ----------------------------------------------
      // const rawQuery = query.raw("select top 1 * from TableName")
      // rawQuery.run().then((results) => {
      //   _debug(results)
      // })
      // ----------------------------------------------
      res.send('custom route')
    })
  return router;
};
