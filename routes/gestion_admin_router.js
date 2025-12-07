// routes/admin.js
const express = require('express');
const path = require('path');
const router = express.Router();
const pool = require('../dataBase/conexion_db');

// Configuración de Multer para subida de fotos
const multer = require('multer');
const fs = require('fs');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/img/vehiculos');
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueName = `user_${req.session.userId}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Validar tipos de archivo permitidos
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

// Funciones auxiliares
function obtenerEstadoFlota(callback) {
    // Query que cuenta vehículos basándose en reservas activas
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

// Helper para renderizar vista de vehículos con mensaje
function renderVistaVehiculos(res, usuario, tipo, texto) {
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
        obtenerEstadoFlota((estadoFlota) => {
            res.render('vista_vehiculos_admin', {
                usuario,
                vehiculos: vehiculos || [],
                mensaje: { tipo, texto },
                estadoFlota: estadoFlota
            });
        });
    });
}

// Helper para renderizar vista admin con mensaje
function renderVistaAdmin(res, usuario, tipo, texto) {
    const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
    
    pool.query(query, (error, concesionarios) => {
        obtenerEstadoFlota((estadoFlota) => {
            res.render('VistaAdmin', {
                usuario,
                concesionarios: concesionarios || [],
                estadoFlota: estadoFlota,
                mensaje: { tipo, texto }
            });
        });
    });
}

// Vista principal administrador
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
        
        obtenerEstadoFlota((estadoFlota) => {
            res.render('VistaAdmin', { 
                usuario, 
                concesionarios,
                estadoFlota: estadoFlota
            });
        });
    });
});

// Vista inicio
router.get('/vista_ini', (req, res) => {
    const usuario = req.session.usuario;
    obtenerEstadoFlota((estadoFlota) => {
        res.render('Inicio_app_admin', { 
            usuario,
            estadoFlota: estadoFlota
        });
    });
});

// Vista vehículos
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

// --- Rutas de Concesionarios ---

// Cargar select de concesionarios
router.get('/lista_concesionarios', (req, res) => {
    const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
    pool.query(query, (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al obtener concesionarios' });
        res.json(results);
    });
});

// Crear concesionario
router.post('/concesionarios/crear', (req, res) => {
    const usuario = req.session.usuario;
    const { nombre, ciudad, correo, telefono } = req.body;

    if (!nombre || !ciudad || !correo) {
        return renderVistaAdmin(res, usuario, 'danger', 'Faltan datos obligatorios (nombre, ciudad, correo)');
    }

    const queryInsert = `
        INSERT INTO concesionarios (nombre, ciudad, correo, telefono)
        VALUES (?, ?, ?, ?)
    `;

    pool.query(queryInsert, [nombre, ciudad, correo, telefono || null], (error, results) => {
        if (error) {
            console.error('Error al crear concesionario:', error);
            return renderVistaAdmin(res, usuario, 'danger', 'Error al agregar concesionario');
        }
        
        renderVistaAdmin(res, usuario, 'success', 'Concesionario agregado correctamente');
    });
});

// Actualizar concesionario
router.post('/concesionarios/actualizar/:id', (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;
    const { nombre, ciudad, correo, telefono } = req.body; 

    if (!nombre || !ciudad || !correo) {
        return renderVistaAdmin(res, usuario, 'danger', 'Faltan datos obligatorios');
    }

    const queryUpdate = `
        UPDATE concesionarios 
        SET nombre = ?, ciudad = ?, correo = ?, telefono = ? 
        WHERE id_concesionario = ?
    `;
    
    pool.query(queryUpdate, [nombre, ciudad, correo, telefono || null, id], (error, results) => {
        if (error) {
            console.error('Error al actualizar concesionario:', error);
            return renderVistaAdmin(res, usuario, 'danger', 'Error al actualizar concesionario');
        }
        
        renderVistaAdmin(res, usuario, 'success', 'Concesionario actualizado correctamente');
    });
});

// Eliminar concesionario
router.post('/concesionarios/eliminar/:id', (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;

    const checkVehiculos = `SELECT COUNT(*) as total FROM vehiculos WHERE id_concesionario = ?`;
    
    pool.query(checkVehiculos, [id], (error, results) => {
        if (error) {
            console.error('Error verificando vehículos:', error);
            return renderVistaAdmin(res, usuario, 'danger', 'Error al verificar vehículos asociados');
        }
        
        const totalVehiculos = results[0].total;
        
        if (totalVehiculos > 0) {
            return renderVistaAdmin(res, usuario, 'warning', `Este concesionario tiene ${totalVehiculos} vehículo(s) asociado(s). Debes redirigir los vehículos a otros concesionarios antes de eliminarlo.`);
        }
        
        const queryDelete = `DELETE FROM concesionarios WHERE id_concesionario = ?`;
        
        pool.query(queryDelete, [id], (error, results) => {
            if (error) {
                console.error('Error eliminando concesionario:', error);
                return renderVistaAdmin(res, usuario, 'danger', 'Error al eliminar concesionario');
            }
            
            if (results.affectedRows === 0) {
                return renderVistaAdmin(res, usuario, 'warning', 'Concesionario no encontrado');
            }
            
            renderVistaAdmin(res, usuario, 'success', 'Concesionario eliminado correctamente');
        });
    });
});

// Listar vehículos por concesionario
router.get('/lista_vehiculos/:id', (req, res) => {
    const id = req.params.id;

    pool.query(`SELECT * FROM vehiculos WHERE id_concesionario = ?`, [id], (err, results) => {
        if (err) return res.status(500).send('Error al obtener vehículos');

        res.render('vehiculos_concesionario', { vehiculos: results }, (err, html) => {
            if (err) return res.status(500).send('Error al renderizar vehículos');
            res.send(html);
        });
    });
});

// --- Rutas de Vehículos ---

// Crear vehículo
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

    // Validar campos obligatorios
    if (!matricula || !marca || !modelo || !anio || !plazas || !autonomia || !color || !estado || !id_concesionario) {
        return renderVistaVehiculos(res, usuario, 'danger', 'Todos los campos son obligatorios');
    }

    if (!req.file) {
        return renderVistaVehiculos(res, usuario, 'danger', 'La imagen del vehículo es obligatoria');
    }

    const anioNum = parseInt(anio);
    const plazasNum = parseInt(plazas);
    const autonomiaNum = parseInt(autonomia);

    if (anioNum < 1900 || anioNum > 2025) {
        return renderVistaVehiculos(res, usuario, 'danger', 'El año debe estar entre 1900 y 2025');
    }

    if (plazasNum < 1 || plazasNum > 50) {
        return renderVistaVehiculos(res, usuario, 'danger', 'Las plazas deben estar entre 1 y 50');
    }

    if (autonomiaNum < 0) {
        return renderVistaVehiculos(res, usuario, 'danger', 'La autonomía no puede ser negativa');
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
            return renderVistaVehiculos(res, usuario, 'danger', 'Error al agregar el vehículo');
        }
        
        renderVistaVehiculos(res, usuario, 'success', 'Vehículo agregado correctamente');
    });
});

// Actualizar vehículo
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

    // Validar campos obligatorios
    if (!marca || !modelo || !anio_matriculacion || !numero_plazas || !autonomia_km) {
        return renderVistaVehiculos(res, usuario, 'danger', 'Por favor, completa todos los campos obligatorios');
    }

    // Si hay nueva imagen, usamos su ruta
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
            return renderVistaVehiculos(res, usuario, 'danger', 'Error al actualizar vehículo');
        }
        
        renderVistaVehiculos(res, usuario, 'success', 'Vehículo actualizado correctamente');
    });
});

// Eliminar vehículo
router.post('/vehiculos/eliminar/:id', (req, res) => {
    const usuario = req.session.usuario;
    const id = req.params.id;

    const query = `DELETE FROM vehiculos WHERE id_vehiculo = ?`;
    
    pool.query(query, [id], (error, results) => {
        if (error) {
            console.error('Error al eliminar vehículo:', error);
            return renderVistaVehiculos(res, usuario, 'danger', 'Error al eliminar vehículo');
        }
        
        if (results.affectedRows === 0) {
            return renderVistaVehiculos(res, usuario, 'warning', 'Vehículo no encontrado');
        }
        
        renderVistaVehiculos(res, usuario, 'success', 'Vehículo eliminado correctamente');
    });
});

// --- Rutas de Estadísticas ---

// Vehículos más usados por concesionario
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

        // Filtrar el vehículo más usado por cada concesionario
        const vehiculosPorConcesionario = {};
        results.forEach(v => {
            if (!vehiculosPorConcesionario[v.concesionario] || 
                v.total_reservas > vehiculosPorConcesionario[v.concesionario].total_reservas) {
                vehiculosPorConcesionario[v.concesionario] = v;
            }
        });

        const vehiculosMasUsados = Object.values(vehiculosPorConcesionario);

        res.render('vehiculo_mas_usado', { vehiculos: vehiculosMasUsados });
    });
});

// Estado de la flota
router.get('/estado_flota', function(req, res) {
    pool.query('SELECT COUNT(*) as total FROM vehiculos', function(err, totalVehiculos) {
        if (err) {
            console.error('Error al obtener total de vehículos:', err);
            return res.status(500).json({ error: 'Error al obtener estado de la flota' });
        }
        
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

// Reservas por franjas horarias
router.get('/estadisticas/reservas-franjas', (req, res) => {
    const query = `
        SELECT 
            HOUR(fecha_inicio) AS hora,
            COUNT(*) AS total
        FROM reservas
        GROUP BY HOUR(fecha_inicio)
        ORDER BY hora
    `;

    pool.query(query, (err, result) => {
        if (err) {
            console.error('Error al obtener reservas por franjas:', err);
            return res.status(500).json([]);
        }

        // Convertir a formato legible
        const franjas = result.map(r => {
            const start = r.hora.toString().padStart(2, '0') + ':00';
            const end = r.hora.toString().padStart(2, '0') + ':59';
            return { label: `${start}-${end}`, total: r.total };
        });

        res.json(franjas);
    });
});

module.exports = router;