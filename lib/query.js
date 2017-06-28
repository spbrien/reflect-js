const R = require('ramda')

const config = require('../config')

module.exports = (models) => {
  return {
    find: (table, query, includes) => {
      return models[table].findAll(query).then((items) => {
        if (items.length > 0) {
          return R.map((item) => item.dataValues, items)
        }
        return null
      })
    },
    findOne: (table, query, includes) => {
      return models[table].findOne(query).then((item) => {
        if (item) {
          return item
        }
        return null
      })
    },
    create: (table, data) => {
      return models[table].create(data).then((item) => {
        item.dataValues[models[table].primaryKeyField] = item.null
        return item.dataValues
      })
    },
    update: (table, params, data) => {
      const fields = R.keys(data)
      params.fields = fields

      return models[table].update(data, params).then((item) => {
        return item.dataValues
      })
    },
    delete: (table, params) => {
      return models[table].destroy(params).then((item) => {
        return item.dataValues
      })
    },
    count: (table, params) => {
      return models[table].count(params)
    },
  }
}
