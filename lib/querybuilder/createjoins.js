const R = require('ramda')

// Imports
const {
  createWhereQuery,
} = require('./createwhere.js')

const {
  getPrimaryKeyFromSchema,
  findModelsByName,
} = require('./utils.js')

const {
  composeList,
} = require('../utils.js')

// Returns a curried function that is used to build join queries
function createJoinQuery(schema) {
  return R.curry((resource, map, joinSubQueryFunctions) => {
    console.log(map)
    const relatedSchema = findModelsByName(schema)(map.relatedTo)
    const relatedPk = getPrimaryKeyFromSchema(relatedSchema)

    if (map.through) {
      console.log("MAP.THROUGH")
      return (db) => {
        return db.leftOuterJoin(
          map.through,
          function() {
            // ---------------------------
            this.on(
              `${resource}.${map.source_column}`,
              `${map.through}.${map.intermediate_source_column}`
            )
            // ---------------------------
          }
        ).leftOuterJoin(
          map.relatedTo,
          function() {
            if (!joinSubQueryFunctions) {
              this.on(
                `${map.through}.${map.intermediate_target_column}`,
                `${map.relatedTo}.${map.target_column}`
              )
            } else {
              this.on(
                `${map.through}.${map.intermediate_target_column}`,
                `${map.relatedTo}.${map.target_column}`
              ).onIn(
                `${map.relatedTo}.${relatedPk}`,
                function() {
                  composeList(joinSubQueryFunctions)(
                    this.select(`${map.relatedTo}.${relatedPk}`).from(`${map.relatedTo}`)
                  )
                }
              )
            }
          }
        )
      }
    }
    console.log("NOT MAP.THROUGH")
    return (db) => {
      return db.leftOuterJoin(
        map.relatedTo,
        function() {
          // ---------------------------
          if (!joinSubQueryFunctions) {
            this.on(
              `${resource}.${map.source_column}`,
              `${map.relatedTo}.${map.target_column}`
            )
          } else {
            this.on(
              `${resource}.${map.source_column}`,
              `${map.relatedTo}.${map.target_column}`
            ).onIn(
              `${map.relatedTo}.${relatedPk}`,
              function() {
                composeList(joinSubQueryFunctions)(
                  this.select(`${map.relatedTo}.${relatedPk}`).from(`${map.relatedTo}`)
                )
              }
            )
          }
          // ---------------------------
        }
      )
    }
    // End Return
  })
}

// Create Join Query

function joinFactory(schema, relationshipSchema, table, params) {
  // -------------------------------
  if (params.include) {
    const modelFinder = findModelsByName(schema)
    const primaryResourceModel = modelFinder(table)
    const primaryResourcePK = getPrimaryKeyFromSchema(primaryResourceModel)

    const joinQuery = createJoinQuery(schema)
    const joinWhereQuery = createWhereQuery()

    const joinQueryWithTable = joinQuery(table)

    // Create a join function for each include
    // and map to an array
    // We will chain these to the main query
    // after they are created
    const initializedJoinFunctions = R.filter(item => item, R.map(
      (include) => {
        // Get query details for the model we want to include
        const relatedItemInfo = R.find(
          (item) => {
            if (include.through) {
              return R.propEq('relatedTo', include.resource)(item) &&
                R.propEq('resource', table)(item) &&
                R.propEq('through', include.through)(item)
            }
            return R.propEq('relatedTo', include.resource)(item) &&
              R.propEq('resource', table)(item)
          },
          relationshipSchema
        )
        console.log(relatedItemInfo)

        // Build out where queries specific to this join
        // if they are being asked for
        if (include.where) {
          // Get user-specified 'and' or 'or' operator for
          // all where queries
          const operator = include.where.operator || 'and'
          // Start bulding an array of where functions for this Join
          const joinWhereWithOperator = joinWhereQuery(operator)
          // Create the array of complete .where functions
          const joinWhereList = R.flatten(
            R.map(
              ([column, comparisonAndValue]) => {
                const joinWhereWithColumn = joinWhereWithOperator(column)
                return R.map(([comparison, value]) => {
                  return joinWhereWithColumn(comparison, value)
                }, R.toPairs(comparisonAndValue))
              }, R.toPairs(R.omit(['operator'], include.where))
            )
          )

          return joinQueryWithTable(
            relatedItemInfo,
            joinWhereList
          )
        }
        // Else, return our join query
        // for this included resource
        return joinQueryWithTable(relatedItemInfo, null)
      },
      params.include
    ))
    // Finally, return a function that accepts
    // a knex query and a global where query builder
    // and chains our join queries onto it
    return (f, q) => {
      return composeList(R.reverse(initializedJoinFunctions))(q)
      .whereIn(`${table}.${primaryResourcePK}`, function(){
        f(this.select(`${table}.${primaryResourcePK}`).from(table))
      })
    }
  } else {
    // If we didn't have any joins, just return a
    // function that applies the global where query builer
    return (f, q) => {
      return f(q)
    }
  }
  // -------------------------------
}

module.exports = { joinFactory }
