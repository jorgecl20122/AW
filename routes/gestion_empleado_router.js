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



router.get('/lista_reservas', (req, res) => {
    const query = `
        SELECT 
            r.id_reserva,
            r.fecha_inicio,
            r.fecha_fin,
            r.estado,
            c.nombre AS coche_nombre,
            c.matricula AS coche_matricula,
            u.nombre_completo AS usuario_nombre
        FROM reservas r
        LEFT JOIN coches c ON r.id_coche = c.id_coche
        LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
        ORDER BY r.fecha_inicio DESC;
    `;

    pool.query(query, (err, result) => {
        if (err) {
            console.error('❌ Error al obtener las reservas:', err);
            return res.status(500).json({ mensaje: 'Error al obtener las reservas.' });
        }
        res.json(result);
    });
});


router.post('/nueva', (req, res) => {
    const { fecha_inicio, fecha_fin, coche } = req.body;
    const id_usuario = req.session?.usuario?.id_usuario || 1; // ID de sesión (ajusta según tu login)

    if (!fecha_inicio || !fecha_fin || !coche) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    // Buscar ID del coche por nombre o matrícula
    const buscarCoche = `
        SELECT id_coche 
        FROM coches 
        WHERE nombre = ? OR matricula = ? 
        LIMIT 1
    `;
    pool.query(buscarCoche, [coche, coche], (err, result) => {
        if (err) {
            console.error('❌ Error al buscar coche:', err);
            return res.status(500).json({ mensaje: 'Error interno al buscar el coche.' });
        }

        if (result.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontró el coche especificado.' });
        }

        const id_coche = result[0].id_coche;

        const insertReserva = `
            INSERT INTO reservas (fecha_inicio, fecha_fin, estado, id_coche, id_usuario)
            VALUES (?, ?, 'activa', ?, ?)
        `;
        pool.query(insertReserva, [fecha_inicio, fecha_fin, id_coche, id_usuario], (err) => {
            if (err) {
                console.error('❌ Error al crear la reserva:', err);
                return res.status(500).json({ mensaje: 'Error al crear la reserva.' });
            }
            res.json({ mensaje: 'Reserva creada correctamente.' });
        });
    });
});


router.put('/:id/cancelar', (req, res) => {
    const id_reserva = req.params.id;

    const query = `
        UPDATE reservas
        SET estado = 'cancelada'
        WHERE id_reserva = ?
    `;

    pool.query(query, [id_reserva], (err, result) => {
        if (err) {
            console.error('❌ Error al cancelar la reserva:', err);
            return res.status(500).json({ mensaje: 'Error al cancelar la reserva.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Reserva no encontrada.' });
        }

        res.json({ mensaje: 'Reserva cancelada correctamente.' });
    });
});

module.exports = router;
