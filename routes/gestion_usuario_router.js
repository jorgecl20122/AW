const express = require('express');
const bcryptjs = require('bcryptjs');
const router = express.Router();
const pool = require('../dataBase/conexion_db'); 
const { validarDatosBBDD } = require('../utils/validarDatosBBDD');

const {
    validarCorreoCorporativo,
    validarContraseñaSegura,
    validarRegistro,
    validarCoincidenciaContraseñas
} = require('../middlewares/validaciones');

// ============================================
// CONFIGURACIÓN DE MULTER PARA SUBIDA DE FOTOS
// ============================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/img/usuarios');
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Generar nombre único
        const uniqueName = `user_${req.session.userId}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)'));
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: fileFilter
});

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
function verificarAutenticacion(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ mensaje: 'No autorizado. Por favor inicia sesión.' });
    }
    next();
}

// ============================================
// FUNCIONES AUXILIARES
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

function obtenerEstadoFlota(callback) {
    // Query mejorada que cuenta vehículos basándose en reservas activas
    const query = `
        SELECT 
            COUNT(DISTINCT CASE WHEN r.estado = 'activa' THEN v.id_vehiculo END) as en_uso,
            COUNT(DISTINCT CASE WHEN r.id_vehiculo IS NULL OR r.estado != 'activa' THEN v.id_vehiculo END) as disponibles,
            COALESCE(SUM(CASE WHEN r.estado = 'activa' THEN r.incidencias_reportadas ELSE 0 END), 0) as incidencias_totales
        FROM vehiculos v
        LEFT JOIN reservas r ON v.id_vehiculo = r.id_vehiculo AND r.estado = 'activa'
    `;
    
    pool.query(query, (err, result) => {
        if (err) {
            console.error('Error al obtener estado de la flota:', err);
            return callback(null);
        }
        
        const datos = result[0] || {
            disponibles: 0,
            en_uso: 0,
            incidencias_totales: 0
        };
        
        callback({
            disponibles: datos.disponibles || 0,
            en_uso: datos.en_uso || 0,
            incidencias_totales: datos.incidencias_totales || 0
        });
    });
}

// ============================================

// Ruta principal - Verificar BD vacía
router.get('/', (req, res) => {

  // Verificar si la BD está vacía
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM concesionarios) as total_concesionarios,
      (SELECT COUNT(*) FROM vehiculos) as total_vehiculos,
      (SELECT COUNT(*) FROM usuarios) as total_usuarios
  `;

  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error al verificar BD:', err);
      return res.render('PaginaInicial', { dbVacia: false });
    }

    const stats = result[0];
    const dbVacia = stats.total_concesionarios === 0 && 
                    stats.total_vehiculos === 0 && 
                    stats.total_usuarios === 0;

                    console.log("Renderizando Inicio con dbVacia =", dbVacia);
    res.render('PaginaInicial', { dbVacia });
  });
});

// Vista de registro
router.get('/registro', (req, res) => {
    extraerConcesionarios((err, concesionarios) => {
        if (err) {
            return res.status(500).send('Error al cargar la página de registro.');
        }
        res.render('RegistroUsuario', { concesionarios, error: null, success: null });
    });
});

// Registro de usuario 
router.post('/signup', validarRegistro, validarContraseñaSegura, (req, res) => {
    const { nombre, apellido, email, contraseña, rol, telefono, id_concesionario } = req.body;
    const nombreCompleto = `${nombre} ${apellido}`;

    // Extraer concesionarios para el select
    extraerConcesionarios((err, concesionarios) => {
        if (err) concesionarios = [];

        // Manejar errores de validación
        if (req.erroresValidacion && req.erroresValidacion.length > 0) {
            return res.render('RegistroUsuario', {
                concesionarios,
                error: req.erroresValidacion.join(', '),
                success: null,
                // Preservar datos del formulario
                formData: {
                    nombre: nombre || '',
                    apellido: apellido || '',
                    email: email || '',
                    telefono: telefono || '',
                    rol: rol || '',
                    id_concesionario: id_concesionario || ''
                }
            });
        }

        // Validar email y teléfono en la base de datos
        validarDatosBBDD(email, telefono, pool)
            .then(result => {
                if (result.error) {
                    return res.render('RegistroUsuario', {
                        concesionarios,
                        error: result.error,
                        success: null,
                        // Preservar datos del formulario
                        formData: {
                            nombre: nombre || '',
                            apellido: apellido || '',
                            email: email || '',
                            telefono: telefono || '',
                            rol: rol || '',
                            id_concesionario: id_concesionario || ''
                        }
                    });
                }

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
            })
            .catch(err => {
                console.error("Error en la validación:", err);
                res.status(500).json({ error: err.error });
            });
    });
});


// Vista de login
router.get('/login', (req, res) => {
    res.render('InicioSesion', { success: null, error: null });
});

// Inicio de sesión 
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

        req.session.usuario = {
            id: usuario.id_usuario,
            rol: usuario.rol,
            nombre_completo: usuario.nombre_completo,
            email: email,
            avatar: usuario.avatar || '/img/usuarios/avatar.jpg'
        };

        req.session.userId = usuario.id_usuario;
        req.session.userRole = usuario.rol;

        // Guardamos la sesión antes de redirigir
        req.session.save((err) => {
            if (err) {
                console.error('Error al guardar sesión:', err);
                return res.render('InicioSesion', { 
                    success: null, 
                    error: 'Error al iniciar sesión.' 
                });
            }

            // Redirigimos según el rol DESPUÉS de guardar la sesión
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
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/usuario/login?logout=success');
    });
});

router.get('/login', (req, res) => {
    const success = req.query.logout === 'success' ? 'Sesión cerrada correctamente.' : null;
    
    res.render('InicioSesion', {
        success: success,
        error: null
    });
});

// Vista de Restablecer Contraseña
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

// Vista de listado de usuarios (renderiza con datos)
router.get('/vistaLista', (req, res) => {
    const usuario = req.session.usuario;
    
    // Consulta para obtener usuarios
    const queryUsuarios = `
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
    
    // Consulta para obtener concesionarios
    const queryConcesionarios = `
        SELECT id_concesionario, nombre, ciudad
        FROM concesionarios
        ORDER BY nombre ASC
    `;
    
    // Ejecutar ambas consultas
    pool.query(queryUsuarios, (errorUsuarios, usuarios) => {
        if (errorUsuarios) {
            console.error('Error al obtener usuarios:', errorUsuarios);
            return res.render('ListadoUsuarios', { 
                usuario, 
                usuarios: [],
                concesionarios: [],
                estadoFlota: null,
                error: 'Error al cargar usuarios'
            });
        }
        
        pool.query(queryConcesionarios, (errorConcesionarios, concesionarios) => {
            if (errorConcesionarios) {
                console.error('Error al obtener concesionarios:', errorConcesionarios);
                return res.render('ListadoUsuarios', { 
                    usuario, 
                    usuarios: usuarios || [],
                    concesionarios: [],
                    estadoFlota: null,
                    error: 'Error al cargar concesionarios'
                });
            }
            
            // Obtener estado de la flota
            obtenerEstadoFlota((estadoFlota) => {
                res.render('ListadoUsuarios', { 
                    usuario, 
                    usuarios: usuarios || [],
                    concesionarios: concesionarios || [],
                    estadoFlota: estadoFlota,
                    success: null,
                    error: null
                });
            });
        });
    });
});

// Obtener usuario actual
router.get('/actual', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
            mensaje: 'No hay sesión activa',
            sinSesion: true 
        });
    }

    const query = `
        SELECT 
            u.id_usuario,
            u.nombre_completo,
            u.correo,
            u.telefono,
            u.rol,
            u.avatar,
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

// Ruta para Cambiar la Foto de perfil
router.post('/cambiar-foto', verificarAutenticacion, upload.single('foto_perfil'), (req, res) => {
    
    if (!req.file) {
        return res.status(400).json({ mensaje: 'No se subió ninguna imagen' });
    }

    const userId = req.session.userId;
    const fotoPath = `/img/usuarios/${req.file.filename}`;

    const queryGetOldPhoto = 'SELECT avatar FROM usuarios WHERE id_usuario = ?';

    pool.query(queryGetOldPhoto, [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ mensaje: 'Error al procesar la solicitud' });
        }

        const oldPhoto = results[0]?.avatar;

        const queryUpdate = 'UPDATE usuarios SET avatar = ? WHERE id_usuario = ?';

        pool.query(queryUpdate, [fotoPath, userId], (error, updateResults) => {
            if (error) {
                return res.status(500).json({ 
                    mensaje: 'Error al actualizar la foto de perfil en la base de datos' 
                });
            }

            if (updateResults.affectedRows === 0) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }

            // Recargar usuario desde BD
            const queryReloadUser = `
                SELECT 
                    id_usuario,
                    nombre_completo,
                    correo,
                    telefono,
                    avatar,
                    rol,
                    id_concesionario
                FROM usuarios 
                WHERE id_usuario = ?
            `;

            pool.query(queryReloadUser, [userId], (errorReload, userResults) => {
                if (errorReload) {
                    return res.status(500).json({ 
                        mensaje: 'Error al recargar datos del usuario' 
                    });
                }

                if (userResults.length === 0) {
                    return res.status(404).json({ mensaje: 'Usuario no encontrado' });
                }

                // Actualizar sesión
                const usuarioActualizado = userResults[0];
                req.session.usuario = {
                    id_usuario: usuarioActualizado.id_usuario,
                    nombre_completo: usuarioActualizado.nombre_completo,
                    correo: usuarioActualizado.correo,
                    telefono: usuarioActualizado.telefono,
                    avatar: usuarioActualizado.avatar,
                    rol: usuarioActualizado.rol,
                    id_concesionario: usuarioActualizado.id_concesionario
                };

                req.session.save((errSave) => {
                    if (errSave) {
                        return res.status(500).json({ 
                            mensaje: 'Error al guardar la sesión' 
                        });
                    }

                    // Eliminar foto antigua
                    if (oldPhoto && oldPhoto !== '/img/usuarios/avatar.jpg' && oldPhoto !== fotoPath) {
                        const oldPhotoPath = path.join(__dirname, '../public', oldPhoto);
                        fs.unlink(oldPhotoPath, (errDelete) => {
                            if (errDelete) {
                                console.error('Error al eliminar foto antigua:', errDelete);
                            } else {
                                console.log('Foto antigua eliminada');
                            }
                        });
                    }
                    return res.json({
                        success: true,
                        mensaje: 'Foto de perfil actualizada correctamente',
                        avatar: fotoPath
                    });
                });
            });
        });
    });
});


// Actualizar usuario 
router.post('/editar', (req, res) => {
    const usuario = req.session.usuario;
    const { id_usuario, rol, concesionario_id } = req.body;

    if (!id_usuario || !rol) {
        // Recargar datos para renderizar
        const queryUsuarios = `
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
        
        const queryConcesionarios = `
            SELECT id_concesionario, nombre, ciudad
            FROM concesionarios
            ORDER BY nombre ASC
        `;
        
        pool.query(queryUsuarios, (errorUsuarios, usuarios) => {
            pool.query(queryConcesionarios, (errorConcesionarios, concesionarios) => {
                obtenerEstadoFlota((estadoFlota) => {
                    return res.render('ListadoUsuarios', { 
                        usuario, 
                        usuarios: usuarios || [],
                        concesionarios: concesionarios || [],
                        estadoFlota: estadoFlota,
                        error: 'Datos incompletos',
                        success: null
                    });
                });
            });
        });
        return;
    }

    const query = `
        UPDATE usuarios 
        SET rol = ?, id_concesionario = ? 
        WHERE id_usuario = ?
    `;

    pool.query(query, [rol, concesionario_id || null, id_usuario], (err, results) => {
        // Recargar datos para renderizar
        const queryUsuarios = `
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
        
        const queryConcesionarios = `
            SELECT id_concesionario, nombre, ciudad
            FROM concesionarios
            ORDER BY nombre ASC
        `;
        
        pool.query(queryUsuarios, (errorUsuarios, usuarios) => {
            pool.query(queryConcesionarios, (errorConcesionarios, concesionarios) => {
                obtenerEstadoFlota((estadoFlota) => {
                    if (err) {
                        console.error('Error al actualizar usuario:', err);
                        return res.render('ListadoUsuarios', { 
                            usuario, 
                            usuarios: usuarios || [],
                            concesionarios: concesionarios || [],
                            estadoFlota: estadoFlota,
                            error: 'Error al actualizar usuario',
                            success: null
                        });
                    }

                    if (results.affectedRows === 0) {
                        return res.render('ListadoUsuarios', { 
                            usuario, 
                            usuarios: usuarios || [],
                            concesionarios: concesionarios || [],
                            estadoFlota: estadoFlota,
                            error: 'Usuario no encontrado',
                            success: null
                        });
                    }

                    res.render('ListadoUsuarios', { 
                        usuario, 
                        usuarios: usuarios || [],
                        concesionarios: concesionarios || [],
                        estadoFlota: estadoFlota,
                        error: null,
                        success: 'Usuario actualizado correctamente'
                    });
                });
            });
        });
    });
});

// ====================
// CARGA DE DATOS JSON
// ====================

//Ruta para cargar los datos del json 
router.post('/cargar-datos-json', (req, res) => {
  const datos = req.body;

  // Validar estructura del JSON
  if (!datos || !datos.concesionarios || !Array.isArray(datos.concesionarios)) {
    return res.status(400).json({ 
      mensaje: 'Formato de JSON inválido. Debe contener un array de concesionarios' 
    });
  }


  // Verificamos que la BD esté vacía antes de cargar
  const checkQuery = `
    SELECT 
      (SELECT COUNT(*) FROM concesionarios) as total_concesionarios,
      (SELECT COUNT(*) FROM vehiculos) as total_vehiculos
  `;

  pool.query(checkQuery, (errCheck, resultCheck) => {
    if (errCheck) {
      return res.status(500).json({ mensaje: 'Error al verificar la base de datos' });
    }


    const stats = resultCheck[0];
    if (stats.total_concesionarios > 0 || stats.total_vehiculos > 0) {
      return res.status(400).json({ 
        mensaje: 'La base de datos ya contiene datos. No se puede cargar el JSON' 
      });
    }

    // Procesamos la carga de datos
    cargarDatosJSON(datos, (err, resultado) => {
      if (err) {
        return res.status(500).json({ 
          mensaje: 'Error al cargar los datos: ' + err.message 
        });
      }

      res.json({
        mensaje: 'Datos cargados exitosamente',
        concesionarios_cargados: resultado.concesionarios,
        vehiculos_cargados: resultado.vehiculos
      });
    });
  });
});

// ==================== FUNCIÓN PARA PROCESAR EL JSON ====================
function cargarDatosJSON(datos, callback) {
  let concesionariosCargados = 0;
  let vehiculosCargados = 0;
  let erroresEncontrados = [];

  // Iniciar transacción
  pool.getConnection((err, connection) => {
    if (err) {
      return callback(err, null);
    }

    connection.beginTransaction((errTrans) => {
      if (errTrans) {
        connection.release();
        return callback(errTrans, null);
      }

      // Procesamos cada concesionario
      let concesionariosProcesados = 0;

      datos.concesionarios.forEach((concesionario, index) => {
        // Insertamos concesionario
        const queryConcesionario = `
          INSERT INTO concesionarios (nombre, ciudad, telefono, correo)
          VALUES (?, ?, ?, ?)
        `;

        const valuesConcesionario = [
          concesionario.nombre,
          concesionario.ciudad || null,
          concesionario.telefono || null,
          concesionario.correo || null
        ];

        connection.query(queryConcesionario, valuesConcesionario, (errConc, resultConc) => {
          if (errConc) {
            erroresEncontrados.push(`Error en concesionario ${concesionario.nombre}: ${errConc.message}`);
            concesionariosProcesados++;
            verificarFinalizacion();
            return;
          }

          concesionariosCargados++;
          const idConcesionario = resultConc.insertId;

          // Insertamos vehículos de este concesionario
          if (concesionario.vehiculos && Array.isArray(concesionario.vehiculos)) {
            let vehiculosProcesados = 0;

            if (concesionario.vehiculos.length === 0) {
              concesionariosProcesados++;
              verificarFinalizacion();
              return;
            }

            concesionario.vehiculos.forEach((vehiculo) => {
              const queryVehiculo = `
                INSERT INTO vehiculos 
                (id_concesionario, matricula, marca, modelo, anio_matriculacion, 
                 numero_plazas, autonomia_km, color, imagen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

              const valuesVehiculo = [
                idConcesionario,
                vehiculo.matricula,
                vehiculo.marca,
                vehiculo.modelo,
                vehiculo.anio_matriculacion || new Date().getFullYear(),
                vehiculo.numero_plazas || 5,
                vehiculo.autonomia_km || 300,
                vehiculo.color || 'Blanco',
                vehiculo.imagen || null
              ];

              connection.query(queryVehiculo, valuesVehiculo, (errVeh) => {
                if (errVeh) {
                  erroresEncontrados.push(`Error en vehículo ${vehiculo.matricula}: ${errVeh.message}`);
                } else {
                  vehiculosCargados++;
                }

                vehiculosProcesados++;
                
                if (vehiculosProcesados === concesionario.vehiculos.length) {
                  concesionariosProcesados++;
                  verificarFinalizacion();
                }
              });
            });
          } else {
            concesionariosProcesados++;
            verificarFinalizacion();
          }
        });
      });

      function verificarFinalizacion() {
        if (concesionariosProcesados === datos.concesionarios.length) {
          if (erroresEncontrados.length > 0) {
            connection.rollback(() => {
              connection.release();
              callback(new Error(erroresEncontrados.join('; ')), null);
            });
          } else {
            connection.commit((errCommit) => {
              connection.release();
              
              if (errCommit) {
                return callback(errCommit, null);
              }

              callback(null, {
                concesionarios: concesionariosCargados,
                vehiculos: vehiculosCargados
              });
            });
          }
        }
      }
    });
  });
}

module.exports = router;