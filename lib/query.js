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
  pool: { min: 0, max: 50 },
  acquireConnectionTimeout: 5000,
})

const {
  toTitle,
  getPrimaryKey,
  getWhereFunctionName,
  whereOperators,
  curriedQueryFunction,
  curriedJoinFunction,
  createSelects
} = require('./utils.js')

function createJoinFilter(models, map) {
  const model = R.find(R.propEq('name', map.relatedTo))(models)
  const columns = R.map((column) => column.name, model.columns)
  
  const obj = {}
  obj[map.relatedTo] = R.fromPairs(R.map((item) => [item,null], columns))

  return obj
}

module.exports = (models, relationships) => {
  return {
    find: (table, params) => {
      return connection.transaction((trx) => {
        const transformations = []
        let q = connection(table)
        // parse params into function call
        const where = params.where
        const include = params.include

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
            q = R.head(filterFunctions)[0](q)
            q = R.apply(R.compose, R.tail(filterFunctions))(q)
          } else if (filterFunctions.length === 1) {
            q = R.head(filterFunctions)[0](q)
          }
        }

        // Ordering
        if (params.order && params.orderby) {
          q = q.orderby(params.orderby, params.order)
        }

        // Pagination
        if (params.offset && config.pagination) {
          q = q.offset(params.offset)
        }

        // Limiting
        if (params.limit) {
          q = q.limit(parseInt(params.limit))
        }

        // Joins
        if (include) {
          let join = curriedJoinFunction()
          join = join(table)
          const joinFunctions = R.map((item) => {
            const map = R.find(
              R.propEq('relatedTo', item.resource),
              relationships
            )
            createJoinFilter(models, map)
            return join(map)
          }, include)
          q = R.apply(R.compose, joinFunctions)(q)
        }

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

        // Count and get results
        const countQuery = connection(table).count()
        return q.transacting(trx)
        .then((rows) => {
          // Map over row
          return countQuery.transacting(trx).then((count) => {
            return {
              rows: rows,
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
