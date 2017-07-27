const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const R = require('ramda');
const jsonParser = bodyParser.json();

// Import config
// ------------------------------------------------------------
const config = require('../config')

// Import authentication
// ------------------------------------------------------------
const auth = require('./authentication')

// Import Hooks
// ------------------------------------------------------------
const hooks = require('./hooks')

// Constants
// ------------------------------------------------------------
const ALLOWED_METHODS = {
  COLLECTION: ['GET', 'POST', 'OPTIONS'],
  RESOURCE: ['GET', 'PUT', 'DELETE', 'OPTIONS']
};
const CONTENT_TYPE = 'application/json';


// Helpers
// ------------------------------------------------------------

const {
  errorStatus,
  successStatus,
  paramTransform,
  responseTransform,
} = require('./utils.js')

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
module.exports = function (models, query) {
  // Collection
  router.use('/:resource', auth.token, hooks.before)
  router.route('/:resource')
    // Get all resources
    .get((req, res, next) => {
      const params = paramTransform(req)
      query.find(req.params.resource, params).then((result) => {
        if (config.pagination) {
          req.apiData = {
            data: result.rows,
            page: params.page ? params.page : 1,
            per_page: params.per_page ? params.per_page : 25,
            total: result.total,
          }
        } else {
          req.apiData = {
            data: result.rows,
            total: result.total,
          }
        }
        next()
      }).catch((error) => {
        return errorStatus(res, 500, error.message) 
      })
    })
    // create a new resource
    .post(jsonParser, (req, res, next) => {
    })
    // catch all hooks and transformations
    .all(hooks.after, (req, res, next) => {
      if (ALLOWED_METHODS.COLLECTION.indexOf(req.method) !== -1) {
        return next();
      }
      res.append('Allow', ALLOWED_METHODS.COLLECTION.join(', ')).status(405).send();
    })

    // Resource
    router.use('/:resource/:id', auth.token, hooks.before)
    router.route('/:resource/:id')
      .get((req, res, next) => {
      })
      .put(jsonParser, (req, res, next) => {
      })
      .delete((req, res, next) => {
      })
      .all(hooks.after, (req, res, next) => {
        if (ALLOWED_METHODS.COLLECTION.indexOf(req.method) !== -1) {
          return next();
        }
        res.append('Allow', ALLOWED_METHODS.COLLECTION.join(', ')).status(405).send();
      })

    router.use('/:resource/:id/:relationship', auth.token, hooks.before)
    router.route('/:resource/:id/:relationship')
      .get((req, res, next) => {
      })
      .all(hooks.after, (req, res, next) => {
        if (ALLOWED_METHODS.COLLECTION.indexOf(req.method) !== -1) {
          return next();
        }
        res.append('Allow', ALLOWED_METHODS.COLLECTION.join(', ')).status(405).send();
      })


  router.use(responseTransform);
  return router;
};
