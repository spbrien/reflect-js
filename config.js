const log = process.env.LOG === 'true' ? console.log : false
const config = {
  db: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  options: {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    directory: false, // prevents the program from writing to disk
    dialectOptions: {
      encrypt: true // Encrypted connection (mssql)
    },
    define: {
      timestamps: false // Don't define our own timestamps, rely on database
    },
    logging: log
  }
}

module.exports = config
