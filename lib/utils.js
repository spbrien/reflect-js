const R = require('ramda')
const { validateQueryString }= require('./validation.js')
// const JSONStream = require('JSONStream')

// Dev utilities
// -----------------------------

function _debug(msg) {
  if (process.env.NODE_ENV === 'development') console.log(msg)
}

// Error Handling and Responses
// -----------------------------

function errorStatus(res, status, error) {
  return res
    .set('Content-Type', 'application/json')
    .status(status)
    .json({
      status: status,
      error: error.message || error
    })
}

function successStatus(res, status, data) {
  return res
    .set('Content-Type', 'application/json')
    .status(status)
    .json({
      status: status,
      data: data
    })
}

// Parsing and Transformation of Parameters
// ------------------------------------------

function paramTransform(models, relationships, req, res) {
  // Validate our request
  const validation = validateQueryString(models, relationships, req.params.resource, req.query)

  if (validation.error) {
    return errorStatus(res, 400, validation.error.details)
  }

  const limit = parseInt(req.query.per_page) || parseInt(req.query.limit) || 25

  // Transform all parameters
  const params = {
    limit: limit,
    offset: req.query.page ? parseInt(req.query.page * limit) : 0,
    // Validate that where query is properly formed
    where: req.query.where ? JSON.parse(req.query.where) : null,

    // distinct: req.query.distinct ? JSON.parse(req.query.distinct) : null,
    // groupby: req.query.groupby ? req.query.groupby : null,
    distinct: req.query.distinct ? req.query.distinct : null,

    orderby: req.query.orderby ? req.query.orderby.toLowerCase() : null,
    order: req.query.order ? req.query.order : null,
    // Validate that attributes exist
    attributes: req.query.attributes ? JSON.parse(req.query.attributes) : null,
    // Validate that relationships exist
    include: req.query.includes ? JSON.parse(req.query.includes) : null
  }
  return R.filter((item) => item, params)
}

function internalParamTransform(models, relationships, resource, query) {
  const validation = validateQueryString(models, relationships, resource, query)
  if (validation.error) {
    return validation
  }
  const limit = parseInt(query.per_page) || parseInt(query.limit) || 25

  // Transform all parameters
  const params = {
    limit: limit,
    offset: query.page ? parseInt(query.page * limit) : 0,
    // Validate that where query is properly formed
    where: query.where ? query.where : null,

    // distinct: req.query.distinct ? JSON.parse(req.query.distinct) : null,
    // groupby: req.query.groupby ? req.query.groupby : null,
    distinct: query.distinct ? query.distinct : null,

    orderby: query.orderby ? query.orderby.toLowerCase() : null,
    order: query.order ? query.order : null,
    // Validate that attributes exist
    attributes: query.attributes ? query.attributes : null,
    // Validate that relationships exist
    include: query.includes ? query.includes : null
  }
  return R.filter((item) => item, params)
}

function responseTransform(req, res) {
  // const result = JSONStream.stringifyObject(req.apiData)
  return res
    .set('Content-Type', 'application/json')
    .json(req.apiData)
}

// Filtering, nesting and query result manipulation
// -------------------------------------------------


const toTitle = R.compose(
  R.join(''),
  R.over(R.lensIndex(0), R.toUpper)
)

function composeList(list) {
  return list.length > 0 ? R.apply(R.compose, list) : (item) => item
}

const mapIndexed = R.addIndex(R.map)


module.exports = {
  errorStatus,
  successStatus,
  paramTransform,
  internalParamTransform,
  responseTransform,
  toTitle,
  composeList,
  mapIndexed,
  _debug,
}
