const express = require('express');
const router = express.Router();
const pool = require('../dataBase/conexion_db'); 

// Funciones auxiliares

function finalizarReservasVencidasAuto(callback) {
  const selectQuery = `
    SELECT id_reserva 
    FROM reservas 
    WHERE estado = 'activa' AND fecha_fin <= NOW()
  `;

  pool.query(selectQuery, (errSelect, reservasVencidas) => {
    if (errSelect) {
      console.error('Error al buscar reservas vencidas:', errSelect);
      return callback(errSelect, null);
    }

    if (reservasVencidas.length === 0) {
      return callback(null, { affectedRows: 0, ids: [] });
    }

    const idsFinalizados = reservasVencidas.map(r => r.id_reserva);

    const updateQuery = `
      UPDATE reservas 
      SET estado = 'finalizada'
      WHERE id_reserva IN (${idsFinalizados.join(',')})
    `;

    pool.query(updateQuery, (errUpdate, result) => {
      if (errUpdate) {
        console.error('Error al finalizar reservas vencidas:', errUpdate);
        return callback(errUpdate, null);
      }

      console.log(`${result.affectedRows} reservas finalizadas automáticamente`);

      callback(null, {
        affectedRows: result.affectedRows,
        ids: idsFinalizados
      });
    });
  });
}

// Crear nueva reserva
router.post('/crear_reserva', (req, res) => {

  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    console.log('Error: Sesión no válida');
    return res.status(401).json({ 
      mensaje: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  const { vehiculo_id, fecha_inicio, fecha_fin } = req.body;
  const id_usuario = req.session.userId;

  if (!vehiculo_id || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin);
  const ahora = new Date();

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return res.status(400).json({ mensaje: 'Fechas inválidas' });
  }

  if (inicio < ahora) {
    return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser en el pasado' });
  }

  if (fin <= inicio) {
    return res.status(400).json({ mensaje: 'La fecha fin debe ser mayor a la fecha inicio' });
  }

  // Verificar que el vehículo pertenece al concesionario del empleado
  const validarVehiculo = `
    SELECT v.id_vehiculo, v.marca, v.modelo, v.matricula
    FROM vehiculos v
    INNER JOIN usuarios u ON v.id_concesionario = u.id_concesionario
    WHERE v.id_vehiculo = ? AND u.id_usuario = ? AND u.rol = 'empleado'
  `;

  pool.query(validarVehiculo, [vehiculo_id, id_usuario], (errVeh, veh) => {
    if (errVeh) {
      return res.status(500).json({ mensaje: 'Error interno al validar vehículo' });
    }
    
    if (veh.length === 0) {
      return res.status(403).json({ mensaje: 'Vehículo no autorizado o no existe' });
    }

    // Verificar si hay conflictos con otras reservas
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
        return res.status(500).json({ mensaje: 'Error al validar disponibilidad' });
      }

      if (reservas.length > 0) {
        return res.status(409).json({ 
          mensaje: 'El vehículo ya está reservado en ese periodo',
          reservas_conflictivas: reservas
        });
      }

      const insertReserva = `
        INSERT INTO reservas (id_usuario, id_vehiculo, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, ?, ?, 'activa')
      `;

      pool.query(insertReserva, [id_usuario, vehiculo_id, inicio, fin], (errSave, result) => {
        if (errSave) {
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

// Vista principal del empleado
router.get('/vista_empleado', (req, res) => {

  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.redirect('/login');
  }

  const idUsuario = req.session.userId;
  const usuario = req.session.usuario;

  // Traer solo los vehículos disponibles (sin reservas activas)
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

  pool.query(query, [idUsuario], (error, vehiculos) => {
    if (error) {
      console.error('Error al obtener vehículos disponibles:', error);
      return res.render('VistaEmpleado', { 
        usuario,
        vehiculos: [],
        error: 'Error al cargar los vehículos disponibles'
      });
    }

    res.render('VistaEmpleado', { 
      usuario,
      vehiculos: vehiculos,
      error: null
    });
  });
});

// Ver mis reservas
router.get('/mis_reservas', (req, res) => {

  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.redirect('/login');
  }

  const id_usuario = req.session.userId;
  const usuario = req.session.usuario;

  // Primero actualizar las que ya pasaron
  finalizarReservasVencidasAuto((err) => {
    if (err) {
      console.error("Error al finalizar reservas vencidas:", err);
    }

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
      WHERE r.id_usuario = ? 
        AND r.estado IN ('activa', 'finalizada')
      ORDER BY 
        CASE WHEN r.estado = 'activa' THEN 1 ELSE 2 END,
        r.fecha_inicio DESC
    `;

    pool.query(query, [id_usuario], (err, reservas) => {
      if (err) {
        console.error("Error al obtener reservas:", err);
        return res.render('Reservas', { 
          usuario,
          reservas: [],
          error: 'Error al obtener reservas'
        });
      }

      res.render('Reservas', { 
        usuario,
        reservas: reservas || [],
        error: null
      });
    }); 
  });
});

// Finalizar reservas que ya pasaron de fecha
router.post('/finalizar_reservas_vencidas', (req, res) => {
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({ 
      mensaje: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  finalizarReservasVencidasAuto((err, resultado) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al actualizar reservas' });
    }

    res.json({ 
      mensaje: 'Reservas actualizadas',
      reservas_finalizadas: resultado.affectedRows,
      ids_finalizados: resultado.ids
    });
  });
});

// Cancelar una reserva activa
router.delete('/cancelar_reserva/:idReserva', (req, res) => {

  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({ 
      mensaje: 'Sesión no iniciada',
      redirect: '/login'
    });
  }

  const id_usuario = req.session.userId;
  const idReserva = req.params.idReserva;

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

      res.json({ 
        mensaje: 'Reserva cancelada correctamente',
        id_reserva: idReserva 
      });
    });
  });
});

// Estadísticas - Reservas por concesionario
router.get('/estadisticas/reservas-concesionario', (req, res) => {

  if (!req.session || !req.session.userId || req.session.userRole !== 'administrador') {
    return res.status(401).json({ 
      error: 'Acceso no autorizado',
      redirect: '/login'
    });
  }

  const query = `
    SELECT 
      c.nombre as concesionario,
      c.ciudad,
      COUNT(r.id_reserva) as total_reservas,
      SUM(CASE WHEN r.estado = 'activa' THEN 1 ELSE 0 END) as activas,
      SUM(CASE WHEN r.estado = 'finalizada' THEN 1 ELSE 0 END) as finalizadas,
      SUM(CASE WHEN r.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas
    FROM concesionarios c
    LEFT JOIN vehiculos v ON c.id_concesionario = v.id_concesionario
    LEFT JOIN reservas r ON v.id_vehiculo = r.id_vehiculo
    GROUP BY c.id_concesionario, c.nombre, c.ciudad
    ORDER BY total_reservas DESC
  `;

  pool.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener reservas por concesionario:', err);
      return res.status(500).send('Error al cargar reservas');
    }

    res.render('reservas_concesionario', { concesionarios: result });
  });
});

// Reportar incidencia en una reserva
router.post('/estadisticas/reportar_incidencia/:idReserva', (req, res) => {
  
  if (!req.session || !req.session.userId || req.session.userRole !== 'empleado') {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const idReserva = req.params.idReserva; 
  const id_usuario = req.session.userId;

  const query = `
    UPDATE reservas 
    SET incidencias_reportadas = COALESCE(incidencias_reportadas, 0) + 1 
    WHERE id_reserva = ? 
      AND id_usuario = ? 
      AND estado = 'activa'
  `;

  pool.query(query, [idReserva, id_usuario], (err, result) => {
    if (err) {
      console.error('Error al reportar incidencia:', err);
      return res.status(500).json({ 
        error: 'Error al reportar',
        detalles: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'No tienes una reserva activa con ese ID' 
      });
    }

    console.log('Incidencia reportada correctamente');
    res.json({ 
      success: true, 
      mensaje: 'Incidencia reportada correctamente'
    });
  });
});

module.exports = router;