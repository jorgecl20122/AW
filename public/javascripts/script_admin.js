$(document).ready(function () {

/* FUNCIÓN CARGAR CONCESIONARIOS: para cargar los concesionarios de forma dinámica en cards 
desde la base de datos al entrar en la vista de administración.
*/
    function cargarConcesionarios() {
        $.ajax({
            url: '/admin/lista_concesionarios',
            method: 'GET',
            success: function(concesionarios) {
                console.log('Concesionarios recibidos:', concesionarios);

                let html = '<div class="row g-3">';

                concesionarios.forEach(c => {
                    html += `
                       <div class="col-md-6">
                          <div class="vehicle-card">
                            <h5>${c.nombre} <span class="badge bg-success">Activo</span></h5>
                            <p class="text-muted"><i class="bi bi-geo-alt"></i> Ciudad: ${c.ciudad || 'Sin especificar'}</p>
                            <p><i class="bi bi-telephone"></i> Teléfono: ${c.telefono || '-'}</p>
                            <p><i class="bi bi-envelope"></i> Correo: ${c.correo}</p><br>
                            <div class="d-flex gap-2">
                              <button class="btn btn-edit">Editar</button>
                              <button class="btn btn-delete">Eliminar</button>
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


    // Cargamos automáticamente al entrar y así aparecen sin recargar la página
    cargarConcesionarios();

//-------------------------------------------------------------------------------
// FUNCIONES PARA BOTONES DE CADA CARD (Eliminar y Editar concesionario)
//-------------------------------------------------------------------------------
    // Eliminar concesionario
    $('#concesionarios-container').on('click', '.btn-delete', function() {
        const card = $(this).closest('.card');
        const id = card.data('id');

        if (confirm('¿Seguro que quieres eliminar este concesionario?')) {
            $.ajax({
                method: 'DELETE',
                url: `/admin/api/${id}`,
                success: function(data) {
                    alert(data.mensaje || 'Concesionario eliminado correctamente');
                    cargarConcesionarios(); // recargar lista actualizada
                },
                error: function(err) {
                    alert(err.responseJSON?.mensaje || 'Error al eliminar concesionario');
                }
            });
        }
    });

    // Editar concesionario
    $('#concesionarios-container').on('click', '.btn-edit', function() {
        const card = $(this).closest('.card');
        const id = card.data('id');
        const nombre = card.find('h5').text();
        const ubicacion = card.find('p.text-muted:first').text().replace('Ubicación: ', '');

        $('#modalEdit #editNombre').val(nombre);
        $('#modalEdit #editUbicacion').val(ubicacion);
        $('#modalEdit').data('id', id);

        const modal = new bootstrap.Modal(document.getElementById('modalEdit'));
        modal.show();
    });

    // Guardar cambios: para que al editar se guarde bien la información actualizada
    $('#guardarEdit').on('click', function() {
        const id = $('#modalEdit').data('id');
        const nombre = $('#editNombre').val().trim();
        const ubicacion = $('#editUbicacion').val().trim();

        if (!nombre || !ubicacion) {
            alert('Por favor, completa todos los campos');
            return;
        }

        $.ajax({
            method: 'PUT',
            url: `/admin/api/${id}`,
            contentType: 'application/json',
            data: JSON.stringify({ nombre, ubicacion }),
            success: function(data) {
                alert(data.mensaje || 'Concesionario actualizado correctamente');
                cargarConcesionarios(); // 🔁 actualizar lista desde la base de datos
                bootstrap.Modal.getInstance(document.getElementById('modalEdit')).hide();
            },
            error: function(err) {
                alert(err.responseJSON?.mensaje || 'Error al actualizar concesionario');
            }
        });
    });

//-------------------------------------------------------------------------------
// ESTA SECCIÓN GESTIONA EL FORMULARIO DE AÑADIR NUEVO CONCESIONARIO
//-------------------------------------------------------------------------------
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

    // Guardar nuevo concesionario
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
            alert('Concesionario agregado correctamente');
            $('#formNuevoConcesionario')[0].reset();
            $('#formConcesionarioContainer').slideUp(300);
            cargarConcesionarios(); // recarga desde el servidor
          },
          error: function(err) {
            alert(err.responseJSON?.mensaje || 'Error al agregar concesionario');
          }
        });
    });
//-------------------------------------------------------------------------------
// FIN DE LA SECCIÓN DE GESTIÓN DE CONCESIONARIOS
//-------------------------------------------------------------------------------

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
            <table class="table table-striped table-hover align-middle id="tabla-vehiculos">
                <thead>
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
                        <th>Acciones</th>
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
                        <td>${v.imagen ? `<img src="${v.imagen}" alt="Imagen" style="width:50px; height:auto;">` : '-'}</td>
                        <td>${v.concesionario}</td>
                        <td>
                            <button class="btn btn-sm btn-edit-vehiculo">Editar</button>
                            <button class="btn btn-sm btn-delete-vehiculo">Eliminar</button>
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
            console.error('Error al cargar vehículos:', err);
            $('#vehiculos-container').html('<p class="text-danger">Error al cargar vehículos.</p>');
        }
    });
} 

// Cargar vehículos al entrar en la vista
cargarVehiculosTabla();


//-------------------------------------------------------------------------------
// FUNCIONES PARA BOTONES DE LOS VEHICULOS (Eliminar y Editar vehiculos)
//-------------------------------------------------------------------------------
    
    // Eliminar vehículo desde la tabla
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


    // Editar vehículo
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

// Guardar cambios de vehículo
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

});
