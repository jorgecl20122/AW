const express = require('express');
const bcryptjs = require('bcryptjs');
const router = express.Router();
const pool = require('../dataBase/conexion_db'); 
const { validarDatosBBDD } = require('../utils/validarDatosBBDD');

// ============================================
// IMPORTAR MIDDLEWARES DE VALIDACIÓN
// ============================================
const {
    validarCorreoCorporativo,
    validarContraseñaSegura,
    validarRegistro,
    validarCoincidenciaContraseñas
} = require('../public/javascripts/validaciones');

// ============================================
// FUNCIÓN AUXILIAR
// ============================================
function extraerConcesionarios(callback) {
    pool.query(`SELECT id_concesionario AS id, nombre FROM concesionarios`, (err, result) => {     
        if (err) {
            console.error('Error al obtener los concesionarios:', err);
            return callback(err, null); 
        }
        callback(null, result);
    });
}
// ============================================

// Página de registro
router.get('/registro', (req, res) => {
    extraerConcesionarios((err, concesionarios) => {
        if (err) {
            return res.status(500).send('Error al cargar la página de registro.');
        }
        res.render('RegistroUsuario', { concesionarios, error: null, success: null });
    });
});

// Registro de usuario 
router.post('/signup', validarRegistro, (req, res) => {
    const { nombre, apellido, email, contraseña, rol, telefono, id_concesionario } = req.body;

    const nombreCompleto = `${nombre} ${apellido}`;

    validarDatosBBDD(email, telefono, pool)
    .then(result => {
        if (result.error) {
            extraerConcesionarios((err, concesionarios) => {
                return res.render('RegistroUsuario', {
                    concesionarios: concesionarios || [],
                    error: result.error,
                    success: null
                });
            });
        } else {
            // Encriptar contraseña
            const hashedPassword = bcryptjs.hashSync(contraseña, 10);
            
            const queryInsert = `
                INSERT INTO usuarios (nombre_completo, correo, contraseña, rol, telefono, id_concesionario)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const values = [nombreCompleto, email, hashedPassword, rol, telefono, id_concesionario];

            pool.query(queryInsert, values, (error) => {
                if (error) {
                    console.error("Error al insertar el usuario:", error);
                    return res.status(500).json({ error: "Error al crear el usuario" });
                }
                return res.render('InicioSesion', {
                    success: "Usuario creado correctamente. Por favor, inicie sesión para acceder.",
                    error: null
                });
            });
        }
    })
    .catch(err => {
        console.error("Error en la validación:", err);
        res.status(500).json({ error: err.error });
    });
});

// Vista de login
router.get('/login', (req, res) => {
    res.render('InicioSesion', { success: null, error: null });
});

// Login
router.post('/login', validarCorreoCorporativo, validarContraseñaSegura, (req, res) => {
    const { email, contraseña } = req.body;

    const query = `SELECT id_usuario, rol, nombre_completo, avatar, contraseña FROM usuarios WHERE correo = ?`;
    
    pool.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error al verificar correo:', err);
            return res.render('InicioSesion', { 
                success: null, 
                error: 'Error en el servidor. Por favor, inténtelo más tarde.' 
            });
        }

        if (results.length === 0) {
            return res.render('InicioSesion', { 
                success: null, 
                error: 'Correo o contraseña incorrectos.' 
            });
        }

        const usuario = results[0];

        // Comparar contraseña con bcrypt
        const contraseñaValida = bcryptjs.compareSync(contraseña, usuario.contraseña);

        if (!contraseñaValida) {
            return res.render('InicioSesion', { 
                success: null, 
                error: 'Correo o contraseña incorrectos.' 
            });
        }

        // Crear sesión
        req.session.usuario = {
            id: usuario.id_usuario,
            rol: usuario.rol,
            nombre_completo: usuario.nombre_completo,
            email: email,
            avatar: usuario.avatar || '/img/default-avatar.png'
        };

        req.session.userId = usuario.id_usuario;
        req.session.userRole = usuario.rol;

        // Redirigir según rol
        if (usuario.rol === 'administrador') {
            return res.redirect(`/admin/vista_ini`);
        } else if (usuario.rol === 'empleado') {
            return res.redirect(`/empleado/vista_empleado`);
        } else {
            return res.render('InicioSesion', { 
                success: null, 
                error: 'Rol desconocido. Por favor, contacte al administrador.' 
            });
        }
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.render('InicioSesion', { success: 'Sesión cerrada correctamente.', error: null });
    });
});

// Vista de restablecer contraseña
router.get('/restablecer_con', (req, res) => {
    res.render('RestablecerContraseña', { success: null, error: null });
});

// Restablecer contraseña 
router.post('/restablecerCon', validarCorreoCorporativo, validarContraseñaSegura, validarCoincidenciaContraseñas, (req, res) => {
        const { email, contrasena1 } = req.body;

        const query_mail_existente = `SELECT id_usuario FROM usuarios WHERE correo = ?`;

        pool.query(query_mail_existente, [email], (error, result) => {
            if (error) {
                console.error('Error al obtener resultados de usuarios', error);
                return res.status(500).json({ error: "Error al buscar usuario" });
            }

            if (result.length === 0) {
                return res.render('RestablecerContraseña', { 
                    success: null, 
                    error: 'Usuario no existente' 
                });
            }

            const usuario = result[0];

            // Encriptar la nueva contraseña
            const hashedPassword = bcryptjs.hashSync(contrasena1, 10);

            const queryContrasena = `UPDATE usuarios SET contraseña = ? WHERE id_usuario = ?`;
            pool.query(queryContrasena, [hashedPassword, usuario.id_usuario], (error, result) => {
                if (error) {
                    console.error("Error al actualizar contraseña", error);
                    return res.status(500).json({ error: "Error al actualizar contraseña" });
                }
                return res.render('InicioSesion', { 
                    success: 'Contraseña actualizada correctamente', 
                    error: null 
                });
            });
        });
    }
);

// Obtener lista de usuarios
router.get('/lista_usuarios', (req, res) => {
    const query = `
        SELECT 
            u.id_usuario,
            u.nombre_completo,
            u.correo,
            u.telefono,
            u.rol,
            c.nombre AS concesionario,
            u.id_concesionario AS concesionario_id
        FROM usuarios u
        LEFT JOIN concesionarios c ON u.id_concesionario = c.id_concesionario
        ORDER BY u.nombre_completo ASC
    `;
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error al obtener usuarios:', error);
            return res.status(500).json({ mensaje: 'Error al obtener usuarios' });
        }
        res.json(results);
    });
});

// Vista de administración
router.get('/vistaLista', (req, res) => {
    const usuario = req.session.usuario;
    res.render('ListadoUsuarios', { usuario });
});

// Obtener datos del usuario actual
router.get('/actual', (req, res) => {
    const query = `
        SELECT 
            u.id_usuario,
            u.nombre_completo,
            u.correo,
            u.telefono,
            u.rol,
            c.nombre AS concesionario,
            u.id_concesionario AS concesionario_id
        FROM usuarios u
        LEFT JOIN concesionarios c ON u.id_concesionario = c.id_concesionario
        WHERE u.id_usuario = ?
    `;

    pool.query(query, [req.session.userId], (error, results) => {
        if (error) {
            console.error('Error al obtener usuario actual:', error);
            return res.status(500).json({ mensaje: 'Error al obtener datos del usuario' });
        }

        if (results.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json(results[0]);
    });
});

// Actualizar usuario (solo rol y concesionario)
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { rol, concesionario_id } = req.body;

    pool.query(
        `UPDATE usuarios SET rol = ?, id_concesionario = ? WHERE id_usuario = ?`,
        [rol, concesionario_id || null, id],
        (err, results) => {
            if (err) {
                console.error('Error al actualizar usuario:', err);
                return res.status(500).json({ mensaje: 'Error al actualizar usuario' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }

            res.json({ mensaje: 'Usuario actualizado correctamente' });
        }
    );
});

module.exports = router;