const R = require('ramda')

const {
  findModelsByName,
} = require('./utils.js')

function selectFactory(schema, table, params) {
  const modelFinder = findModelsByName(schema)

  if (params.attributes && !params.include) {
    params.attributes.push(pk)
    return (q) => {
      return q.select(R.map(item => `${table}.${item}`, params.attributes))
    }
  }

  if (params.include) {
    const nestedItemSelects = R.flatten(R.map((item) => {
      const nestedItemSchema = modelFinder(item.resource)
      // If the item has an attributes key,
      // return the attributes list for the select
      if (item.attributes) {
        const nestedItemPK= getPrimaryKeyFromSchema(nestedItemSchema)
        item.attributes.push(nestedItemPK)
        return R.map(attr => `${item.resource}.${attr}`, item.attributes)
      }
      // Else, return all columns so we don't limit by other attributes lists
      return R.map(col => `${item.resource}.${col.name}`, nestedItemSchema.columns)
    }, params.include))

    // If we have nested item attributes, handle those here
    if (params.attributes) {
      const mainAttributes = R.map(item => `${table}.${item}`, params.attributes)
      const allAttributes = R.concat(mainAttributes, nestedItemSelects)
      return (q) => q.select(allAttributes)
    } else {
      const primaryModel = modelFinder(table)
      const mainAttributes = R.map(item => `${table}.${item.name}`, primaryModel.columns)
      const allAttributes = R.concat(mainAttributes, nestedItemSelects)
      return (q) => q.select(allAttributes)
    }
  }
  return (q) =>  q
}

module.exports =  { selectFactory }
