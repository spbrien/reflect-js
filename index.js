const dotenv = require('dotenv').config()
const R = require('ramda')

const config = require('./config')
const getModels = require('./lib/models')()
const queryBuilder = require('./lib/query')
const jsonApi = require('./lib/router')
const schemaApi = require('./lib/schemaRouter')
const relationshipApi = require('./lib/relationshipRouter')
const hooks = require('./lib/hooks')
const authentication = require('./lib/authentication')
const userRelationships = require('./relationships')

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
  // TODO: implement JWT
  app.use(authentication.init())

  // API Endpoints
  const relationshipsSchema = userRelationships ? userRelationships.concat(results.relationships) : results.relationships
  app.use('/api', jsonApi(models, relationshipsSchema, query))
  app.use('/schema', schemaApi(results.schema))
  app.use('/relationships', relationshipApi(relationshipsSchema))

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
