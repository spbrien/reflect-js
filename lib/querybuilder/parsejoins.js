const { _debug } = require('./utils')
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
const mapToSet = (f, list) => R.uniq(R.map(f, list))

function findRelationship(relationships) {
  return (resource, related, through) => {
    return R.find((item) => {
      return R.propEq('resource', resource)(item) &&
        R.propEq('relatedTo', related)(item) &&
        R.propEq('through', through)(item)
    }, relationships)
  }
}

// A function to nest all of the joined results into the primary result
// Returns a function that runs all of the filters on the results returned
// by Knex
function nestJoinResults(schema, table, params, relationships) {
  const modelFinder = findModelsByName(schema)
  const primaryModel = modelFinder(table)
  const relationshipFinder = findRelationship(relationships)
  const pk = getPrimaryKeyFromSchema(primaryModel)

  // Return our filtering function
  if (params.include) {
    return (results) => {
      const grouped = R.groupBy((result) => {
        return result[`${table}______${pk}`]
      }, results)
      const merged = R.map(
        (group) => {
          const separatedResults = R.map(
            (included) => {
              const includedPk = getPrimaryKeyFromSchema(modelFinder(included))
              const picker = pickColumnByTableName(included)
              const picked = R.objOf(
                included,
                R.filter(
                  item => item[includedPk],
                  mapToSet(
                    (item) => {
                      const pickedData = picker(item)
                      return renameKeysBy(
                        (key) => key.split('______')[1],
                        pickedData
                      )
                    },
                    group
                  )
                )
              )
              return picked
            },
            R.append(
              table,
              R.concat(
                R.map(item => item.resource, params.include),
                R.filter(item => item, R.map(item => item.through, params.include))
              )
            )
          )
          const collected = R.mergeAll(separatedResults)
          const main = collected[table]
          const nested = R.map((include) => {
            const parent = include.through ? include.through : include.resource
            const child = include.resource
            if (include.through) {
              const mapping = relationshipFinder(
                table,
                include.resource,
                include.through
              )
              return R.objOf(parent, R.map((item) => {
                item[child] = R.filter((child) => {
                  return item[mapping.intermediate_target_column] === child[mapping.target_column]
                }, collected[child])
                return item
              }, collected[parent]))
            }
            return R.objOf(child, collected[child])
          }, params.include)

          return R.mergeAll(R.concat([main[0]], nested))
        },
        R.values(grouped)
      )
      return R.flatten(merged)
      return R.merge(flattened[table], R.omit([table], flattened))
    }
  }
  return (results) => R.map((item) => {
    return renameKeysBy(
      (key) => key.indexOf('______') != -1 ? key.split('______')[1] : key,
      item
    )
  }, results)
}

module.exports = {
  nestJoinResults,
}
