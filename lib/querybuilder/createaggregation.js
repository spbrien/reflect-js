const config = require('../../config')

function groupBy(params) {
  if (params.groupby) {
    return (q) => q.groupBy(params.groupby)
  }
  return (q) => q
}

function distinct(params) {
  if (params.distinct) {
    return (q) => q.distinct(params.distinct)
  }
  return (q) => q
}


module.exports = {
  groupBy,
  distinct,
}
