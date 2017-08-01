const R = require('ramda')

const {
  getPrimaryKeyFromSchema,
  findModelsByName,
} = require('./utils.js')

const parsible = field_name => `${field_name} as ${field_name.replace('.','_')}`

function selectFactory(schema, table, params) {
  const modelFinder = findModelsByName(schema)
  const primaryModel = modelFinder(table)
  const pk = getPrimaryKeyFromSchema(primaryModel)
  const a = R.append(pk, params.attributes)

  if (params.attributes && !params.include) {
    return (q) => {
      return q.select(R.map(item => parsible(`${table}.${item}`), a))
    }
  } else if (!params.attributes && !params.include) {
    return (q) => {
      return q.select(R.map(item => parsible(`${table}.${item.name}`), primaryModel.columns))
    }
  }

  if (params.include) {
    const nestedItemSelects = R.flatten(R.map((item) => {
      const nestedItemSchema = modelFinder(item.resource)
      let throughSelects = []
      // If the item has an attributes key,
      // return the attributes list for the select
      if (item.through) {
        const throughSchema = modelFinder(item.through)
        throughSelects = R.map(
          col => parsible(`${item.through}.${col.name}`),
          throughSchema.columns
        )
      }

      if (item.attributes) {
        const nestedItemPK = getPrimaryKeyFromSchema(nestedItemSchema)
        item.attributes.push(nestedItemPK)

        return R.concat(
          R.map(
            attr => parsible(`${item.resource}.${attr}`),
            item.attributes
          ),
          throughSelects
        )
      }
      // Else, return all columns so we don't limit by other attributes lists
      return R.concat(
        R.map(
          col => parsible(`${item.resource}.${col.name}`),
          nestedItemSchema.columns
        ),
        throughSelects
      )
    }, params.include))

    // If we have nested item attributes, handle those here
    if (params.attributes) {
      const mainAttributes = R.map(item => parsible(`${table}.${item}`), a)
      const allAttributes = R.concat(mainAttributes, nestedItemSelects)
      return (q) => q.select(allAttributes)
    } else {
      const primaryModel = modelFinder(table)
      const mainAttributes = R.map(item => parsible(`${table}.${item.name}`), primaryModel.columns)
      const allAttributes = R.concat(mainAttributes, nestedItemSelects)
      return (q) => q.select(allAttributes)
    }
  }
  return (q) =>  q
}

module.exports =  { selectFactory }
