// ==================== MODAL RESERVA ====================
document.addEventListener('DOMContentLoaded', function() {
  const modalReserva = document.getElementById('modalReserva');

  // Al abrir el modal, se llenan los datos del vehículo
  modalReserva.addEventListener('show.bs.modal', function(event) {
    const button = event.relatedTarget;
    const vehiculoId = button.getAttribute('data-vehiculo-id');
    const matricula = button.getAttribute('data-matricula');
    const marca = button.getAttribute('data-marca');
    const modelo = button.getAttribute('data-modelo');

    // Rellenar los campos en el modal
    document.getElementById('vehiculoInfoReserva').textContent =
      `${marca} ${modelo} (${matricula})`;
    document.getElementById('vehiculoIdReserva').value = vehiculoId;

    // Fecha mínima = ahora mismo
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const fechaMin = `${year}-${month}-${day}T${hours}:${minutes}`;

    document.getElementById('fechaInicioReserva').min = fechaMin;
    document.getElementById('fechaFinReserva').min = fechaMin;
  });

  // Auto-cerrar alertas
  const alerts = document.querySelectorAll('.alert');
  if (alerts.length > 0) {
    setTimeout(() => {
      alerts.forEach(alert => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      });
    }, 5000);
  }
});

// ==================== GUARDAR RESERVA CON AJAX ====================
$(document).ready(function() {
  $('#btnGuardarReserva').on('click', function(e) {
    e.preventDefault(); // Evitar el envío tradicional del formulario

    const vehiculoId = $('#vehiculoIdReserva').val();
    const fechaInicio = $('#fechaInicioReserva').val();
    const fechaFin = $('#fechaFinReserva').val();

    // Validación de fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (fin <= inicio) {
      mostrarAlerta('La fecha de fin debe ser posterior a la fecha de inicio', 'danger');
      return;
    }

    // Enviar reserva por AJAX
    $.ajax({
      url: '/empleado/crear_reserva',
      method: 'POST',
      data: {
        vehiculo_id: vehiculoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      },
      success: function(response) {
        // Cerrar modal
        const modalReservaElement = document.getElementById('modalReserva');
        const modalReserva = bootstrap.Modal.getInstance(modalReservaElement);
        if (modalReserva) modalReserva.hide();

        // Mostrar mensaje de éxito
        mostrarAlerta(response.mensaje || 'Reserva creada exitosamente', 'success');

       // Eliminar la fila del vehículo reservado de la tabla
        $(`#vehiculo-${vehiculoId}`).fadeOut(400, function() {
          $(this).remove();

          // Si no quedan vehículos, mostrar mensaje
          if ($('#listaReservas tbody tr:visible').length === 0) {
            $('#listaReservas').html('<div class="alert alert-info text-center">No hay vehículos disponibles en tu concesionario.</div>');
          }
        });

        cargarReservas();
      },
      error: function(xhr) {
        let mensaje = 'Error al crear la reserva';
        
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          mensaje = xhr.responseJSON.mensaje;
        } else if (xhr.responseText) {
          try {
            const response = JSON.parse(xhr.responseText);
            mensaje = response.mensaje || mensaje;
          } catch (e) {
            console.error('Error al parsear respuesta:', e);
          }
        }

        mostrarAlerta(mensaje, 'danger');
      }
    });
  });
});

// ==================== CANCELAR RESERVA CON AJAX ====================
$(document).ready(function() {
  $(document).on('click', '.btn-cancelar-reserva', function() {
    const reservaId = $(this).data('reserva-id');
    
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      return;
    }

    cancelarReserva(reservaId);
  });
});


function cancelarReserva(reservaId) {
  $.ajax({
    url: `/empleado/cancelar_reserva/${reservaId}`,
    method: 'DELETE',
    success: function(response) {

      // Eliminar la fila de la reserva con animación
      $(`#reserva-${reservaId}`).fadeOut(400, function() {
        $(this).remove();

        // Si no quedan reservas visibles, mostrar mensaje
        if ($('#listaReservas tbody tr:visible').length === 0) {
          $('#listaReservas').html('<div class="alert alert-info text-center">No tienes reservas activas.</div>');
        }
      });

      // Mostrar alerta de éxito
      mostrarAlerta(response.mensaje || 'Reserva cancelada exitosamente', 'success');

      // Opcional: recargar vehículos disponibles si tu backend no devuelve los datos
      cargarVehiculosParaReserva();
    },
    error: function(xhr) {
      let mensaje = 'Error al cancelar la reserva';
      if (xhr.responseJSON && xhr.responseJSON.mensaje) {
        mensaje = xhr.responseJSON.mensaje;
      }
      mostrarAlerta(mensaje, 'danger');
    }
  });
}


// ==================== FUNCIONES AUXILIARES ====================
// Función auxiliar para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
  const alerta = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  // Si existe un contenedor específico, usarlo; sino, crear uno al inicio del main
  let container = $('#alertaContainer');
  if (container.length === 0) {
    $('main').prepend('<div id="alertaContainer"></div>');
    container = $('#alertaContainer');
  }
  
  container.html(alerta);
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    $('.alert').fadeOut(400, function() {
      $(this).remove();
    });
  }, 5000);
}

// Función para finalizar reservas vencidas automáticamente
function finalizarReservasVencidas() {
  $.ajax({
    url: '/empleado/finalizar_reservas_vencidas',
    method: 'POST',
    success: function(response) {
      if (response.reservas_finalizadas > 0) {
        console.log(`${response.reservas_finalizadas} reservas finalizadas automáticamente`);
        
        // Recargar las listas para mostrar los cambios
        cargarVehiculosParaReserva();
        cargarReservas();
      }
    },
    error: function(err) {
      console.error('Error al finalizar reservas vencidas:', err);
    }
  });
}

// Función para cargar vehículos disponibles en el concesionario
function cargarVehiculosParaReserva() {
  $.ajax({
    url: '/empleado/vehiculos_disponibles',
    method: 'GET',
    success: function(vehiculos) {
      console.log('Vehículos cargados:', vehiculos);
    },
    error: function(err) {
      console.error('Error al cargar vehículos:', err);
    }
  });
}

// Función para cargar reservas del empleado
function cargarReservas() {
  $.ajax({
    url: '/empleado/mis_reservas_json',
    method: 'GET',
    success: function(reservas) {
      console.log('Reservas cargadas:', reservas);
    },
    error: function(err) {
      console.error('Error al cargar reservas:', err);
    }
  });
}

// ==================== INICIALIZACIÓN ====================
$(document).ready(function() {
  // Finalizar reservas vencidas al cargar
  finalizarReservasVencidas();

  // Verificar reservas vencidas cada 5 minutos
  setInterval(finalizarReservasVencidas, 5 * 60 * 1000);
});