const express = require('express');
const router = express.Router();
const pool = require('../dataBase/conexion_db'); 

//vista principal 
router.get('/vista_empleado', (req, res) => {
    extraerConcesionarios((err, concesionarios) => {
        if (err) {
            return res.status(500).send('Error al cargar la página.');
        }
        res.render('VistaEmpleado', { concesionarios, error: null, success: null });
    });
});
    

module.exports = router;
