function cargarUsuariosTabla() {
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
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Teléfono</th>
                        <th>Concesionario</th>
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

$(document).ready(() => cargarUsuariosTabla());
