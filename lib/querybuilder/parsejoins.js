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

const pickColumnByTableName = (table) => {
  return R.pickBy((val, key) => key.startsWith(`${table}_`))
}

const renameKeysBy = R.curry((fn, obj) => R.pipe(R.toPairs, R.map(R.adjust(fn, 0)), R.fromPairs)(obj));
const mapToSet = (f, list) => R.dropRepeats(R.map(f, list))

// A function to nest all of the joined results into the primary result
// Returns a function that runs all of the filters on the results returned
// by Knex
function nestJoinResults(schema, table, params) {
  const modelFinder = findModelsByName(schema)
  const primaryModel = modelFinder(table)
  const pk = getPrimaryKeyFromSchema(primaryModel)

  // Return our filtering function
  if (params.include) {
    return (results) => {
      const grouped = R.groupBy((result) => {
        return result[`${table}_${pk}`]
      }, results)
      const merged = R.map(
        (group) => {
          const separatedResults = R.map(
            (included) => {
              const picker = pickColumnByTableName(included)
              const picked = R.objOf(included, mapToSet(
                (item) => {
                  const pickedData = picker(item)
                  return renameKeysBy(
                    (key) => key.split('_')[1],
                    pickedData
                  )
                },
                group
              ))
              return picked
            },
            R.append(table, R.map(item => item.resource, params.include))
          )
          const collected = R.mergeAll(separatedResults)
          const main = collected[table]
          return R.merge(main[0], R.omit([table], collected))
        },
        R.values(grouped)
      )
      return R.flatten(merged)
      return R.merge(flattened[table], R.omit([table], flattened))
    }
  }
  return (results) => results
}

module.exports = {
  nestJoinResults,
}
