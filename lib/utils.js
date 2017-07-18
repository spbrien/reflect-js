const R = require('ramda')

// Error Handling and Responses
// -----------------------------

function errorStatus(res, status, error) {
  return res
    .set('Content-Type', 'application/json')
    .status(status)
    .json({
      status: status,
      error: error
    })
}

function successStatus(status, data) {
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

function paramTransform(req) {
  const limit = parseInt(req.query.per_page) || parseInt(req.query.limit) || 25
  const params = {
    limit: limit,
    offset: req.query.page ? parseInt(req.query.page * limit) : 0,
    where: req.query.where ? JSON.parse(req.query.where) : null,
    orderby: req.query.orderby ? req.query.orderby.toLowerCase() : null,
    order: req.query.order ? req.query.order : null,
    attributes: req.query.attributes ? JSON.parse(req.query.attributes) : null,
    include: req.query.includes ? JSON.parse(req.query.includes) : null
  }
  return R.filter((item) => item, params)
}

function responseTransform(req, res) {
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
  responseTransform,
  toTitle,
  composeList,
  mapIndexed,
}
