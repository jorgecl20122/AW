$(document).ready(function () {

// ============================================
// SECCIÓN: CONCESIONARIOS
// ============================================
   
    // función que sirve para recargar los cards después de crear/editar/eliminar concesionarios
    function RecargarPágina() {
        window.location.reload(); //recargamos la página para obtener los datos actualizados
    }

    // --------------------------------------------
    // BOTONES DE CONCESIONARIOS
    // --------------------------------------------

    // Eliminar concesionario CHECK.
    $('#concesionarios-container').on('click', '.btn-delete', function() {
        const $btn = $(this);
        const card = $btn.closest('.vehicle-card');
        const containerCol = card.closest('.col-md-6');
        const id = card.attr('data-id');

            $.ajax({
                method: 'DELETE',
                url: `/admin/api/${id}`,
                success: function(data) {
                    alert(data.mensaje || 'Concesionario eliminado correctamente');
                    containerCol.fadeOut(300, function() { $(this).remove(); });
                     RecargarPágina();
                },
                error: function(xhr) {
                    const msg = xhr.responseJSON?.mensaje || xhr.statusText || 'Error al eliminar concesionario';
                    alert(msg);
                }
            });
    });

    // Editar un concesionario CHECK.
    $('#concesionarios-container').on('click', '.btn-edit', function() {
        const card = $(this).closest('.vehicle-card');
        const id = card.attr('data-id');

        // Extraer los valores del card:
        const nombre = card.find('h5 strong').first().text().trim();
        const ciudad = card.find('i.bi-geo-alt').parent().text().replace('Ciudad:', '').trim();
        const telefono = card.find('i.bi-telephone').parent().text().replace('Teléfono:', '').trim();
        const correo = card.find('i.bi-envelope').parent().text().replace('Correo:', '').trim();

        // Rellenar los campos del modal:
        $('#modalEdit').data('id', id);
        $('#editNombre').val(nombre);
        $('#editCiudad').val(ciudad);
        $('#editCorreo').val(correo);
        $('#editTelefono').val(telefono);

        // Mostrar el modal:
        const modal = new bootstrap.Modal(document.getElementById('modalEdit'));
        modal.show();
    });

    // Guardar los cambios de concesionario CHECK.
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
                 RecargarPágina();
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.mensaje || 'Error al actualizar concesionario');
            }
        });
    });

// --------------------------------------------
// AÑADIR NUEVO CONCESIONARIO
// --------------------------------------------

    // Efectos del formulario "Añadir concesionario" CHECK.
    $(document).ready(function() {
        $('#formConcesionarioContainer').hide();

        $('#btnAddConcesionario').on('click', function() {
          $('#formConcesionarioContainer').slideToggle(300);
        });

        $('#cancelarConcesionario').on('click', function() {
          $('#formNuevoConcesionario')[0].reset();
          $('#formConcesionarioContainer').slideUp(300);
        });
    });

    // Guardar nuevo concesionario CHECK.
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
           RecargarPágina();
          alert('Concesionario agregado correctamente');
        },
        error: function(err) {
          alert(err.responseJSON?.mensaje || 'Error al añadir el concesionario');
        }
      });
    });

// --------------------------------------------
// BUSCADOR DE VEHÍCULOS
// --------------------------------------------

    // Filtrar vehículos en la tabla CHECK.
    $('#buscarVehiculo').on('keyup', function() {
        const textoBusqueda = $(this).val().toLowerCase().trim();
        
        if (textoBusqueda === '') {
            $('#tabla-vehiculos tbody tr').show();
            return;
        }
        
        $('#tabla-vehiculos tbody tr').each(function() {
            const fila = $(this);
            
            const matricula = fila.find('td:nth-child(1)').text().toLowerCase();
            const marca = fila.find('td:nth-child(2)').text().toLowerCase();
            const modelo = fila.find('td:nth-child(3)').text().toLowerCase();
            const concesionario = fila.find('td:nth-child(9)').text().toLowerCase();
            const autonomia = fila.find('td:nth-child(6)').text().toLowerCase();
            const plazas = fila.find('td:nth-child(5)').text().toLowerCase();
           
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
        
        const filasVisibles = $('#tabla-vehiculos tbody tr:visible').length;
        
        if (filasVisibles === 0) {
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
            $('#mensajeNoResultados').remove();
        }
    });


// --------------------------------------------
// BOTONES DE VEHÍCULOS
// --------------------------------------------

    // Eliminar vehículo CHECK.
    $('#vehiculos-container').on('click', '.btn-delete-vehiculo', function() {
        const fila = $(this).closest('tr');
        const id = fila.data('id');

        if (confirm('¿Seguro que deseas eliminar este vehículo?')) {
            $.ajax({
                method: 'DELETE',
                url: `/admin/vehiculos/${id}`,
                success: function(respuesta) {
                    alert(respuesta.mensaje || 'Vehículo eliminado correctamente');
                    RecargarPágina();
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

        const matricula = fila.find('td:nth-child(1)').text().trim();
        const marca = fila.find('td:nth-child(2)').text().trim();
        const modelo = fila.find('td:nth-child(3)').text().trim();
        const anio = fila.find('td:nth-child(4)').text().trim();
        const plazas = fila.find('td:nth-child(5)').text().trim();
        const autonomia = fila.find('td:nth-child(6)').text().replace(' km', '').trim();
        const color = fila.find('td:nth-child(7)').text().trim();

        $('#modalEditVehiculo').data('id', id);
        $('#editMatricula').val(matricula);
        $('#editMarca').val(marca);
        $('#editModelo').val(modelo);
        $('#editAnio').val(anio);
        $('#editPlazas').val(plazas);
        $('#editAutonomia').val(autonomia);
        $('#editColor').val(color);

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
                RecargarPágina();
                bootstrap.Modal.getInstance(document.getElementById('modalEditVehiculo')).hide();
            },
            error: function(err) {
                console.error('Error al actualizar vehículo:', err);
                alert(err.responseJSON?.mensaje || 'Error al actualizar vehículo');
            }
        });
    });


// --------------------------------------------
// AÑADIR NUEVO VEHÍCULO
// --------------------------------------------

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

    // Efectos del formulario "Añadir Vehículo" CHECK.
    $(document).ready(function() {
      $('#formVehiculoContainer').hide();

      $('#btnAddVehiculo').on('click', function() {
        $('#formVehiculoContainer').slideToggle(300);
        cargarConcesionariosSelect();
      });

      $('#cancelarVehiculo').on('click', function() {
        $('#formNuevoVehiculo')[0].reset();
        $('#formVehiculoContainer').slideUp(300);
      });
    });

    // Guardar un vehículo nuevo CHECK.
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
      const id_concesionario = $('#nuevoIdConcesionario').val();
      const imagenFile = $('#nuevaImagen')[0].files[0];

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
        processData: false,
        contentType: false,
        success: function(response) {
          alert('Vehículo agregado correctamente');
           RecargarPágina();
          $('#formNuevoVehiculo')[0].reset();
          $('#previewContainer').hide();
          $('#formVehiculoContainer').hide();
          
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


// --------------------------------------------
// VER VEHÍCULOS DE UN CONCESIONARIO
// --------------------------------------------

   // Botón para ver vehículos de un concesionario CHECK.
$(document).on('click', '.btn-ver-vehiculos', function() {
    const id = $(this).data('id'); 
    
    if (!id) {
        alert('No se ha encontrado el ID del concesionario');
        return;
    }

    // Mostrar mensaje de carga
    $('#listaVehiculosConcesionario').html('<p class="text-center"><i class="bi bi-hourglass-split"></i> Cargando vehículos...</p>');
    
   $.ajax({
        url: `/admin/lista_vehiculos/${id}`,
        method: 'GET',
        success: function(html) {
            $('#listaVehiculosConcesionario').html(html);
        },
        error: function(err) {
            console.error(err);
            $('#listaVehiculosConcesionario').html('<p class="text-danger text-center">Error al cargar los vehículos.</p>');
        }
    });

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalVehiculosConcesionario'));
    modal.show();
});

// ============================================
// SECCIÓN: ESTADÍSTICAS
// ============================================

   function cargarReservasPorConcesionario() {
  $('#tabla-concesionarios').html(`
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2 text-muted">Cargando estadísticas...</p>
    </div>
  `);

  $.ajax({
    url: '/empleado/estadisticas/reservas-concesionario',
    method: 'GET',
    success: function(html) {
      $('#tabla-concesionarios').html(html);
    },
    error: function(err) {
      console.error('Error al cargar reservas por concesionario:', err);
      $('#tabla-concesionarios').html('<p class="text-danger text-center">Error al cargar los datos</p>');
    }
  });
}



function cargarVehiculosMasUsados() {
    $('#vehiculos-mas-usados').html('<p class="text-center py-4"><i class="bi bi-hourglass-split"></i> Cargando vehículos destacados...</p>');

    $.ajax({
        url: '/admin/estadisticas/vehiculo-mas-usado',
        method: 'GET',
        success: function(html) {
            $('#vehiculos-mas-usados').html(html);
        },
        error: function(err) {
            console.error('Error al cargar vehículos más usados:', err);
            $('#vehiculos-mas-usados').html('<p class="text-danger text-center">Error al cargar los datos</p>');
        }
    });
}

    // Cargar estadísticas al iniciar CHECK.
    $(document).ready(function() {
        cargarReservasPorConcesionario();
        cargarVehiculosMasUsados();
    });


}); 