const R = require('ramda')
const md5 = require('md5')

const config = require('./config')
const getModels = require('./lib/models')()
const queryBuilder = require('./lib/query')
const jsonApi = require('./lib/router')
const authApi = require('./lib/authRouter')
const schemaApi = require('./lib/schemaRouter')
const relationshipApi = require('./lib/relationshipRouter')
const hooks = require('./lib/hooks')
const authentication = require('./lib/authentication')
const userRelationships = require('./relationships')

const express = require('express')
const app = express()

console.log('Initializing...')
app.set('secret', md5(config.secret_key))

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
  authentication.init()

  // API Endpoints
  const relationshipsSchema = userRelationships ? userRelationships.concat(results.relationships) : results.relationships
  app.use('/api', jsonApi(models, relationshipsSchema, query))
  app.use('/auth', authentication.authorize, authApi())
  app.use('/schema', schemaApi(results.schema))
  app.use('/relationships', relationshipApi(relationshipsSchema))

  // --------------------------
  // Set up Custom Routes
  // --------------------------
  // TODO: Custom routes

  // Start App
  app.set('json spaces', 40)
  app.listen(parseInt(config.port || 9000, function () {
    console.log('App listening!')
  })

}, (error) => {
  console.log(error)
})
