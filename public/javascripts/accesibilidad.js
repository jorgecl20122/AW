$(document).ready(function(){

  // Valores por defecto
  const DEFAULTS = {
    tamanoTitulo: 2.5,
    tamanoTexto: 1,
    colorTitulos: "#31a1a9",
    colorTexto: "#000000",
    fondoSeccion: "#f4f4f4",
    subrayadoEnlaces: false,
    modoContraste: false,
    modoDaltonismo: false
  };

  // Cargar preferencias guardadas o usar defaults
  let prefs = JSON.parse(sessionStorage.getItem('accesibilidad')) || {...DEFAULTS};

  // Solo aplicar si el usuario ya configuró algo antes
  if (sessionStorage.getItem('accesibilidad')) {
    aplicarPreferencias(prefs);
  }

  $('#configuradorModal').on('show.bs.modal', function () {
    actualizarFormulario(prefs);
  });

  // ------------------------------
  // EVENTOS INDIVIDUALES DEL MODAL
  // ------------------------------

  // Tamaño títulos
  $("#fuente-titulo").on("input", function(){
    let v = parseFloat($(this).val());
    prefs.tamanoTitulo = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("h2").css("font-size", v + "rem");
    $("h4").css("font-size", (v * 0.6) + "rem");
  });

  // Tamaño texto
  $("#fuente-texto").on("input", function(){
    let v = parseFloat($(this).val());
    prefs.tamanoTexto = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a")
      .css("font-size", v + "rem");
  });

  // Color de títulos
  $("#color-titulos").on("change", function(){
    let v = $(this).val();
    prefs.colorTitulos = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("h2, h4").css("color", v);
  });

  // Color del texto
  $("#color-texto").on("change", function(){
    let v = $(this).val();
    prefs.colorTexto = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a")
      .css("color", v);
  });

  // Fondo sección
  $("#fondo-seccion").on("change", function(){
    let v = $(this).val();
    prefs.fondoSeccion = v;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("main").css("background-color", v);
  });

  // Subrayado enlaces
  $("#subrayado-enlaces").on("change", function(){
    let isActive = $(this).is(":checked");
    prefs.subrayadoEnlaces = isActive;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("a").css("text-decoration", isActive ? "underline" : "none");
  });

  // Modo contraste
  $("#modo-contraste").on("change", function(){
    let isActive = $(this).is(":checked");
    prefs.modoContraste = isActive;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("body").toggleClass("bajo-contraste", isActive);
  });

  // Modo daltonismo
  $("#modo-daltonismo").on("change", function(){
    let isActive = $(this).is(":checked");
    prefs.modoDaltonismo = isActive;
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    $("body").toggleClass("daltonismo", isActive);
  });

  // ------------------------------
  // BOTÓN RESTAURAR
  //------------------------------
  
  $("#btnRestaurar").on("click", function(){
    sessionStorage.removeItem('accesibilidad');
    prefs = {...DEFAULTS};

    actualizarFormulario(prefs);
    aplicarPreferencias(prefs);

    bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).hide();
  });

  $("#form-configurador").on("submit", function(e){
    e.preventDefault();
    bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).hide();
  });

  // Modo daltonismo
$("#modo-daltonismo").on("change", function(){
  let isActive = $(this).is(":checked");
  prefs.modoDaltonismo = isActive;
  sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

  $("body").toggleClass("daltonismo", isActive);

});

// Adicionalmente, asegurar centrado cuando se abra el modal
$('#configuradorModal').on('show.bs.modal', function () {
  let $modalDialog = $(this).find('.modal-dialog');
  $modalDialog.css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100% - 1rem)'
  });
});

  // ------------------------------
  // NAVEGACIÓN POR TECLADO
  // ------------------------------

  // Obtener el rol del usuario desde el atributo data-role del body
  const userRole = $('body').data('user-role') || 'empleado';

  // Atajos de teclado predefinidos según el rol
  $(document).keydown(function(e){
    
    // ATAJOS COMUNES PARA TODOS
    if(e.ctrlKey && e.key.toLowerCase() === 'a'){ // Ctrl+A - Accesibilidad
        e.preventDefault();
        bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).show();
    }
    
    /*if(e.ctrlKey && e.key.toLowerCase() === 'i'){ // Ctrl+I - Inicio
        if(userRole === 'empleado') {
          e.preventDefault();
          window.location.href = '/empleado/vista_ini';
        }
        else{
          e.preventDefault();
          window.location.href = '/admin/vista_ini';
        }
    }*/
     if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q'){ // Ctrl+Shift+Q - Cerrar Sesión
        e.preventDefault();
        if(confirm('¿Deseas cerrar sesión?')) {
          window.location.href = '/usuario/logout';
        }
    }

    // ATAJOS PARA EMPLEADOS
    if(userRole === 'empleado') {
      if(e.ctrlKey && e.key.toLowerCase() === 'r'){ // Ctrl+R - Reservar
          e.preventDefault();
          $("#btnReservarVehiculo").click();
      }
      
      if(e.ctrlKey && e.key.toLowerCase() === 'h'){ // Ctrl+H - Mis Reservas (Historial)
          e.preventDefault();
          window.location.href = '/empleado/mis_reservas';
      }
      
      if(e.ctrlKey && e.key.toLowerCase() === 'v'){ // Ctrl+V - Ver Vehículos
          e.preventDefault();
          window.location.href = '/empleado/vehiculos';
      }
    }

    // ATAJOS PARA ADMINISTRADORES
    if(userRole === 'administrador') {
      if(e.ctrlKey && e.key.toLowerCase() === 'v'){ // Ctrl+V - Gestión Vehículos
          e.preventDefault();
          window.location.href = '/admin/VistaVehiculos';
      }
      
      if(e.ctrlKey && e.key.toLowerCase() === 'u'){ // Ctrl+U - Usuarios
          e.preventDefault();
          window.location.href = '/usuario/vistaLista';
      }
      
      if(e.ctrlKey && e.key.toLowerCase() === 'g'){ // Ctrl+G - Gestionar Reservas
          e.preventDefault();
          window.location.href = '/admin/reservas';
      }
      
      if(e.ctrlKey && e.key.toLowerCase() === 'n'){ // Ctrl+N - Nuevo Vehículo
          e.preventDefault();
          $("#btnNuevoVehiculo").click();
      }
    }
    
  });

  // Mejora de accesibilidad por teclado
  $("button, input, a, select, table, table th, table td").attr("tabindex", "0");


  // ------------------------------
  // FUNCIONES
  // ------------------------------

  function actualizarFormulario(p){
    $("#fuente-titulo").val(p.tamanoTitulo);
    $("#fuente-texto").val(p.tamanoTexto);
    $("#color-titulos").val(p.colorTitulos);
    $("#color-texto").val(p.colorTexto);
    $("#fondo-seccion").val(p.fondoSeccion);
    $("#subrayado-enlaces").prop("checked", p.subrayadoEnlaces);
    $("#modo-contraste").prop("checked", p.modoContraste);
    $("#modo-daltonismo").prop("checked", p.modoDaltonismo);
  }

 function aplicarPreferencias(p){
    if(p.tamanoTitulo){
      // h2 más grande que h4
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
}


});