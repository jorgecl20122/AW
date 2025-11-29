// routes/admin.js
const express = require('express');
const path = require('path');
const router = express.Router();
const pool = require('../dataBase/conexion_db');
const multer = require('multer');

// Configuración de multer para guardar imágenes:

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/vehiculos/') // Asegúrate que esta carpeta existe
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes'));
    }
});
function obtenerEstadoFlota(callback) {
    // Obtener vehículos disponibles (estado NO activo)
    pool.query(`SELECT COUNT(*) as disponibles FROM vehiculos WHERE estado != 'activo'`, (err, vehiculosDisponibles) => {
        if (err) {
            console.error('Error al obtener vehículos disponibles:', err);
            return callback(null); // Retorna null si hay error
        }
        
        // Obtener vehículos en uso (estado activo)
        pool.query(`SELECT COUNT(*) as en_uso FROM vehiculos WHERE estado = 'activo'`, (err, vehiculosEnUso) => {
            if (err) {
                console.error('Error al obtener vehículos en uso:', err);
                return callback(null); // Retorna null si hay error
            }
            
            const disponibles = vehiculosDisponibles[0].disponibles || 0;
            const enUso = vehiculosEnUso[0].en_uso || 0;
            const total = disponibles + enUso;
            
            callback({
                disponibles: disponibles,
                en_uso: enUso,
                total: total
            });
        });
    });
}

// ============================================
// RUTAS ACTUALIZADAS CON ESTADO DE FLOTA
// ============================================

// 1. VISTA ADMIN
router.get('/vista_admin', (req, res) => {
    const usuario = req.session.usuario;
    
    const queryConcesionarios = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
    
    pool.query(queryConcesionarios, (error, concesionarios) => {
        if (error) {
            console.error('Error al obtener concesionarios:', error);
            return res.render('VistaAdmin', { 
                usuario, 
                concesionarios: [],
                estadoFlota: null 
            });
        }
        
        // Obtener estado de la flota
        obtenerEstadoFlota((estadoFlota) => {
            res.render('VistaAdmin', { 
                usuario, 
                concesionarios,
                estadoFlota: estadoFlota
            });
        });
    });
});

// 2. VISTA INICIO
router.get('/vista_ini', (req, res) => {
    const usuario = req.session.usuario;
    
    // Obtener estado de la flota
    obtenerEstadoFlota((estadoFlota) => {
        res.render('Inicio_app_admin', { 
            usuario,
            estadoFlota: estadoFlota
        });
    });
});

// 3. VISTA VEHÍCULOS
router.get('/VistaVehiculos', (req, res) => {
    const usuario = req.session.usuario;
    const mensaje = req.session.mensaje;
    delete req.session.mensaje;
    
    const query = `
        SELECT 
            v.id_vehiculo AS id,
            v.matricula,
            v.marca,
            v.modelo,
            v.anio_matriculacion,
            v.numero_plazas,
            v.autonomia_km,
            v.color,
            v.imagen,
            v.estado,
            c.nombre AS concesionario
        FROM vehiculos v
        JOIN concesionarios c ON v.id_concesionario = c.id_concesionario
    `;
    
    pool.query(query, (error, vehiculos) => {
        if (error) {
            console.error('Error al obtener vehículos:', error);
            return res.render('vista_vehiculos_admin', { 
                usuario, 
                vehiculos: [], 
                mensaje,
                estadoFlota: null
            });
        }
        
        // Obtener estado de la flota
        obtenerEstadoFlota((estadoFlota) => {
            res.render('vista_vehiculos_admin', { 
                usuario, 
                vehiculos, 
                mensaje,
                estadoFlota: estadoFlota
            });
        });
    });
});


//------------------------------------
// RUTAS DE CONCESIONARIOS
//------------------------------------

// ✅ AJAX - Para cargar select de concesionarios (necesario para el formulario de vehículos)
router.get('/lista_concesionarios', (req, res) => {
    const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
    pool.query(query, (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al obtener concesionarios' });
        res.json(results);
    });
});

// ✅ SIN AJAX - Crear concesionario
router.post('/concesionarios/crear', (req, res) => {
    const usuario = req.session.usuario;
    const { nombre, ciudad, correo, telefono } = req.body;

    if (!nombre || !ciudad || !correo) {
        const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
        pool.query(query, (error, concesionarios) => {
            return res.render('VistaAdmin', {
                usuario,
                concesionarios: concesionarios || [],
                mensaje: {
                    tipo: 'danger',
                    texto: 'Faltan datos obligatorios (nombre, ciudad, correo)'
                }
            });
        });
        return;
    }
    
    const queryInsert = `
        INSERT INTO concesionarios (nombre, ciudad, correo, telefono)
        VALUES (?, ?, ?, ?)
    `;

    pool.query(queryInsert, [nombre, ciudad, correo, telefono || null], (error, results) => {
        const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
        
        pool.query(query, (error2, concesionarios) => {
            if (error) {
                console.error('Error al crear concesionario:', error);
                return res.render('VistaAdmin', {
                    usuario,
                    concesionarios: concesionarios || [],
                    mensaje: {
                        tipo: 'danger',
                        texto: 'Error al agregar concesionario'
                    }
                });
            }
            
            res.render('VistaAdmin', {
                usuario,
                concesionarios,
                mensaje: {
                    tipo: 'success',
                    texto: 'Concesionario agregado correctamente'
                }
            });
        });
    });
});

// ✅ SIN AJAX - Actualizar concesionario
router.post('/concesionarios/actualizar/:id', (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;
    const { nombre, ciudad, correo, telefono } = req.body; 

    if (!nombre || !ciudad || !correo) {
        const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
        pool.query(query, (error, concesionarios) => {
            return res.render('VistaAdmin', {
                usuario,
                concesionarios: concesionarios || [],
                mensaje: {
                    tipo: 'danger',
                    texto: 'Faltan datos obligatorios'
                }
            });
        });
        return;
    }

    const queryUpdate = `
        UPDATE concesionarios 
        SET nombre = ?, ciudad = ?, correo = ?, telefono = ? 
        WHERE id_concesionario = ?
    `;
    
    pool.query(queryUpdate, [nombre, ciudad, correo, telefono || null, id], (error, results) => {
        const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
        
        pool.query(query, (error2, concesionarios) => {
            if (error) {
                console.error('Error al actualizar concesionario:', error);
                return res.render('VistaAdmin', {
                    usuario,
                    concesionarios: concesionarios || [],
                    mensaje: {
                        tipo: 'danger',
                        texto: 'Error al actualizar concesionario'
                    }
                });
            }
            
            res.render('VistaAdmin', {
                usuario,
                concesionarios,
                mensaje: {
                    tipo: 'success',
                    texto: 'Concesionario actualizado correctamente'
                }
            });
        });
    });
});

// ✅ SIN AJAX - Eliminar concesionario
router.post('/concesionarios/eliminar/:id', (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;

    const checkVehiculos = `SELECT COUNT(*) as total FROM vehiculos WHERE id_concesionario = ?`;
    
    pool.query(checkVehiculos, [id], (error, results) => {
        if (error) {
            console.error('Error verificando vehículos:', error);
            const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
            pool.query(query, (error2, concesionarios) => {
                return res.render('VistaAdmin', {
                    usuario,
                    concesionarios: concesionarios || [],
                    mensaje: {
                        tipo: 'danger',
                        texto: 'Error al verificar vehículos asociados'
                    }
                });
            });
            return;
        }
        
        const totalVehiculos = results[0].total;
        
        if (totalVehiculos > 0) {
            const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
            pool.query(query, (error, concesionarios) => {
                return res.render('VistaAdmin', {
                    usuario,
                    concesionarios: concesionarios || [],
                    mensaje: {
                        tipo: 'warning',
                        texto: `Este concesionario tiene ${totalVehiculos} vehículo(s) asociado(s). Debes redirigir los vehículos a otros concesionarios antes de eliminarlo.`
                    }
                });
            });
            return;
        }
        
        const queryDelete = `DELETE FROM concesionarios WHERE id_concesionario = ?`;
        
        pool.query(queryDelete, [id], (error, results) => {
            const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
            
            pool.query(query, (error2, concesionarios) => {
                if (error) {
                    console.error('Error eliminando concesionario:', error);
                    return res.render('VistaAdmin', {
                        usuario,
                        concesionarios: concesionarios || [],
                        mensaje: {
                            tipo: 'danger',
                            texto: 'Error al eliminar concesionario'
                        }
                    });
                }
                
                if (results.affectedRows === 0) {
                    return res.render('VistaAdmin', {
                        usuario,
                        concesionarios: concesionarios || [],
                        mensaje: {
                            tipo: 'warning',
                            texto: 'Concesionario no encontrado'
                        }
                    });
                }
                
                res.render('VistaAdmin', {
                    usuario,
                    concesionarios,
                    mensaje: {
                        tipo: 'success',
                        texto: 'Concesionario eliminado correctamente'
                    }
                });
            });
        });
    });
});

// Listar los vehiculos por concesionario CHECK.
router.get('/lista_vehiculos/:id', (req, res) => {
  const id = req.params.id;

  pool.query(`SELECT * FROM vehiculos WHERE id_concesionario = ?`, [id], (err, results) => {
    if (err) return res.status(500).send('Error al obtener vehículos');

    // Renderizar a vehiculos_concesionario EJS y lo envia como HTML
    res.render('vehiculos_concesionario', { vehiculos: results }, (err, html) => {
      if (err) return res.status(500).send('Error al renderizar vehículos');
      res.send(html);
    });
  });
});

//----------------------------
// RUTAS DE VEHÍCULOS
//----------------------------

// ✅ MANTENER - Vista principal de vehículos
router.get('/VistaVehiculos', (req, res) => {
    const usuario = req.session.usuario;
    const mensaje = req.session.mensaje;
    delete req.session.mensaje;
    
    const query = `
        SELECT 
            v.id_vehiculo AS id,
            v.matricula,
            v.marca,
            v.modelo,
            v.anio_matriculacion,
            v.numero_plazas,
            v.autonomia_km,
            v.color,
            v.imagen,
            v.estado,
            c.nombre AS concesionario
        FROM vehiculos v
        JOIN concesionarios c ON v.id_concesionario = c.id_concesionario
    `;
    
    pool.query(query, (error, vehiculos) => {
        if (error) {
            console.error('Error al obtener vehículos:', error);
            return res.render('vista_vehiculos_admin', { usuario, vehiculos: [], mensaje });
        }
        
        res.render('vista_vehiculos_admin', { usuario, vehiculos, mensaje });
    });
});

// ✅ CREAR vehículo (POST tradicional con multer)
router.post('/vehiculos/crear', upload.single('imagen'), (req, res) => {
    const usuario = req.session.usuario;
    
    const { 
        matricula, 
        marca, 
        modelo, 
        anio, 
        plazas, 
        autonomia, 
        color, 
        estado,
        id_concesionario 
    } = req.body;

    // Función helper para recargar vehículos y renderizar
    const renderConMensaje = (tipo, texto) => {
        const query = `
            SELECT 
                v.id_vehiculo AS id,
                v.matricula,
                v.marca,
                v.modelo,
                v.anio_matriculacion,
                v.numero_plazas,
                v.autonomia_km,
                v.color,
                v.imagen,
                v.estado,
                c.nombre AS concesionario
            FROM vehiculos v
            JOIN concesionarios c ON v.id_concesionario = c.id_concesionario
        `;
        
        pool.query(query, (error, vehiculos) => {
            res.render('vista_vehiculos_admin', {
                usuario,
                vehiculos: vehiculos || [],
                mensaje: { tipo, texto }
            });
        });
    };

    // Validaciones
    if (!matricula || !marca || !modelo || !anio || !plazas || !autonomia || !color || !estado || !id_concesionario) {
        return renderConMensaje('danger', 'Todos los campos son obligatorios');
    }

    if (!req.file) {
        return renderConMensaje('danger', 'La imagen del vehículo es obligatoria');
    }

    const anioNum = parseInt(anio);
    const plazasNum = parseInt(plazas);
    const autonomiaNum = parseInt(autonomia);

    if (anioNum < 1900 || anioNum > 2025) {
        return renderConMensaje('danger', 'El año debe estar entre 1900 y 2025');
    }

    if (plazasNum < 1 || plazasNum > 50) {
        return renderConMensaje('danger', 'Las plazas deben estar entre 1 y 50');
    }

    if (autonomiaNum < 0) {
        return renderConMensaje('danger', 'La autonomía no puede ser negativa');
    }

    const imagenUrl = `/img/vehiculos/${req.file.filename}`;

    const query = `
        INSERT INTO vehiculos 
        (matricula, marca, modelo, anio_matriculacion, numero_plazas, autonomia_km, color, estado, imagen, id_concesionario) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    pool.query(query, [
        matricula.toUpperCase(),
        marca,
        modelo,
        anioNum,
        plazasNum,
        autonomiaNum,
        color,
        estado,
        imagenUrl,
        id_concesionario
    ], (error, results) => {
        if (error) {
            console.error('Error al crear vehículo:', error);
            return renderConMensaje('danger', 'Error al agregar el vehículo');
        }
        
        renderConMensaje('success', 'Vehículo agregado correctamente');
    });
});

// ACTUALIZAR vehículo (POST tradicional con multer)
router.post('/vehiculos/actualizar/:id', upload.single('imagen'), (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;
    
    const {
        marca,
        modelo,
        anio_matriculacion,
        numero_plazas,
        autonomia_km,
        color,
        estado
    } = req.body;

    // Función helper para recargar vehículos y renderizar
    const renderConMensaje = (tipo, texto) => {
        const query = `
            SELECT 
                v.id_vehiculo AS id,
                v.matricula,
                v.marca,
                v.modelo,
                v.anio_matriculacion,
                v.numero_plazas,
                v.autonomia_km,
                v.color,
                v.imagen,
                v.estado,
                c.nombre AS concesionario
            FROM vehiculos v
            JOIN concesionarios c ON v.id_concesionario = c.id_concesionario
        `;
        
        pool.query(query, (error, vehiculos) => {
            res.render('vista_vehiculos_admin', {
                usuario,
                vehiculos: vehiculos || [],
                mensaje: { tipo, texto }
            });
        });
    };

    // Validaciones
    if (!marca || !modelo || !anio_matriculacion || !numero_plazas || !autonomia_km) {
        return renderConMensaje('danger', 'Por favor, completa todos los campos obligatorios');
    }

    // Si se subió una imagen nueva, obtenemos su ruta
    const imagen = req.file ? `/img/vehiculos/${req.file.filename}` : null;

    let query;
    let params;

    if (imagen) {
        query = `
            UPDATE vehiculos
            SET marca = ?, modelo = ?, anio_matriculacion = ?, numero_plazas = ?, 
                autonomia_km = ?, color = ?, estado = ?, imagen = ?
            WHERE id_vehiculo = ?
        `;
        params = [marca, modelo, anio_matriculacion, numero_plazas, autonomia_km, color, estado, imagen, id];
    } else {
        query = `
            UPDATE vehiculos
            SET marca = ?, modelo = ?, anio_matriculacion = ?, numero_plazas = ?, 
                autonomia_km = ?, color = ?, estado = ?
            WHERE id_vehiculo = ?
        `;
        params = [marca, modelo, anio_matriculacion, numero_plazas, autonomia_km, color, estado, id];
    }

    pool.query(query, params, (error, results) => {
        if (error) {
            console.error('Error al actualizar vehículo:', error);
            return renderConMensaje('danger', 'Error al actualizar vehículo');
        }
        
        renderConMensaje('success', 'Vehículo actualizado correctamente');
    });
});

// ELIMINAR vehículo (POST tradicional)
router.post('/vehiculos/eliminar/:id', (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;

    // Función helper para recargar vehículos y renderizar
    const renderConMensaje = (tipo, texto) => {
        const query = `
            SELECT 
                v.id_vehiculo AS id,
                v.matricula,
                v.marca,
                v.modelo,
                v.anio_matriculacion,
                v.numero_plazas,
                v.autonomia_km,
                v.color,
                v.imagen,
                v.estado,
                c.nombre AS concesionario
            FROM vehiculos v
            JOIN concesionarios c ON v.id_concesionario = c.id_concesionario
        `;
        
        pool.query(query, (error, vehiculos) => {
            res.render('vista_vehiculos_admin', {
                usuario,
                vehiculos: vehiculos || [],
                mensaje: { tipo, texto }
            });
        });
    };

    const query = `DELETE FROM vehiculos WHERE id_vehiculo = ?`;
    
    pool.query(query, [id], (error, results) => {
        if (error) {
            console.error('Error al eliminar vehículo:', error);
            return renderConMensaje('danger', 'Error al eliminar vehículo');
        }
        
        if (results.affectedRows === 0) {
            return renderConMensaje('warning', 'Vehículo no encontrado');
        }
        
        renderConMensaje('success', 'Vehículo eliminado correctamente');
    });
});

//----------------------------
// RUTAS DE ESTADÍSTICAS
//----------------------------

// Obtener vehículos más usados por concesionario
router.get('/estadisticas/vehiculo-mas-usado', (req, res) => {
    const query = `
        SELECT 
            c.nombre as concesionario,
            v.marca,
            v.modelo,
            v.imagen,
            COUNT(r.id_reserva) as total_reservas
        FROM concesionarios c
        INNER JOIN vehiculos v ON v.id_concesionario = c.id_concesionario
        INNER JOIN reservas r ON r.id_vehiculo = v.id_vehiculo
        GROUP BY c.id_concesionario, v.id_vehiculo, c.nombre, v.marca, v.modelo, v.imagen
        HAVING COUNT(r.id_reserva) > 0
        ORDER BY c.id_concesionario, total_reservas DESC
    `;

    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener vehículos más usados:', err);
            return res.status(500).send('<p class="text-danger text-center">Error al cargar los vehículos.</p>');
        }

        // Filtrar el más usado por concesionario
        const vehiculosPorConcesionario = {};
        results.forEach(v => {
            if (!vehiculosPorConcesionario[v.concesionario] || 
                v.total_reservas > vehiculosPorConcesionario[v.concesionario].total_reservas) {
                vehiculosPorConcesionario[v.concesionario] = v;
            }
        });

        const vehiculosMasUsados = Object.values(vehiculosPorConcesionario);

        // Renderizamos el partial directamente
        res.render('vehiculo_mas_usado', { vehiculos: vehiculosMasUsados });
    });
});

// Obtener estado de la flota
router.get('/estado_flota', function(req, res) {
    // Total de vehículos
    pool.query('SELECT COUNT(*) as total FROM vehiculos', function(err, totalVehiculos) {
        if (err) {
            console.error('Error al obtener total de vehículos:', err);
            return res.status(500).json({ error: 'Error al obtener estado de la flota' });
        }
        
        // Vehículos en uso (con reservas activas)
        pool.query(`
            SELECT COUNT(DISTINCT id_vehiculo) as en_uso 
            FROM reservas 
            WHERE estado = 'activa'
        `, function(err, vehiculosEnUso) {
            if (err) {
                console.error('Error al obtener vehículos en uso:', err);
                return res.status(500).json({ error: 'Error al obtener estado de la flota' });
            }
            
            const total = totalVehiculos[0].total;
            const enUso = vehiculosEnUso[0].en_uso || 0;
            const disponibles = total - enUso;
            
            res.json({
                disponibles: disponibles,
                en_uso: enUso,
                total: total
            });
        });
    });
});


module.exports = router;
