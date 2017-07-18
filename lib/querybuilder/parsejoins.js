const R = require('ramda')

const {
  findModelsByName,
  getPrimaryKeyFromSchema,
} = require('./utils.js')

const {
  mapIndexed,
} = require('../utils.js')

// Selects data from an object that matches a set of key names
function selectDataByColumn(keys, object, nested, idx) {
  nested = nested || []
  return R.mapObjIndexed(
    (value, key) => {
      if (
        typeof value === 'object' &&
        value &&
        value.length > 0 &&
        !R.contains(key, nested)
      ) return value[idx]
      return value
    },
    R.pickAll(R.concat(keys, nested), object)
  )
}

// A function to nest all of the joined results into the primary result
// Returns a function that runs all of the filters on the results returned
// by Knex
function nestJoinResults(schema, table, params) {
  const modelFinder = findModelsByName(schema)
  const primaryModel = modelFinder(table)
  const pk = getPrimaryKeyFromSchema(primaryModel)
  const attributes = params.attributes

  let primaryColumnNames = R.map(item => item.name, primaryModel.columns)

  if (attributes) {
    // Make sure our primary key is included
    // in the attributes returned to the user
    attributes.push(pk)
    // Filter our any column names not included in attributes
    // Knex handles most of the attribute limiting, this is
    // to remove any columns added back in by the joins --
    // essentially columns common to both the primary and joined tables
    primaryColumnNames = R.filter(
      (item) => R.contains(item, attributes),
      primaryColumnNames
    )
  }

  // Return our filtering function
  if (params.include) {
    const related = R.map(item => item.resource, params.include)
    return (results) => {
      // First group the results by the primary resource's primary key
      const grouped = R.groupBy((result) => {
        return result[pk] && result[pk].length > 0 ? result[pk][0] : result[pk]
      }, results)

      // Merge the joined resources into a single list for each join
      const merged = R.values(R.map(
        (group) => {
          // console.log("GROUP LENGTH: ", group.length)
          // console.log(group)
          // Get primary item
          const primaryItemData = selectDataByColumn(
            primaryColumnNames, group[0], related, 0
          )
          // Get all related items in a list
          const relatedItems = mapIndexed((item, idx) => {
            const itemModel = modelFinder(item)
            const itemPk = getPrimaryKeyFromSchema(itemModel)
            const itemColumnNames = R.map(item => item.name, itemModel.columns)
            return R.objOf(item, R.dropRepeats(
              R.filter(item => item, R.map((groupItem) => {
                const itemColumns = selectDataByColumn(
                  itemColumnNames, groupItem, related, idx
                )
                if (itemColumns[itemPk]) return itemColumns
                return null
              }, group)))
            )
          }, related)

          return R.merge(primaryItemData, R.mergeAll(relatedItems))
        }, grouped))

      return merged
    }
  }
  return (results) => results
}

module.exports = {
  nestJoinResults,
}
