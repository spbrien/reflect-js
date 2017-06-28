// Authentication
const R = require('ramda')
const passport = require('passport')
const BasicStrategy = require('passport-http').BasicStrategy

const authSettings = require('../auth')

// This is terrible and fake
// Don't do This
// TODO: REPLACE
const user = {
  username: 'admin',
  password: 'test',
  id: 1
}

passport.use(new BasicStrategy(
  {passReqToCallback: true},
  function(req, username, password, done) {
    // Check for username and role restrictions using the req object
    const method = req.method
    const resource = req.params.resource
    const authRestrictions = authSettings[method] ? authSettings[method][resource] : null
    if (!authRestrictions) {
      return done(null, false)
    }
    if (R.contains('*', authRestrictions.authorizedUsers)) {
      if ( user.username === username && user.password === password) {
          return done(null, {username: username});
      }
    } else if (R.contains(username, authRestrictions.authorizedUsers)) {
      if ( user.username === username && user.password === password) {
          return done(null, {username: username});
      }
    }
    return done(null, false);
  }
))

module.exports = {
  init() {
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
