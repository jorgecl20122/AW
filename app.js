const express = require("express");
const session = require('express-session');
const path = require("path");
const app = express();

const PORT = 3000;

// Configuración de la sesión (solo una vez)
app.use(session({
    secret: 'clave_secreta_para_sesiones', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hora
        secure: false
    }
}));

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal → siempre InicioSesion
app.get('/', (req, res) => {
    res.render('InicioSesion', { error: null, success: null });
});

// Rutas para los módulos
const gestion_usuario_router = require('./routes/gestion_usuario_router');
app.use('/usuario', gestion_usuario_router); 

const gestion_admin_router = require('./routes/gestion_admin_router');
app.use('/admin', gestion_admin_router); 

const gestion_empleado_router = require('./routes/gestion_empleado_router');
app.use('/empleado', gestion_empleado_router); 


// Inicializar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
