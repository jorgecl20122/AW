// =============================
// Función: Cargar Reservas en Tabla
// =============================
function cargarReservasTabla() {
    $.ajax({
        url: '/reserva/lista_reservas',
        method: 'GET',
        success: function(reservas) {
            console.log('Reservas recibidas:', reservas);

            const contenedor = $('#Reservas-container');
            contenedor.empty();

            if (!reservas || reservas.length === 0) {
                contenedor.html('<p>No hay reservas registradas.</p>').show();
                return;
            }

            let html = `
            <div class="table-responsive">
              <table class="table table-striped table-hover align-middle" id="tabla-reservas">
                <thead class="table-secondary">
                    <tr>
                        <th>Coche</th>
                        <th>Matrícula</th>
                        <th>Fecha Inicio</th>
                        <th>Fecha Fin</th>
                        <th>Estado</th>
                        <th>Creada por</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
            `;

            reservas.forEach(r => {
                html += `
                    <tr data-id="${r.id_reserva}">
                        <td>${r.coche_nombre || '-'}</td>
                        <td>${r.coche_matricula || '-'}</td>
                        <td>${r.fecha_inicio || '-'}</td>
                        <td>${r.fecha_fin || '-'}</td>
                        <td>
                            <span class="badge bg-${r.estado === 'activa' ? 'success' : (r.estado === 'finalizada' ? 'primary' : 'secondary')}">
                                ${r.estado || 'Desconocido'}
                            </span>
                        </td>
                        <td>${r.usuario_nombre || 'Empleado'}</td>
                        <td>
                            <button class="btn btn-sm btn-danger btn-cancelar-reserva">
                                <i class="bi bi-x-circle-fill"></i> <strong>Cancelar</strong>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `
                </tbody>
              </table>
            </div>
            `;

            contenedor.html(html).show();
        },
        error: function(err) {
            console.error('Error al cargar reservas:', err);
            $('#Reservas-container').html('<p class="text-danger">Error al cargar reservas.</p>');
        }
    });
}

// =============================
// Mostrar / Ocultar Formulario
// =============================
$('#btnAddReserva').on('click', function() {
    $('#formReservaContainer').slideToggle(); // Mostrar/ocultar formulario
});

$('#cancelarReserva').on('click', function() {
    $('#formReservaContainer').slideUp();
    $('#formNuevaReserva')[0].reset();
});

// =============================
// Enviar Nueva Reserva
// =============================
$('#formNuevaReserva').on('submit', function(e) {
    e.preventDefault();

    const nuevaReserva = {
        fecha_inicio: $('#fecha_ini').val(),
        fecha_fin: $('#fecha_fin').val(),
        coche: $('#cocheReserva').val()
    };

    if (!nuevaReserva.fecha_inicio || !nuevaReserva.fecha_fin || !nuevaReserva.coche) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }

    $.ajax({
        url: '/reserva/nueva',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(nuevaReserva),
        success: function(resp) {
            alert(resp.mensaje || 'Reserva creada correctamente.');
            $('#formReservaContainer').slideUp();
            $('#formNuevaReserva')[0].reset();
            cargarReservasTabla(); // Recargar tabla
        },
        error: function(err) {
            console.error('Error al crear reserva:', err);
            alert(err.responseJSON?.mensaje || 'Error al crear la reserva.');
        }
    });
});

// =============================
// Cancelar una Reserva
// =============================
$(document).on('click', '.btn-cancelar-reserva', function() {
    const fila = $(this).closest('tr');
    const id = fila.data('id');

    if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;

    $.ajax({
        url: `/reserva/${id}/cancelar`,
        method: 'PUT',
        success: function(resp) {
            alert(resp.mensaje || 'Reserva cancelada correctamente.');
            cargarReservasTabla();
        },
        error: function(err) {
            console.error('Error al cancelar reserva:', err);
            alert(err.responseJSON?.mensaje || 'Error al cancelar la reserva.');
        }
    });
});

// =============================
// Cargar Reservas al Iniciar
// =============================
$(document).ready(function() {
    cargarReservasTabla();
});
