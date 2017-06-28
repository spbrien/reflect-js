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

function errorStatus(res, status, error) {
  return res
    .set('Content-Type', CONTENT_TYPE)
    .status(status)
    .json({
      status: status,
      error: data
    })
}

function successStatus(status, data) {
  return res
    .set('Content-Type', CONTENT_TYPE)
    .status(status)
    .json({
      status: status,
      data: data
    })
}


// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
module.exports = function (models, relationships, query, options) {

  const optionDefaults = {
    // Modify parameters before api takes control
    paramTransform: function (req) {
      const limit = req.query.per_page ? parseInt(req.query.per_page) : 25
      const params = {
        limit: limit,
        offset: req.query.page ? parseInt(req.query.page * limit) : 0,
        where: req.query.where ? JSON.parse(req.query.where) : null,
        order: req.query.orderby && req.query.order ? [[req.query.orderby, req.query.order]] : null,
      }
      return R.filter((item) => item, params)
    },
    responseTransform: function (req, res) {
      return res
        .set('Content-Type', CONTENT_TYPE)
        .json(req.apiData)
    }
  };

  options = options || optionDefaults;
  const paramTransform = options.paramTransform || optionDefaults.paramTransform;
  const getIncludes = options.getIncludes || optionDefaults.getIncludes;
  const responseTransform = options.responseTransform || optionDefaults.responseTransform;

  // Collection
  router.use('/:resource', auth.authorize, hooks.before)
  router.route('/:resource')
    // Get all resources
    .get((req, res, next) => {
      const params = paramTransform(req)
      const countParams = R.omit(['limit', 'offset'], params)
      const includes = req.query.includes ? JSON.parse(req.query.includes) : null
      let ormIncludeParameter = []

      // Process Relationships and add to params
      if (includes) {
        // Make sure we have a mapping and relationships
        ormIncludeParameter = R.filter(
          (item) => item,
          R.map((include) => {
            const mapping = R.filter(
              R.propEq('relatedTo', include.resource),
              R.filter(
                R.propEq('resource', req.params.resource),
                relationships
              )
            )
            if (mapping) {
              const direct = R.filter((item) => item.direct, mapping)
              if (direct && direct.length > 0) {
                const map = direct[0]
                if (models[include.resource]) {
                  models[req.params.resource].hasMany(
                    models[include.resource],
                    {
                      foreignKey: map.target_column,
                      sourceKey: map.source_column,
                    }
                  )
                  return {
                   model: models[include.resource],
                   where: include.where
                  }
                }
              } else {
                if (include.through) {
                  const map = R.find(R.propEq('through', include.through), mapping)
                  if (map) {
                    models[req.params.resource].belongsToMany(models[include.resource], {
                      through: map.through,
                      foreignKey: map.intermediate_source_column,
                      otherKey: map.intermediate_target_column,
                    })
                    models[include.resource].belongsToMany(models[req.params.resource], {
                      through: map.through,
                      foreignKey: map.intermediate_target_column,
                      otherKey: map.intermediate_source_column,
                    })

                    return {
                      model: models[include.resource],
                      where: include.where,
                    }
                  }
                }
              }
            }
            return null
          }, includes)
        )
      }

      params.include = ormIncludeParameter
      // Run the queries
      if (models[req.params.resource]) {
        query.count(req.params.resource, countParams).then((total) => {
          query.find(req.params.resource, params).then((items) => {
            if (items) {
              req.apiData = {
                data: items,
                per_page: items.length,
                page: req.query.page ? parseInt(req.query.page) : 1,
                total: total,
              }
              // TODO: remove relationship mappings from ORM
              next()
            } else {
              return errorStatus(res, 404)
            }
          }, (error) => {
            console.log(error)
            return errorStatus(res, 500)
          })
        })
      } else {
        return errorStatus(res, 404)
      }
    })
    // create a new resource
    .post(jsonParser, (req, res, next) => {
      query.create(req.params.resource, req.body).then((result) => {
        return successStatus(201, result)
      }, (error) => {
        return errorStatus(res, 400)
      })
    })
    // catch all hooks and transformations
    .all(hooks.after, (req, res, next) => {
      if (ALLOWED_METHODS.COLLECTION.indexOf(req.method) !== -1) {
        return next();
      }
      res.append('Allow', ALLOWED_METHODS.COLLECTION.join(', ')).status(405).send();
    })

    // Resource
    router.use('/:resource/:id', auth.authorize, hooks.before)
    router.route('/:resource/:id')
      .get((req, res, next) => {
        const params = { where: {} }
        params['where'][models[req.params.resource].primaryKeyField] = req.params.id

        query.findOne(req.params.resource, params).then((item) => {
          if (item) {
            req.apiData = { data: item }
            next()
          } else {
            return errorStatus(res, 404)
          }
        })
      })
      .put(jsonParser, (req, res, next) => {
        const params = { where: {} }
        params['where'][models[req.params.resource].primaryKeyField] = req.params.id

        // TODO: error handling
        query.findOne(req.params.resource, params).then((item) => {
          if (item) {
            query.update(
              req.params.resource,
              params,
              req.body
            ).then((result) => {
              return successStatus(201, result)
            }, (error) => {
              return errorStatus(res, 400)
            })
          } else {
            return errorStatus(res, 404)
          }
        })
      })
      .delete((req, res, next) => {
        const params = { where: {} }
        params['where'][models[req.params.resource].primaryKeyField] = req.params.id

        query.findOne(req.params.resource, params).then((item) => {
          if (item) {
            query.delete(
              req.params.resource,
              params
            ).then((result) => {
              return successStatus(204, result)
            }, (error) => {
              return errorStatus(res, 400)
            })
          } else {
            return errorStatus(res, 404)
          }
        })
      })
      .all(hooks.after, (req, res, next) => {
        if (ALLOWED_METHODS.COLLECTION.indexOf(req.method) !== -1) {
          return next();
        }
        res.append('Allow', ALLOWED_METHODS.COLLECTION.join(', ')).status(405).send();
      })

    router.use('/:resource/:id/:relationship', auth.authorize, hooks.before)
    router.route('/:resource/:id/:relationship')
      .get((req, res, next) => {
        // Set up Relationship where parameters
        const params = paramTransform(req)
        params['where'] = params['where'] ? params['where'] : {}

        // Get our mapping for relationships
        const mapping = R.filter(
          R.propEq('relatedTo', req.params.relationship),
          R.filter(
            R.propEq('resource', req.params.resource),
            relationships
          )
        )

        // If we have no mapping, return
        if (!mapping) {
          return ErrorStatus(res, 404)
        }

        // If we have directly related resources, use the first one
        // There shouldn't be more than one
        const direct = R.filter((item) => item.direct, mapping)
        // console.log(direct)
        if (direct && direct.length > 0) {
          // Set up direct parameters
          const map = direct[0]
          const originalParams = { where: {} }
          originalParams['where'][models[req.params.resource].primaryKeyField] = req.params.id
          query.findOne(req.params.resource, originalParams).then((item) => {
            params['where'][map.target_column] = item[map.source_column]

            // Set up count params
            const countParams = R.omit(['limit', 'offset'], params)

            // Run query
            query.count(req.params.relationship, countParams).then((total) => {
              query.find(req.params.relationship, params).then((items) => {
                if (items) {
                  req.apiData = {
                    data: items,
                    per_page: items.length,
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    total: total,
                  }
                  next()
                } else {
                  return errorStatus(res, 404)
                }
              }, (error) => {
                return errorStatus(res, 500)
              })
            })
          })
        } else {
          if (req.query.through) {
            const map = R.find(R.propEq('through', req.query.through), mapping)
            // Check to make sure our query makes sense
            if (!map) {
              return errorStatus(res, 404)
            }

            // Create Associations
            models[req.params.resource].belongsToMany(models[req.params.relationship], {
              through: map.through,
              foreignKey: map.intermediate_source_column,
              otherKey: map.intermediate_target_column,
            })
            models[req.params.relationship].belongsToMany(models[req.params.resource], {
              through: map.through,
              foreignKey: map.intermediate_target_column,
              otherKey: map.intermediate_source_column,
            })

            // Get resource data
            const parentParams = {where: {}}
            parentParams['where'][models[req.params.resource].primaryKeyField] = req.params.id

            // Set up count params
            const countParams = R.omit(['limit', 'offset'], params)

            parentParams['include'] = {
              model: models[req.params.relationship],
              where: params.where,
            }

            query.findOne(req.params.resource, parentParams).then((item) => {
              req.apiData = {
                data: item,
              }
              next()
            }, (error) => {
              console.log(error)
            })
          } else {
            return errorStatus(res, 400)
          }
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
