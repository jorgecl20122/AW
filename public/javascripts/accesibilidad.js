$(document).ready(function(){

  // Cargar preferencias desde sessionStorage si existen
  if(sessionStorage.getItem('accesibilidad')) {
      let prefs = JSON.parse(sessionStorage.getItem('accesibilidad'));
      aplicarPreferencias(prefs);
  }

  // Capturar submit del formulario
  $("#form-configurador").on("submit", function(e){
    e.preventDefault();

    // Crear objeto de preferencias
    let prefs = {
        tamanoTitulo: $("#fuente-titulo").val(),
        tamanoTexto: $("#fuente-texto").val(),
        colorTitulos: $("#color-titulos").val(),
        colorTexto: $("#color-texto").val(),
        fondoSeccion: $("#fondo-seccion").val(),
        subrayadoEnlaces: $("#subrayado-enlaces").is(":checked"),
        modoContraste: $("#modo-contraste").is(":checked"),
        modoDaltonismo: $("#modo-daltonismo").is(":checked")
    };

    // Guardar en sesión
    sessionStorage.setItem('accesibilidad', JSON.stringify(prefs));

    // Aplicar visualmente
    aplicarPreferencias(prefs);

    // Cerrar modal
    bootstrap.Modal.getOrCreateInstance($('#configuradorModal')).hide();
  });

  // Restaurar valores por defecto
  $("#btnRestaurar").on("click", function(){
    sessionStorage.removeItem('accesibilidad');
    $("#fuente-titulo").val("1.5");
    $("#fuente-texto").val("1");
    $("#color-titulos").val("#000000");
    $("#color-texto").val("#333333");
    $("#fondo-seccion").val("#f8f9fa");
    $("#subrayado-enlaces").prop("checked", false);
    $("#modo-contraste").prop("checked", false);
    $("#modo-daltonismo").prop("checked", false);

    aplicarPreferencias({});
  });

  // Función que aplica todas las preferencias
  function aplicarPreferencias(prefs) {
    // Tamaño de títulos
    $("h2, h4").css("font-size", (prefs.tamanoTitulo || 1.5) + "rem");

    // Tamaño de texto (párrafos, status-box, tabla)
    let tamTexto = (prefs.tamanoTexto || 1) + "rem";
    $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a").css("font-size", tamTexto);

    // Color títulos
    $("h2, h4").css("color", prefs.colorTitulos || "#000000");

    // Color texto (incluye tabla, status-box, small)
    let colorTexto = prefs.colorTexto || "#333333";
    $("p, .vehicle-card p, .status-box, small, table, table th, table td, input, select, button, a").css("color", colorTexto);

    // Fondo sección principal
    $("main").css("background-color", prefs.fondoSeccion || "#f8f9fa");

    // Subrayado enlaces
    $("a").css("text-decoration", prefs.subrayadoEnlaces ? "underline" : "none");

    // Contraste alto
    if(prefs.modoContraste) {
        $("body").addClass("alto-contraste");
    } else {
        $("body").removeClass("alto-contraste");
    }

    // Paleta daltonismo
    if(prefs.modoDaltonismo) {
        $("body").addClass("daltonismo");
    } else {
        $("body").removeClass("daltonismo");
    }
  }

  // Atajos de teclado predefinidos
  $(document).keydown(function(e){
    if(e.ctrlKey && e.key.toLowerCase() === 'r'){ // Ctrl+R
        e.preventDefault();
        $("#btnReservarVehiculo").click();
    }
    if(e.ctrlKey && e.key.toLowerCase() === 'h'){ // Ctrl+H
        e.preventDefault();
        $("#linkMisReservas").click();
    }
  });

  // Mejora de accesibilidad por teclado
  $("button, input, a, select, table, table th, table td").attr("tabindex", "0"); 

});
