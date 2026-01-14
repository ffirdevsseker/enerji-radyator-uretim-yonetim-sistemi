const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Debug: log what credentials are being used (mask password)
console.log('DB CONFIG DEBUG', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER ? '***' : process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Create promise-based connection
const promisePool = pool.promise();

// Test connection
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('MySQL Database connected successfully!');
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
};

testConnection();

module.exports = promisePool;