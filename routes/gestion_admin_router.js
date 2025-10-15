// routes/admin.js
const express = require('express');
const router = express.Router();
const pool = require('../dataBase/conexion_db');
const multer = require('multer');

// Configuración de multer para guardar imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/vehiculos/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Vista de administración
router.get('/vista_admin', (req, res) => {
    const usuario = req.session.usuario;
    res.render('VistaAdmin', { usuario });
});

//obtener lista de concesionarios
router.get('/lista_concesionarios', (req, res) => {
    const query = `SELECT id_concesionario, nombre, ciudad, correo, telefono FROM concesionarios`;
    pool.query(query, (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al obtener concesionarios' });
        res.json(results);
    });
});

//eliminar concesionario
router.delete('/api/:id', (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM concesionarios WHERE id_concesionario = ?`;
    pool.query(query, [id], (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al eliminar concesionario' });
        res.json({ mensaje: 'Concesionario eliminado correctamente' });
    });
});

//actualizar concesionario
router.put('/api/:id', (req, res) => {
    const id = req.params.id;
    const { nombre, ubicacion } = req.body; // "ubicacion" viene del front, equivale a "ciudad"
    const query = `UPDATE concesionarios SET nombre = ?, ciudad = ? WHERE id_concesionario = ?`;
    pool.query(query, [nombre, ubicacion, id], (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al actualizar concesionario' });
        res.json({ mensaje: 'Concesionario actualizado correctamente' });
    });
});

// Crear nuevo concesionario
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
            console.error('Error al insertar concesionario:', error);
            return res.status(500).json({ mensaje: 'Error al agregar concesionario' });
        }
    });
});

//---------------------------------------------------------------------
// Vista de vehiculos en administración
router.get('/VistaVehiculos', (req, res) => {
    const usuario = req.session.usuario;
    res.render('vista_vehiculos_admin', { usuario });
});

// Obtener lista de vehículos
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

// Eliminar vehículo
router.delete('/vehiculos/:id', (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM vehiculos WHERE id_vehiculo = ?`;
    pool.query(query, [id], (error, results) => {
        if (error) return res.status(500).json({ mensaje: 'Error al eliminar vehículo' });
        res.json({ mensaje: 'Vehículo eliminado correctamente' });
    });
});

// Actualizar vehículo con imagen subida
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
    const imagen = req.file ? `/uploads/vehiculos/${req.file.filename}` : null;

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


router.get('/lista_vehiculos/:id', (req, res) => {
  const id = req.params.id_concesionario;
  console.log('ID del concesionario clicado:', id);

  pool.query('SELECT * FROM vehiculos WHERE concesionario_id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al obtener vehículos' });
    }
    res.json(results);
  });
});




module.exports = router;
