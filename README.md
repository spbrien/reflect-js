# Reflect JS

Takes an SQL database of any dialect and turns it into a REST API.

### Requirements
* Node 6.7.0 or greater

### Installation
```
git clone git@hlk.git.beanstalkapp.com:/hlk/hlk-devteam-utilities.git
cd hlk-devteam-utilities/reflect-js
npm install
```

### Usage
Copy `/config.template.js` to `/config.js` and fill in database details.

Fill out Authentication settings in `/auth/index.js`:

```
// Auth Configuration
module.exports = {
  disabled: true, // Disable all authentication
  // If disabled is set to false, you must open up access for each resource individually
  // Access is completely blocked by default, even to authenticated users
  GET: { // Specify all auth settings for each http method
    wp_posts: { // Specify auth settings per resource according to the database table name
      // Endpoints are restricted completely by default
      public: true, // Open Endpoint to everyone
      // authorizedUsers: ['*'], // Open Endpoint to all authorized users
      // authorizedUsers: ['Bob'] // Open endpoint to only Bob
    },
  },
  POST: {
  },
  PUT: {
  },
  DELETE: {
  },
}
```

Run the application:

```
node index.js
```

---

See all available resources / the database schema:

```
http://localhost:8080/schema
```

Or for each resource / database table:

```
http://localhost:8080/schema/<resource>
```

See all mapped relationships (according to database foreign keys):

```
http://localhost:8080/relationships
```

Or for each resource:

```
http://localhost:8080/relationships/<resource>
```

---

Get a collection for a certain resource:

```
http://localhost:8080/api/<resource>
```

Single resource:

```
http://localhost:8080/api/<resource>/<primary key value>
```

Related resources for a simple one-to-many or one-to-one relationship:

```
http://localhost:8080/api/<resource>/<primary key value>/<related resource>
```

Related resources for a complex many-to-many relationship:

```
http://localhost:8080/api/<resource>/<primary key value>/<related resource>?through=<intermediate table name>
```

### Queries / filters

You can filter results using JSON in the request's query string:

`http://localhost:8080/api/<resource>?where={"ID": 4}`


Follow the guidelines for "where" queries found [here](http://docs.sequelizejs.com/manual/tutorial/querying.html).

You can also use `order` and `orderby`, `page` and `per_page` (default is 25 results per page).

### User-defined Relationships

If you're working with a poorly made database with no foreign keys for relationships (like, say, Wordpress databases), the application will not be able to return results for related tables. In this case, you can specify relationships manually in the `/relationships/index.js` file:

```
module.exports = [
  {
    resource: "wp_posts",
    relatedTo: "wp_postmeta",
    direct: true,
    source_column: "ID",
    target_column: "post_id"
  },
  {
    resource: "wp_posts",
    relatedTo: "wp_posts",
    direct: false,
    through: "wp_postmeta",
    source_column: "ID",
    intermediate_target_column: "post_id",
    intermediate_source_column: "meta_id",
    target_column: "ID",
    as: "wp_posts"
  },
]
```

Reflect-js will create join queries for the tables and return results properly:

`http://localhost:8080/api/wp_posts/37/wp_posts?through=wp_postmeta&where={"post_type":"acf-field"}`

### Authentication

A real authentication implementation should be written. This project uses Passport for auth. You can modify the current (fake and embarrassing) auth implementation in `/lib/authentication.js`.
