/* ============================================================
   Pan (arrastrar) + pinch zoom sobre la zona interactiva.
   Version en JavaScript plano, sin frameworks.
   ============================================================ */
(function () {
  'use strict';

  var ZOOM_MIN = 1;
  var ZOOM_MAX = 4;

  var zona = document.getElementById('zona');
  var contenido = document.getElementById('contenido');
  if (!zona || !contenido) return;

  var estado = { scale: 1, tx: 0, ty: 0 };
  var punteros = new Map();
  var gesto = null;

  function distancia(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function medio(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  // Limita el zoom y evita que el contenido se despegue de los bordes
  function limitar(scale, tx, ty, rect) {
    var s = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
    var maxX = rect.width * (s - 1);
    var maxY = rect.height * (s - 1);
    return {
      scale: s,
      tx: Math.min(0, Math.max(-maxX, tx)),
      ty: Math.min(0, Math.max(-maxY, ty))
    };
  }

  function pintar() {
    contenido.style.transform =
      'translate(' + estado.tx + 'px, ' + estado.ty + 'px) scale(' + estado.scale + ')';
  }

  function aplicar(nuevo) {
    estado = nuevo;
    pintar();
  }

  zona.addEventListener('pointerdown', function (e) {
    zona.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var rect = zona.getBoundingClientRect();
    var pts = Array.from(punteros.values());

    if (punteros.size === 1) {
      gesto = {
        modo: 'pan',
        scale: estado.scale, tx: estado.tx, ty: estado.ty,
        inicio: { x: pts[0].x, y: pts[0].y },
        rect: rect
      };
    } else if (punteros.size === 2) {
      gesto = {
        modo: 'pinch',
        scale: estado.scale, tx: estado.tx, ty: estado.ty,
        dist: distancia(pts[0], pts[1]),
        medio: medio(pts[0], pts[1]),
        rect: rect
      };
    }
  });

  zona.addEventListener('pointermove', function (e) {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesto) return;

    var rect = gesto.rect;

    if (gesto.modo === 'pan' && punteros.size === 1) {
      var p = punteros.get(e.pointerId);
      var dx = p.x - gesto.inicio.x;
      var dy = p.y - gesto.inicio.y;
      aplicar(limitar(gesto.scale, gesto.tx + dx, gesto.ty + dy, rect));

    } else if (gesto.modo === 'pinch' && punteros.size === 2) {
      var pts = Array.from(punteros.values());
      var dist = distancia(pts[0], pts[1]);
      var med = medio(pts[0], pts[1]);
      var nuevoScale = gesto.scale * (dist / gesto.dist);
      var localX = gesto.medio.x - rect.left;
      var localY = gesto.medio.y - rect.top;
      var delta = nuevoScale / gesto.scale;
      var tx = (gesto.tx - localX) * delta + localX + (med.x - gesto.medio.x);
      var ty = (gesto.ty - localY) * delta + localY + (med.y - gesto.medio.y);
      aplicar(limitar(nuevoScale, tx, ty, rect));
    }
  });

  function soltar(e) {
    punteros.delete(e.pointerId);

    if (punteros.size === 0) {
      gesto = null;
    } else if (punteros.size === 1) {
      // De pinch a pan: se reinicia el gesto con el dedo que queda
      var pts = Array.from(punteros.values());
      gesto = {
        modo: 'pan',
        scale: estado.scale, tx: estado.tx, ty: estado.ty,
        inicio: { x: pts[0].x, y: pts[0].y },
        rect: gesto ? gesto.rect : zona.getBoundingClientRect()
      };
    }
  }

  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);

  // Safari en iOS hace zoom de toda la pagina al pellizcar; dentro de la
  // zona el gesto debe ampliar solo el croquis.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (tipo) {
    zona.addEventListener(tipo, function (e) { e.preventDefault(); });
  });

  pintar();
})();
