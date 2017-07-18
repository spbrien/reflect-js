const R = require('ramda')

// Gets the name of the primary key column from a resource schema
function getPrimaryKeyFromSchema(model) {
  const column = R.find((item) => item.primaryKey === true, model.columns)
  return column.name
}

// A factory function that takes an array of model objects
// Returns a function that accepts a model name and returns
// the model object associated with it
function findModelsByName(models) {
  return (name) => R.find(R.propEq('name', name))(models)
}

module.exports = {
  findModelsByName,
  getPrimaryKeyFromSchema,
}
