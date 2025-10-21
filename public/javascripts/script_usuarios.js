function cargarUsuariosTabla() { //CHECK.
    $.ajax({
        url: '/usuario/lista_usuarios',
        method: 'GET',
        success: function(usuarios) {
            console.log('Usuarios recibidos:', usuarios);

            if (usuarios.length === 0) {
                $('#usuarios-container').html('<p>No hay usuarios registrados.</p>').show();
                return;
            }

            let html = `
            <table class="table table-striped table-hover align-middle" id="tabla-usuarios">
                <thead class="table-secondary">
                    <tr>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Teléfono</th>
                        <th>Concesionario</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
            `;

            usuarios.forEach(u => {
                html += `
                   <tr data-id="${u.id_usuario}">
                        <td>${u.nombre_completo}</td>
                        <td>${u.correo}</td>
                        <td>
                            <span class="badge ${u.rol === 'administrador' ? 'bg-primary' : 'bg-secondary'}">
                                ${u.rol === 'administrador' ? 'Administrador' : 'Empleado'}
                            </span>
                        </td>
                        <td>${u.telefono || '-'}</td>
                        <td>${u.concesionario || '<span class="text-muted">Sin asignar</span>'}</td>
                        <td>
                            <button class="btn btn-sm  btn-edit-usuario" data-concesionario-id="${u.concesionario_id || ''}">
                                <i class="bi bi-pencil-fill"></i> <strong>Editar</strong>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table>`;
            $('#usuarios-container').html(html).show();
        },
        error: function(err) {
            console.error('Error al cargar usuarios:', err);
            $('#usuarios-container').html('<p class="text-danger">Error al cargar usuarios.</p>');
        }
    });
}

// Cargar concesionarios en el modal de edición CHECK.
function cargarConcesionariosSelectEdit(concesionarioIdActual = '') {
    $.ajax({
        url: '/admin/lista_concesionarios',
        method: 'GET',
        success: function(concesionarios) {
            const select = $('#editUsuarioConcesionario');
            select.empty();
            select.append('<option value="">Sin asignar</option>');
            
            concesionarios.forEach(function(concesionario) {
                const selected = concesionario.id_concesionario == concesionarioIdActual ? 'selected' : '';
                select.append(
                    `<option value="${concesionario.id_concesionario}" ${selected}>
                        ${concesionario.nombre} - ${concesionario.ciudad}
                    </option>`
                );
            });
            
            console.log('Concesionarios cargados en el select de edición');
        },
        error: function(xhr) {
            console.error('Error al cargar concesionarios:', xhr);
            $('#editUsuarioConcesionario').html('<option value="">Error al cargar</option>');
        }
    });
}

// Editar usuario (solo rol y concesionario) CHECK.
$(document).on('click', '.btn-edit-usuario', function() {
    const fila = $(this).closest('tr');
    const id = fila.data('id');
    const concesionarioId = $(this).data('concesionario-id');
    
    console.log('ID del usuario:', id);

    // Extraer los valores de la fila
    const nombre = fila.find('td').eq(0).text().trim();
    const correo = fila.find('td').eq(1).text().trim();
    const rolBadge = fila.find('td').eq(2).find('.badge').text().trim().toLowerCase();
    const rol = rolBadge === 'administrador' ? 'administrador' : 'empleado';

    $('#editUsuarioNombre').text(nombre);
    $('#editUsuarioCorreo').text(correo);
    
    // Rellenar el modal con los datos editables
    $('#modalEditUsuario').data('id', id);
    $('#editUsuarioRol').val(rol);
    
    // Cargar concesionarios de forma dinámica y seleccionar el actual por ID
    cargarConcesionariosSelectEdit(concesionarioId);

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalEditUsuario'));
    modal.show();
});


// Guardar cambios del usuario (solo rol y concesionario)
$('#guardarEditUsuario').on('click', function() {
    const id = $('#modalEditUsuario').data('id');
    const rol = $('#editUsuarioRol').val();
    const concesionario_id = $('#editUsuarioConcesionario').val();

    // Validación
    if (!rol) {
        alert('Por favor, selecciona un rol.');
        return;
    }

    console.log('Guardando cambios:', { id, rol, concesionario_id });

    $.ajax({
        method: 'PUT',
        url: `/usuarios/${id}`,
        contentType: 'application/json',
        data: JSON.stringify({
            rol,
            concesionario_id: concesionario_id || null
        }),
        success: function(data) {
            alert(data.mensaje || 'Usuario actualizado correctamente');
            cargarUsuariosTabla(); // Recargar la tabla de usuarios
            bootstrap.Modal.getInstance(document.getElementById('modalEditUsuario')).hide();
        },
        error: function(err) {
            console.error('Error al actualizar usuario:', err);
            alert(err.responseJSON?.mensaje || 'Error al actualizar usuario');
        }
    });
});

$(document).ready(() => cargarUsuariosTabla());