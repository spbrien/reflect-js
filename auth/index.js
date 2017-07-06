// Auth Configuration
const config = require('../config')

module.exports = {
  disabled: config.authentication, // Disable all auth
  GET: {
    employees: {
      authorizedUsers: ['admin'],
      authorizedRoles: ['admin']
    }
  },
}
