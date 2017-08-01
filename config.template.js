const config = {
  port: 9000,
  environment: 'dev',
  authentication: false,
  secret_key: 'secret',
  db: '',
  user: '',
  password: '!',
  default_user: 'admin',
  default_password: 'test',
  create_user_table: false,
  pagination: false,
  options: {
    host: '',
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
