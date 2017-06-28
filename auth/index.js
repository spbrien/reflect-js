// Auth Configuration
module.exports = {
  disabled: process.env.AUTHENTICATION === 'false' ? true : false, // Disable all auth
  GET: {
    PlotForms: {
      // Endpoints are restricted completely by default
      public: true, // Open Endpoint to everyone
      // authorizedUsers: ['*'], // Open Endpoint to all authorized users
      // authorizedUsers: ['Bob'] // Open endpoint to only Bob
    },
  },
}
