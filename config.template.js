const DATABASE = process.env.NODE_ENV === 'production' ? 'prodDatabase' : 'testDatabase'
const USER = process.env.NODE_ENV === 'production' ? 'prodDatabaseUser' : 'testDatabaseUser'
const PASSWORD = process.env.NODE_ENV === 'production' ? 'productionDatabasePassword' : 'testDatabasePassword'
const HOST = process.env.NODE_ENV === 'production' ? 'production.host.com' : 'test.host.com'

const config = {
  port: 9000,
  authentication: false,
  secret_key: 'secret',
  db: DATABASE,
  user: USER,
  password: PASSWORD,
  default_user: 'admin',
  default_password: 'test',
  create_user_table: false,
  pagination: true,
  options: {
    host: HOST,
    dialect: 'mssql',
    directory: false, // prevents the program from writing to disk
    dialectOptions: {
      encrypt: true // Encrypted connection (mssql)
    },
    define: {
      timestamps: false // Don't define our own timestamps, rely on database
    },
    logging: false
  }
}

module.exports = config
