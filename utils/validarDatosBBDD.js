// Función para validar que el correo y el teléfono no existan en la base de datos
const validarDatosBBDD = (email, telefono, pool) => {
    return new Promise((resolve, reject) => {
        // Consultar si el correo ya existe
        const queryEmail = 'SELECT * FROM usuarios WHERE correo = ?';
        const queryTelefono = 'SELECT * FROM usuarios WHERE telefono = ?';

        // Primero verificamos el correo
        pool.query(queryEmail, [email], (err, results) => {
            if (err){
                console.log(err);
                return reject({ error: "Error en la consulta de correo." });
            } 

            if (results.length > 0) {
                console.log(" correo ya está asociado a un usuario");
                // Si hay resultados, el correo ya existe
                return resolve({ error: "El correo electrónico ya está registrado." });
            }

            // Si no, verificamos el teléfono
            pool.query(queryTelefono, [telefono], (err, results) => {
                if (err){
                    console.log(err);
                    return reject({ error: "Error en la consulta de teléfono." });
                } 

                if (results.length > 0) {
                    // Si hay resultados, el teléfono ya está registrado
                    console.log(" teléfono ya está asociado a un usuario")
                    return resolve({ error: "El teléfono ya está asociado a un usuario." });
                }

                // Si todo está bien, retornamos un éxito
                resolve({ success: true });
            });
        });
    });
};

module.exports = { validarDatosBBDD };
