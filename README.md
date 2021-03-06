# Reflect JS

Takes an SQL database of any dialect and turns it into a REST API.

### Requirements
* Node 8.0.0 or greater

### Installation
```
git clone git@hlk.git.beanstalkapp.com:/hlk/hlk-reflect.git
cd hlk-reflect
npm install
```

### Usage
Copy `/config.template.js` to `/config.js` and fill in database/config details.

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
      // authorizedUsers: ['*', 'Bob'], // Open Endpoint to all authorized users and Bob
      // authorizedRoles: ['admin'] // Open endpoint to any user with the admin role
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
npm run dev
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

Related resources can be nested within returned objects:

```
http://localhost:8080/api/employees?includes=[{resource: departments, through: dept_emp}]
```

### Queries / filters

You can filter results using JSON in the request's query string:

`http://localhost:8080/api/<resource>?where={"ID": {"$eq": 4}}`

The operators for creating where queries:

```
const whereOperators = [
  $gt,
  $gte,
  $lt,
  $lte,
  $ne,
  $eq,
  $between,
  $notBetween,
  $in,
  $notIn,
  $like,
  $notLike,
]
```

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
    target_column: "ID"
  },
]
```

Reflect-js will create join queries for the tables and return results properly

### Authentication

There are three options for handling authentication:

1. Create new reflect-specific tables in your connected database
2. Create a portable sqlite database to store users and login information
3. Disable all authentication

In the config file:

```
authentication: true, // false to disable auth
create_user_table: false, // true to create new tables, false to use sqlite
```
