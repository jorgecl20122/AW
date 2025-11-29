// --------------------------------------------
// CARGA DE DATOS
// --------------------------------------------

// Cargar lista de usuarios en la tabla
function cargarUsuariosTabla() {
    $.ajax({
        url: '/usuario/lista_usuarios',
        method: 'GET',
        success: function(usuarios) {
            console.log('Usuarios recibidos:', usuarios);
        },
        error: function(err) {
            console.error('Error al cargar usuarios:', err);
        }
    });
}

// Cargar datos del usuario actual (sidebar)
function cargarDatosUsuarioActual() {
    $.ajax({
        url: '/usuario/actual',
        method: 'GET',
        success: function(usuario) {
            console.log('Usuario actual:', usuario);
            
            // Actualizar rol (si existe en el HTML)
            const rolTexto = usuario.rol === 'administrador' ? 'Administrador' : 'Empleado';
            if ($('#userRole').length) {
                $('#userRole').text(rolTexto);
            }
            
            // Actualizar email (si existe en el HTML)
            if ($('#userEmail').length) {
                $('#userEmail').text(usuario.correo);
            }
            
            // Actualizar foto de perfil
            if (usuario.foto_perfil) {
                $('#userAvatar').attr('src', usuario.foto_perfil);
            } else {
                const iniciales = obtenerIniciales(usuario.nombre_completo);
                $('#userAvatar').attr('src', generarAvatarIniciales(iniciales));
            }
        },
        error: function(err) {
            console.error('Error al cargar datos del usuario:', err);
            if ($('#userRole').length) {
                $('#userRole').text('Usuario');
            }
            if ($('#userEmail').length) {
                $('#userEmail').text('No disponible');
            }
        }
    });
}

// --------------------------------------------
// BUSCADOR
// --------------------------------------------

// Buscador de usuarios en la tabla
$('#buscarUsuario').on('keyup', function() {
    const textoBusqueda = $(this).val().toLowerCase().trim();
    const tbody = $('#tabla-usuarios tbody');

    // Mostrar todo si está vacío
    if (textoBusqueda === '') {
        tbody.find('tr').show();
        $('#mensajeNoResultados').remove();
        return;
    }

    // Filtrar filas
    tbody.find('tr').each(function() {
        const fila = $(this);
        const nombre = fila.find('td:nth-child(1)').text().toLowerCase();
        const correo = fila.find('td:nth-child(2)').text().toLowerCase();

        if (nombre.includes(textoBusqueda) || correo.includes(textoBusqueda)) {
            fila.show();
        } else {
            fila.hide();
        }
    });

    // Verificar si quedan resultados visibles
    const visibles = tbody.find('tr:visible').length;

    if (visibles === 0) {
        if ($('#mensajeNoResultados').length === 0) {
            tbody.append(`
                <tr id="mensajeNoResultados">
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-search"></i> No se encontraron usuarios que coincidan con "${textoBusqueda}"
                    </td>
                </tr>
            `);
        }
    } else {
        $('#mensajeNoResultados').remove();
    }
});

// --------------------------------------------
// MODAL DE EDICIÓN
// --------------------------------------------

// Cargar concesionarios en el modal de edición
function cargarConcesionariosSelectEdit(concesionarioIdActual = '') {
    $.ajax({
        url: '/admin/lista_concesionarios',
        method: 'GET',
        success: function(concesionarios) {
            const select = $('#editUsuarioConcesionario');
            select.empty();
            
            // Agregar "Sin asignar" primero
            select.append('<option value="">Sin asignar</option>');
            
            // Agregar concesionarios
            concesionarios.forEach(function(concesionario) {
                const selected = concesionario.id_concesionario == concesionarioIdActual ? 'selected' : '';
                select.append(
                    `<option value="${concesionario.id_concesionario}" ${selected}>
                        ${concesionario.nombre} - ${concesionario.ciudad}
                    </option>`
                );
            });
            
            // Si no hay concesionario actual, seleccionar "Sin asignar"
            if (!concesionarioIdActual) {
                select.val('');
            }
        },
        error: function(xhr) {
            console.error('Error al cargar concesionarios:', xhr);
            $('#editUsuarioConcesionario').html('<option value="">Error al cargar</option>');
        }
    });
}

// Abrir modal de edición (carga datos del botón data-attributes)
$(document).on('click', '.btn-edit-usuario', function() {
    const id = $(this).data('id');
    const nombre = $(this).data('nombre');
    const correo = $(this).data('correo');
    const rol = $(this).data('rol');
    const concesionarioId = $(this).data('concesionario-id');

    // Rellenar campos del modal
    $('#editUsuarioId').val(id);
    $('#editUsuarioNombre').text(nombre);
    $('#editUsuarioCorreo').text(correo);
    $('#editUsuarioRol').val(rol);
    
    // Cargar concesionarios de forma dinámica y seleccionar el actual
    cargarConcesionariosSelectEdit(concesionarioId);

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalEditUsuario'));
    modal.show();
});

// --------------------------------------------
// UTILIDADES
// --------------------------------------------

// Función para obtener iniciales del nombre
function obtenerIniciales(nombreCompleto) {
    if (!nombreCompleto) return 'U';
    
    const palabras = nombreCompleto.trim().split(' ');
    if (palabras.length >= 2) {
        return (palabras[0][0] + palabras[1][0]).toUpperCase();
    }
    return palabras[0][0].toUpperCase();
}

// Función para generar avatar con iniciales
function generarAvatarIniciales(iniciales) {
    return `https://ui-avatars.com/api/?name=${iniciales}&background=0D8ABC&color=fff&size=128&bold=true`;
}

// --------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------

// Cargar al inicio
$(document).ready(function() {
    cargarDatosUsuarioActual();
    cargarUsuariosTabla();
});