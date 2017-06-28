// Sample Config File
module.exports = {
  db: 'database-name',
  user: 'database-user',
  password: 'database-password',
  options: {
    host: 'database-host',
    dialect: 'database-dialect',
    directory: false, // prevents the program from writing to disk
    dialectOptions: {
  		encrypt: true // Encrypted connection (mssql)
  	},
    define: {
      timestamps: false // Don't define our own timestamps, rely on database
    },
    logging: false,
  },
}
