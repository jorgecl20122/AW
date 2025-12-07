//==========================
// MIDDLEWARES 
//==========================

// Middleware para validar correo corporativo
function validarCorreoCorporativo(req, res, next) {
    const { email } = req.body;

    const regexCorporativo = /^[a-zA-Z0-9._-]+@(?!gmail|hotmail|yahoo|outlook|live|icloud)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email) {
        return res.render("InicioSesion", {
            error: "El correo electrónico es obligatorio",
            success: null
        });
    }

    if (!regexCorporativo.test(email)) {
        return res.render("InicioSesion", {
            error: "Debe usar un correo corporativo válido (no Gmail, Hotmail, Yahoo, Outlook...)",
            success: null
        });
    }

    next();
}


// Middleware para validar contraseña segura
function validarContraseñaSegura(req, res, next) {
    const { contraseña } = req.body;
    const errores = [];

    if (!contraseña) {
        errores.push("La contraseña es obligatoria");
    } else {
        const regexContraseña = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!regexContraseña.test(contraseña)) {
            errores.push("La contraseña debe tener mínimo 8 caracteres, al menos 1 mayúscula y 1 número");
        }
    }

    if (errores.length > 0) {
        req.erroresValidacion = errores; // guardamos el error en la request
    }

    next();
}



// Middleware combinado: valida correo Y contraseña
function validarRegistro(req, res, next) {
    const { email, contraseña } = req.body;

    const regexCorporativo = /^[a-zA-Z0-9._-]+@(?!gmail|hotmail|yahoo|outlook|live|icloud)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const regexContraseña = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!email) {
        return res.render("RegistroUsuario", {
            concesionarios: [], 
            error: "El correo electrónico es obligatorio",
            success: null
        });
    }

    if (!regexCorporativo.test(email)) {
        return res.render("RegistroUsuario", {
            concesionarios: [],
            error: "Debe usar un correo corporativo válido (no Gmail, Hotmail...)",
            success: null
        });
    }

    if (!contraseña) {
        return res.render("RegistroUsuario", {
            concesionarios: [],
            error: "La contraseña es obligatoria",
            success: null
        });
    }

    if (!regexContraseña.test(contraseña)) {
        return res.render("RegistroUsuario", {
            concesionarios: [],
            error: "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número",
            success: null
        });
    }

    next();
}


// Middleware para validar que las contraseñas coincidan (restablecer contraseña)
function validarCoincidenciaContraseñas(req, res, next) {
    const { contrasena1, contrasena2 } = req.body;

    if (!contrasena1 || !contrasena2) {
        return res.render("RestablecerContraseña", {
            error: "Debe escribir ambas contraseñas",
            success: null
        });
    }

    if (contrasena1 !== contrasena2) {
        return res.render("RestablecerContraseña", {
            error: "Las contraseñas no coinciden",
            success: null
        });
    }

    next();
}


module.exports = {
    validarCorreoCorporativo,
    validarContraseñaSegura,
    validarRegistro,
    validarCoincidenciaContraseñas
};