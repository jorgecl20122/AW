let graficaKilometros = null;

// Cargar resumen de estadísticas
function cargarResumenEstadisticas() {
    $.ajax({
        url: '/reservas/estadisticas/resumen',
        method: 'GET',
        success: function(data) {
            $('#km-totales').text(data.km_totales?.toLocaleString() || 0);
            $('#km-promedio').text(Math.round(data.km_promedio || 0).toLocaleString());
            $('#total-reservas').text(data.total_reservas_finalizadas || 0);
            $('#vehiculos-usados').text(data.vehiculos_usados || 0);
        },
        error: function(err) {
            console.error('Error al cargar resumen:', err);
        }
    });
}

// Cargar datos de la gráfica por meses
function cargarGraficaKilometros(periodo = 6) {
    $.ajax({
        url: `/reservas/estadisticas/km-tiempo?periodo=${periodo}`,
        method: 'GET',
        success: function(datos) {
            console.log('Datos de gráfica:', datos);

            if (datos.length === 0) {
                mostrarMensajeVacio();
                return;
            }

            // Preparar datos para Chart.js
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            const labels = datos.map(d => {
                const [year, month] = d.mes.split('-');
                const mesNombre = meses[parseInt(month) - 1];
                return `${mesNombre} ${year}`;
            });

            const kmPorMes = datos.map(d => d.km_mes);
            const reservasPorMes = datos.map(d => d.reservas_mes);

            // Crear o actualizar gráfica
            const ctx = document.getElementById('grafica-kilometros').getContext('2d');

            if (graficaKilometros) {
                graficaKilometros.destroy();
            }

            graficaKilometros = new Chart(ctx, {
                type: 'bar', // Cambié a 'bar' para meses, pero puedes dejarlo como 'line'
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Kilómetros Recorridos',
                            data: kmPorMes,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgb(75, 192, 192)',
                            borderWidth: 2,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Número de Reservas',
                            data: reservasPorMes,
                            backgroundColor: 'rgba(255, 99, 132, 0.6)',
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        if (context.datasetIndex === 0) {
                                            label += context.parsed.y.toLocaleString() + ' km';
                                        } else {
                                            label += context.parsed.y + ' reservas';
                                        }
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Kilómetros'
                            },
                            beginAtZero: true
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Reservas'
                            },
                            beginAtZero: true,
                            grid: {
                                drawOnChartArea: false,
                            }
                        }
                    }
                }
            });
        },
        error: function(err) {
            console.error('Error al cargar datos de gráfica:', err);
            mostrarMensajeError();
        }
    });
}

// Mostrar mensaje cuando no hay datos
function mostrarMensajeVacio() {
    const ctx = document.getElementById('grafica-kilometros').getContext('2d');
    if (graficaKilometros) {
        graficaKilometros.destroy();
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('No hay datos disponibles para el período seleccionado', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

function mostrarMensajeError() {
    const ctx = document.getElementById('grafica-kilometros').getContext('2d');
    if (graficaKilometros) {
        graficaKilometros.destroy();
    }
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#dc3545';
    ctx.textAlign = 'center';
    ctx.fillText('Error al cargar los datos', ctx.canvas.width / 2, ctx.canvas.height / 2);
}

// Evento: cambiar período
$('#btn-actualizar-grafica').on('click', function() {
    const periodo = $('#select-periodo').val();
    cargarGraficaKilometros(periodo);
});

// Cargar todo al iniciar
$(document).ready(function() {
    cargarResumenEstadisticas();
    cargarGraficaKilometros(6); // Por defecto 6 meses
});