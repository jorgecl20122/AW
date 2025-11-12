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
              <button class="btn btn-reservar" 
                      data-vehiculo-id="${v.id}"
                      data-matricula="${v.matricula}"
                      data-marca="${v.marca}"
                      data-modelo="${v.modelo}">
                <i class="bi bi-calendar-check"></i><strong> Reservar</strong>
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
  
  // Configurar fecha mínima
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const fechaMin = now.toISOString().slice(0,16);
  
  const inputInicio = document.getElementById("fechaInicioReserva");
  const inputFin = document.getElementById("fechaFinReserva");
  
  if (inputInicio) inputInicio.min = fechaMin;
  if (inputFin) inputFin.min = fechaMin;
  
  $('#modalReserva').modal('show');
}

// Función para guardar la reserva
function guardarReserva() {
  console.log('=== INICIANDO GUARDADO DE RESERVA ===');
  
  const vehiculoId = $('#vehiculoIdReserva').val();
  const fechaInicio = $('#fechaInicioReserva').val();
  const fechaFin = $('#fechaFinReserva').val();

  console.log('Datos capturados:', {vehiculoId, fechaInicio, fechaFin});

  // Validaciones
  if (!vehiculoId) {
    alert('Error: No se ha seleccionado un vehículo');
    return;
  }

  if (!fechaInicio || !fechaFin) {
    alert('Por favor, completa ambas fechas');
    return;
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    alert('Las fechas no son válidas');
    return;
  }

  if (fin <= inicio) {
    alert('La fecha de fin debe ser posterior a la fecha de inicio');
    return;
  }

  // Convertir las fechas a formato ISO para enviar al servidor
  const fechaInicioISO = inicio.toISOString();
  const fechaFinISO = fin.toISOString();

  console.log('Fechas convertidas a ISO:', {fechaInicioISO, fechaFinISO});

  // Deshabilitar botón mientras se procesa
  const btnGuardar = $('#btnGuardarReserva');
  btnGuardar.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Guardando...');

  const datosReserva = {
    vehiculo_id: parseInt(vehiculoId),
    fecha_inicio: fechaInicioISO,
    fecha_fin: fechaFinISO
  };

  console.log('Datos a enviar:', datosReserva);

  $.ajax({
    url: '/empleado/crear_reserva',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(datosReserva),
    success: function(response) {
      console.log('Respuesta exitosa:', response);
      
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
    error: function(xhr, status, error) {
      console.error('=== ERROR AL CREAR RESERVA ===');
      console.error('Status:', xhr.status);
      console.error('Error:', error);
      console.error('Response:', xhr.responseText);
      console.error('Response JSON:', xhr.responseJSON);
      
      let mensaje = 'Error al crear la reserva';
      
      if (xhr.status === 404) {
        mensaje = 'Ruta no encontrada. Verifica la configuración del servidor.';
      } else if (xhr.status === 401) {
        mensaje = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (xhr.responseJSON && xhr.responseJSON.mensaje) {
        mensaje = xhr.responseJSON.mensaje;
      }
      
      mostrarAlerta(mensaje, 'danger');
    },
    complete: function() {
      // Restaurar botón
      btnGuardar.prop('disabled', false).html('<i class="fas fa-save"></i> Guardar Reserva');
    }
  });
}

// Función para cargar reservas - CORREGIDA
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
        
        // CORRECCIÓN: Verde para activa, Rojo para finalizada
        const estadoNormalizado = r.estado.toLowerCase();
        const badgeClass = estadoNormalizado === 'activa' ? 'bg-success' : 'bg-danger';
        const estadoTexto = r.estado.charAt(0).toUpperCase() + r.estado.slice(1);
        
        html += `
          <tr id="reserva-${r.id}">
            <td>${r.vehiculo_marca} ${r.vehiculo_modelo}</td>
            <td>${r.vehiculo_matricula}</td>
            <td>${fechaInicio}</td>
            <td>${fechaFin}</td>
            <td>
              <span class="badge ${badgeClass}">
                ${estadoTexto}
              </span>
            </td>
            <td>
              ${estadoNormalizado === 'activa' ? `
                <button class="btn btn-cancelar-reserva" data-reserva-id="${r.id}">
                  <i class="bi bi-x-circle"></i><strong> Cancelar </strong>
                </button>
              ` : '<span class="text-muted">-</span>'}
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

// Función para cancelar reserva - CORREGIDA
function cancelarReserva(reservaId) {
  if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
    return;
  }

  console.log('Cancelando reserva ID:', reservaId);

  $.ajax({
    url: `/empleado/cancelar_reserva/${reservaId}`,  // SIN barra al inicio después de empleado
    method: 'DELETE',
    success: function(response) {
      console.log('Reserva cancelada exitosamente:', response);
      
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
    error: function(xhr, status, error) {
      console.error('Error al cancelar reserva:', xhr);
      console.error('Status:', xhr.status);
      console.error('Response:', xhr.responseText);
      
      let mensaje = 'Error al cancelar la reserva';
      if (xhr.responseJSON && xhr.responseJSON.mensaje) {
        mensaje = xhr.responseJSON.mensaje;
      }
      
      mostrarAlerta(mensaje, 'danger');
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

// Función para finalizar reservas vencidas automáticamente
function finalizarReservasVencidas() {
  $.ajax({
    url: '/empleado/finalizar_reservas_vencidas',
    method: 'POST',
    success: function(response) {
      console.log('Reservas vencidas actualizadas:', response);
      if (response.reservas_finalizadas > 0) {
        console.log(`${response.reservas_finalizadas} reservas han sido finalizadas`);
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

// Inicializar al cargar la página
$(document).ready(function() {
  // Finalizar reservas vencidas al cargar
  finalizarReservasVencidas();
  
  // Cargar datos
  cargarVehiculosParaReserva();
  cargarReservas();

  // Evento del botón guardar en el modal
  $('#btnGuardarReserva').on('click', guardarReserva);
  
  // Verificar reservas vencidas cada 5 minutos
  setInterval(finalizarReservasVencidas, 5 * 60 * 1000);
});