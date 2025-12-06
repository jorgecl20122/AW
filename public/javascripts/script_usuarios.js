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
            
            // Actualizar nombre completo
            if ($('#userName').length) {
                $('#userName').text(usuario.nombre_completo);
            }
            
            // Actualizar foto de perfil
            if (usuario.foto_perfil && usuario.foto_perfil !== '/img/default-avatar.png') {
                $('#userAvatar').attr('src', usuario.foto_perfil);
                $('.user-avatar').attr('src', usuario.foto_perfil);
            } else {
                const iniciales = obtenerIniciales(usuario.nombre_completo);
                $('#userAvatar').attr('src', generarAvatarIniciales(iniciales));
            }
        },
        error: function(xhr) {
            // SILENCIAR error 401 (sin sesión) - es normal en setup/login
            if (xhr.status === 401) {
                console.log('ℹ️ Sin sesión activa');
                return; // Salir sin mostrar error
            }
            
            // Para otros errores, sí mostrarlos
            console.error('Error al cargar datos del usuario:', xhr);
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
// CAMBIAR FOTO DE PERFIL
// --------------------------------------------

// Guardar nueva foto
$(document).on('click', '#btnGuardarFoto', function() {
    console.log('🔵 Botón clickeado');
    
    const formData = new FormData($('#formCambiarFoto')[0]);
    
    if (!$('#inputFoto')[0].files.length) {
        console.log('🔴 No hay archivo seleccionado');
        mostrarErrorFoto('Por favor selecciona una imagen');
        return;
    }
    
    console.log('🟢 Archivo seleccionado:', $('#inputFoto')[0].files[0].name);
    console.log('🟢 Enviando petición a /usuario/cambiar-foto');
    
    // Mostrar spinner
    $('#btnTexto').addClass('d-none');
    $('#btnSpinner').removeClass('d-none');
    $(this).prop('disabled', true);
    
    $.ajax({
        url: '/usuario/cambiar-foto',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            console.log('✅ Respuesta exitosa:', response);
            mostrarExitoFoto('Foto de perfil actualizada correctamente');
            
            $('#userAvatar').attr('src', response.avatar);
            $('.user-avatar').attr('src', response.avatar);
            
            setTimeout(function() {
                $('#modalCambiarFoto').modal('hide');
                resetearModalFoto();
            }, 1500);
        },
        error: function(xhr) {
            console.error('❌ Error en la petición:', xhr);
            console.error('❌ Status:', xhr.status);
            console.error('❌ Response:', xhr.responseText);
            
            let mensaje = 'Error al actualizar la foto de perfil';
            
            if (xhr.responseJSON && xhr.responseJSON.mensaje) {
                mensaje = xhr.responseJSON.mensaje;
            } else if (xhr.status === 413) {
                mensaje = 'El archivo es demasiado grande';
            } else if (xhr.status === 401) {
                mensaje = 'Sesión expirada. Por favor inicia sesión nuevamente';
                setTimeout(function() {
                    window.location.href = '/usuario/login';
                }, 2000);
            }
            
            mostrarErrorFoto(mensaje);
        },
        complete: function() {
            $('#btnTexto').removeClass('d-none');
            $('#btnSpinner').addClass('d-none');
            $('#btnGuardarFoto').prop('disabled', false);
        }
    });
});

// Resetear modal al cerrarlo
$(document).on('hidden.bs.modal', '#modalCambiarFoto', function() {
    resetearModalFoto();
});

// Al abrir el modal, cargar el avatar actual en el preview
$(document).on('show.bs.modal', '#modalCambiarFoto', function() {
    const avatarActual = $('#userAvatar').attr('src');
    $('#previewAvatar').attr('src', avatarActual);
});

// Funciones auxiliares para el modal de foto
function mostrarErrorFoto(mensaje) {
    $('#mensajeError').text(mensaje).removeClass('d-none');
    $('#mensajeExito').addClass('d-none');
}

function mostrarExitoFoto(mensaje) {
    $('#mensajeExito').text(mensaje).removeClass('d-none');
    $('#mensajeError').addClass('d-none');
}

function ocultarMensajesFoto() {
    $('#mensajeError').addClass('d-none');
    $('#mensajeExito').addClass('d-none');
}

function resetearModalFoto() {
    $('#formCambiarFoto')[0].reset();
    $('#previewAvatar').attr('src', $('#userAvatar').attr('src'));
    ocultarMensajesFoto();
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

//---------------------------------------------
// CARGA DE DATOS DESDE JSON
//---------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    const btnCargarJSON = document.getElementById('btnCargarJSON');
    const fileInput = document.getElementById('fileInput');
    const uploadStatus = document.getElementById('uploadStatus');

    if (btnCargarJSON) {
    btnCargarJSON.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (!file) return;

        if (!file.name.endsWith('.json')) {
        mostrarEstado('error', 'Por favor, selecciona un archivo JSON válido');
        return;
        }

        cargarJSON(file);
    });
    }

    function cargarJSON(file) {
    const reader = new FileReader();

    mostrarEstado('loading', 'Cargando archivo JSON...');

    reader.onload = function(e) {
        try {
        const jsonData = JSON.parse(e.target.result);
        enviarJSON(jsonData);
        } catch (error) {
        mostrarEstado('error', 'Error al leer el archivo JSON: formato inválido');
        }
    };

    reader.onerror = function() {
        mostrarEstado('error', 'Error al leer el archivo');
    };

    reader.readAsText(file);
    }

    function enviarJSON(data) {
    $.ajax({
        url: '/usuario/cargar-datos-json',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            mostrarEstado('success', response.mensaje || 'Datos cargados exitosamente');
        },
        error: function(xhr) {
            
            let mensaje = 'Error al cargar los datos';
            
            if (xhr.responseJSON && xhr.responseJSON.mensaje) {
                mensaje = xhr.responseJSON.mensaje;
            } else if (xhr.responseText) {
                mensaje = xhr.responseText;
            }
            
            mostrarEstado('error', `${mensaje} (Status: ${xhr.status})`);
        }
    });
    }

    function mostrarEstado(tipo, mensaje) {
    uploadStatus.style.display = 'block';

    if (tipo === 'loading') {
        uploadStatus.className = 'upload-status alert alert-info d-flex align-items-center';
        uploadStatus.innerHTML = `
        <div class="spinner-border spinner-border-sm me-3" role="status">
            <span class="visually-hidden">Cargando...</span>
        </div>
        <span>${mensaje}</span>
        `;
    } else if (tipo === 'success') {
        uploadStatus.className = 'upload-status alert alert-success d-flex align-items-center';
        uploadStatus.innerHTML = `
        <i class="bi bi-check-circle-fill me-3 fs-4"></i>
        <span>${mensaje}</span>
        `;
    } else if (tipo === 'error') {
        uploadStatus.className = 'upload-status alert alert-danger d-flex align-items-center';
        uploadStatus.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
        <span>${mensaje}</span>
        `;
    }
    }
    });

// --------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------

// Cargar al inicio
$(document).ready(function() {
    cargarDatosUsuarioActual();
    cargarUsuariosTabla();
});