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
  let combinacionAnterior = null;

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
        $("button, input, a, select, table, table th, table td").removeAttr("tabindex");
        break;
        
      case 'optimizado':
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
              `<button class="btn btn-sm btn-editar-atajo" title="Editar atajo">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-eliminar-atajo ms-1" title="Eliminar atajo">
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

  $("#btnAnadirAtajo").on("click", function() {
    mostrarModalAtajo();
  });

  $(document).on("click", ".btn-editar-atajo", function() {
    let combinacion = $(this).closest("tr").data("combinacion");
    mostrarModalAtajo(combinacion);
  });

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
  // MODAL INTUITIVO - PASO A PASO
  // ============================================

  function mostrarModalAtajo(combinacion = null) {
    combinacionAnterior = combinacion;
    
    // Limpiar formulario
    $("#inputCombinacion").val("");
    $("#tipoAccionSeleccionado").val("");
    $("#destinoSeleccionado").val("");
    $("#descripcionDestino").val("");
    $("#paso3Destino").hide();
    $("#resumenAtajo").hide();
    $("#btnGuardarAtajo").prop("disabled", true);
    $(".tipo-accion-card").removeClass("selected");
    
    // Cambiar título
    if(combinacion) {
      $("#tituloModalAtajo").text("Editar Atajo de Teclado");
      cargarDatosEdicion(combinacion);
    } else {
      $("#tituloModalAtajo").text("Añadir Atajo de Teclado");
    }
    
    // Mostrar modal
    let modalInstance = new bootstrap.Modal($("#modalAtajo")[0]);
    modalInstance.show();
  }

  function cargarDatosEdicion(combinacion) {
    let datos = atajosActivos[combinacion];
    $("#inputCombinacion").val(combinacion);
    
    if(datos.url) {
      seleccionarTipoAccion('navegacion');
      setTimeout(() => {
        $(`#grupoEnlaces .list-group-item[data-url="${datos.url}"]`).click();
      }, 100);
    } else if(datos.selector && datos.accion === 'click') {
      seleccionarTipoAccion('click');
      setTimeout(() => {
        $(`#grupoBotones .list-group-item[data-selector="${datos.selector}"]`).click();
      }, 100);
    }
  }

  // PASO 1: Capturar combinación
  $("#inputCombinacion").on("keydown", function(e) {
    e.preventDefault();
    
    let teclas = [];
    if(e.ctrlKey) teclas.push("ctrl");
    if(e.shiftKey) teclas.push("shift");
    if(e.altKey) teclas.push("alt");
    if(e.key && !['Control', 'Shift', 'Alt'].includes(e.key)) {
      teclas.push(e.key.toLowerCase());
    }
    
    if(teclas.length > 1) {
      let combinacion = teclas.join("+");
      $(this).val(combinacion);
      
      // Validar
      if(ATAJOS_PREDEFINIDOS[userRole] && ATAJOS_PREDEFINIDOS[userRole][combinacion]) {
        $(this).addClass("is-invalid");
        alert("⚠️ Esta combinación está reservada para un atajo predefinido.");
      } else if(atajosActivos[combinacion] && combinacion !== combinacionAnterior) {
        $(this).addClass("is-invalid");
        alert("⚠️ Esta combinación ya está en uso.");
      } else {
        $(this).removeClass("is-invalid").addClass("is-valid");
        actualizarResumen();
      }
    }
  });

  // PASO 2: Seleccionar tipo de acción
  $(".tipo-accion-card").on("click", function() {
    let tipo = $(this).data("tipo");
    seleccionarTipoAccion(tipo);
  });

  function seleccionarTipoAccion(tipo) {
    $(".tipo-accion-card").removeClass("selected");
    $(`.tipo-accion-card[data-tipo="${tipo}"]`).addClass("selected");
    $("#tipoAccionSeleccionado").val(tipo);
    
    // Mostrar lista correspondiente
    $("#listaPaginas, #listaBotones").hide();
    $("#paso3Destino").show();
    
    if(tipo === 'navegacion') {
      $("#labelPaso3").text("¿A qué página quieres ir?");
      cargarEnlacesDisponibles();
      $("#listaPaginas").show();
    } else if(tipo === 'click') {
      $("#labelPaso3").text("¿Qué botón quieres activar?");
      cargarBotonesDisponibles();
      $("#listaBotones").show();
    }
    
    actualizarResumen();
  }

  // PASO 3A: Cargar enlaces disponibles
  function cargarEnlacesDisponibles() {
    let $grupo = $("#grupoEnlaces");
    $grupo.empty();
    
    // Obtener enlaces del menú de navegación
    $("nav a, .navbar a").each(function() {
      let $enlace = $(this);
      let href = $enlace.attr("href");
      let texto = $enlace.text().trim();
      
      if(href && href !== "#" && href !== "/" && texto) {
        let icono = $enlace.find("i").attr("class") || "bi bi-link-45deg";
        
        $grupo.append(`
          <a href="javascript:void(0)" class="list-group-item list-group-item-action seleccionable" 
             data-url="${href}" data-descripcion="${texto}">
            <i class="${icono} me-2"></i>
            <strong>${texto}</strong>
            <small class="text-muted d-block">${href}</small>
          </a>
        `);
      }
    });
    
    if($grupo.children().length === 0) {
      $grupo.append('<div class="alert alert-warning">No se encontraron enlaces disponibles</div>');
    }
  }

  // PASO 3B: Cargar botones disponibles
  function cargarBotonesDisponibles() {
    let $grupo = $("#grupoBotones");
    $grupo.empty();
    
    $("button, .btn").each(function() {
      let $boton = $(this);
      let texto = $boton.text().trim() || $boton.attr("title") || $boton.attr("aria-label");
      let id = $boton.attr("id");
      let clases = $boton.attr("class");
      
      if(texto && !$boton.closest(".modal").length) {
        let selector = id ? `#${id}` : `.${clases.split(' ')[0]}`;
        let icono = $boton.find("i").attr("class") || "bi bi-hand-index";
        
        $grupo.append(`
          <a href="javascript:void(0)" class="list-group-item list-group-item-action seleccionable" 
             data-selector="${selector}" data-descripcion="Clic en: ${texto}">
            <i class="${icono} me-2"></i>
            <strong>${texto}</strong>
            <small class="text-muted d-block">Selector: ${selector}</small>
          </a>
        `);
      }
    });
    
    if($grupo.children().length === 0) {
      $grupo.append('<div class="alert alert-warning">No se encontraron botones disponibles</div>');
    }
  }

  // Seleccionar destino de las listas
  $(document).on("click", ".seleccionable", function() {
    let $item = $(this);
    $item.siblings().removeClass("active");
    $item.addClass("active");
    
    let destino = $item.data("url") || $item.data("selector");
    let descripcion = $item.data("descripcion");
    
    $("#destinoSeleccionado").val(destino);
    $("#descripcionDestino").val(descripcion);
    
    actualizarResumen();
  });

  // Búsqueda en listas
  $("#buscarBoton").on("input", function() {
    let busqueda = $(this).val().toLowerCase();
    $("#grupoBotones .seleccionable").each(function() {
      let texto = $(this).text().toLowerCase();
      $(this).toggle(texto.includes(busqueda));
    });
  });

  // Actualizar resumen y habilitar botón guardar
  function actualizarResumen() {
    let combinacion = $("#inputCombinacion").val();
    let tipo = $("#tipoAccionSeleccionado").val();
    let destino = $("#destinoSeleccionado").val();
    let descripcion = $("#descripcionDestino").val();
    
    if(combinacion && tipo && destino) {
      $("#resumenCombinacion").html(`<kbd>${combinacion.toUpperCase()}</kbd>`);
      $("#resumenAccion").text(descripcion);
      $("#resumenAtajo").show();
      $("#btnGuardarAtajo").prop("disabled", false);
    } else {
      $("#resumenAtajo").hide();
      $("#btnGuardarAtajo").prop("disabled", true);
    }
  }

  // Guardar atajo
  $("#btnGuardarAtajo").on("click", function() {
    let combinacion = $("#inputCombinacion").val().trim();
    let tipo = $("#tipoAccionSeleccionado").val();
    let destino = $("#destinoSeleccionado").val();
    let descripcion = $("#descripcionDestino").val();
    
    if(!combinacion || !tipo || !destino || !descripcion) {
      alert("Por favor completa todos los pasos.");
      return;
    }
    
    // Eliminar atajo anterior si se cambió
    if(combinacionAnterior && combinacionAnterior !== combinacion) {
      delete prefs.atajosPersonalizados[combinacionAnterior];
    }
    
    // Crear nuevo atajo
    let nuevoAtajo = { descripcion };
    
    if(tipo === 'navegacion') {
      nuevoAtajo.url = destino;
    } else if(tipo === 'click') {
      nuevoAtajo.selector = destino;
      nuevoAtajo.accion = 'click';
    }
    
    prefs.atajosPersonalizados[combinacion] = nuevoAtajo;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));
    atajosActivos = obtenerAtajosActivos();
    cargarAtajosEnTabla();
    
    bootstrap.Modal.getInstance($("#modalAtajo")[0]).hide();
    combinacionAnterior = null;
  });

  // ============================================
  // EJECUCIÓN DE ATAJOS
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
        }
      }
    }
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
  // SALTOS RÁPIDOS
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
  // RESTAURAR
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

  aplicarOrdenTabulacion(prefs.ordenTabulacion || "default");

});