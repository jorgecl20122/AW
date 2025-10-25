const express = require('express');
const router = express.Router();
const pool = require('../dataBase/conexion_db'); 

function extraerConcesionarios(callback) {
    pool.query(`SELECT id_concesionario AS id, nombre FROM concesionarios`, (err, result) => {
        if (err) {
            console.error('Error al obtener los concesionarios:', err);
            return callback(err, null); 
        }
        callback(null, result);
    });
}

//vista principal 
router.get('/vista_empleado', (req, res) => {
    extraerConcesionarios((err, concesionarios) => {
        if (err) {
            return res.status(500).send('Error al cargar la página.');
        }
        res.render('VistaEmpleado', { concesionarios, error: null, success: null });
    });
});

// Obtener vehículos DISPONIBLES del concesionario del empleado (sin reserva activa)
router.get('/vehiculos_disponibles', (req, res) => {
  const idEmpleado = req.session.empleado.id_empleado;
  
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
      v.imagen
    FROM vehiculos v
    INNER JOIN empleados e ON v.id_concesionario = e.id_concesionario
    LEFT JOIN reservas r ON v.id_vehiculo = r.id_vehiculo AND r.estado = 'activa'
    WHERE e.id = ? AND r.id_reserva IS NULL
    ORDER BY v.marca, v.modelo
  `;
  
  pool.query(query, [idEmpleado], (error, resultados) => {
    if (error) {
      console.error('Error al obtener vehículos disponibles:', error);
      return res.status(500).json({ error: 'Error al obtener los vehículos disponibles' });
    }
    
    res.json({ vehiculos: resultados });
  });
});


module.exports = router;