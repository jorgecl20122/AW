// --------------------------------------------
// FUNCIÓN DE ALERTAS
// --------------------------------------------

function mostrarAlerta(mensaje, tipo) {
    // Buscar contenedor de alertas o crear uno
    let contenedorAlertas = document.getElementById('contenedor-alertas');
    
    if (!contenedorAlertas) {
        contenedorAlertas = document.createElement('div');
        contenedorAlertas.id = 'contenedor-alertas';
        contenedorAlertas.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        document.body.appendChild(contenedorAlertas);
    }
    
    // Crear alerta
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show shadow-sm`;
    alerta.role = 'alert';
    alerta.innerHTML = `
        <i class="bi bi-${tipo === 'success' ? 'check-circle' : tipo === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    contenedorAlertas.appendChild(alerta);
    
    // Auto-cerrar después de 4 segundos
    setTimeout(() => {
        alerta.classList.remove('show');
        setTimeout(() => alerta.remove(), 150);
    }, 4000);
}

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

// Cargar datos del usuario actual 
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
            
            // Actualizar avatar
            if (usuario.avatar && usuario.avatar !== '/img/usuarios/avatar.jpg') {
                console.log('Actualizando avatar a:', usuario.avatar);
                $('#userAvatar').attr('src', usuario.avatar + '?t=' + new Date().getTime());
                $('.user-avatar').attr('src', usuario.avatar + '?t=' + new Date().getTime());
            } else {
                // Si no hay avatar, usar el por defecto o iniciales
                const avatarDefault = '/img/usuarios/avatar.jpg';
                $('#userAvatar').attr('src', avatarDefault);
                $('.user-avatar').attr('src', avatarDefault);
            }
        },
        error: function(xhr) {
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

$(document).on('click', '#btnGuardarFoto', function() {
    const $btn = $(this);
    const $btnTexto = $('#btnTexto');
    const $btnSpinner = $('#btnSpinner');
    const formData = new FormData($('#formCambiarFoto')[0]);
    
    if (!$('#inputFoto')[0].files.length) {
        mostrarAlerta('Por favor selecciona una imagen', 'warning');
        return;
    }
    
    $btnTexto.addClass('d-none');
    $btnSpinner.removeClass('d-none');
    $btn.prop('disabled', true);
    
    $.ajax({
        url: '/usuario/cambiar-foto',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            mostrarAlerta(response.mensaje || 'Foto actualizada correctamente', 'success');
            
            // Recargar avatar después de cambiar la foto
            setTimeout(() => {
                cargarDatosUsuarioActual();
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalCambiarFoto'));
                if (modal) modal.hide();
            }, 1000);
        },
        error: function(xhr) {
            const msg = xhr.responseJSON?.mensaje || 'Hubo un error al subir la imagen';
            mostrarAlerta(msg, 'danger');
        },
        complete: function() {
            $btn.prop('disabled', false);
            $btnTexto.removeClass('d-none');
            $btnSpinner.addClass('d-none');
        }
    });
});

// Resetear modal al cerrarlo
$(document).on('hidden.bs.modal', '#modalCambiarFoto', function() {
    resetearModalFoto();
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
                // Recargar tabla después de cargar datos
                setTimeout(() => {
                    cargarUsuariosTabla();
                }, 1500);
            },
            error: function(xhr) {
                let mensaje = 'Error al cargar los datos';
                if (xhr.responseJSON?.mensaje) {
                    mensaje = xhr.responseJSON.mensaje;
                }
                mostrarEstado('error', `${mensaje} (Status: ${xhr.status})`);
            }
        });
    }

    function mostrarEstado(tipo, mensaje) {
        if (!uploadStatus) return;
        
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
            // Ocultar después de 5 segundos
            setTimeout(() => {
                uploadStatus.style.display = 'none';
            }, 5000);
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