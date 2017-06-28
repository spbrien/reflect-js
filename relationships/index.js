const models = []
let relationship_config = null
const relationships = `./${process.env.DB_NAME}`

try {
  relationship_config = require(relationships)
}
catch (err) {
  console.log("No relationships defined by user...")
}
if (relationship_config) {
  models = relationship_config
}

module.exports = models
