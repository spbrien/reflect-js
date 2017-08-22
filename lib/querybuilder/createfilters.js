const config = require('../../config')

function order(params) {
  if (params.order && params.orderby) {
    return (q) => q.orderBy(params.orderby, params.order)
  }
  return (q) => q
}

// Pagination
function offset(params) {
  if (params.offset && config.pagination) {
    return (q) => q.offset(params.offset)
  }
  return (q) => q
}

// Limiting
function limit(params) {
  if (params.limit && params.limit !== -1) {
    return (q) => q.limit(params.limit)
  }
  return (q) => q
}

module.exports = {
  order,
  offset,
  limit
}
