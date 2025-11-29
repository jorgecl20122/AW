$(document).ready(function(){

  // ============================================
  // VALORES POR DEFECTO
  // ============================================
  const DEFAULTS = {
    tamanoTitulo: 2.5,
    tamanoTexto: 1,
    colorTitulos: "#31a1a9",
    colorTexto: "#000000",
    fondoSeccion: "#f4f4f4",
    subrayadoEnlaces: false,
    modoContraste: false,
    modoDaltonismo: false,
    atajosPersonalizados: {},
    ordenTabulacion: "default"
  };

  // Obtener rol del usuario
  const userRole = $('body').data('user-role') || 'empleado';

  // ============================================
  // ATAJOS PREDEFINIDOS SEGÚN ROL
  // ============================================
  const ATAJOS_PREDEFINIDOS = {
    empleado: {
      'ctrl+a': { accion: 'abrir_accesibilidad', descripcion: 'Abrir configuración de accesibilidad' },
      'ctrl+r': { accion: 'reservar', descripcion: 'Reservar vehículo' },
      'ctrl+h': { accion: 'historial', descripcion: 'Ver mis reservas' },
      'ctrl+v': { accion: 'ver_vehiculos', descripcion: 'Ver vehículos disponibles' },
      'ctrl+shift+q': { accion: 'cerrar_sesion', descripcion: 'Cerrar sesión' }
    },
    administrador: {
      'ctrl+a': { accion: 'abrir_accesibilidad', descripcion: 'Abrir configuración de accesibilidad' },
      'ctrl+v': { accion: 'gestion_vehiculos', descripcion: 'Gestión de vehículos' },
      'ctrl+u': { accion: 'usuarios', descripcion: 'Gestión de usuarios' },
      'ctrl+g': { accion: 'gestionar_reservas', descripcion: 'Gestionar reservas' },
      'ctrl+n': { accion: 'nuevo_vehiculo', descripcion: 'Crear nuevo vehículo' },
      'ctrl+shift+q': { accion: 'cerrar_sesion', descripcion: 'Cerrar sesión' }
    }
  };

  // Cargar preferencias
  let prefs = JSON.parse(sessionStorage.getItem('accesibilidad')) || {...DEFAULTS};
  let atajosActivos = obtenerAtajosActivos();
  let combinacionAnterior = null; // Para edición

  // Aplicar preferencias si existen
  if (sessionStorage.getItem('accesibilidad')) {
    aplicarPreferencias(prefs);
  }

  // ============================================
  // MODAL - CONFIGURACIÓN AL ABRIR
  // ============================================
  $('#configuradorModal').on('show.bs.modal', function () {
    actualizarFormulario(prefs);
    cargarAtajosEnTabla();
    
    let $modalDialog = $(this).find('.modal-dialog');
    $modalDialog.css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100% - 1rem)'
    });
  });

  // ============================================
  // EVENTOS DE CONFIGURACIÓN VISUAL
  // ============================================

  $("#fuente-titulo").on("input", function(){
    let v = parseFloat($(this).val());
    prefs.tamanoTitulo = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("h2").css("font-size", v + "rem");
    $("h4").css("font-size", (v * 0.6) + "rem");
  });

  $("#fuente-texto").on("input", function(){
    let v = parseFloat($(this).val());
    prefs.tamanoTexto = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a")
      .css("font-size", v + "rem");
  });

  $("#color-titulos").on("change", function(){
    let v = $(this).val();
    prefs.colorTitulos = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("h2, h4").css("color", v);
  });

  $("#color-texto").on("change", function(){
    let v = $(this).val();
    prefs.colorTexto = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a")
      .css("color", v);
  });

  $("#fondo-seccion").on("change", function(){
    let v = $(this).val();
    prefs.fondoSeccion = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("main").css("background-color", v);
  });

  $("#subrayado-enlaces").on("change", function(){
    let isActive = $(this).is(":checked");
    prefs.subrayadoEnlaces = isActive;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("a").css("text-decoration", isActive ? "underline" : "none");
  });

  $("#modo-contraste").on("change", function(){
    let isActive = $(this).is(":checked");
    prefs.modoContraste = isActive;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("body").toggleClass("bajo-contraste", isActive);
  });

  $("#modo-daltonismo").on("change", function(){
    let isActive = $(this).is(":checked");
    prefs.modoDaltonismo = isActive;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    $("body").toggleClass("daltonismo", isActive);
  });

  // ============================================
  // ORDEN DE TABULACIÓN
  // ============================================
  
  $("#orden-tabulacion").on("change", function(){
    let modo = $(this).val();
    prefs.ordenTabulacion = modo;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    aplicarOrdenTabulacion(modo);
  });

  function aplicarOrdenTabulacion(modo) {
    switch(modo) {
      case 'default':
        // Orden natural del DOM
        $("button, input, a, select, table, table th, table td").removeAttr("tabindex");
        break;
        
      case 'optimizado':
        // Orden optimizado: navbar > botones principales > formularios > tablas > enlaces
        let tabIndex = 1;
        
        $("nav a, nav button").each(function(){ $(this).attr("tabindex", tabIndex++); });
        $("main button.btn-primary, main button.btn-success").each(function(){ 
          $(this).attr("tabindex", tabIndex++); 
        });
        $("form input, form select, form textarea").each(function(){ 
          $(this).attr("tabindex", tabIndex++); 
        });
        $("main button:not(.btn-primary):not(.btn-success)").each(function(){ 
          $(this).attr("tabindex", tabIndex++); 
        });
        $("table th, table td").each(function(){ 
          $(this).attr("tabindex", tabIndex++); 
        });
        $("main a").each(function(){ 
          $(this).attr("tabindex", tabIndex++); 
        });
        break;
        
      case 'personalizado':
        asignarAtajosSecciones();
        break;
    }
  }

  function asignarAtajosSecciones() {
    let secciones = $("main section, main .card, main form");
    secciones.each(function(index) {
      $(this).attr("tabindex", (index + 1) * 10);
      $(this).attr("data-seccion", index + 1);
    });
    $("button, input, a, select").attr("tabindex", "0");
  }

  // ============================================
  // ATAJOS DE TECLADO CONFIGURABLES
  // ============================================

  function obtenerAtajosActivos() {
    let atajosPredefinidos = ATAJOS_PREDEFINIDOS[userRole] || {};
    let atajosPersonalizados = prefs.atajosPersonalizados || {};
    return { ...atajosPredefinidos, ...atajosPersonalizados };
  }

  function cargarAtajosEnTabla() {
    let tbody = $("#tablaAtajos tbody");
    tbody.empty();
    
    $.each(atajosActivos, function(combinacion, datos) {
      let esPredefinido = ATAJOS_PREDEFINIDOS[userRole] && 
                          ATAJOS_PREDEFINIDOS[userRole][combinacion];
      
      let fila = `
        <tr data-combinacion="${combinacion}">
          <td><span class="badge bg-dark">${combinacion.toUpperCase()}</span></td>
          <td>${datos.descripcion}</td>
          <td class="text-center">
            ${!esPredefinido ? 
              `<button class="btn btn-sm btn-warning btn-editar-atajo" title="Editar atajo">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-eliminar-atajo ms-1" title="Eliminar atajo">
                <i class="bi bi-trash"></i>
              </button>` 
              : 
              '<span class="badge bg-secondary">Predefinido</span>'}
          </td>
        </tr>
      `;
      tbody.append(fila);
    });
  }

  // ============================================
  // MODAL DE ATAJOS - EVENTOS
  // ============================================

  // Botón añadir nuevo atajo
  $("#btnAnadirAtajo").on("click", function() {
    mostrarModalAtajo();
  });

  // Editar atajo personalizado
  $(document).on("click", ".btn-editar-atajo", function() {
    let combinacion = $(this).closest("tr").data("combinacion");
    mostrarModalAtajo(combinacion);
  });

  // Eliminar atajo personalizado
  $(document).on("click", ".btn-eliminar-atajo", function() {
    let combinacion = $(this).closest("tr").data("combinacion");
    
    if(confirm(`¿Eliminar el atajo ${combinacion.toUpperCase()}?`)) {
      delete prefs.atajosPersonalizados[combinacion];
      sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
      atajosActivos = obtenerAtajosActivos();
      cargarAtajosEnTabla();
    }
  });

  // ============================================
  // FUNCIONES DEL MODAL DE ATAJOS
  // ============================================

  function mostrarModalAtajo(combinacion = null) {
    // Guardar referencia si es edición
    combinacionAnterior = combinacion;
    
    // Limpiar formulario
    $("#inputCombinacion").val("");
    $("#selectAccion").val("");
    $("#inputDestino").val("");
    $("#inputDescripcion").val("");
    $("#campoDestino").hide();
    
    // Cambiar título según modo
    if(combinacion) {
      $("#tituloModalAtajo").text("Editar Atajo de Teclado");
      
      // Cargar datos existentes
      let datos = atajosActivos[combinacion];
      $("#inputCombinacion").val(combinacion);
      $("#inputDescripcion").val(datos.descripcion);
      
      if(datos.url) {
        $("#selectAccion").val("navegacion_url");
        $("#inputDestino").val(datos.url);
        $("#campoDestino").show();
      } else if(datos.selector) {
        if(datos.accion === 'click') {
          $("#selectAccion").val("click_elemento");
        } else {
          $("#selectAccion").val("foco_elemento");
        }
        $("#inputDestino").val(datos.selector);
        $("#campoDestino").show();
      }
    } else {
      $("#tituloModalAtajo").text("Añadir Atajo de Teclado");
    }
    
    // Mostrar modal
    let modalInstance = new bootstrap.Modal($("#modalAtajo")[0]);
    modalInstance.show();
  }

  // Capturar combinación de teclas
  $("#inputCombinacion").on("keydown", function(e) {
    e.preventDefault();
    capturarCombinacion(e);
  });

  // Mostrar campo destino según acción seleccionada
  $("#selectAccion").on("change", function() {
    let accion = $(this).val();
    if(accion) {
      $("#campoDestino").show();
      if(accion === "navegacion_url") {
        $("#inputDestino").attr("placeholder", "Ej: /empleado/vehiculos");
      } else {
        $("#inputDestino").attr("placeholder", "Ej: #btnReservar o .mi-clase");
      }
    } else {
      $("#campoDestino").hide();
    }
  });

  // Guardar atajo
  $("#btnGuardarAtajo").on("click", function() {
    guardarAtajo();
  });

  function capturarCombinacion(e) {
    let teclas = [];
    
    if(e.ctrlKey) teclas.push("ctrl");
    if(e.shiftKey) teclas.push("shift");
    if(e.altKey) teclas.push("alt");
    
    if(e.key && !['Control', 'Shift', 'Alt'].includes(e.key)) {
      teclas.push(e.key.toLowerCase());
    }
    
    if(teclas.length > 1) {
      let combinacion = teclas.join("+");
      $("#inputCombinacion").val(combinacion);
      
      // Verificar si ya existe
      if(ATAJOS_PREDEFINIDOS[userRole] && ATAJOS_PREDEFINIDOS[userRole][combinacion]) {
        alert("⚠️ Esta combinación está reservada para un atajo predefinido.");
      } else if(atajosActivos[combinacion] && combinacion !== combinacionAnterior) {
        alert("⚠️ Esta combinación ya está en uso.");
      }
    }
  }

  function guardarAtajo() {
    let combinacion = $("#inputCombinacion").val().trim();
    let accion = $("#selectAccion").val();
    let destino = $("#inputDestino").val().trim();
    let descripcion = $("#inputDescripcion").val().trim();
    
    // Validar campos
    if(!combinacion || !accion || !destino || !descripcion) {
      alert("Por favor completa todos los campos.");
      return;
    }
    
    // Eliminar atajo anterior si se cambió la combinación
    if(combinacionAnterior && combinacionAnterior !== combinacion) {
      delete prefs.atajosPersonalizados[combinacionAnterior];
    }
    
    // Crear nuevo atajo
    let nuevoAtajo = { descripcion };
    
    switch(accion) {
      case 'navegacion_url':
        nuevoAtajo.url = destino;
        break;
      case 'click_elemento':
        nuevoAtajo.selector = destino;
        nuevoAtajo.accion = 'click';
        break;
      case 'foco_elemento':
        nuevoAtajo.selector = destino;
        nuevoAtajo.accion = 'focus';
        break;
    }
    
    // Guardar
    prefs.atajosPersonalizados[combinacion] = nuevoAtajo;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    atajosActivos = obtenerAtajosActivos();
    cargarAtajosEnTabla();
    
    // Cerrar modal
    bootstrap.Modal.getInstance($("#modalAtajo")[0]).hide();
    
    // Resetear variable
    combinacionAnterior = null;
  }

  // ============================================
  // MANEJO DE ATAJOS EN TIEMPO REAL
  // ============================================

  $(document).keydown(function(e){
    let teclas = [];
    
    if(e.ctrlKey) teclas.push("ctrl");
    if(e.shiftKey) teclas.push("shift");
    if(e.altKey) teclas.push("alt");
    if(e.key && !['Control', 'Shift', 'Alt'].includes(e.key)) {
      teclas.push(e.key.toLowerCase());
    }
    
    let combinacion = teclas.join("+");
    let atajo = atajosActivos[combinacion];
    
    if(atajo) {
      e.preventDefault();
      ejecutarAtajo(atajo);
    }
  });

  function ejecutarAtajo(atajo) {
    if(atajo.accion === 'abrir_accesibilidad') {
      bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).show();
    }
    else if(atajo.accion === 'cerrar_sesion') {
      if(confirm('¿Deseas cerrar sesión?')) {
        window.location.href = '/usuario/logout';
      }
    }
    else if(atajo.url) {
      window.location.href = atajo.url;
    }
    else if(atajo.selector) {
      let elemento = $(atajo.selector);
      if(elemento.length) {
        if(atajo.accion === 'click') {
          elemento.click();
        } else if(atajo.accion === 'focus') {
          elemento.focus();
        }
      }
    }
    // Atajos predefinidos específicos
    else if(atajo.accion === 'reservar') {
      $("#btnReservarVehiculo").click();
    }
    else if(atajo.accion === 'historial') {
      window.location.href = '/empleado/mis_reservas';
    }
    else if(atajo.accion === 'ver_vehiculos') {
      window.location.href = '/empleado/vehiculos';
    }
    else if(atajo.accion === 'gestion_vehiculos') {
      window.location.href = '/admin/VistaVehiculos';
    }
    else if(atajo.accion === 'usuarios') {
      window.location.href = '/usuario/vistaLista';
    }
    else if(atajo.accion === 'gestionar_reservas') {
      window.location.href = '/admin/reservas';
    }
    else if(atajo.accion === 'nuevo_vehiculo') {
      $("#btnNuevoVehiculo").click();
    }
  }

  // ============================================
  // SALTOS RÁPIDOS POR TABULACIÓN
  // ============================================

  $(document).keydown(function(e) {
    if(e.altKey && !isNaN(e.key) && e.key !== '') {
      let numSeccion = parseInt(e.key);
      let seccion = $(`[data-seccion="${numSeccion}"]`);
      
      if(seccion.length) {
        e.preventDefault();
        seccion.focus();
        $('html, body').animate({
          scrollTop: seccion.offset().top - 100
        }, 300);
      }
    }
  });

  // ============================================
  // BOTÓN RESTAURAR
  // ============================================
  
  $("#btnRestaurar").on("click", function(){
    if(confirm("¿Restaurar toda la configuración a valores predeterminados?")) {
      sessionStorage.removeItem('accesibilidad');
      prefs = {...DEFAULTS};
      atajosActivos = obtenerAtajosActivos();
      
      actualizarFormulario(prefs);
      aplicarPreferencias(prefs);
      aplicarOrdenTabulacion(prefs.ordenTabulacion);
      cargarAtajosEnTabla();
      
      bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).hide();
    }
  });

  $("#form-configurador").on("submit", function(e){
    e.preventDefault();
    bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).hide();
  });

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  function actualizarFormulario(p){
    $("#fuente-titulo").val(p.tamanoTitulo);
    $("#fuente-texto").val(p.tamanoTexto);
    $("#color-titulos").val(p.colorTitulos);
    $("#color-texto").val(p.colorTexto);
    $("#fondo-seccion").val(p.fondoSeccion);
    $("#subrayado-enlaces").prop("checked", p.subrayadoEnlaces);
    $("#modo-contraste").prop("checked", p.modoContraste);
    $("#modo-daltonismo").prop("checked", p.modoDaltonismo);
    $("#orden-tabulacion").val(p.ordenTabulacion || "default");
  }

  function aplicarPreferencias(p){
    if(p.tamanoTitulo){
      $("h4").css("font-size", p.tamanoTitulo + "rem");
      $("h5").css("font-size", (p.tamanoTitulo * 0.5) + "rem");
    }
    if(p.tamanoTexto){
      $("p, .vehicle-card p, .status-box, table, table th, table td, input, select, button, a")
        .css("font-size", p.tamanoTexto + "rem");
      $("small").css("font-size", (p.tamanoTexto * 0.9) + "rem");
    }
    if(p.colorTitulos){
      $("h4").css("color", p.colorTitulos); 
      $("h5").css("color", "#000000");       
    }
    if(p.colorTexto){
      $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a")
        .css("color", p.colorTexto);
    }
    if(p.fondoSeccion){
      $("main").css("background-color", p.fondoSeccion);
    }
    $("a").css("text-decoration", p.subrayadoEnlaces ? "underline" : "none");
    $("body").toggleClass("bajo-contraste", p.modoContraste);
    $("body").toggleClass("daltonismo", p.modoDaltonismo);
    
    if(p.ordenTabulacion) {
      aplicarOrdenTabulacion(p.ordenTabulacion);
    }
  }

  // Aplicar orden de tabulación al cargar
  aplicarOrdenTabulacion(prefs.ordenTabulacion || "default");

});