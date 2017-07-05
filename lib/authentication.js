// Authentication
const R = require('ramda')
const bcrypt = require('bcrypt')
const Sequelize = require('sequelize')
const passport = require('passport')
const BasicStrategy = require('passport-http').BasicStrategy
const config = require('../config')

const authSettings = require('../auth')

// Create a new user table, or a whole sqlite database
function createAuthDatabaseConnection() {
  if (process.env.CREATE_USER_TABLE === 'true') {
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

passport.use(new BasicStrategy(
  {passReqToCallback: true},
  function(req, username, password, done) {
    // TODO: Refactor without passport
    reflect_user.findOne({
      where: {username: username},
      include: [reflect_role],
    }).then((user) => {
      const method = req.method
      const resource = req.params.resource
      const authRestrictions = authSettings[method] ? authSettings[method][resource] : null

      // Setup conditionals
      const userExists = user ? true : false
      const hasAuthorizedRoles = authRestrictions && authRestrictions.authorizedRoles
      const hasAuthorizedUsers = authRestrictions && authRestrictions.authorizedUsers
      const allowAllUsers = R.contains('*', authRestrictions.authorizedUsers)
      const allowAllRoles = R.contains('*', authRestrictions.authorizedRoles)
      const allowGivenRole = R.any(
        R.flip(R.contains)(authRestrictions.authorizedRoles),
        R.map(item => item.role, user.reflect_roles)
      )
      const allowGivenUser = R.contains(username, authRestrictions.authorizedUsers)
      const usernameMatches = user.username === username
      const passwordMatches = bcrypt.compareSync(password, user.password)

      // Set up Auth test function
      var testAuthentication = R.cond([
        [
          R.always(userExists && hasAuthorizedUsers && allowAllUsers && usernameMatches && passwordMatches),
          R.always(() => done(null, {username: username}))
        ],
        [
          R.always(userExists && hasAuthorizedRoles && allowAllRoles && usernameMatches && passwordMatches),
          R.always(() => done(null, {username: username}))
        ],
        [
          R.always(userExists && hasAuthorizedRoles && allowGivenRole && usernameMatches && passwordMatches),
          R.always(() => done(null, {username: username}))
        ],
        [
          R.always(userExists && hasAuthorizedUsers && allowGivenUser && usernameMatches && passwordMatches),
          R.always(() => done(null, {username: username}))
        ],
        [
          R.T, R.always(() => done(null, false))
        ],
      ])

      // Run Auth Checks
      authorized = testAuthentication()
      return authorized()
    })
  }
))

module.exports = {
  init() {
    // Set up User / Role relationships
    reflect_user.belongsToMany(reflect_role, {through: 'reflect_users_roles'})
    reflect_role.belongsToMany(reflect_user, {through: 'reflect_users_roles'})
    // Create tables if they don't exist
    reflect_user.sync()
    reflect_role.sync()
    reflect_users_roles.sync()

    // Create a default user if it doesn't exist
    reflect_user.findOne({ where: { username: process.env.DEFAULT_USER} }).then((user) => {
      if (user) {
        return passport.initialize()
      } else {
        bcrypt.hash(process.env.DEFAULT_PASSWORD, 10, (err, hash) => {
          if (err) {
            console.log(err)
          }
          reflect_user.create({
            username: process.env.DEFAULT_USER,
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
      console.log(err)
    })
    return passport.initialize()
  },
  authorize(req, res, next) {
    // Check if this endpoint is protected at all
    const method = req.method
    const resource = req.params.resource
    const authRestrictions = authSettings[method] ? authSettings[method][resource] : null

    if ((!authRestrictions || !authRestrictions.public) && !authSettings.disabled) {
      return passport.authorize('basic', {session: false})(req, res, next)
    }
    next()
  },
}
