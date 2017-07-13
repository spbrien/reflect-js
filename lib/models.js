const R = require('ramda')
const SequelizeAuto = require('sequelize-auto')

const config = require('../config')

// ----------------------------------
// Init our Connection to read schema
// ----------------------------------
const connection = new SequelizeAuto(
  config.db,
  config.user,
  config.password,
  config.options
)

const promise = new Promise((resolve, reject) => {
  connection.run((err) => {
    if (!err) {
      // Sequelize auto will generate model definitions as JS Object for our Database
      // --------------------------------------------------------------------------

      // Create a schema definition for use in our schema endpoint
      const schema = R.map((table) => {
        const tableSchema = {
          name: table[0],
          columns: R.map((sub) => {
            return {
              name: sub[0],
              type: sub[1].type,
              default_value: sub[1].defaultValue,
              allow_null: sub[1].allowNull,
              primaryKey: sub[1].primaryKey
            }
          }, R.toPairs(table[1])),
          // Probably won't need foreign keys
          // foreignKeys: connection.foreignKeys[table[0]]
        }
        return tableSchema
      }, R.toPairs(connection.tables))
      // Return models
      resolve(schema)
    }
    else {
      reject(Error("Could not create db schema"))
    }
  })
})

module.exports = () => promise
