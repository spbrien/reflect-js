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

function createCountParams(params) {
  return R.omit(['limit', 'offset', 'attributes'], params)
}

// Relationships and Includes
// -------------------------------------

function createRelationshipMapping(resource, include, relationships) {
  return R.filter(
    R.propEq('relatedTo', include.resource),
    R.filter(
      R.propEq('resource', resource),
      relationships
    )
  )
}

function getDirectRelationshipMap(mapping) {
  const directMapping = R.filter((item) => item.direct, mapping)
  return directMapping.length > 0 ? directMapping[0] : null
}

function createSimpleRelationship(models, include, resource, map) {
  if (models[include.resource]) {
    return {
      params: {
        model: models[include.resource],
        where: include.where,
        attributes: include.attributes,
      },
      filters: applyFilters([
        order(include.orderby, include.order),
        limit(include.limit, include.offset),
      ])(include.resource),
      newModels: models,
    }
  }
  return null
}

function getComplexRelationshipMap(mapping, include) {
  if (include.through) {
    return R.find(R.propEq('through', include.through), mapping)
  }
  return null
}

function createComplexRelationship(models, include) {
  return {
    params: {
      model: models[include.resource],
      where: include.where,
      attributes: include.attributes,
    },
    filters: applyFilters([
      order(include.orderby, include.order),
      limit(include.limit, include.offset)
    ])(include.resource),
  }
}

// Data Mapping and Functions
// -----------------------------------------

// ----------------------------------------


module.exports = {
  errorStatus,
  successStatus,
  order,
  limit,
  applyFilters,
  paramTransform,
  responseTransform,
  createCountParams,
  createRelationshipMapping,
  getDirectRelationshipMap,
  getComplexRelationshipMap,
  createSimpleRelationship,
  createComplexRelationship,
}
