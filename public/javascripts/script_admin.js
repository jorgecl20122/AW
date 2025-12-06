$(document).ready(function () {

// ============================================
// SECCIÓN: CONCESIONARIOS
// ============================================

    // --------------------------------------------
    // EFECTOS VISUALES DE FORMULARIOS
    // --------------------------------------------

    // Mostrar/ocultar formulario "Añadir concesionario"
    $('#formConcesionarioContainer').hide();

    $('#btnAddConcesionario').on('click', function() {
        $('#formConcesionarioContainer').slideToggle(300);
    });

    $('#cancelarConcesionario').on('click', function() {
        $('form[action="/admin/concesionarios/crear"]')[0].reset();
        $('#formConcesionarioContainer').slideUp(300);
    });

    // --------------------------------------------
    // EDITAR CONCESIONARIO
    // --------------------------------------------

    // Abrir modal de edición con datos
    $(document).on('click', '.btn-edit', function() {
        const id = $(this).data('id');
        const nombre = $(this).data('nombre');
        const ciudad = $(this).data('ciudad');
        const correo = $(this).data('correo');
        const telefono = $(this).data('telefono');

        // Configurar el action del formulario
        $('#formEditConcesionario').attr('action', `/admin/concesionarios/actualizar/${id}`);

        // Rellenar los campos
        $('#editNombre').val(nombre);
        $('#editCiudad').val(ciudad);
        $('#editCorreo').val(correo);
        $('#editTelefono').val(telefono);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('modalEdit'));
        modal.show();
    });

// ============================================
// SECCIÓN: VEHÍCULOS 
// ============================================

    // --------------------------------------------
    // EFECTOS VISUALES DE FORMULARIOS
    // --------------------------------------------

    // Mostrar/ocultar formulario "Añadir Vehículo"
    $('#formVehiculoContainer').hide();

    $('#btnAddVehiculo').on('click', function() {
        $('#formVehiculoContainer').slideToggle(300);
        cargarConcesionariosSelect(); // Cargar concesionarios cuando se abre el form
    });

    $('#cancelarVehiculo').on('click', function() {
        $('form[action="/admin/vehiculos/crear"]')[0].reset();
        $('#formVehiculoContainer').slideUp(300);
    });

    // --------------------------------------------
    // EDITAR VEHÍCULO
    // --------------------------------------------

    // Abrir modal de edición con datos
    $(document).on('click', '.btn-edit-vehiculo', function() {
        const id = $(this).data('id');
        const matricula = $(this).data('matricula');
        const marca = $(this).data('marca');
        const modelo = $(this).data('modelo');
        const anio = $(this).data('anio');
        const plazas = $(this).data('plazas');
        const autonomia = $(this).data('autonomia');
        const color = $(this).data('color');
        const estado = $(this).data('estado');

        // Configurar el action del formulario
        $('#formEditVehiculo').attr('action', `/admin/vehiculos/actualizar/${id}`);

        // Rellenar los campos
        $('#editMatricula').val(matricula);
        $('#editMarca').val(marca);
        $('#editModelo').val(modelo);
        $('#editAnio').val(anio);
        $('#editPlazas').val(plazas);
        $('#editAutonomia').val(autonomia);
        $('#editColor').val(color);
        $('#editEstado').val(estado);

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('modalEditVehiculo'));
        modal.show();
    });

// ============================================
// SECCIÓN: CARGAR DATOS (LISTADOS)
// ============================================

    // --------------------------------------------
    // CARGAR CONCESIONARIOS EN SELECT
    // --------------------------------------------

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

    // --------------------------------------------
    // VER VEHÍCULOS DE UN CONCESIONARIO
    // --------------------------------------------

   $(document).on('click', '.btn-ver-vehiculos', function(e) {
    e.preventDefault(); // Prevenir comportamiento por defecto
    
    const id = $(this).data('id'); 
    
    if (!id) {
        alert('No se ha encontrado el ID del concesionario');
        return;
    }

    // Mostrar mensaje de carga
    $('#listaVehiculosConcesionario').html('<p class="text-center"><i class="bi bi-hourglass-split"></i> Cargando vehículos...</p>');
    
    // Mostrar el modal PRIMERO (usando jQuery/Bootstrap)
    $('#modalVehiculosConcesionario').modal('show');
    
    // Luego cargar los datos
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
});

// ============================================
// SECCIÓN: ESTADÍSTICAS (CARGAR CON AJAX)
// ============================================

    function cargarReservasPorConcesionario() {
        if ($('#vehiculos-mas-usados').length === 0) {
        console.log('Sección de vehículos más usados no encontrada en esta página');
        return;
    }
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
        if ($('#tabla-concesionarios').length === 0) {
        console.log('Tabla de concesionarios no encontrada en esta página');
        return;
    }
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

    // Cargar estadísticas de la flota
    function cargarEstadoFlota() {
        // Verificar si los elementos existen
    if ($('#disponibles-count').length === 0 || $('#enuso-count').length === 0) {
        console.log('Elementos de estado de flota no encontrados en esta página');
        return;
    }
        $.ajax({
            url: '/admin/estado_flota',
            method: 'GET',
            success: function(data) {
                console.log('Estado de la flota:', data);
                
                // Actualizar disponibles
                $('#disponibles-count').text(data.disponibles);
                
                // Actualizar en uso
                $('#enuso-count').text(data.en_uso);
            },
            error: function(err) {
                console.error('Error al cargar estado de la flota:', err);
                
                // Mostrar valores por defecto en caso de error
                $('#disponibles-count').text('0');
                $('#enuso-count').text('0');
            }
        });
    }

    
function cargarReservasFranjas() {
     // Verificar si el canvas existe en la página
    const canvasElement = document.getElementById('graficoFranjas');
    if (!canvasElement) {
        console.log('Canvas graficoFranjas no encontrado en esta página');
        return; // Salir si no existe
    }

    $.ajax({
        url: '/admin/estadisticas/reservas-franjas',
        method: 'GET',
        success: function(franjas) {
            console.log('Datos recibidos:', franjas); // Para debug

            // Ocultar spinner y mostrar canvas
            $('#spinner-franjas').hide();
            $('#graficoFranjas').show();

            // Agrupar datos en franjas de 2 horas
            const franjasAgrupadas = {};
            for (let i = 0; i < 24; i += 2) {
                franjasAgrupadas[i] = 0;
            }

            // Sumar reservas de cada hora a su franja correspondiente
            franjas.forEach(f => {
                const hora = parseInt(f.label.split(':')[0]);
                const franjaInicio = Math.floor(hora / 2) * 2;
                if (franjasAgrupadas[franjaInicio] !== undefined) {
                    franjasAgrupadas[franjaInicio] += f.total;
                }
            });

            // Preparar etiquetas y datos
            const labels = [];
            const data = [];
            for (let i = 0; i < 24; i += 2) {
                labels.push(`${i.toString().padStart(2,'0')}:00-${(i+2).toString().padStart(2,'0')}:00`);
                data.push(franjasAgrupadas[i]);
            }

            console.log('Labels:', labels); // Para debug
            console.log('Data:', data); // Para debug

            // Destruir gráfico anterior si existe
            const canvasElement = document.getElementById('graficoFranjas');
            if (window.chartFranjas) {
                window.chartFranjas.destroy();
            }

            // Crear gráfico
            const ctx = canvasElement.getContext('2d');
            window.chartFranjas = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Reservas',
                        data: data,
                        backgroundColor: '#66a2fcff',
                        borderColor: '#66a2fcff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                label: function(context) {
                                    return 'Reservas: ' + context.parsed.y;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Franjas Horarias'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Reservas'
                            },
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        }
                    }
                }
            });
        },
        error: function(err) {
            console.error('Error al cargar reservas por franjas:', err);
            $('#spinner-franjas').html('<p class="text-danger">Error al cargar estadísticas.</p>');
        }
    });
}


    // Cargar estadísticas al iniciar la página
    cargarReservasPorConcesionario();
    cargarVehiculosMasUsados();
    cargarEstadoFlota();
    cargarReservasFranjas();

// ============================================
// SECCIÓN: BUSCADOR DE VEHÍCULOS (FILTRO CLIENTE)
// ============================================

    $('#buscarVehiculo').on('keyup', function() {
        const textoBusqueda = $(this).val().toLowerCase().trim();
        
        if (textoBusqueda === '') {
            $('#tabla-vehiculos tbody tr').show();
            $('#mensajeNoResultados').remove();
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
});