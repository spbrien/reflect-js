const R = require('ramda')
const Sequelize = require('sequelize')
const SequelizeAuto = require('sequelize-auto')
const fs = require('fs')

const config = require('../config')
const { _debug } = require('./utils')

// ----------------------------------
// Init our Connection to read schema
// ----------------------------------
const connection = new SequelizeAuto(
  config.db,
  config.user,
  config.password,
  config.options
)

const executor = (resolve, reject) => {
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

      // Create a map of our simple one-to-many or one-to-one relationships
      const simpleRelationships = R.filter(
        (item) => item,
        R.map(
          (i) => {
            const key = i[0]
            const value = i[1]

            const connections = R.filter(
              (item) => item.target_table && item.target_column,
              R.values(value)
            )
            if (connections.length === 1) {
              return {
                resource: key,
                relatedTo: connections[0].target_table,
                direct: true,
                source_column: connections[0].source_column,
                target_column: connections[0].target_column,
              }
            }
            return null
          },
          R.toPairs(connection.foreignKeys)
        )
      )

      // Create a map of the reverse one-to-many or one-to-one relationships
      const backwardsSimpleRelationships = R.map((relationship) => {
        return {
          resource: relationship.relatedTo,
          relatedTo: relationship.resource,
          direct: true,
          source_column: relationship.target_column,
          target_column: relationship.source_column,
        }
      }, simpleRelationships)

      // Create a map of our complex relationships
      // First make a var to hold them
      const complexRelationships = []
      // For each complex relationship, build out an object to describe them
      R.forEachObjIndexed((value, key) => {
        const connections = R.filter(
          (item) => item.target_table && item.target_column,
          R.values(value)
        )
        if (connections.length > 1) {
          R.forEach((connection) => {
            const remaining = R.filter(
              (item) => item !== connection,
              connections
            )

            R.forEach((item) => {
              // Add to our complex relationship var
              complexRelationships.push({
                resource: connection.target_table,
                direct: false,
                relatedTo: item.target_table,
                through: key,
                source_column: connection.target_column,
                intermediate_source_column: connection.source_column,
                target_column: item.target_column,
                intermediate_target_column: item.source_column,
                as: item.target_table,
              })
            }, remaining)

          }, connections)
        }
      }, connection.foreignKeys)

      // Merge simple and complex relationships
      const relationships = R.flatten([
        simpleRelationships,
        backwardsSimpleRelationships,
        complexRelationships
      ])

      // Write Schema and Relationships JSON
      const opts = {
        flag: 'w'
      }
      fs.writeFile(`${process.cwd()}/.schema/schema.json`, JSON.stringify(schema), opts, function(err) {
        if(err) {
          _debug(err);
        }
        _debug("Cacheing schema JSON");
      })
      fs.writeFile(`${process.cwd()}/.schema/relationships.json`, JSON.stringify(relationships), opts, function(err) {
        if(err) {
          _debug(err);
        }
        _debug("Cacheing relationship JSON");
      })
      // Return models
      resolve({
        schema,
        relationships,
      })
    }
    else {
      reject(Error("Could not create Sequelize models"))
    }
  })
}

module.exports = () => {
  // Set up vars
  let schemaCache = null
  let relationshipCache = null

  // Grab cached schemas if they exist
  try {
    schemaCache = fs.readFileSync(`${process.cwd()}/.schema/schema.json`, 'utf8')
    relationshipCache = fs.readFileSync(`${process.cwd()}/.schema/relationships.json`, 'utf8')
  }
  catch(err) {
    _debug(err)
  }

  if (schemaCache && relationshipCache) {
    return new Promise((resolve, reject) => {
      _debug('Using cached schema and relationships...')
      resolve({
        schema: JSON.parse(schemaCache),
        relationships: JSON.parse(relationshipCache),
      })
    })
  }
  return new Promise(executor)
}
