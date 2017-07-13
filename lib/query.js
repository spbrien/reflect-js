const R = require('ramda')
const knex = require('knex')

const config = require('../config')

// const connection = knex({
//   client: config.options.dialect,
//   connection: {
//     host : config.options.host,
//     user : config.user,
//     password : config.password,
//     database : config.database,
//     debug: true,
//     options: {
//       encrypt: true,
//     },
//   },
//   pool: { min: 0, max: 50 },
//   acquireConnectionTimeout: 5000,
// })
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

const toTitle = R.compose(
  R.join(''),
  R.over(R.lensIndex(0), R.toUpper)
)

function getPrimaryKey() {

}

function getWhereFunctionName(operator, fn) {
    return operator ? `${operator}${toTitle(fn)}` : fn
}


// Map query string operators to strings representing function names
const whereOperators = {
  $gt: {
    funcName: 'where',
    comparison: '>',
  },
  $gte: {
    funcName: 'where',
    comparison: '>=',
  },
  $lt: {
    funcName: 'where',
    comparison: '<',
  },
  $lte: {
    funcName: 'where',
    comparison: '<=',
  },
  $ne: {
    funcName: 'where',
    comparison: '!=',
  },
  $eq: {
    funcName: 'where',
    comparison: '=',
  },
  $between: {
    funcName: 'whereBetween',
    comparison: null,
  },
  $notBetween: {
    funcName: 'whereNotBetween',
    comparison: null,
  },
  $in: {
    funcName: 'whereIn',
    comparison: null,
  },
  $notIn: {
    funcName: 'whereNotIn',
    comparison: null,
  },
  $like: {
    funcName: 'where',
    comparison: 'like',
  },
  $notLike: {
    funcName: 'where',
    comparison: 'not like',
  },
}

function curriedQueryFunction() {
  return R.curry((operator, column, comparison, value) => {
    if (whereOperators[comparison]) {
      const fn = getWhereFunctionName(operator, whereOperators[comparison].funcName)
      if (whereOperators[comparison].comparison) {
        return (db, operatorOverride) => {
          if (operatorOverride) {
            return db.where(column, whereOperators[comparison].comparison, value)
          }
          return db[fn](column, whereOperators[comparison].comparison, value)
        }
      }
      return (db, operatorOverride) => {
        if (operatorOverride) {
          return db.where(column, whereOperators[comparison].comparison, value)
        }
        return db[fn](column, value)
      }
    }
  })
}

function limit(db, value) {
  return db.limit(value)
}

function offset(db, value)  {
  return db.offset(value)
}

module.exports = (models, relationships) => {
  return {
    find: (table, params) => {
      return connection.transaction((trx) => {
        let q = connection(table)
        // parse params into function call
        const where = params.where
        let query = curriedQueryFunction()
        if (where) {
          console.log('have where')
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
            const firstFunction = R.head(filterFunctions)
            q = R.head(filterFunctions)[0](q)
            q = R.apply(R.compose, R.tail(filterFunctions))(q)
          } else if (filterFunctions.length === 1) {
            const firstFunction = R.head(filterFunctions)
            q = R.head(filterFunctions)[0](q)
          }
        }


        if (params.order && params.orderby) {
          q = q.orderby(params.orderby, params.order)
        }

        if (params.offset && config.pagination) {
          q = q.offset(params.offset)
        }

        if (params.limit) {
          q = q.limit(parseInt(params.limit))
        }

        const countQuery = connection(table).count()
        return q.transacting(trx).then((rows) => {
          return countQuery.transacting(trx).then((count) => {
            return {
              rows: rows,
              total: where ? rows.length : count,
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
