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

// Nested item manipulation
// ------------------------------

function order(by, direction) {
  if (by) {
    if (direction === 'DESC') return R.sort(R.descend(R.prop(by)))
    return R.sort(R.ascend(R.prop(by)))
  }
  return item => item
}

function limit(limit, offset) {
  if (limit) {
    if (offset) return R.slice(offset, limit)
    return R.slice(0, limit)
  }
  return item => item
}

function applyFilters(filters) {
  return (attribute) => {
    return (item) => {
      item[attribute] = R.apply(R.compose, filters)(item[attribute])
      return item
    }
  }
}

// Parsing and Transformation of Parameters
// ------------------------------------------

function paramTransform(req) {
  const limit = req.query.per_page ? parseInt(req.query.per_page) : 25
  const params = {
    limit: limit,
    offset: req.query.page ? parseInt(req.query.page * limit) : 0,
    where: req.query.where ? JSON.parse(req.query.where) : null,
    order: req.query.orderby && req.query.order ? [[req.query.orderby, req.query.order]] : null,
    attributes: req.query.attributes ? JSON.parse(req.query.attributes) : null
  }
  return R.filter((item) => item, params)
}

function responseTransform(req, res) {
  return res
    .set('Content-Type', 'application/json')
    .json(req.apiData)
}


module.exports = {
  errorStatus,
  successStatus,
  paramTransform,
  responseTransform,
}
