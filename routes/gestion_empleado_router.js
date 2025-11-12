const express = require('express');
const router = express.Router();
const pool = require('../dataBase/conexion_db'); 

// CHECK
function extraerConcesionarios(callback) { 
    pool.query(`SELECT id_concesionario AS id, nombre FROM concesionarios`, (err, result) => {
        if (err) {
            console.error('Error al obtener los concesionarios:', err);
            return callback(err, null); 
        }
        callback(null, result);
    });
}

//vista principal  CHECK
router.get('/vista_empleado', (req, res) => {
    extraerConcesionarios((err, concesionarios) => {
        if (err) {
            return res.status(500).send('Error al cargar la página.');
        }
        res.render('VistaEmpleado', { concesionarios, error: null, success: null });
    });
});

// NUEVO: Middleware para finalizar reservas vencidas automáticamente
function finalizarReservasVencidasAuto(callback) {
  const query = `
    UPDATE reservas 
    SET estado = 'finalizada'
    WHERE estado = 'activa' AND fecha_fin < NOW()
  `;

  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error al finalizar reservas vencidas:', err);
      return callback(err, null);
    }
    
    if (result.affectedRows > 0) {
      console.log(`✅ ${result.affectedRows} reservas finalizadas automáticamente`);
    }
    
    callback(null, result.affectedRows);
  });
}

// Obtener vehículos DISPONIBLES del concesionario del empleado - MEJORADO
router.get('/vehiculos_disponibles', (req, res) => {
  // Validar sesión
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({ 
      error: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  const idUsuario = req.session.userId;
  
  // Primero finalizar reservas vencidas
  finalizarReservasVencidasAuto((err) => {
    if (err) {
      console.error('Error al actualizar reservas:', err);
    }
    
    // Luego obtener vehículos disponibles (sin reservas activas)
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
      INNER JOIN usuarios u ON v.id_concesionario = u.id_concesionario
      LEFT JOIN reservas r ON v.id_vehiculo = r.id_vehiculo AND r.estado = 'activa'
      WHERE u.id_usuario = ? AND u.rol = 'empleado' AND r.id_vehiculo IS NULL
      ORDER BY v.marca, v.modelo
    `;
    
    pool.query(query, [idUsuario], (error, resultados) => {
      if (error) {
        console.error('Error al obtener vehículos disponibles:', error);
        return res.status(500).json({ 
          error: 'Error al obtener los vehículos disponibles'
        });
      }
      
      console.log(`Vehículos disponibles encontrados para usuario ${idUsuario}: ${resultados.length}`);
      res.json({ vehiculos: resultados });
    });
  });
});

// Crear nueva reserva CHECK
router.post('/crear_reserva', (req, res) => {

  // Validar sesión
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    console.log('Error: Sesión no válida');
    return res.status(401).json({ 
      mensaje: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  const { vehiculo_id, fecha_inicio, fecha_fin } = req.body;
  const id_usuario = req.session.userId;

  // Validar datos requeridos
  if (!vehiculo_id || !fecha_inicio || !fecha_fin) {
    console.log('Error: Datos incompletos');
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  // Convertir fechas
  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin);
  const ahora = new Date();

  // Validaciones de fechas
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    console.log('Error: Fechas inválidas');
    return res.status(400).json({ mensaje: 'Fechas inválidas' });
  }

  if (inicio < ahora) {
    console.log('Error: Fecha de inicio en el pasado');
    return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser en el pasado' });
  }

  if (fin <= inicio) {
    console.log('Error: Fecha fin no es mayor a fecha inicio');
    return res.status(400).json({ mensaje: 'La fecha fin debe ser mayor a la fecha inicio' });
  }

  // Validar que el vehículo pertenece al mismo concesionario del empleado
  const validarVehiculo = `
    SELECT v.id_vehiculo, v.marca, v.modelo, v.matricula
    FROM vehiculos v
    INNER JOIN usuarios u ON v.id_concesionario = u.id_concesionario
    WHERE v.id_vehiculo = ? AND u.id_usuario = ? AND u.rol = 'empleado'
  `;

  pool.query(validarVehiculo, [vehiculo_id, id_usuario], (errVeh, veh) => {
    if (errVeh) {
      console.error('Error al validar vehículo:', errVeh);
      return res.status(500).json({ mensaje: 'Error interno al validar vehículo' });
    }
    
    if (veh.length === 0) {
      console.log('Error: Vehículo no autorizado');
      return res.status(403).json({ mensaje: 'Vehículo no autorizado o no existe' });
    }

    // Validar solapamiento con reservas activas
    const queryConflicto = `
      SELECT id_reserva, fecha_inicio, fecha_fin 
      FROM reservas
      WHERE id_vehiculo = ? AND estado = 'activa'
      AND (
        (fecha_inicio BETWEEN ? AND ?) OR
        (fecha_fin BETWEEN ? AND ?) OR
        (fecha_inicio <= ? AND fecha_fin >= ?)
      )
    `;

    pool.query(queryConflicto, [vehiculo_id, inicio, fin, inicio, fin, inicio, fin], (errConf, reservas) => {
      if (errConf) {
        console.error('Error al validar conflictos:', errConf);
        return res.status(500).json({ mensaje: 'Error al validar disponibilidad' });
      }

      if (reservas.length > 0) {
        console.log('Conflicto encontrado:', reservas);
        return res.status(409).json({ 
          mensaje: 'El vehículo ya está reservado en ese periodo',
          reservas_conflictivas: reservas
        });
      }

      // Insertar reserva
      const insertReserva = `
        INSERT INTO reservas (id_usuario, id_vehiculo, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, ?, ?, 'activa')
      `;

      pool.query(insertReserva, [id_usuario, vehiculo_id, inicio, fin], (errSave, result) => {
        if (errSave) {
          console.error('Error al guardar reserva:', errSave);
          return res.status(500).json({ mensaje: 'Error al guardar la reserva' });
        }

        res.json({
          mensaje: 'Reserva creada correctamente',
          id_reserva: result.insertId,
          vehiculo: veh[0]
        });
      });
    });
  });
});

// Vista de administración CHECK.
router.get('/vistaReservas', (req, res) => {
    const usuario = req.session.usuario;
    res.render('Reservas', { usuario });
});

// Finalizar reservas vencidas automáticamente - MEJORADO
router.post('/finalizar_reservas_vencidas', (req, res) => {
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({ 
      mensaje: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  finalizarReservasVencidasAuto((err, affectedRows) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al actualizar reservas' });
    }

    res.json({ 
      mensaje: 'Reservas actualizadas',
      reservas_finalizadas: affectedRows 
    });
  });
});

// Obtener reservas del empleado (activas y finalizadas) - MEJORADO
router.get('/mis_reservas', (req, res) => {
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({
      error: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  const id_usuario = req.session.userId;

  // Primero finalizar reservas vencidas
  finalizarReservasVencidasAuto((err) => {
    if (err) {
      console.error('Error al actualizar reservas:', err);
    }

    // Luego obtener todas las reservas
    const query = `
      SELECT 
        r.id_reserva AS id,
        r.fecha_inicio,
        r.fecha_fin,
        r.estado,
        v.marca AS vehiculo_marca,
        v.modelo AS vehiculo_modelo,
        v.matricula AS vehiculo_matricula
      FROM reservas r
      INNER JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo
      WHERE r.id_usuario = ? AND r.estado IN ('activa', 'finalizada')
      ORDER BY 
        CASE WHEN r.estado = 'activa' THEN 1 ELSE 2 END,
        r.fecha_inicio DESC
    `;

    pool.query(query, [id_usuario], (err, results) => {
      if (err) {
        console.error("Error al obtener reservas:", err);
        return res.status(500).json({ mensaje: "Error al obtener reservas" });
      }

      res.json({ reservas: results });
    });
  });
});

// Cancelar una reserva del empleado CHECK
router.delete('/cancelar_reserva/:idReserva', (req, res) => {
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({ 
      mensaje: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  const id_usuario = req.session.userId;
  const idReserva = req.params.idReserva;

  // Validar que la reserva pertenece al usuario y está activa
  const validarReserva = `
    SELECT * FROM reservas 
    WHERE id_reserva = ? AND id_usuario = ? AND estado = 'activa'
  `;

  pool.query(validarReserva, [idReserva, id_usuario], (errCheck, result) => {
    if (errCheck) {
      console.error('Error al verificar reserva:', errCheck);
      return res.status(500).json({ mensaje: 'Error interno' });
    }

    if (result.length === 0) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada o ya cancelada' });
    }

    // Marcar como cancelada
    const cancelarQuery = `
      UPDATE reservas 
      SET estado = 'cancelada'
      WHERE id_reserva = ?
    `;

    pool.query(cancelarQuery, [idReserva], (errCancel) => {
      if (errCancel) {
        console.error('Error al cancelar reserva:', errCancel);
        return res.status(500).json({ mensaje: 'Error al cancelar la reserva' });
      }

      res.json({ mensaje: 'Reserva cancelada exitosamente' });
    });
  });
});


module.exports = router;