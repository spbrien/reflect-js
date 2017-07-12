
// Error Handling and Responses
// -----------------------------

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
    .set('Content-Type', CONTENT_TYPE)
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

function getDirectRelationshipsMap(mapping) {
  const directMapping = R.filter((item) => item.direct, mapping)
  return directMapping.length > 0 ? directMapping : null
}

function createSimpleRelationship(models, include, resource, map) {
  if (models[include.resource]) {
    models[resource].hasMany(
      models[include.resource],
      {
        foreignKey: map.target_column,
        sourceKey: map.source_column,
      }
    )
    ormIncludeFilters.push(
      applyFilters([
        order(include.orderby, include.order),
        limit(include.limit, include.offset),
      ])(include.resource)
    )
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

createComplexRelationship(models, include, resource, map) {
  models[resource].belongsToMany(models[include.resource], {
    through: map.through,
    foreignKey: map.intermediate_source_column,
    otherKey: map.intermediate_target_column,
  })
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
  getDirectRelationshipsMap,
  getComplexRelationshipMap,
  createSimpleRelationship,
  createComplexRelationship,
}
