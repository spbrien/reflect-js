const R = require('ramda')
const knex = require('knex')

const config = require('../config')

// Create our db connection
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

// Import query builder functions
const {
  joinFactory,
  selectFactory,
  whereFactory,
  nestJoinResults,
  limit,
  order,
  offset,
  groupBy,
  distinct,
} = require('./querybuilder/index.js')

const {
  findModelsByName,
  getPrimaryKeyFromSchema,
} = require('./querybuilder/utils.js')

const { composeList } = require('./utils.js')


module.exports = (schema, relationshipSchema) => {
  return {
    find: (table, params) => {
      // Create Main Query
      return connection.transaction((trx) => {

        let query = connection(table)
        let countQuery = null

        // Create our factories
        const createJoins = joinFactory(schema, relationshipSchema, table, params)
        const createSelects = selectFactory(schema, table, params)
        const createWhere = whereFactory(schema, table, params)
        const createOrder = order(params)
        const createLimit = limit(params)
        const createOffset = offset(params)
        const parseResults = nestJoinResults(schema, table, params, relationshipSchema)

        if (params.distinct) {
          const createDistinct = distinct(params)
          query = createWhere(query)
          query = createOrder(query)
          query = createLimit(query)
          query = createOffset(query)
          query = createDistinct(query)

        } else {
          const createSelects = selectFactory(schema, table, params)

          query = createSelects(query)
          query = createJoins(
            composeList([
              createWhere,
              createOrder,
              createLimit,
              createOffset,
            ]),
            query
          )

          const countWhere = createWhere(connection(table))
          countQuery = countWhere.count()
        }

        console.log(query.toString())
        return query.transacting(trx)
        .then((rows) => {
          // Apply nesting filters from Join queries
          const results = parseResults(rows)
          // Return our results with Count
          if (countQuery) {
            return countQuery.transacting(trx).then((count) => {
              return {
                rows: results,
                total: R.values(count[0])[0],
              }
            })
          }
          return {
            rows: results,
            total: results.length
          }
        })
      })
    },
    findOne: (table, id, params) => {
      return connection.transaction((trx) => {
        const model = findModelsByName(schema)(table)
        const pk = getPrimaryKeyFromSchema(model)

        let query = connection(table).where(pk, id)

        // Create our factories
        const createJoins = joinFactory(schema, relationshipSchema, table, params)
        const createSelects = selectFactory(schema, table, params)
        const createLimit = limit({ limit: 1 })
        const parseResults = nestJoinResults(schema, table, params, relationshipSchema)

        query = createSelects(query)
        query = createJoins(
          composeList([
            createLimit,
          ]),
          query
        )
        // console.log(query.toString())
        return query.transacting(trx)
        .then((rows) => {
          // Apply nesting filters from Join queries
          return parseResults(rows)[0]
        })
      })
    },
  }
}
