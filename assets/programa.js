/* ============================================================
   Programa del evento: los items aparecen al entrar en pantalla
   y el bullet de cada horario crece conforme el usuario baja,
   alcanzando su tamano maximo al pasar por el foco de la
   pantalla y volviendo al normal al alejarse.
   ============================================================ */
(function () {
  'use strict';

  var CRECER_MAX = 0.6;    // 1 -> 1.6 veces el tamano del bullet
  var FOCO = 0.60;         // altura de pantalla donde el bullet es mayor
  var ALCANCE = 0.42;      // distancia (en pantallas) para volver al normal
  var ENTRADA = 0.92;      // altura a la que el item aparece

  var items = Array.prototype.slice.call(
    document.querySelectorAll('.agenda__item')
  );
  if (!items.length) return;

  // Cada item con su bullet, ya resueltos
  var filas = items.map(function (item) {
    return { item: item, punto: item.querySelector('.agenda__punto') };
  });

  function revelarTodo() {
    filas.forEach(function (f) { f.item.classList.add('esta-visible'); });
  }

  // Con el movimiento reducido se muestra todo quieto
  var reducido = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducido) {
    revelarTodo();
    return;
  }

  var pendiente = false;

  function medir() {
    pendiente = false;

    var alto = window.innerHeight;
    var foco = alto * FOCO;
    var alcance = alto * ALCANCE;

    for (var i = 0; i < filas.length; i++) {
      var f = filas[i];
      if (!f.punto) continue;

      // El bullet crece desde su centro, asi que el centro no se mueve
      var caja = f.punto.getBoundingClientRect();
      var centro = caja.top + caja.height / 2;

      if (centro < alto * ENTRADA && caja.bottom > 0) {
        f.item.classList.add('esta-visible');
      }

      var cerca = Math.max(0, 1 - Math.abs(centro - foco) / alcance);
      cerca = cerca * cerca * (3 - 2 * cerca);   // suaviza los extremos

      f.punto.style.setProperty('--crecer', (1 + cerca * CRECER_MAX).toFixed(3));
    }
  }

  function solicitar() {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(medir);
    }
  }

  window.addEventListener('scroll', solicitar, { passive: true });
  window.addEventListener('resize', solicitar);
  window.addEventListener('load', solicitar);   // las imagenes cambian el alto al cargar

  medir();
})();
