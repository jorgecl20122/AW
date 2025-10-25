// Cargar vehículos del concesionario del empleado logueado
function cargarVehiculosParaReserva() {
  $.ajax({
    url: '/empleado/vehiculos_disponibles',
    method: 'GET',
    success: function(response) {
      const vehiculos = response.vehiculos || response;

      if (!vehiculos || vehiculos.length === 0) {
        $('#listaVehiculosReserva').html('<p class="text-center">No hay vehículos disponibles en tu concesionario.</p>');
        return;
      }

      let html = `
        <table class="table table-striped table-hover align-middle">
          <thead class="table-secondary">
            <tr>
              <th>Matrícula</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Año</th>
              <th>Plazas</th>
              <th>Autonomía</th>
              <th>Color</th>
              <th>Imagen</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
      `;

      vehiculos.forEach(v => {
        html += `
          <tr data-id="${v.id}" id="vehiculo-${v.id}">
            <td>${v.matricula}</td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.anio_matriculacion}</td>
            <td>${v.numero_plazas}</td>
            <td>${v.autonomia_km} km</td>
            <td>${v.color}</td>
            <td>${v.imagen ? `<img src="${v.imagen}" alt="Imagen" class="vehiculo-img">` : '-'}</td>
            <td>
              <button class="btn btn-primary btn-sm btn-reservar" 
                      data-vehiculo-id="${v.id}"
                      data-matricula="${v.matricula}"
                      data-marca="${v.marca}"
                      data-modelo="${v.modelo}">
                <i class="fas fa-calendar-check"></i> Reservar
              </button>
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      $('#listaVehiculosReserva').html(html);

      // Agregar evento click a los botones de reservar
      $('.btn-reservar').on('click', function() {
        const vehiculoId = $(this).data('vehiculo-id');
        const matricula = $(this).data('matricula');
        const marca = $(this).data('marca');
        const modelo = $(this).data('modelo');
        abrirModalReserva(vehiculoId, matricula, marca, modelo);
      });
    },
    error: function(err) {
      console.error('Error al cargar vehículos:', err);
      $('#listaVehiculosReserva').html('<p class="text-danger">Error al cargar los vehículos disponibles.</p>');
    }
  });
}

// Función para abrir modal de reserva
function abrirModalReserva(vehiculoId, matricula, marca, modelo) {
  $('#vehiculoInfoReserva').text(`${marca} ${modelo} (${matricula})`);
  $('#vehiculoIdReserva').val(vehiculoId);
  
  // Limpiar fechas previas
  $('#fechaInicioReserva').val('');
  $('#fechaFinReserva').val('');
  
  $('#modalReserva').modal('show');
}

// Función para guardar la reserva
function guardarReserva() {
  const vehiculoId = $('#vehiculoIdReserva').val();
  const fechaInicio = $('#fechaInicioReserva').val();
  const fechaFin = $('#fechaFinReserva').val();

  // Validaciones
  if (!fechaInicio || !fechaFin) {
    alert('Por favor, completa ambas fechas');
    return;
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (fin <= inicio) {
    alert('La fecha de fin debe ser posterior a la fecha de inicio');
    return;
  }

  // Deshabilitar botón mientras se procesa
  const btnGuardar = $('#btnGuardarReserva');
  btnGuardar.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Guardando...');

  $.ajax({
    url: '/empleado/crear_reserva',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      vehiculo_id: vehiculoId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    }),
    success: function(response) {
      // Cerrar modal
      $('#modalReserva').modal('hide');
      
      // Eliminar vehículo de la tabla de disponibles
      $(`#vehiculo-${vehiculoId}`).fadeOut(400, function() {
        $(this).remove();
        
        // Si no quedan vehículos, mostrar mensaje
        if ($('#listaVehiculosReserva tbody tr').length === 0) {
          $('#listaVehiculosReserva').html('<p class="text-center">No hay vehículos disponibles en tu concesionario.</p>');
        }
      });

      // Recargar tabla de reservas
      cargarReservas();

      // Mostrar mensaje de éxito
      mostrarAlerta('Reserva creada exitosamente', 'success');
    },
    error: function(err) {
      console.error('Error al crear reserva:', err);
      let mensaje = 'Error al crear la reserva';
      if (err.responseJSON && err.responseJSON.mensaje) {
        mensaje = err.responseJSON.mensaje;
      }
      mostrarAlerta(mensaje, 'danger');
    },
    complete: function() {
      // Restaurar botón
      btnGuardar.prop('disabled', false).html('<i class="fas fa-save"></i> Guardar Reserva');
    }
  });
}

// Función para cargar reservas
function cargarReservas() {
  $.ajax({
    url: '/empleado/mis_reservas',
    method: 'GET',
    success: function(response) {
      const reservas = response.reservas || response;

      if (!reservas || reservas.length === 0) {
        $('#listaReservas').html('<p class="text-center">No tienes reservas activas.</p>');
        return;
      }

      let html = `
        <table class="table table-striped table-hover align-middle">
          <thead class="table-secondary">
            <tr>
              <th>Vehículo</th>
              <th>Matrícula</th>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
      `;

      reservas.forEach(r => {
        const fechaInicio = new Date(r.fecha_inicio).toLocaleString('es-ES');
        const fechaFin = new Date(r.fecha_fin).toLocaleString('es-ES');
        
        html += `
          <tr id="reserva-${r.id}">
            <td>${r.vehiculo_marca} ${r.vehiculo_modelo}</td>
            <td>${r.vehiculo_matricula}</td>
            <td>${fechaInicio}</td>
            <td>${fechaFin}</td>
            <td><span class="badge bg-success">${r.estado || 'Activa'}</span></td>
            <td>
              <button class="btn btn-danger btn-sm btn-cancelar-reserva" data-reserva-id="${r.id}">
                <i class="fas fa-times"></i> Cancelar
              </button>
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      $('#listaReservas').html(html);

      // Evento para cancelar reserva
      $('.btn-cancelar-reserva').on('click', function() {
        const reservaId = $(this).data('reserva-id');
        cancelarReserva(reservaId);
      });
    },
    error: function(err) {
      console.error('Error al cargar reservas:', err);
      $('#listaReservas').html('<p class="text-danger">Error al cargar las reservas.</p>');
    }
  });
}

// Función para cancelar reserva
function cancelarReserva(reservaId) {
  if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
    return;
  }

  $.ajax({
    url: `/empleado/cancelar_reserva/${reservaId}`,
    method: 'DELETE',
    success: function(response) {
      $(`#reserva-${reservaId}`).fadeOut(400, function() {
        $(this).remove();
        
        if ($('#listaReservas tbody tr').length === 0) {
          $('#listaReservas').html('<p class="text-center">No tienes reservas activas.</p>');
        }
      });

      // Recargar vehículos disponibles
      cargarVehiculosParaReserva();

      mostrarAlerta('Reserva cancelada exitosamente', 'success');
    },
    error: function(err) {
      console.error('Error al cancelar reserva:', err);
      mostrarAlerta('Error al cancelar la reserva', 'danger');
    }
  });
}

// Función auxiliar para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
  const alerta = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  $('#alertaContainer').html(alerta);
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    $('.alert').fadeOut();
  }, 5000);
}

// Inicializar al cargar la página
$(document).ready(function() {
  cargarVehiculosParaReserva();
  cargarReservas();

  // Evento del botón guardar en el modal
  $('#btnGuardarReserva').on('click', guardarReserva);
});