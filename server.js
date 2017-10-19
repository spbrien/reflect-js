const R = require('ramda')
const md5 = require('md5')
const sqlite3 = require('sqlite3')
const tedious = require('tedious')


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
const customRoutes = require('./routes')

const express = require('express')
const app = express()
const { _debug } = require('./lib/utils')

_debug('Initializing...')
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
  const models = results.schema

  // --------------------------
  // Set up queries
  // --------------------------
  const relationshipSchema = userRelationships ? userRelationships.concat(results.relationships) : results.relationships
  const query = queryBuilder(models, relationshipSchema)

  // --------------------------
  // Set up API
  // --------------------------

  // Start Auth
  authentication.init()

  // API Endpoints
  app.use('/api', jsonApi(models, relationshipSchema, query))
  app.use('/auth', authentication.authorize, authApi())
  app.use('/schema', schemaApi(results.schema))
  app.use('/relationships', relationshipApi(relationshipSchema))

  // --------------------------
  // Set up Custom Routes
  // --------------------------
  app.use('/', customRoutes(models, query))

  // Start App
  if (process.env.NODE_ENV !== 'production') {
    app.set('json spaces', 40)
  }
  app.listen(config.port || 9000, function () {
    _debug(`App listening on port ${config.port || 9000}!`)
  })

}, (error) => {
  _debug(error)
})
