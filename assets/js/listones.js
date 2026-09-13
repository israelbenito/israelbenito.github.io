/* =========================================================
   LISTONES — la pared del fondo de la sala, detrás del 01

   La otra vía para el fondo del capítulo de Trabajos. La malla de
   puntos propone una superficie que se aleja; esto propone lo
   contrario: un sitio. No es un fondo que además pega con la intro,
   es literalmente la misma nave vista desde dentro.

   Por qué esta idea y no otra: la única regla que ha funcionado en
   toda la web está escrita en el brief —mover o iluminar lo que ya
   existe en la escena—. La estela de humo y la cámara del museo se
   cayeron por saltársela. Aquí no se inventa nada: los listones ya
   existen, el neón ya existe y el cursor ya es una luz.

   Y hay un argumento de composición: el carrusel se despliega a lo
   ancho y los listones bajan. Eso es contraste. La malla comparte
   eje con las tarjetas, y por eso necesita tanta máscara para no
   estorbar.

   Las medidas NO están inventadas, salen de sala.js:
     84 listones de 0,55 de ancho por 10 de alto y 0,5 de fondo
     color 0x1B2028
     planta en U por seis puntos, de (-19,15) a (19,15)
     niebla exponencial 0x070910
     tira de neón a y=0,14 y otra casi apagada a y=9,3
     cámara de 40° con el ojo a 3,2 y en z=13

   Canvas 2D otra vez, y aquí sale aún más a cuenta que en la malla:
   son 84 rectángulos y tres trazos, no trece mil puntos.
   ========================================================= */

export const VALORES = {
  /* ---- Cámara. La de la sala, sin tocar. ---- */
  fov:        40,
  alturaOjo:  3.2,
  camZ:       13,
  horizonte:  0.46,   // 0 = arriba del lienzo, 1 = abajo

  /* ---- La nave ---- */
  numero:     84,
  anchoListon: 0.55,
  fondoListon: 0.5,
  altoSala:   10,
  escala:     1,      // agranda o encoge la planta entera

  /* ---- Profundidad y materia ---- */
  niebla:     0.042,  // la de sala.js
  opacidad:   0.55,   // techo de brillo del listón más cercano
  colorListon:'#39424F',

  /* ---- Neón ---- */
  colorNeon:  '#FFC98F',   // el de la tira del suelo en sala.js
  neonSuelo:  0.30,
  neonTecho:  0.10,
  anchoHalo:  46,     // px del halo más ancho
  respiracion: 0.16,  // cuánto late el neón, 0 = fijo
  velRespira: 0.09,   // rad/s

  /* ---- El cursor es una luz, no un puntero ----
     Es la firma de la web y en el capítulo 01 no estaba usada. */
  luzCursor:  0.85,
  radioCursor: 300,   // px

  /* ---- Vaivén ----
     La cámara se mece lo justo para que la pared no esté muerta. El
     movimiento que vende la profundidad aquí es el paralaje entre
     listones cercanos y lejanos, no que algo ondule. */
  vaiven:     0.55,   // unidades de mundo
  velVaiven:  0.055,  // rad/s

  /* ---- Máscara de contenido ---- */
  atenuacion: 0.45,
  margen:     130,

  /* ---- Sistema ---- */
  fps:        30,
  dpr:        1.25,
  deriva:     0
};

const NIVELES = 22;                 // escalones de brillo del listón
const CELDAS_X = 44, CELDAS_Y = 28; // resolución del mapa de atenuación

/* La máscara está duplicada respecto a malla.js a sabiendas. Son dos
   propuestas que compiten y una de las dos se va a borrar; sacarla a
   un módulo común dejaría un archivo compartido con un solo cliente,
   y tocar la malla ya aprobada para refactorizar es riesgo sin premio.
   Si sobreviven las dos, entonces sí: se extrae. */

const limitar = (v, a, b) => v < a ? a : (v > b ? b : v);

export function montarListones(lienzo, opciones = {}) {
  const ctx = lienzo.getContext('2d', { alpha: true });
  if (!ctx) return nulo();

  const v = Object.assign({}, VALORES, opciones);
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, cx = 0, cy = 0, f = 0;
  let planta = [];      // { x, z, tx, tz } muestreados de la curva
  let mascara = new Float32Array(CELDAS_X * CELDAS_Y).fill(1);
  let cajas = [];
  let tintas = [];

  let vivo = false, corriendo = false, pedido = 0;
  let t0 = performance.now(), ultimo = 0, ms = 0, pintados = 0, dibujados = 0;
  let raton = { x: -9999, y: -9999, dentro: false };

  /* ---- La planta de la nave ---------------------------------
     Los mismos seis puntos de sala.js, interpolados con Catmull-Rom.
     Si se escribieran a mano las 84 posiciones, la pared de aquí y la
     sala de allí se separarían en cuanto alguien tocase una. */
  const CONTROL = [
    [-19, 15], [-13, -2], [-9.5, -14], [9.5, -14], [13, -2], [19, 15]
  ];

  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t +
                  (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                  (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  function catmullDer(p0, p1, p2, p3, t) {
    const t2 = t * t;
    return 0.5 * ((-p0 + p2) +
                  2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
                  3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2);
  }

  function trazarPlanta() {
    const c = CONTROL;
    const n = c.length;
    planta = [];
    for (let i = 0; i < v.numero; i++) {
      const u = i / (v.numero - 1) * (n - 1);
      const seg = Math.min(Math.floor(u), n - 2);
      const t = u - seg;
      const p0 = c[Math.max(seg - 1, 0)], p1 = c[seg];
      const p2 = c[seg + 1], p3 = c[Math.min(seg + 2, n - 1)];
      const x  = catmull(p0[0], p1[0], p2[0], p3[0], t) * v.escala;
      const z  = catmull(p0[1], p1[1], p2[1], p3[1], t) * v.escala;
      let tx = catmullDer(p0[0], p1[0], p2[0], p3[0], t);
      let tz = catmullDer(p0[1], p1[1], p2[1], p3[1], t);
      const L = Math.hypot(tx, tz) || 1;
      planta.push({ x, z, tx: tx / L, tz: tz / L });
    }
  }

  function prepararTintas() {
    const [r, g, b] = aRGB(v.colorListon);
    tintas = new Array(NIVELES + 1);
    for (let i = 0; i <= NIVELES; i++) {
      const k = i / NIVELES;
      tintas[i] = `rgba(${r},${g},${b},${(k * v.opacidad).toFixed(4)})`;
    }
  }

  function construir() {
    const rect = lienzo.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width  * v.dpr));
    H = Math.max(1, Math.round(rect.height * v.dpr));
    lienzo.width = W; lienzo.height = H;
    cx = W / 2;
    cy = H * v.horizonte;
    f  = (H / 2) / Math.tan(v.fov * Math.PI / 360);
    trazarPlanta();
    prepararTintas();
    remapearMascara();
  }

  /* ---- Máscara ---- */
  function medir(elementos) {
    const base = lienzo.getBoundingClientRect();
    cajas = [];
    for (const el of elementos || []) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      cajas.push({ x0: r.left - base.left, y0: r.top - base.top,
                   x1: r.right - base.left, y1: r.bottom - base.top });
    }
    remapearMascara();
  }

  function remapearMascara() {
    mascara.fill(1);
    if (!cajas.length || v.atenuacion >= 1) return;
    const rect = lienzo.getBoundingClientRect();
    const ax = rect.width / CELDAS_X, ay = rect.height / CELDAS_Y;
    for (let j = 0; j < CELDAS_Y; j++) {
      const py = (j + 0.5) * ay;
      for (let i = 0; i < CELDAS_X; i++) {
        const px = (i + 0.5) * ax;
        let m = 1;
        for (const c of cajas) {
          const dx = px < c.x0 ? c.x0 - px : (px > c.x1 ? px - c.x1 : 0);
          const dy = py < c.y0 ? c.y0 - py : (py > c.y1 ? py - c.y1 : 0);
          const k = limitar(Math.hypot(dx, dy) / v.margen, 0, 1);
          m = Math.min(m, v.atenuacion + (1 - v.atenuacion) * (k * k * (3 - 2 * k)));
        }
        mascara[j * CELDAS_X + i] = m;
      }
    }
  }

  const muestraMascara = (sx, sy) =>
    mascara[limitar((sy / H * CELDAS_Y) | 0, 0, CELDAS_Y - 1) * CELDAS_X +
            limitar((sx / W * CELDAS_X) | 0, 0, CELDAS_X - 1)] || 0;

  /* ---- Pintado ---------------------------------------------- */
  function pintar(ahora) {
    const arranque = performance.now();
    const t = (ahora - t0) / 1000;
    ctx.clearRect(0, 0, W, H);

    /* El vaivén mueve la CÁMARA, no la nave: así los listones
       cercanos se desplazan más que los del fondo y el paralaje
       cuenta la profundidad solo. Es el mismo principio por el que
       el logo de la intro despega de un punto fijo de pantalla. */
    const camX = Math.sin(t * v.velVaiven) * v.vaiven;
    const camZ = v.camZ + v.deriva;
    const late = 1 + Math.sin(t * v.velRespira) * v.respiracion;

    const rx = raton.dentro ? raton.x : -9999;
    const ry = raton.dentro ? raton.y : -9999;
    const radio2 = v.radioCursor * v.radioCursor;

    /* Los bordes proyectados del suelo y del techo, que sirven para
       dos cosas: recortar el listón y trazar el neón. */
    const sueloX = new Float32Array(v.numero);
    const sueloY = new Float32Array(v.numero);
    const techoY = new Float32Array(v.numero);
    const visible = new Uint8Array(v.numero);

    let tinta = -1;
    dibujados = 0;

    for (let i = 0; i < v.numero; i++) {
      const p = planta[i];
      const d = camZ - p.z;
      if (d <= 0.6) { visible[i] = 0; continue; }

      const escala = f / d;
      const sx = cx + escala * (p.x - camX);
      const sySuelo = cy + escala * v.alturaOjo;
      const syTecho = cy + escala * (v.alturaOjo - v.altoSala * v.escala);
      sueloX[i] = sx; sueloY[i] = sySuelo; techoY[i] = syTecho;

      /* Ancho aparente. El listón está girado para seguir la tangente
         de la planta, así que los de los lados se ven casi de canto:
         lo que se ve de ancho es la componente perpendicular a la
         visual, más el canto que asoma. Sin esto la pared se lee como
         una valla plana y se pierde que es una nave curva. */
      let vx = p.x - camX, vz = p.z - camZ;
      const L = Math.hypot(vx, vz) || 1;
      vx /= L; vz /= L;
      const cruz = Math.abs(p.tx * vz - p.tz * vx);
      const punto = Math.abs(p.tx * vx + p.tz * vz);
      const ancho = Math.max(1, escala * (v.anchoListon * cruz + v.fondoListon * punto) * v.escala);

      if (sx < -ancho || sx > W + ancho) { visible[i] = 0; continue; }
      visible[i] = 1;

      /* Brillo: niebla, más la luz del cursor. La luz sube el nivel
         del listón; no se pinta un halo encima, que es lo que hacía
         que la estela de humo se leyera como una capa ajena. */
      let brillo = Math.exp(-((d * v.niebla) ** 2));
      if (rx > -9000) {
        const dx = sx - rx;
        const dy = (sySuelo + syTecho) * 0.5 - ry;
        const d2 = dx * dx + dy * dy;
        if (d2 < radio2) {
          const k = 1 - d2 / radio2;
          brillo += v.luzCursor * k * k * brillo;
        }
      }
      brillo *= muestraMascara(sx, sySuelo);

      const nivel = limitar((brillo * NIVELES + 0.5) | 0, 0, NIVELES);
      if (nivel === 0) continue;
      if (nivel !== tinta) { tinta = nivel; ctx.fillStyle = tintas[nivel]; }
      ctx.fillRect(sx - ancho * 0.5, syTecho, ancho, sySuelo - syTecho);
      dibujados++;
    }

    /* ---- Neón ----
       Tres trazos de ancho decreciente en vez de shadowBlur, que es
       caro y en Canvas 2D se recalcula por trazo. El halo apretado de
       la sala se consigue igual y cuesta tres llamadas. */
    ctx.globalCompositeOperation = 'lighter';
    trazarNeon(sueloX, sueloY, visible, v.neonSuelo * late, v.anchoHalo);
    trazarNeon(sueloX, techoY, visible, v.neonTecho * late, v.anchoHalo * 0.6);
    ctx.globalCompositeOperation = 'source-over';

    pintados++;
    ms = performance.now() - arranque;
  }

  function trazarNeon(xs, ys, visible, fuerza, ancho) {
    if (fuerza <= 0) return;
    const [r, g, b] = aRGB(v.colorNeon);
    const capas = [[ancho, 0.10], [ancho * 0.42, 0.22], [ancho * 0.14, 0.55]];
    for (const [grosor, alfa] of capas) {
      ctx.beginPath();
      let abierto = false;
      for (let i = 0; i < v.numero; i++) {
        if (!visible[i]) { abierto = false; continue; }
        const m = muestraMascara(xs[i], ys[i]);
        if (m < 0.08) { abierto = false; continue; }
        if (!abierto) { ctx.moveTo(xs[i], ys[i]); abierto = true; }
        else ctx.lineTo(xs[i], ys[i]);
      }
      ctx.strokeStyle = `rgba(${r},${g},${b},${(alfa * fuerza).toFixed(4)})`;
      ctx.lineWidth = grosor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  /* ---- Bucle ---- */
  function marco(ahora) {
    if (!corriendo) return;
    pedido = requestAnimationFrame(marco);
    if (ahora - ultimo < 1000 / v.fps - 1) return;
    ultimo = ahora;
    pintar(ahora);
  }
  function arrancar() {
    if (corriendo || !vivo) return;
    if (reducido) { pintar(performance.now()); return; }
    corriendo = true; ultimo = 0;
    pedido = requestAnimationFrame(marco);
  }
  function parar() {
    corriendo = false;
    if (pedido) cancelAnimationFrame(pedido);
    pedido = 0;
  }

  /* El cursor. En táctil no hay puntero: `dentro` se queda en falso y
     los listones se quedan con la luz de la sala, sin más. */
  function alMover(e) {
    const r = lienzo.getBoundingClientRect();
    raton.x = (e.clientX - r.left) * v.dpr;
    raton.y = (e.clientY - r.top) * v.dpr;
    raton.dentro = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
  }
  function alSalir() { raton.dentro = false; }
  addEventListener('pointermove', alMover, { passive: true });
  addEventListener('pointerleave', alSalir, { passive: true });

  const centinela = new IntersectionObserver(es => {
    vivo = es[0].isIntersecting;
    vivo ? arrancar() : parar();
  }, { rootMargin: '120px' });
  centinela.observe(lienzo);

  const observador = new ResizeObserver(() => {
    construir();
    if (reducido) pintar(performance.now());
  });
  observador.observe(lienzo);

  construir();
  vivo = true;
  arrancar();

  return {
    ajustar(parciales) {
      let geometria = false;
      for (const k in parciales) {
        if (v[k] === parciales[k]) continue;
        v[k] = parciales[k];
        if (k === 'colorListon' || k === 'opacidad') prepararTintas();
        else if (!SIN_GEOMETRIA.has(k)) geometria = true;
      }
      if (geometria) construir();
      if (reducido || !corriendo) pintar(performance.now());
    },
    progreso(unidades) { v.deriva = unidades; },
    medir,
    valores() { return Object.assign({}, v); },
    estadisticas() {
      return { puntos: dibujados, ms, pintados, fps: v.fps,
               paso: v.escala, filas: v.numero };
    },
    destruir() {
      parar();
      centinela.disconnect();
      observador.disconnect();
      removeEventListener('pointermove', alMover);
      removeEventListener('pointerleave', alSalir);
      ctx.clearRect(0, 0, W, H);
    }
  };
}

const SIN_GEOMETRIA = new Set([
  'deriva', 'fps', 'niebla', 'colorNeon', 'neonSuelo', 'neonTecho',
  'anchoHalo', 'respiracion', 'velRespira', 'luzCursor', 'radioCursor',
  'vaiven', 'velVaiven', 'camZ', 'anchoListon', 'fondoListon'
]);

function nulo() {
  const no = () => {};
  return { ajustar: no, progreso: no, medir: no, destruir: no,
           valores: () => ({}), estadisticas: () => ({ puntos: 0, ms: 0, pintados: 0 }) };
}

function aRGB(hex) {
  const s = hex.replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/./g, c => c + c) : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
