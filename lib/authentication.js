// Authentication
const R = require('ramda')
const atob = require('atob')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Sequelize = require('sequelize')
const config = require('../config')
const { _debug } = require('./utils')

const authSettings = require('../auth')

// Get User and Password from headers
function decodeUser(authHeader) {
  // Grab btoa string, decode, and separate username and password into variables
  if (authHeader) {
    const authString = authHeader.replace(/Basic/g, '')
    const decoded = atob(authString)
    const username = decoded.slice(0, decoded.indexOf(':'))
    const password = decoded.slice(decoded.indexOf(':') + 1)
    return { username, password }
  }
  return false
}

// Create a new user table, or a whole sqlite database
function createAuthDatabaseConnection() {
  if (config.create_user_table) {
    return new Sequelize(
      config.db,
      config.user,
      config.password,
      config.options
    )
  }
  return new Sequelize({
    dialect: 'sqlite',
    storage: 'reflect_users.sqlite'
  })
}

const sequelize = createAuthDatabaseConnection()

// Create a User model
const reflect_user = sequelize.define('reflect_user', {
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
  },
})

const reflect_role = sequelize.define('reflect_role', {
  role: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
})

const reflect_users_roles = sequelize.define('reflect_users_roles')

module.exports = {
  init() {
    if (config.authentication) {
      // Set up User / Role relationships
      reflect_user.belongsToMany(reflect_role, {through: 'reflect_users_roles'})
      reflect_role.belongsToMany(reflect_user, {through: 'reflect_users_roles'})
      // Create tables if they don't exist
      reflect_user.sync()
      reflect_role.sync()
      reflect_users_roles.sync()

      // Create a default user if it doesn't exist
      reflect_user.findOne({ where: { username: config.default_user} }).then((user) => {
        if (user) {
          return
        } else {
          bcrypt.hash(config.default_password, 10, (err, hash) => {
            if (err) {
              _debug(err)
            }
            reflect_user.create({
              username: config.default_user,
              password: hash,
              reflect_roles: [
                {role: 'admin'}
              ]
            }, {
              include: [reflect_role]
            })
          })
        }
      }, (err) => {
        _debug(err)
      })
    }
  },
  authorize(req, res, next) {
    if (config.authentication) {
      if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
        // Grab btoa string, decode, and separate username and password into variables
        const { username, password } = decodeUser(req.headers.authorization)
        reflect_user.findOne({
          where: {username: username},
          include: [reflect_role],
        }).then((user) => {
          const usernameMatches = user.username === username
          const passwordMatches = bcrypt.compareSync(password, user.password)

          if (user && usernameMatches && passwordMatches) {
            req.authenticated = true
            req.user = {
              username: user.username,
              reflect_roles: user.reflect_roles
            }
            next()
          } else {
            res.status(401).json({
              error: 401,
              msg: "Not Authorized"
            })
          }
        })
      }
    } else {
      next()
    }
  },
  token(req, res, next) {
    if (config.authentication) {
      const token = req.headers['x-token']
      // Check the token
      if (token) {
        jwt.verify(token, req.app.get('secret'), (err, decoded) => {
          if (err) {
            res.status(401).json({
              error: 401,
              msg: "Not Authorized"
            })
          } else {
            const user = jwt.decode(token)

            // Setup conditionals
            const method = req.method
            const resource = req.params.resource
            const authRestrictions = authSettings[method] ? authSettings[method][resource] : null
            // ---
            const userExists = user ? true : false
            const hasAuthorizedRoles = authRestrictions && authRestrictions.authorizedRoles
            const hasAuthorizedUsers = authRestrictions && authRestrictions.authorizedUsers
            // ---
            const allowAllUsers = R.contains('*', authRestrictions.authorizedUsers)
            const allowAllRoles = R.contains('*', authRestrictions.authorizedRoles)
            const allowGivenRole = R.any(
              R.flip(R.contains)(authRestrictions.authorizedRoles),
              R.map(item => item.role, user.reflect_roles)
            )
            const allowGivenUser = R.contains(user.username, authRestrictions.authorizedUsers)

            // Check Auth conditions
            const auth = R.cond([
              [
                R.always(userExists && hasAuthorizedUsers && allowAllUsers),
                R.always(next)
              ],
              [
                R.always(userExists && hasAuthorizedRoles && allowAllRoles),
                R.always(next)
              ],
              [
                R.always(userExists && hasAuthorizedRoles && allowGivenRole),
                R.always(next)
              ],
              [
                R.always(userExists && hasAuthorizedUsers && allowGivenUser),
                R.always(next)
              ],
              [
                R.T, R.always(() => {
                  return res.status(401).json({
                    error: 401,
                    msg: "Not Authorized"
                  })
                })
              ],
            ])

            // Run checks and finish request
            const finish = auth()
            finish()
          }
        })
      } else {
        res.status(401).json({
          error: 401,
          msg: "Not Authorized"
        })
      }
    } else {
      next()
    }
  },
}
