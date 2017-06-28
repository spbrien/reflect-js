// Pre-request Hook Configuration
module.exports = {
  // Example
  GET: {
    wp_posts: (req, res, next) => {
      console.log('after', req.params.resource)
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
