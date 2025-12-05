// ==================== CONFIGURACIÓN DEL MODAL DE RESERVA ====================
document.addEventListener('DOMContentLoaded', function() {
  const modalReserva = document.getElementById('modalReserva');

  // Al abrir el modal, configurar fechas mínimas y llenar datos del vehículo
  modalReserva.addEventListener('show.bs.modal', function(event) {
    const button = event.relatedTarget;
    const vehiculoId = button.getAttribute('data-vehiculo-id');
    const matricula = button.getAttribute('data-matricula');
    const marca = button.getAttribute('data-marca');
    const modelo = button.getAttribute('data-modelo');

    // Rellenar información del vehículo
    document.getElementById('vehiculoInfoReserva').textContent = 
      `${marca} ${modelo} (${matricula})`;
    document.getElementById('vehiculoIdReserva').value = vehiculoId;

    // Establecer fecha y hora mínimas (ahora)
    const ahora = new Date();
    const fechaMin = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaMin = ahora.toTimeString().slice(0, 5);   // HH:MM

    document.getElementById('fechaInicioReserva').min = fechaMin;
    document.getElementById('fechaFinReserva').min = fechaMin;
    
    // Valores por defecto: inicio ahora, fin en 2 horas
    document.getElementById('fechaInicioReserva').value = fechaMin;
    document.getElementById('horaInicioReserva').value = horaMin;
    
    const finDefault = new Date(ahora.getTime() + 2 * 60 * 60 * 1000); // +2 horas
    document.getElementById('fechaFinReserva').value = finDefault.toISOString().split('T')[0];
    document.getElementById('horaFinReserva').value = finDefault.toTimeString().slice(0, 5);

    // Calcular duración inicial
    calcularDuracion();
  });

  // Calcular duración al cambiar las fechas/horas
  document.getElementById('fechaInicioReserva').addEventListener('change', calcularDuracion);
  document.getElementById('horaInicioReserva').addEventListener('change', calcularDuracion);
  document.getElementById('fechaFinReserva').addEventListener('change', calcularDuracion);
  document.getElementById('horaFinReserva').addEventListener('change', calcularDuracion);
});

// ==================== CALCULAR DURACIÓN DE LA RESERVA ====================
function calcularDuracion() {
  const fechaInicio = document.getElementById('fechaInicioReserva').value;
  const horaInicio = document.getElementById('horaInicioReserva').value;
  const fechaFin = document.getElementById('fechaFinReserva').value;
  const horaFin = document.getElementById('horaFinReserva').value;

  if (!fechaInicio || !horaInicio || !fechaFin || !horaFin) {
    document.getElementById('resumenDuracion').style.display = 'none';
    return;
  }

  const inicio = new Date(`${fechaInicio}T${horaInicio}`);
  const fin = new Date(`${fechaFin}T${horaFin}`);

  const diferencia = fin - inicio; // milisegundos

  if (diferencia <= 0) {
    document.getElementById('textoDuracion').textContent = 'La fecha de fin debe ser posterior al inicio';
    document.getElementById('resumenDuracion').className = 'alert alert-danger';
    document.getElementById('resumenDuracion').style.display = 'block';
    return;
  }

  // Calcular días, horas y minutos
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

  let textoDuracion = '';
  if (dias > 0) textoDuracion += `${dias} día${dias > 1 ? 's' : ''} `;
  if (horas > 0) textoDuracion += `${horas} hora${horas > 1 ? 's' : ''} `;
  if (minutos > 0) textoDuracion += `${minutos} minuto${minutos > 1 ? 's' : ''}`;

  document.getElementById('textoDuracion').textContent = textoDuracion.trim();
  document.getElementById('resumenDuracion').className = 'alert alert-secondary';
  document.getElementById('resumenDuracion').style.display = 'block';
}

// ==================== GUARDAR RESERVA CON AJAX ====================
$(document).ready(function() {
  $('#btnGuardarReserva').on('click', function(e) {
    e.preventDefault();

    // Obtener valores
    const vehiculoId = $('#vehiculoIdReserva').val();
    const fechaInicio = $('#fechaInicioReserva').val();
    const horaInicio = $('#horaInicioReserva').val();
    const fechaFin = $('#fechaFinReserva').val();
    const horaFin = $('#horaFinReserva').val();

    // Validar que todos los campos estén completos
    if (!vehiculoId || !fechaInicio || !horaInicio || !fechaFin || !horaFin) {
      mostrarAlerta('Por favor, completa todos los campos', 'warning');
      return;
    }

    // Combinar fecha y hora en formato ISO
    const fechaInicioCompleta = `${fechaInicio}T${horaInicio}:00`;
    const fechaFinCompleta = `${fechaFin}T${horaFin}:00`;

    // Validación de fechas
    const inicio = new Date(fechaInicioCompleta);
    const fin = new Date(fechaFinCompleta);

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
        fecha_inicio: fechaInicioCompleta,
        fecha_fin: fechaFinCompleta
      },
      success: function(response) {
        // Cerrar modal
        const modalElement = document.getElementById('modalReserva');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();

        // Mostrar mensaje de éxito
        mostrarAlerta(response.mensaje || 'Reserva creada exitosamente', 'success');

        // Eliminar solo el card del vehículo reservado
        $(`#vehiculo-${vehiculoId}`).fadeOut(400, function() {
          $(this).remove();

          // Verificar si quedan cards de vehículos (buscar por la clase col)
          const cardsRestantes = $('#listaReservas .row .col-12').length;
          
          if (cardsRestantes === 0) {
            $('#listaReservas').html(
              '<div class="alert alert-info text-center">' +
              '<i class="bi bi-info-circle-fill me-2"></i>' +
              'No hay vehículos disponibles en tu concesionario.' +
              '</div>'
            );
          }
        });

        // Limpiar el formulario
        $('#formReserva')[0].reset();
        $('#resumenDuracion').hide();
      },
      error: function(xhr) {
        let mensaje = 'Error al crear la reserva';
        
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          mensaje = xhr.responseJSON.mensaje;
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

        // Verificar si quedan reservas (ajustar selector según tu estructura)
        const reservasRestantes = $('#listaReservas .card').length;
        
        if (reservasRestantes === 0) {
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
function mostrarAlerta(mensaje, tipo) {
  const alerta = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      <i class="bi bi-${tipo === 'success' ? 'check-circle' : tipo === 'danger' ? 'exclamation-triangle' : 'info-circle'}-fill me-2"></i>
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
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

function finalizarReservasVencidas() {
  $.ajax({
    url: '/empleado/finalizar_reservas_vencidas',
    method: 'POST',
    success: function(response) {

      if (!response.ids_finalizados || response.ids_finalizados.length === 0) return;

      response.ids_finalizados.forEach(id => {
        const fila = $(`#reserva-${id}`);
        const estadoBadge = fila.find('td span.badge').first();

        estadoBadge
          .removeClass('bg-success')
          .addClass('bg-danger')
          .text('Finalizada');

        fila.find('.btn-cancelar-reserva').fadeOut(200, function() {
          $(this).remove();
          fila.find('td:last').html('<span class="text-muted">-</span>');
        });

        fila.addClass('table-secondary').fadeOut(200).fadeIn(200);
      });

      mostrarAlerta(
        `${response.reservas_finalizadas} reserva${response.reservas_finalizadas > 1 ? 's' : ''} finalizada${response.reservas_finalizadas > 1 ? 's' : ''} automáticamente`,
        'info'
      );
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