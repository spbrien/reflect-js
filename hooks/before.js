// Post-request Hook Configuration
module.exports = {
  // Example
  GET: {
    wp_posts: (req, res, next) => {
      console.log('before', req.params.resource)
      next()
    },
  },
  POST: {
  },
  PUT: {
  },
  DELETE: {
  },
}
