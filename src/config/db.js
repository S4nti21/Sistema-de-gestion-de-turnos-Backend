const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Las columnas DATE son fechas de calendario: se devuelven como 'YYYY-MM-DD'
  // para que no se corran de dia por la zona horaria al pasar por JSON.
  dateStrings: ["DATE"],
});

module.exports = pool;
