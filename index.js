const dotenv = require('dotenv').config()
const R = require('ramda')

const config = require('./config')
const getModels = require('./lib/models')()
const queryBuilder = require('./lib/query')
const jsonapi = require('./lib/router')
const hooks = require('./lib/hooks')
const authentication = require('./lib/authentication')
const userRelationships = require('./relationships')
const authConfig = require('./auth')

const express = require('express')
const app = express()

console.log('Initializing...')

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)

  next()
})


getModels.then((results) => {
  // --------------------------
  // Set up models
  // --------------------------
  const models = results.models

  // --------------------------
  // Set up queries
  // --------------------------
  const query = queryBuilder(models)

  // --------------------------
  // Set up API
  // --------------------------

  // Start Auth
  app.use(authentication.init())

  // API Endpoints
  const relationshipsSchema = userRelationships ? userRelationships.concat(results.relationships) : results.relationships
  app.use('/api', jsonapi(models, relationshipsSchema, query))

  // Show Schema endpoints only for dev environment
  if (process.env.ENVIRONMENT === 'dev') {
    // Schema Endpoints
    app.get('/schema', function(req, res, next) {
      res
        .set('Content-Type', 'application/json')
        .send({ data: results.schema })
    })
    app.get('/schema/:resource', function(req, res, next) {
      const resourceSchema = R.find(
        R.propEq(
          'name',
          req.params.resource
        )
      )(results.schema)
      res
        .set('Content-Type', 'application/json')
        .send(resourceSchema)
    })

    // Relationship Endpoints
    app.get('/relationships', function(req, res, next) {
      res
        .set('Content-Type', 'application/json')
        .send({ data: relationshipsSchema })
    })
    app.get('/relationships/:resource', function(req, res, next) {
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
  }

  // --------------------------
  // Set up Custom Routes
  // --------------------------
  // TODO: Custom routes

  // Start App
  app.set('json spaces', 40)
  app.listen(parseInt(process.env.PORT) || 9000, function () {
    console.log('App listening!')
  })

}, (error) => {
  console.log(error)
})
