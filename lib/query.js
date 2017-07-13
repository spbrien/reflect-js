const R = require('ramda')
const knex = require('knex')

const config = require('../config')

const db = knex({
  client: config.dialect,
  connection: {
    host : config.host,
    user : config.user,
    password : config.password,
    database : config.database
  }
})

function getWhereFunction(op) {
    return operator ? `${operator}Where` : 'where'
}

// Map query string operators to strings representing function names
const whereOperators = {
  $gt: (db, column, value, operator) => {
    const f = getWhereFunction(operator)
    return db[f](column, '>', value)
  },
  $gte: (db, column, value, operator) => {
    const f = getWhereFunction(operator)
    return db[f](column, '>=', value)
  },
  $lt: (db, column, value, operator) => {
    const f = getWhereFunction(operator)
    return db[f](column, '<', value)
  },
  $lte: (db, column, value, operator) => {
    const f = getWhereFunction(operator)
    return db[f](column, '<=', value)
  },
  $ne: (db, column, value, operator) => {
    const f = getWhereFunction(operator)
    return db[f](column, '!=', value)
  },
  $eq: (db, column, value, operator) => {
    const f = getWhereFunction(operator)
    return db[f](column, value)
  },
  $between: (db, column, value, operator) => {
    const f = operator ? `${operator}WhereBetween` : 'whereBetween'
    return db[f](column, value)
  },
  $notBetween: (db, column, value, operator) => {
    const f = operator ? `${operator}WhereNotBetween` : 'whereNotBetween'
    return db[f](column, value)
  },
  $in: (db, column, value, operator) => {
    const f = operator ? `${operator}WhereIn` : 'whereIn'
    return db[f](column, value)
  },
  $notIn: (db, column, value, operator) => {
    const f = operator ? `${operator}WhereNotIn` : 'whereNotIn'
    return db[f](column, value)
  },
  $like: (db, column, value, operator) => {
    const f = operator ? `${operator}Where` : 'where'
    return db[f](column, 'like', value)
  },
  $notLike: (db, column, value, operator) => {
    const f = operator ? `${operator}Where` : 'where'
    return db[f](column, 'not like', value)
  },
}

const limit = (db, value) => {
  returb db.limit(value)
}

const offset = (db, value) => {
  return db.offset(value)
}

module.exports = (models, relationships) => {
  return {
    find: (table, params) => {
      // parse params into function call
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
