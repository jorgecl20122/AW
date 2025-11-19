$(document).ready(function () {

/* FUNCIÓN CARGAR CONCESIONARIOS: para cargar los concesionarios de forma dinámica en cards 
desde la base de datos al entrar en la vista de administración.
*/

//CHECK.
    function cargarConcesionarios() {
        $.ajax({
            url: '/admin/lista_concesionarios',
            method: 'GET',
            success: function(concesionarios) {

                let html = '<div class="row g-3">';

                concesionarios.forEach(c => {
                   html += `
                    <div class="col-md-6">
                        <div class="vehicle-card" data-id="${c.id_concesionario}">
                        <h5><strong>${c.nombre}</strong> <span class="badge bg-success">Activo</span></h5>
                        <p class="text-muted"><i class="bi bi-geo-alt"></i> Ciudad: ${c.ciudad || 'Sin especificar'}</p>
                        <p><i class="bi bi-telephone"></i> Teléfono: ${c.telefono || '-'}</p>
                        <p><i class="bi bi-envelope"></i> Correo: ${c.correo}</p><br>
                        <div class="d-flex gap-2">
                            <button class="btn btn-ver-vehiculos" data-id="${c.id_concesionario}"><i class="bi bi-car-front"></i><strong> Vehículos</strong></button>
                            <button class="btn btn-edit"><i class="bi bi-pencil-fill"></i><strong> Editar</strong></button>
                            <button class="btn btn-delete"><i class="bi bi-trash-fill"></i><strong> Eliminar</strong></button>
                        </div>
                        </div>
                    </div>`;
                });

                html += '</div>';
                $('#concesionarios-container').html(html).show();
            },
            error: function(err) {
                console.error('Error al cargar concesionarios:', err);
                alert('Error al cargar concesionarios');
            }
        });
    }

    // Cargamos automáticamente al entrar y así aparecen sin recargar la página CHECK.
    cargarConcesionarios();


//-------------------------------------------------------------------------------
// FUNCIONES PARA BOTONES DE CADA CARD (Eliminar y Editar concesionario)
//-------------------------------------------------------------------------------

    // Eliminar concesionario (cliente) CHECK.
$('#concesionarios-container').on('click', '.btn-delete', function() {
    const $btn = $(this);
    // buscamos la tarjeta correcta
    const card = $btn.closest('.vehicle-card');
    const containerCol = card.closest('.col-md-6'); // contenedor externo para eliminar todo el bloque
    const id = card.attr('data-id');

    if (confirm('¿Seguro que quieres eliminar este concesionario?')) {
        $.ajax({
            method: 'DELETE',
            // ajusta la URL según dónde montes el router (ver sección servidor abajo)
            url: `/admin/api/${id}`,
            success: function(data) {
                alert(data.mensaje || 'Concesionario eliminado correctamente');
                // animación suave antes de retirar el elemento
                containerCol.fadeOut(300, function() { $(this).remove(); });
            },
            error: function(xhr) {
                // mejor manejo de errores
                const msg = xhr.responseJSON?.mensaje || xhr.statusText || 'Error al eliminar concesionario';
                alert(msg);
            }
        });
    }
});

// Editar un concesionario (cliente) CHECK.
$('#concesionarios-container').on('click', '.btn-edit', function() {
    const card = $(this).closest('.vehicle-card'); // ⭐ Cambiado de .card a .vehicle-card
    const id = card.attr('data-id');

    // Extraer los valores del card de forma más robusta
    const nombre = card.find('h5 strong').first().text().trim();
    
    // Para ciudad, correo y teléfono, buscar por el ícono
    const ciudad = card.find('i.bi-geo-alt').parent().text().replace('Ciudad:', '').trim();
    const telefono = card.find('i.bi-telephone').parent().text().replace('Teléfono:', '').trim();
    const correo = card.find('i.bi-envelope').parent().text().replace('Correo:', '').trim();

    // Rellenar los campos del modal
    $('#modalEdit').data('id', id);
    $('#editNombre').val(nombre);
    $('#editCiudad').val(ciudad); // Asegúrate que el input se llame así
    $('#editCorreo').val(correo);
    $('#editTelefono').val(telefono);

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalEdit'));
    modal.show();
});

// Guardar los cambios CHECK.
$('#formEditConcesionario').on('submit', function(e) {
    e.preventDefault();
    
    const id = $('#modalEdit').data('id');
    const nombre = $('#editNombre').val().trim();
    const ciudad = $('#editCiudad').val().trim();
    const correo = $('#editCorreo').val().trim();
    const telefono = $('#editTelefono').val().trim();

    if (!nombre || !ciudad || !correo || !telefono) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }

    $.ajax({
        method: 'PUT',
        url: `/admin/api/${id}`,
        contentType: 'application/json',
        data: JSON.stringify({ nombre, ciudad, correo, telefono }),
        success: function(data) {
            alert(data.mensaje || 'Concesionario actualizado correctamente');
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdit'));
            modal.hide();
            
            // Recargar concesionarios
            cargarConcesionarios();
        },
        error: function(xhr) {
            alert(xhr.responseJSON?.mensaje || 'Error al actualizar concesionario');
        }
    });
});

//---------------------------------------------------------
// Para los efectos del formulario "Añadir concesionario"
//---------------------------------------------------------
    $(document).ready(function() {
        // Asegurarnos de que el formulario está oculto al inicio
        $('#formConcesionarioContainer').hide();

        // Toggle al hacer clic en "Añadir Concesionario"
        $('#btnAddConcesionario').on('click', function() {
          $('#formConcesionarioContainer').slideToggle(300);
        });

        // Cancelar y ocultar formulario
        $('#cancelarConcesionario').on('click', function() {
          $('#formNuevoConcesionario')[0].reset();
          $('#formConcesionarioContainer').slideUp(300);
        });
    });
//---------------------------------------------------------

   // Guardar nuevo concesionario (cliente) CHECK.
$('#formNuevoConcesionario').on('submit', function(e) {
  e.preventDefault();

  const nombre = $('#nuevoNombre').val().trim();
  const ciudad = $('#nuevaCiudad').val().trim();
  const correo = $('#nuevoCorreo').val().trim();
  const telefono = $('#nuevoTelefono').val().trim();

  if (!nombre || !ciudad || !correo) {
    alert('Por favor, completa todos los campos obligatorios.');
    return;
  }

  $.ajax({
    method: 'POST',
    url: '/admin/api',
    contentType: 'application/json',
    data: JSON.stringify({ nombre, ciudad, correo, telefono }),
    success: function(data) {
      $('#formNuevoConcesionario')[0].reset();
      $('#formConcesionarioContainer').slideUp(300);
      
      // Recargar todos los concesionarios
      cargarConcesionarios();
      
      // Alert después de recargar (opcional)
      alert('Concesionario agregado correctamente');
    },
    error: function(err) {
      alert(err.responseJSON?.mensaje || 'Error al añadir el concesionario');
    }
  });
});

// CHECK.
function cargarVehiculosTabla() {
    $.ajax({
        url: '/admin/lista_vehiculos', // Endpoint que devuelve los vehículos en JSON
        method: 'GET',
        success: function(vehiculos) {
            console.log('Vehículos recibidos:', vehiculos);

            if (vehiculos.length === 0) {
                $('#vehiculos-container').html('<p>No hay vehículos registrados.</p>').show();
                return;
            }

            let html = `
            <table class="table table-striped table-hover align-middle" id="tabla-vehiculos">
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
                        <th>Concesionario</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
            `;

            vehiculos.forEach(v => {
                html += `
                    <tr data-id="${v.id}">
                        <td>${v.matricula}</td>
                        <td>${v.marca}</td>
                        <td>${v.modelo}</td>
                        <td>${v.anio_matriculacion}</td>
                        <td>${v.numero_plazas}</td>
                        <td>${v.autonomia_km} km</td>
                        <td>${v.color}</td>
                        <td>${v.imagen ? `<img src="${v.imagen}" alt="Imagen" class="vehiculo-img">` : '-'}</td>
                        <td>${v.concesionario}</td>
                        <td>
                            <button class="btn btn-sm btn-edit-vehiculo"><i class="bi bi-pencil-fill"></i><strong> Editar</strong></button>
                            <button class="btn btn-sm btn-delete-vehiculo"><i class="bi bi-trash-fill"></i></i><strong> Eliminar</strong></button>
                        </td>
                    </tr>
                `;
            });


            html += `
                </tbody>
            </table>
            `;
            $('#vehiculos-container').html(html).show();
        },
        error: function(err) {
            console.error('Error al cargar todos los vehículos:', err);
            $('#vehiculos-container').html('<p class="text-danger">Error al cargar vehículos.</p>');
        }
    });
} 

// Cargar vehículos al entrar en la vista
cargarVehiculosTabla();

// Buscador de vehículos en la tabla
$('#buscarVehiculo').on('keyup', function() {
    const textoBusqueda = $(this).val().toLowerCase().trim();
    
    // Si está vacío, mostrar todos los vehículos
    if (textoBusqueda === '') {
        $('#tabla-vehiculos tbody tr').show();
        return;
    }
    
    // Filtrar filas de la tabla
    $('#tabla-vehiculos tbody tr').each(function() {
        const fila = $(this);
        
        // Obtener valores de las columnas relevantes
        const matricula = fila.find('td:nth-child(1)').text().toLowerCase();
        const marca = fila.find('td:nth-child(2)').text().toLowerCase();
        const modelo = fila.find('td:nth-child(3)').text().toLowerCase();
        const concesionario = fila.find('td:nth-child(9)').text().toLowerCase();
         const autonomia = fila.find('td:nth-child(6)').text().toLowerCase();
        const plazas = fila.find('td:nth-child(5)').text().toLowerCase();
       
        
        // Buscar en matrícula, marca, modelo o concesionario
        if (matricula.includes(textoBusqueda) || 
            marca.includes(textoBusqueda) || 
            modelo.includes(textoBusqueda) ||
            concesionario.includes(textoBusqueda) ||
            autonomia.includes(textoBusqueda) ||
            plazas.includes(textoBusqueda)) {
            fila.show();
        } else {
            fila.hide();
        }
    });
    
    // Mostrar mensaje si no hay resultados
    const filasVisibles = $('#tabla-vehiculos tbody tr:visible').length;
    
    if (filasVisibles === 0) {
        // Si no existe el mensaje, lo añadimos
        if ($('#mensajeNoResultados').length === 0) {
            $('#tabla-vehiculos tbody').append(`
                <tr id="mensajeNoResultados">
                    <td colspan="10" class="text-center text-muted py-4">
                        <i class="bi bi-search"></i> No se encontraron vehículos que coincidan con "${textoBusqueda}"
                    </td>
                </tr>
            `);
        }
    } else {
        // Eliminar mensaje si hay resultados
        $('#mensajeNoResultados').remove();
    }
});

    
// Eliminar vehículo desde la tabla CHECK.
$('#vehiculos-container').on('click', '.btn-delete-vehiculo', function() {
    const fila = $(this).closest('tr');
    const id = fila.data('id');

    if (confirm('¿Seguro que deseas eliminar este vehículo?')) {
        $.ajax({
            method: 'DELETE',
            url: `/admin/vehiculos/${id}`, // Ruta al endpoint de eliminación
            success: function(respuesta) {
                alert(respuesta.mensaje || 'Vehículo eliminado correctamente');
                cargarVehiculosTabla(); // Recargar la tabla actualizada
            },
            error: function(err) {
                console.error('Error al eliminar vehículo:', err);
                alert(err.responseJSON?.mensaje || 'Error al eliminar vehículo');
            }
        });
    }
});


    // Editar vehículo CHECK.
$('#vehiculos-container').on('click', '.btn-edit-vehiculo', function() {
    const fila = $(this).closest('tr');
    const id = fila.data('id');

    // Extraer los valores de la fila
    const matricula = fila.find('td:nth-child(1)').text().trim();
    const marca = fila.find('td:nth-child(2)').text().trim();
    const modelo = fila.find('td:nth-child(3)').text().trim();
    const anio = fila.find('td:nth-child(4)').text().trim();
    const plazas = fila.find('td:nth-child(5)').text().trim();
    const autonomia = fila.find('td:nth-child(6)').text().replace(' km', '').trim();
    const color = fila.find('td:nth-child(7)').text().trim();

    // Rellenar el modal con los datos
    $('#modalEditVehiculo').data('id', id);
    $('#editMatricula').val(matricula);
    $('#editMarca').val(marca);
    $('#editModelo').val(modelo);
    $('#editAnio').val(anio);
    $('#editPlazas').val(plazas);
    $('#editAutonomia').val(autonomia);
    $('#editColor').val(color);

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalEditVehiculo'));
    modal.show();
});

// Guardar cambios de vehículo CHECK.
$('#guardarEditVehiculo').on('click', function() {
    const id = $('#modalEditVehiculo').data('id');
    const marca = $('#editMarca').val().trim();
    const modelo = $('#editModelo').val().trim();
    const anio = $('#editAnio').val().trim();
    const plazas = $('#editPlazas').val().trim();
    const autonomia = $('#editAutonomia').val().trim();
    const color = $('#editColor').val().trim();
    const estado = $('#editEstado').val();

    if (!marca || !modelo || !anio || !plazas || !autonomia) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }

    $.ajax({
        method: 'PUT',
        url: `/admin/vehiculos/${id}`,
        contentType: 'application/json',
        data: JSON.stringify({
            marca,
            modelo,
            anio_matriculacion: anio,
            numero_plazas: plazas,
            autonomia_km: autonomia,
            color,
            estado
        }),
        success: function(data) {
            alert(data.mensaje || 'Vehículo actualizado correctamente');
            cargarVehiculosTabla(); // Recargar la tabla
            bootstrap.Modal.getInstance(document.getElementById('modalEditVehiculo')).hide();
        },
        error: function(err) {
            console.error('Error al actualizar vehículo:', err);
            alert(err.responseJSON?.mensaje || 'Error al actualizar vehículo');
        }
    });
});

// Cargar concesionarios en el select CHECK.
function cargarConcesionariosSelect() {
  $.ajax({
    url: '/admin/lista_concesionarios',
    method: 'GET',
    success: function(concesionarios) {
      const select = $('#nuevoIdConcesionario');
      select.empty();
      select.append('<option value="">Selecciona un concesionario</option>');
      
      concesionarios.forEach(function(concesionario) {
        select.append(
          `<option value="${concesionario.id_concesionario}">
            ${concesionario.nombre} - ${concesionario.ciudad}
          </option>`
        );
      });
    },
    error: function(xhr) {
      console.error('Error al cargar concesionarios:', xhr);
      alert('Error al cargar la lista de concesionarios');
    }
  });
}

// CHECK.
$(document).ready(function() {
  // Asegurarnos de que el formulario está oculto al inicio
  $('#formVehiculoContainer').hide();

  // Toggle al hacer clic en "Añadir Vehículo"
  $('#btnAddVehiculo').on('click', function() {
    $('#formVehiculoContainer').slideToggle(300);
    cargarConcesionariosSelect();
  });

  // Cancelar y ocultar formulario
  $('#cancelarVehiculo').on('click', function() {
    $('#formNuevoVehiculo')[0].reset();
    $('#formVehiculoContainer').slideUp(300);
  });
});

//---------------------------------------------------------

//Guardar un vehículo nuevo CHECK.
$('#formNuevoVehiculo').on('submit', function(e) {
  e.preventDefault();

  const matricula = $('#nuevaMatricula').val().trim();
  const marca = $('#nuevaMarca').val().trim();
  const modelo = $('#nuevoModelo').val().trim();
  const anio = parseInt($('#nuevoAnio').val());
  const plazas = parseInt($('#nuevasPlazas').val());
  const autonomia = parseInt($('#nuevaAutonomia').val());
  const color = $('#nuevoColor').val().trim();
  const estado = $('#nuevoEstado').val();
  const id_concesionario = $('#nuevoIdConcesionario').val(); // ← AÑADE ESTO
  const imagenFile = $('#nuevaImagen')[0].files[0];

  // Validación de campos obligatorios
  if (!matricula || !marca || !modelo || !anio || !plazas || !autonomia || !color || !estado || !id_concesionario) {
    alert('Por favor, completa todos los campos obligatorios.');
    return;
  }

  if (!imagenFile) {
    alert('Por favor, selecciona una imagen del vehículo.');
    return;
  }

  if (anio < 1900 || anio > 2025) {
    alert('El año debe estar entre 1900 y 2025.');
    return;
  }

  if (plazas < 1 || plazas > 50) {
    alert('El número de plazas debe estar entre 1 y 50.');
    return;
  }

  if (autonomia < 0) {
    alert('La autonomía no puede ser negativa.');
    return;
  }

  // Crear FormData para enviar datos + imagen
  const formData = new FormData();
  formData.append('matricula', matricula);
  formData.append('marca', marca);
  formData.append('modelo', modelo);
  formData.append('anio', anio);
  formData.append('plazas', plazas);
  formData.append('autonomia', autonomia);
  formData.append('color', color);
  formData.append('estado', estado);
  formData.append('id_concesionario', id_concesionario); 
  formData.append('imagen', imagenFile);

  $.ajax({
    url: '/admin/vehiculos',
    method: 'POST',
    data: formData,
    processData: false,  // Importante para FormData
    contentType: false,  // Importante para FormData
    success: function(response) {
      alert('Vehículo agregado correctamente');
      
      // Limpiar el formulario
      $('#formNuevoVehiculo')[0].reset();
      $('#previewContainer').hide();
      $('#formVehiculoContainer').hide();
      
      // Recargar la tabla de vehículos
      cargarVehiculosTabla(); 
    },
    error: function(xhr) {
      const error = xhr.responseJSON;
      if (error && error.mensaje) {
        alert('Error: ' + error.mensaje);
      } else {
        alert('Error al añadir el vehículo');
      }
      console.error('Error completo:', xhr);
    }
  });
});

// Cargar vehículos de un concesionario específico CHECK.
function cargarVehiculosPorConcesionario(idConcesionario) {
  $.ajax({
    url: `/admin/lista_vehiculos/${idConcesionario}`,
    method: 'GET',
    success: function(vehiculos) {

      if (!vehiculos || vehiculos.length === 0) {
        $('#listaVehiculosConcesionario').html('<p class="text-center">Este concesionario no tiene vehículos registrados.</p>');
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
            </tr>
          </thead>
          <tbody>
      `;

      vehiculos.forEach(v => {
        html += `
          <tr data-id="${v.id}">
            <td>${v.matricula}</td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.anio_matriculacion}</td>
            <td>${v.numero_plazas}</td>
            <td>${v.autonomia_km} km</td>
            <td>${v.color}</td>
            <td>${v.imagen ? `<img src="${v.imagen}" alt="Imagen" class="vehiculo-img">` : '-'}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      $('#listaVehiculosConcesionario').html(html);
    },
    error: function(err) {
      console.error('Error al cargar vehículos del concesionario:', err);
      $('#listaVehiculosConcesionario').html('<p class="text-danger">Error al cargar los vehículos.</p>');
    }
  });
}

// Cargar vehiculos de un concesionario CHECK.
$(document).on('click', '.btn-ver-vehiculos', function() {
    // Obtener el ID del botón clicado (this)
   const id = $(this).data('id'); 
    
    if (!id) {
        alert('No se ha encontrado el ID del concesionario');
        return;
    }

    // Guardar el ID en el modal para referencia futura
    $('#modalVehiculosConcesionario').data('id', id);
    
    // Cargar los vehículos del concesionario
    cargarVehiculosPorConcesionario(id);
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalVehiculosConcesionario'));
    modal.show();
});

// ============================================
// FUNCIÓN PARA CARGAR RESERVAS POR CONCESIONARIO
// Agregar al archivo script_admin.js o crear uno nuevo
// ============================================

function cargarReservasPorConcesionario() {
  $.ajax({
    url: '/empleado/estadisticas/reservas-concesionario',
    method: 'GET',
    success: function(response) {
      const concesionarios = response.concesionarios || [];
      
      if (concesionarios.length === 0) {
        $('#tabla-concesionarios').html('<p class="text-center text-muted">No hay datos disponibles</p>');
        return;
      }

      let html = `
        <table class="table table-striped table-hover align-middle">
          <thead class="table-secondary">
            <tr>
              <th>Concesionario</th>
              <th class="text-center">Total Reservas</th>
              <th class="text-center">Activas</th>
              <th class="text-center">Finalizadas</th>
              <th class="text-center">Canceladas</th>
            </tr>
          </thead>
          <tbody>
      `;

      concesionarios.forEach(c => {
        html += `
          <tr>
            <td>
              <strong>${c.concesionario}</strong>
            </td>
            <td class="text-center">
              <span class="badge bg-primary fs-6">${c.total_reservas || 0}</span>
            </td>
            <td class="text-center">
              <span class="badge bg-success fs-6">${c.activas || 0}</span>
            </td>
            <td class="text-center">
              <span class="badge bg-danger fs-6">${c.finalizadas || 0}</span>
            </td>
            <td class="text-center">
              <span class="badge bg-secondary fs-6">${c.canceladas || 0}</span>
            </td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;

      $('#tabla-concesionarios').html(html);
    },
    error: function(err) {
      console.error('Error al cargar reservas por concesionario:', err);
      $('#tabla-concesionarios').html('<p class="text-danger text-center">Error al cargar los datos</p>');
    }
  });
}

// Cargar vehículos más usados por concesionario
function cargarVehiculosMasUsados() {
    $.ajax({
        url: '/admin/estadisticas/vehiculo-mas-usado',
        method: 'GET',
        success: function(vehiculos) {
            if (!vehiculos || vehiculos.length === 0) {
                $('#vehiculos-mas-usados').html('<p class="text-center text-muted">No hay datos disponibles</p>');
                return;
            }

            let html = '<div class="row g-3">';

            vehiculos.forEach(v => {
                html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="card shadow-sm border-0 h-100">
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <img src="${v.imagen || '/img/default-car.png'}" 
                                         alt="${v.marca} ${v.modelo}" 
                                         class="img-fluid rounded vehiculo-destacado-img"
                                         style="max-height: 200px; object-fit: cover;">
                                </div>
                                <h4 class="fw-bold mb-2">${v.marca} ${v.modelo}</h4>
                                <p class="text-muted mb-3">
                                    <i class="bi bi-building"></i> ${v.concesionario}
                                </p>
                                <div class="d-flex justify-content-center align-items-center gap-2">
                                    <span class="badge bg-primary fs-5 px-3 py-2">
                                        <i class="bi bi-calendar-check"></i> ${v.total_reservas} reservas
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $('#vehiculos-mas-usados').html(html);
        },
        error: function(err) {
            console.error('Error al cargar vehículos más usados:', err);
            $('#vehiculos-mas-usados').html('<p class="text-danger text-center">Error al cargar los datos</p>');
        }
    });
}

// Llamar función cuando se carga la página
$(document).ready(function() {
    cargarReservasPorConcesionario();
    cargarVehiculosMasUsados();
});


});
