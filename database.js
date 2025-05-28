const mysql = require('mysql2');

// Configuración para WAMP server local
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Cambia esto si tu WAMP tiene contraseña para root
    database: 'programa1',
    port: 3306 // Puerto por defecto de MySQL en WAMP
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err);
        console.log('💡 Asegúrate de que:');
        console.log('   - WAMP server esté ejecutándose');
        console.log('   - MySQL esté activo');
        console.log('   - La base de datos "programa1" existe');
        return;
    }
    console.log('✅ Conexión exitosa a MySQL (WAMP server)');
});

module.exports = connection;