const R = require('ramda')

const {
  composeList,
  toTitle,
} = require('../utils.js')

// where function operators
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

// Creates a .andWhere or .orWhere function name
function getWhereFunctionName(operator, fn) {
    return operator ? `${operator}${toTitle(fn)}` : fn
}

// Builds an .andWhere or .orWhere function
// Chains the funciton onto a supplied query
function createWhereQuery() {
  return R.curry((operator, column, comparison, value) => {
    if (whereOperators[comparison]) {
      const fn = getWhereFunctionName(operator, whereOperators[comparison].funcName)
      if (whereOperators[comparison].comparison) {
        return (db, overrideOperator) => {
          if (overrideOperator) {
            return db.where(column, whereOperators[comparison].comparison, value)
          }
          return db[fn](column, whereOperators[comparison].comparison, value)
        }
      }
      return (db, overrideOperator) => {
        if (overrideOperator) {
          return db.where(column, whereOperators[comparison].comparison, value)
        }
        return db[fn](column, value)
      }
    }
  })
}

function whereFactory(schema, table, params) {
  if (params.where) {
    const operator = params.where.operator || 'and'
    // First arg to curried query function
    const whereQuery = createWhereQuery()
    const whereQueryWithOperator = whereQuery(operator)

    const initializedWhereFunctions = R.map(([column, comparisonAndValue]) => {
      // Second argument to curried query function
      const whereWithColumn = whereQueryWithOperator(column)
      return R.map(([comparison, value]) => {
        // last two arguments to curried query function
        // returns a new function that takes the db connection
        // as an arg
        return whereWithColumn(comparison, value)
      }, R.toPairs(comparisonAndValue))
    }, R.toPairs(R.omit(['operator'], params.where)))

    if (initializedWhereFunctions) {
      return (q) => composeList(initializedWhereFunctions)(q)
    }
    return (q) => q
  }
  return (q) => q
}

module.exports = {
  createWhereQuery,
  whereFactory,
}
