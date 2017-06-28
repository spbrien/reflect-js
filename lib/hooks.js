const before = require('../hooks/before')
const after = require('../hooks/after')

module.exports = {
    before(req, res, next) {
      const resource = req.params.resource
      const method = req.method

      const hookFunction = before[method] && before[method][resource] ? before[method][resource] : null
      if (hookFunction !== null) {
        return hookFunction(req, res, next)
      }
      next()
    },
    after(req, res, next) {
      const resource = req.params.resource
      const method = req.method

      const hookFunction = after[method] && after[method][resource] ? after[method][resource] : null
      if (hookFunction !== null) {
        return hookFunction(req, res, next)
      }
      next()
    },
}
