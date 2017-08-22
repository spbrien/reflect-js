const R = require('ramda')
const express = require('express');
const router = express.Router();
const config = require('../config')


module.exports = function (relationshipsSchema) {
  // Show Schema endpoints only for dev environment
  if (process.env.NODE_ENV === 'development') {
    // Relationship Endpoints
    router.get('/', function(req, res, next) {
      res
        .set('Content-Type', 'application/json')
        .send({ data: relationshipsSchema })
    })
    router.get('/:resource', function(req, res, next) {
      const resourceSchema = R.find(
        R.propEq(
          'resource',
          req.params.resource
        )
      )(relationshipsSchema)
      res
        .set('Content-Type', 'application/json')
        .send(resourceSchema)
    })
  } else {
    router.all((req, res, next) => {
      return res
        .set('Content-Type', 'application/json')
        .status(404)
        .json({
          status: 404,
          error: "Not Found"
        })
    })
  }
  return router
}
