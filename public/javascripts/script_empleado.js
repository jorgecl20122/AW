// ===============================================================
//          CONFIGURACIÓN INICIAL DEL MODAL DE RESERVA 
// ===============================================================

// Configuración del modal de reserva
document.addEventListener('DOMContentLoaded', function() {
  const modalReserva = document.getElementById('modalReserva');
  
  // Solo configurar el modal si existe en la página
  if (!modalReserva) {
    console.log('Modal de reserva no encontrado - probablemente estás en otra página');
    return;
  }

  modalReserva.addEventListener('show.bs.modal', function(event) {
    const button = event.relatedTarget;

    // Datos del vehículo desde los atributos del botón
    const vehiculoId = button.getAttribute('data-vehiculo-id');
    const matricula = button.getAttribute('data-matricula');
    const marca = button.getAttribute('data-marca');
    const modelo = button.getAttribute('data-modelo');

    // Rellenar información del vehículo en el modal
    document.getElementById('vehiculoInfoReserva').textContent = `${marca} ${modelo} (${matricula})`;
    document.getElementById('vehiculoIdReserva').value = vehiculoId;

    const ahora = new Date();
    const fechaMin = ahora.toISOString().split('T')[0];
    const horaMin = ahora.toTimeString().slice(0, 5);

    document.getElementById('fechaInicioReserva').min = fechaMin;
    document.getElementById('fechaFinReserva').min = fechaMin;

    // Valores por defecto
    document.getElementById('fechaInicioReserva').value = fechaMin;
    document.getElementById('horaInicioReserva').value = horaMin;

    const finDefault = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    document.getElementById('fechaFinReserva').value = finDefault.toISOString().split('T')[0];
    document.getElementById('horaFinReserva').value = finDefault.toTimeString().slice(0, 5);
    
    calcularDuracion();
  });

  // Recalcular duración cuando cambian los campos
  ['fechaInicioReserva', 'horaInicioReserva', 'fechaFinReserva', 'horaFinReserva']
    .forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.addEventListener('change', calcularDuracion);
      }
    });
});

// Cálculo de duración
function calcularDuracion() {
  const fechaInicio = document.getElementById('fechaInicioReserva')?.value;
  const horaInicio = document.getElementById('horaInicioReserva')?.value;
  const fechaFin = document.getElementById('fechaFinReserva')?.value;
  const horaFin = document.getElementById('horaFinReserva')?.value;

  const resumenDuracion = document.getElementById('resumenDuracion');
  if (!resumenDuracion) return;

  // Si falta algún valor, no mostrar
  if (!fechaInicio || !horaInicio || !fechaFin || !horaFin) {
    resumenDuracion.style.display = 'none';
    return;
  }

  const inicio = new Date(`${fechaInicio}T${horaInicio}`);
  const fin = new Date(`${fechaFin}T${horaFin}`);

  const diferencia = fin - inicio; 

  if (diferencia <= 0) {
    document.getElementById('textoDuracion').textContent = 'La fecha de fin debe ser posterior al inicio';
    resumenDuracion.className = 'alert alert-danger';
    resumenDuracion.style.display = 'block';
    return;
  }

  const dias = Math.floor(diferencia / 86400000);
  const horas = Math.floor((diferencia % 86400000) / 3600000);
  const minutos = Math.floor((diferencia % 3600000) / 60000);

  let textoDuracion = '';
  if (dias) textoDuracion += `${dias} día${dias > 1 ? 's' : ''} `;
  if (horas) textoDuracion += `${horas} hora${horas > 1 ? 's' : ''} `;
  if (minutos) textoDuracion += `${minutos} minuto${minutos > 1 ? 's' : ''}`;

  document.getElementById('textoDuracion').textContent = textoDuracion.trim();
  resumenDuracion.className = 'alert alert-secondary';
  resumenDuracion.style.display = 'block';
}


// ==================================================================
//                          GUARDAR RESERVA 
// ==================================================================
$(document).ready(function() {
  $('#btnGuardarReserva').on('click', function(e) {
    e.preventDefault();

    const vehiculoId = $('#vehiculoIdReserva').val();
    const fechaInicio = $('#fechaInicioReserva').val();
    const horaInicio = $('#horaInicioReserva').val();
    const fechaFin = $('#fechaFinReserva').val();
    const horaFin = $('#horaFinReserva').val();

    if (!vehiculoId || !fechaInicio || !horaInicio || !fechaFin || !horaFin) {
      return mostrarAlerta('Por favor, completa todos los campos', 'warning');
    }

    const inicio = new Date(`${fechaInicio}T${horaInicio}:00`);
    const fin = new Date(`${fechaFin}T${horaFin}:00`);
    if (fin <= inicio) {
      return mostrarAlerta('La fecha de fin debe ser posterior a la fecha de inicio', 'danger');
    }

    const $btnGuardar = $(this);
    const textoOriginal = $btnGuardar.html();

    $btnGuardar.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Guardando...');

    $.ajax({
      url: '/empleado/crear_reserva',
      method: 'POST',
      data: {
        vehiculo_id: vehiculoId,
        fecha_inicio: inicio.toISOString(),
        fecha_fin: fin.toISOString()
      },
      success: function(response) {
        bootstrap.Modal.getInstance(document.getElementById('modalReserva')).hide();
        mostrarAlerta(response.mensaje || 'Reserva creada exitosamente', 'success');

        // Eliminar tarjeta del vehículo
        $(`#vehiculo-${vehiculoId}`).fadeOut(400, function() {
          $(this).remove();
          if ($('#listaReservas .row .col-12').length === 0) {
            $('#listaReservas').html(`
              <div class="alert alert-info text-center">
                <i class="bi bi-info-circle-fill me-2"></i>No hay vehículos disponibles en tu concesionario.
              </div>`);
          }
        });

        $('#formReserva')[0].reset();
        $('#resumenDuracion').hide();
      },
      error: () => mostrarAlerta('Error al crear la reserva', 'danger'),
      complete: () => $btnGuardar.prop('disabled', false).html(textoOriginal)
    });
  });
});


// ==================================================================
//                         CANCELAR RESERVA 
// ==================================================================
$(document).on('click', '.btn-cancelar-reserva', function() {
  const reservaId = $(this).data('reserva-id');
  if (confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
    cancelarReserva(reservaId);
  }
});

function cancelarReserva(reservaId) {
  $.ajax({
    url: `/empleado/cancelar_reserva/${reservaId}`,
    method: 'DELETE',
    success: function(response) {
      // Buscar específicamente la fila/card de esta reserva
      const $reservaElemento = $(`[data-reserva-id="${reservaId}"]`).closest('.card, tr');
      
      // Animación al eliminar
      $reservaElemento.fadeOut(400, function() {
        $(this).remove();

        // Verificar si quedan reservas en toda la lista
        const reservasRestantes = $('.btn-cancelar-reserva').length;
        
        if (reservasRestantes === 0) {
          $('#listaReservas').html(`
            <div class="alert alert-info text-center">
              <i class="bi bi-info-circle-fill me-2"></i>No tienes reservas activas.
            </div>
          `);
        }
      });

      mostrarAlerta(response.mensaje || 'Reserva cancelada correctamente', 'success');
    },
    error: xhr => {
      mostrarAlerta(xhr.responseJSON?.mensaje || 'Error al cancelar la reserva', 'danger');
    }
  });
}


// ==================================================================
//                   REPORTAR INCIDENCIA 
// ==================================================================
$(document).on('click', '.btn-reportar-incidencia', function(e) {
  e.preventDefault();
  const reservaId = $(this).data('reserva-id');
  const $btn = $(this);

  if (!confirm('¿Reportar incidencia en esta reserva?')) return;

  const original = $btn.html();
  $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');

  $.ajax({
    url: `/empleado/estadisticas/reportar_incidencia/${reservaId}`,
    method: 'POST',
    success: res =>
      mostrarAlerta(res.mensaje || 'Incidencia reportada correctamente', 'success'),
    error: () =>
      mostrarAlerta('Error al reportar la incidencia', 'danger'),
    complete: () => $btn.prop('disabled', false).html(original)
  });
});


// ==================================================================
//                    FUNCIONES AUXILIARES 
// ==================================================================
function mostrarAlerta(mensaje, tipo) {
  let container = $('#alertaContainer');
  if (!container.length) {
    $('main').prepend('<div id="alertaContainer"></div>');
    container = $('#alertaContainer');
  }

  container.html(`
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      <i class="bi bi-${tipo === 'success' ? 'check-circle' : tipo === 'danger' ? 'exclamation-triangle' : 'info-circle'}-fill me-2"></i>${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`);

  setTimeout(() => $('.alert').fadeOut(400, function() { $(this).remove(); }), 5000);
}


// Auto-finalizar reservas vencidas
function finalizarReservasVencidas() {
  $.ajax({
    url: '/empleado/finalizar_reservas_vencidas',
    method: 'POST',
    success: function(response) {
      if (!response.ids_finalizados?.length) return;

      response.ids_finalizados.forEach(id => {
        const fila = $(`#reserva-${id}`);
        fila.find('td span.badge').first()
          .removeClass('bg-success')
          .addClass('bg-danger')
          .text('Finalizada');

        fila.find('.btn-cancelar-reserva').remove();
      });

      mostrarAlerta(
        `${response.reservas_finalizadas} reserva(s) finalizada(s) automáticament`,'info'
      );
    }
  });
}

// Recargar vehículos disponibles y reservas
function cargarVehiculosParaReserva() {
  $.get('/empleado/vehiculos_disponibles', data => console.log('Vehículos actualizados:', data));
}

function cargarReservas() {
  $.get('/empleado/mis_reservas_json', data => console.log('Reservas cargadas:', data));
}


// ==================================================================
//                    INICIALIZACIÓN PERIÓDICA 
// ==================================================================
$(document).ready(function() {
  finalizarReservasVencidas();        
  setInterval(finalizarReservasVencidas, 5 * 60 * 1000); 
});
