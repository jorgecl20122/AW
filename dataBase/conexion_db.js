// dbConnection.js
const mysql = require('mysql');

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: "localhost",    
    user: "root",         
    password: "",        
    database: "bbdd_ecoflota"
});

module.exports = pool;
