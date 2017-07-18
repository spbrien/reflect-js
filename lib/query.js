const R = require('ramda')
const knex = require('knex')

const config = require('../config')

const connection = knex({
  client : 'mssql',
  connection: {
    server : config.options.host,
    user : config.user,
    password : config.password,
    options: {
        database : config.db,
        encrypt: true
    }
  },
  pool: { min: 0, max: 10 },
  acquireConnectionTimeout: 5000,
})

const {
  toTitle,
  getPrimaryKey,
  getWhereFunctionName,
  whereOperators,
  curriedQueryFunction,
  curriedJoinFunction,
  createSelects,
  findModelsByName,
  createEmptyResourceFromColumns,
  selectMatchingColumns,
  composeList,
  joinFilters,
  curriedSubqueryFunction,
} = require('./utils.js')


module.exports = (models, relationships) => {
  return {
    find: (table, params) => {
      return connection.transaction((trx) => {
        const transformations = []
        let q = connection(table)
        let apply = null
        let subqueryFunctions = []

        // parse params into function call
        const where = params.where
        const include = params.include
        const pk = getPrimaryKey(findModelsByName(table)(models))

        // Select Columns
        // TODO: figure out includes / nested includes
        if (params.attributes && !include) {
          params.attributes.push(pk)
          q = q.select(R.map(item => `${table}.${item}`, params.attributes))
        }

        // Joins
        if (include) {
          // Handle attributes
          const includeSelects = R.flatten(R.map((item) => {
            if (item.attributes) {
              return R.map(attr => `${item.resource}.${attr}`, item.attributes)
            }
            const includeModel = findModelsByName(item.resource)(models)
            return R.map(col => `${item.resource}.${col.name}`, includeModel.columns)
          }, include))
          if (params.attributes) {
            const mainAttributes = R.map(item => `${table}.${item}`, params.attributes)
            const allAttributes = R.concat(mainAttributes, includeSelects)
            q = q.select(allAttributes)
          } else {
            const primaryModel = findModelsByName(table)(models)
            const mainAttributes = R.map(item => `${table}.${item.name}`, primaryModel.columns)
            const allAttributes = R.concat(mainAttributes, includeSelects)
            q = q.select(allAttributes)
          }

          let join = curriedJoinFunction(models)
          let joinquery = curriedQueryFunction()

          join = join(table)

          const joinFunctions = R.map((item) => {
            // Build map
            const map = R.find(
              R.propEq('relatedTo', item.resource),
              relationships
            )

            // Build where functions if necessary
            const where = item.where
            if (where) {
              console.log("HAS WHERE")
              const operator = where.operator || 'and'
              // First arg to curried query function
              joinquery = joinquery(operator)
              const filterFunctions = R.flatten(R.map(([key, value]) => {
                // Second argument to curried query function
                joinquery = joinquery(key)
                return R.map(([key, value]) => {
                  // last two arguments to curried query function
                  // returns a new function that takes the db connection
                  // as an arg
                  return joinquery(key, value)
                }, R.toPairs(value))
              }, R.toPairs(R.omit(['operator'], where))))

              // If we have filters on our join,
              // apply them and return the query
              return join(map, filterFunctions)
            }
            // Return our join function
            return join(map, null)
          }, include)
          // Create Apply function
          apply = (f, q) => {
            return composeList(R.reverse(joinFunctions))(q).whereIn(`${table}.${pk}`, function(){
              f(this.select(`${table}.${pk}`).from(table))
            })
          }
        } else {
          apply = (f, query) => f(query)
        }

        let query = curriedQueryFunction()

        // Where filters
        if (where) {
          const operator = where.operator || 'and'
          // First arg to curried query function
          query = query(operator)
          const filterFunctions = R.map(([key, value]) => {
            // Second argument to curried query function
            query = query(key)
            return R.map(([key, value]) => {
              // last two arguments to curried query function
              // returns a new function that takes the db connection
              // as an arg
              return query(key, value)
            }, R.toPairs(value))
          }, R.toPairs(R.omit(['operator'], where)))

          // call the initial where function on the query
          if (filterFunctions.length > 1) {
            subqueryFunctions.push(R.head(filterFunctions)[0])
            subqueryFunctions.push(composeList(R.tail(filterFunctions)))
          } else if (filterFunctions.length === 1) {
            subqueryFunctions.push(R.head(filterFunctions)[0])
          }
        }

        // Ordering
        if (params.order && params.orderby) {
          subqueryFunctions.push(
            (query) => query.orderby(params.orderby, params.order)
          )
        }

        // Pagination
        if (params.offset && config.pagination) {
          subqueryFunctions.push(
            (query) => query.offset(params.offset)
          )
        }

        // Limiting
        if (params.limit) {
          subqueryFunctions.push(
            (query) => query.limit(parseInt(params.limit))
          )
        }



        q = apply(composeList(subqueryFunctions), q)

        // Count and get results
        const countQuery = connection(table).count()
        console.log(q.toString())
        return q.transacting(trx)
        .then((rows) => {
          // Apply nesting filters from Join queries
          let results = rows
          if (include) {
            const filter = joinFilters(
              models,
              rows,
              table,
              pk,
              R.map(item => item.resource, include)
            )
            results = filter(rows)
          }

          return countQuery.transacting(trx).then((count) => {
            return {
              rows: results,
              total: where ? rows.length : R.values(count[0])[0],
            }
          })
        })
      })
    },
    findOne: (table, params) => {
    },
    create: (table, data) => {
    },
    update: (table, params, data) => {
    },
    delete: (table, params) => {
    },
    count: (table, params) => {
    },
  }
}
