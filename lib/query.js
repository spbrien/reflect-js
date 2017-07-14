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
  createJoinFilter
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
        if (params.attributes) {
          if (!include) {
            q = q.select(params.attributes)
          } else {
            q = createSelects(
              q,
              R.map(item => `${table}.${item}`, params.attributes),
              R.filter(item => item, R.map((inc) => {
                return R.map(
                  attribute => `${inc.relatedTo}.${attribute}`,
                  inc.attributes
                )
              }, include)
            ))
          }
        }

        // Joins
        if (include) {
          let join = curriedJoinFunction(pk)
          join = join(table)
          const joinFunctions = R.map((item) => {
            const map = R.find(
              R.propEq('relatedTo', item.resource),
              relationships
            )

            // Create a transformation filter for this related resource
            transformations.push(
              createJoinFilter(models, map.relatedTo, table, pk)
            )

            // Return our join function
            return join(map)
          }, include)
          apply = (f, q) => composeList(joinFunctions)(f, q)
        } else {
          apply = (f, query) => f(query)
        }

        let query = curriedQueryFunction()
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
          // Map over row
          const results = composeList(transformations)(rows)
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
