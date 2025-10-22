// routes/admin.js
const express = require('express');
const path = require('path');
const router = express.Router();
const pool = require('../dataBase/conexion_db');
const multer = require('multer');

// Configuración de multer para guardar imágenes
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

// Vista de administración
router.get('/vista_admin', (req, res) => {
    const usuario = req.session.usuario;
    res.render('VistaAdmin', { usuario });
});

// Vista de administración
router.get('/vista_ini', (req, res) => {
    const usuario = req.session.usuario;
    res.render('Inicio_app', { usuario });
});

//obtener lista de concesionarios
router.get('/lista_concesionarios', (req, res) => {
    const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
    pool.query(query, (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al obtener concesionarios' });
        res.json(results);
    });
});

//eliminar concesionario CHECK.
router.delete('/api/:id', (req, res) => {
    const id = req.params.id;

    // Primero verificamos si tiene vehículos asociados
    const checkVehiculos = `SELECT COUNT(*) as total FROM vehiculos WHERE id_concesionario = ?`;
    pool.query(checkVehiculos, [id], (error, results) => {
        if (error) {
            console.error('❌ Error verificando vehículos:', error);
            return res.status(500).json({ mensaje: 'Error al verificar vehículos asociados' });
        }
        
        const totalVehiculos = results[0].total;
        
        // Si tiene vehículos, no permitimos eliminar
        if (totalVehiculos > 0) {
            return res.status(400).json({ 
                mensaje: `Este concesionario tiene ${totalVehiculos} vehículo(s) asociado(s). Debes redireccionar los vehículos asociados a este concesionario a otros que estén activos antes de eliminarlo.` 
            });
        }
        
        // Si no tiene vehículos, procedemos a eliminar
        const query = `DELETE FROM concesionarios WHERE id_concesionario = ?`;
        pool.query(query, [id], (error, results) => {
            if (error) {
                console.error('❌ Error eliminando concesionario:', error);
                return res.status(500).json({ mensaje: 'Error al eliminar concesionario' });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ mensaje: 'Concesionario no encontrado' });
            }
            
            console.log('Concesionario eliminado correctamente');
            res.json({ mensaje: 'Concesionario eliminado correctamente' });
        });
    });
});

//actualizar concesionario CHECK.
router.put('/api/:id', (req, res) => {
    const id = req.params.id;
    const { nombre, ciudad, correo, telefono } = req.body; 

    const query = `UPDATE concesionarios SET nombre = ?, ciudad = ? , correo = ?, telefono = ? WHERE id_concesionario = ?`;
    
    pool.query(query, [nombre, ciudad, correo, telefono, id], (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al actualizar concesionario' });
        res.json({ mensaje: 'Concesionario actualizado correctamente' });
    });
});

// Crear nuevo concesionario CHECK.
router.post('/api', (req, res) => {
    const { nombre, ciudad, correo, telefono } = req.body;

    // Validar campos mínimos
    if (!nombre || !ciudad || !correo) {
        return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    }
    
    const query = `
        INSERT INTO concesionarios (nombre, ciudad, correo, telefono)
        VALUES (?, ?, ?, ?)
    `;

    pool.query(query, [nombre, ciudad, correo, telefono], (error, results) => {
        if (error) {
            return res.status(500).json({ mensaje: 'Error al agregar concesionario' });
        }
        res.status(201).json({ 
            mensaje: 'Concesionario agregado correctamente',
            id: results.insertId 
        });
    });
});

//---------------------------------------------------------------------
// Vista de vehiculos en administración CHECK.
router.get('/VistaVehiculos', (req, res) => {
    const usuario = req.session.usuario;
    res.render('vista_vehiculos_admin', { usuario });
});

// Obtener lista de vehículos CHECK.
router.get('/lista_vehiculos', (req, res) => {
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
    
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error al obtener vehículos:', error);
            return res.status(500).json({ mensaje: 'Error al obtener vehículos' });
        }
        res.json(results);
    });
});

// Eliminar vehículo CHECK.
router.delete('/vehiculos/:id', (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM vehiculos WHERE id_vehiculo = ?`;
    pool.query(query, [id], (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al eliminar vehículo' });
        res.json({ mensaje: 'Vehículo eliminado correctamente' });
    });
});

// Actualizar vehículo con imagen subida CHECK.
router.put('/vehiculos/:id', upload.single('imagen'), (req, res) => {
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

    // Si se subió una imagen, obtenemos su ruta
    const imagen = req.file ? `/img/vehiculos/${req.file.filename}` : null;

    const query = `
        UPDATE vehiculos
        SET marca = ?, modelo = ?, anio_matriculacion = ?, 
            numero_plazas = ?, autonomia_km = ?, color = ?, 
            estado = ?, ${imagen ? 'imagen = ?,' : ''} 
            id_vehiculo = id_vehiculo
        WHERE id_vehiculo = ?;
    `;

    const params = imagen
        ? [marca, modelo, anio_matriculacion, numero_plazas, autonomia_km, color, estado, imagen, id]
        : [marca, modelo, anio_matriculacion, numero_plazas, autonomia_km, color, estado, id];

    pool.query(query, params, (error, results) => {
        if (error) {
            console.error('Error al actualizar vehículo:', error);
            return res.status(500).json({ mensaje: 'Error al actualizar vehículo' });
        }
        res.json({ mensaje: 'Vehículo actualizado correctamente' });
    });
});

//Crear un vehiculo CHECK.
router.post('/vehiculos', upload.single('imagen'), (req, res) => {

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

    // Debug: Ver qué está llegando
    console.log('Datos recibidos:', req.body);
    console.log('Archivo recibido:', req.file);

    // Validar que todos los campos estén presentes Y no estén vacíos
    if (!matricula || matricula.trim() === '' || 
        !marca || marca.trim() === '' || 
        !modelo || modelo.trim() === '' || 
        !anio || anio.trim() === '' || 
        !plazas || plazas.trim() === '' || 
        !autonomia || autonomia.trim() === '' || 
        !color || color.trim() === '' || 
        !estado || estado.trim() === '' || 
        !id_concesionario || id_concesionario.trim() === '') {
        
        return res.status(400).json({ 
            mensaje: 'Todos los campos son obligatorios',
            datosRecibidos: req.body // Para debug
        });
    }

    if (!req.file) {
        return res.status(400).json({ 
            mensaje: 'La imagen del vehículo es obligatoria' 
        });
    }

    const anioNum = parseInt(anio);
    const plazasNum = parseInt(plazas);
    const autonomiaNum = parseInt(autonomia);

    if (anioNum < 1900 || anioNum > 2025) {
        return res.status(400).json({ 
            mensaje: 'El año debe estar entre 1900 y 2025' 
        });
    }

    if (plazasNum < 1 || plazasNum > 50) {
        return res.status(400).json({ 
            mensaje: 'Las plazas deben estar entre 1 y 50' 
        });
    }

    if (autonomiaNum < 0) {
        return res.status(400).json({ 
            mensaje: 'La autonomía no puede ser negativa' 
        });
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
            
            return res.status(500).json({ 
                mensaje: 'Error al agregar el vehículo',
                codigo: error.code
            });
        }
        
        res.status(201).json({
            mensaje: 'Vehículo agregado correctamente',
            id: results.insertId,
        });
    });
});

// Listar los vehiculos por concesionario CHECK.
router.get('/lista_vehiculos/:id', (req, res) => {
  const id = req.params.id;
  console.log('ID del concesionario clicado:', id);

  pool.query(`SELECT * FROM vehiculos WHERE id_concesionario = ?`, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al obtener vehículos' });
    }
    res.json(results);
  });
});

// Obtener datos para gráfica de kilómetros por mes
router.get('/estadisticas/km-tiempo', (req, res) => {
    const { periodo = '6' } = req.query; // Por defecto últimos 6 meses

    const query = `
        SELECT 
            DATE_FORMAT(r.fecha_fin, '%Y-%m') as mes,
            DATE_FORMAT(r.fecha_fin, '%M %Y') as mes_nombre,
            SUM(r.km_recorridos) as km_mes,
            COUNT(r.id_reserva) as reservas_mes,
            GROUP_CONCAT(DISTINCT CONCAT(v.marca, ' ', v.modelo) SEPARATOR ', ') as vehiculos
        FROM reservas r
        INNER JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo
        WHERE r.estado = 'finalizada' 
            AND r.km_recorridos > 0
            AND r.fecha_fin >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        GROUP BY DATE_FORMAT(r.fecha_fin, '%Y-%m')
        ORDER BY mes ASC
    `;

    pool.query(query, [periodo], (err, results) => {
        if (err) {
            console.error('Error al obtener datos de kilómetros:', err);
            return res.status(500).json({ mensaje: 'Error al obtener estadísticas' });
        }

        res.json(results);
    });
});

module.exports = router;
