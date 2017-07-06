const config = {
  port: 9000,
  environment: 'dev',
  authentication: true,
  secret_key: 'secret',
  db: 'employees',
  user: 'root',
  password: 'root',
  default_user: 'admin',
  default_password: 'test',
  create_user_table: false,
  options: {
    host: '192.168.33.133',
    dialect: 'mysql',
    directory: false, // prevents the program from writing to disk
    dialectOptions: {
      encrypt: true // Encrypted connection (mssql)
    },
    define: {
      timestamps: false // Don't define our own timestamps, rely on database
    },
    logging: true
  }
}

module.exports = config
