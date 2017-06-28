// Auth Configuration
module.exports = {
  disabled: process.env.AUTHENTICATION === 'false' ? true : false, // Disable all auth
  GET: {
  },
}
