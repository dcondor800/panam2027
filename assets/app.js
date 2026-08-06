/* ============================================================
   Pan (arrastrar) + pinch zoom sobre la zona interactiva.
   Version en JavaScript plano, sin frameworks.

   El gesto es INCREMENTAL: cada movimiento parte del estado que
   ya esta en pantalla, no del estado inicial del gesto. Asi el
   croquis no se desplaza cuando el limite recorta la posicion o
   cuando el navegador se salta algun evento.
   ============================================================ */
(function () {
  'use strict';

  var ZOOM_MIN = 1;
  var ZOOM_MAX = 4;

  var zona = document.getElementById('zona');
  var contenido = document.getElementById('contenido');
  if (!zona || !contenido) return;

  // scale = ampliacion actual; tx/ty = desplazamiento en px de pantalla
  var estado = { scale: 1, tx: 0, ty: 0 };

  var punteros = new Map();   // pointerId -> {x, y}
  var previo = null;          // referencia del movimiento anterior
  var rect = null;            // medidas de la zona durante el gesto

  function distancia(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function medio(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  function dedos() { return Array.from(punteros.values()); }

  function medir() { rect = zona.getBoundingClientRect(); }

  // Mantiene el croquis cubriendo la zona: sin zoom queda centrado,
  // con zoom no puede despegarse de ningun borde.
  function limitar(s, tx, ty) {
    var sobraX = rect.width * s - rect.width;
    var sobraY = rect.height * s - rect.height;
    return {
      scale: s,
      tx: sobraX <= 0 ? -sobraX / 2 : Math.min(0, Math.max(-sobraX, tx)),
      ty: sobraY <= 0 ? -sobraY / 2 : Math.min(0, Math.max(-sobraY, ty))
    };
  }

  function aplicar(s, tx, ty) {
    estado = limitar(s, tx, ty);
    contenido.style.transform =
      'translate(' + estado.tx + 'px, ' + estado.ty + 'px) scale(' + estado.scale + ')';
  }

  function pintar() { aplicar(estado.scale, estado.tx, estado.ty); }

  // Recalcula la referencia a partir de los dedos que hay ahora.
  // Se llama al apoyar o levantar un dedo para que no haya saltos.
  function referenciar() {
    var pts = dedos();
    if (pts.length === 1) {
      previo = { modo: 'pan', punto: { x: pts[0].x, y: pts[0].y } };
    } else if (pts.length >= 2) {
      previo = {
        modo: 'pinch',
        dist: distancia(pts[0], pts[1]),
        centro: medio(pts[0], pts[1])
      };
    } else {
      previo = null;
    }
  }

  zona.addEventListener('pointerdown', function (e) {
    zona.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    medir();
    referenciar();
  });

  zona.addEventListener('pointermove', function (e) {
    if (!punteros.has(e.pointerId) || !previo) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });

    var pts = dedos();

    if (previo.modo === 'pan' && pts.length === 1) {
      // Un dedo: recorre el croquis
      var p = pts[0];
      aplicar(
        estado.scale,
        estado.tx + (p.x - previo.punto.x),
        estado.ty + (p.y - previo.punto.y)
      );
      previo.punto = { x: p.x, y: p.y };

    } else if (previo.modo === 'pinch' && pts.length >= 2) {
      // Dos dedos: el punto que hay entre los dedos se queda quieto
      var dist = distancia(pts[0], pts[1]);
      var centro = medio(pts[0], pts[1]);
      if (previo.dist <= 0) { previo.dist = dist; return; }

      var deseado = estado.scale * (dist / previo.dist);
      var nuevo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, deseado));
      var factor = nuevo / estado.scale;   // el real, ya con el tope aplicado

      // Ancla local del gesto, relativa a la esquina de la zona
      var cx = previo.centro.x - rect.left;
      var cy = previo.centro.y - rect.top;

      aplicar(
        nuevo,
        (estado.tx - cx) * factor + cx + (centro.x - previo.centro.x),
        (estado.ty - cy) * factor + cy + (centro.y - previo.centro.y)
      );

      previo.dist = dist;
      previo.centro = centro;
    }
  });

  function soltar(e) {
    punteros.delete(e.pointerId);
    referenciar();   // de pinch a pan (o fin del gesto) sin salto
  }

  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);

  // El navegador tambien quiere hacer zoom de la pagina al pellizcar.
  // Dentro del recuadro el gesto es solo para el croquis.
  zona.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (tipo) {
    zona.addEventListener(tipo, function (e) { e.preventDefault(); });
  });

  // Si la zona cambia de tamano (giro de pantalla), recolocar
  window.addEventListener('resize', function () { medir(); pintar(); });

  medir();
  pintar();
})();
