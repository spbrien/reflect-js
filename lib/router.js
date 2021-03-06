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
module.exports = function (models, relationships, query) {
  // Collection
  router.use(jsonParser)
  router.use('/:resource', auth.token, hooks.before)
  router.route('/:resource')
    // Get all resources
    .get((req, res, next) => {
      const params = paramTransform(models, relationships, req, res)
      if (!params.statusCode) {
        query.find(req.params.resource, params).then((result) => {
          const pageCount = params.per_page || params.limit ? params.per_page || params.limit : 25
          if (config.pagination) {
            req.apiData = {
              data: result.rows,
              page: params.offset && params.limit ? parseInt(params.offset / params.limit) : 1,
              per_page: pageCount == '-1' ? result.total : pageCount,
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
          return errorStatus(res, 500, error)
        })
      }
    })
    .post((req, res, next) => {
      if (config.authentication) {
        query.create(req.params.resource, req.body).then((result) => {
          return successStatus(res, 201, result)
        })
      } else {
        return errorStatus(res, 405, 'method not allowed')
      }
    })
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
        const params = paramTransform(models, relationships, req, res)
        if (!params.statusCode) {
          query.findOne(req.params.resource, req.params.id, params).then((result) => {
            req.apiData = result,
            next()
          }).catch((error) => {
            return errorStatus(res, 500, error)
          })
        }
      })
      .put((req, res, next) => {
        if (config.authentication) {
          query.update(req.params.resource, req.params.id, req.body).then((result) => {
            return successStatus(res, 204, result)
          })
        } else {
          return errorStatus(res, 405, 'method not allowed')
        }
      })
      .delete((req, res, next) => {
        if (config.authentication) {
          query.delete(req.params.resource, req.params.id).then((result) => {
            return successStatus(res, 204, result)
          })
        } else {
          return errorStatus(res, 405, 'method not allowed')
        }
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
