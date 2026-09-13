import { montarSala } from './sala.js';
import { montarMalla } from './malla.js';
import { PROYECTOS, CONTACTO, SOFTWARE } from './datos.js';
import { reducido, $, $$, activarRevelados, tomarVuelta, medirVentana } from './comun.js';

/* =========================================================
   01 · CARRUSEL DE TRABAJOS
   Se pinta desde las fichas. Añadir un proyecto es rellenar
   un objeto en datos.js, no tocar esta plantilla: en ninguna
   parte de aquí hay un 4 escrito a mano, el número de piezas
   sale siempre de la longitud del mazo.

   Las tarjetas van en posición absoluta y se transforman una
   a una según su distancia al centro. No es un anillo 3D —el
   porqué está en home.css.
   ========================================================= */

const LADOS = 2;     // pasos visibles a cada lado del centro

/* La separación y el ángulo los declara el CSS —`--sep` en anchos de
   tarjeta, `--giro` en grados— para que una media query pueda cambiar la
   geometría sin tocar esto. Se releen al medir, no en cada frame:
   getComputedStyle fuerza resolver estilo y el arrastre pinta a 60 fps. */
let GEO = { sep:1.13, giro:40, comp:0.84 };

/* Distancia lateral de una pieza, en anchos de tarjeta.

   El primer vecino va a la separación de la referencia y NO se toca: es
   el que fija el parecido. A partir del segundo se comprime. El motivo es
   de pantalla, no de gusto: con la separación pareja, la cuarta pieza cae
   justo detrás del borde y no se ve ni un píxel de ella, así que no se lee
   como "está lejos" sino como "ya no está". Comprimida asoma un tercio y
   el carrusel sigue diciendo que hay más obra a ese lado.

   Continua y monótona a propósito: durante el arrastre `d` es fraccionario
   y cualquier salto aquí se notaría en el dedo. */
function dist(d){
  const a = Math.abs(d);
  return Math.sign(d) * (Math.min(a, 1) + Math.max(0, a - 1) * GEO.comp);
}

let tarjetas = [];   // todas, en el orden de las fichas
let mazo = [];       // las que pasan el filtro
let actual = 0;      // posición en el mazo; SIEMPRE fraccionaria

/* ---- El bucle ------------------------------------------
   *(13 sep 2026, lo pidió Israel)* El carrusel da la vuelta: pasada la
   última pieza vuelve la primera, y al revés. Aquí decía "sin bucle: con
   cuatro piezas, dar la vuelta desorienta más que ayuda", y se revierte
   con la pega delante —con cuatro piezas la obra se REPITE, y a lo ancho
   la misma pieza puede verse en los dos bordes a la vez—. Decisión suya.

   SOLO DA LA VUELTA SIN FILTRO *(13 sep 2026, misma noche, lo pidió
   Israel)*. Con Environments o Props se para en los extremos, con su pared
   y sus flechas apagadas, como antes. Primero se montó con "tres piezas o
   más", y Props, que tiene tres, daba la vuelta repitiendo el Terminator
   en los dos bordes. Y tampoco hay bucle si el sitio entero tuviera menos
   de tres piezas: dos dando vueltas se leen como un fallo.

   UNA TARJETA POR PIEZA NO BASTA, y es lo que obliga a las copias. Con
   cuatro piezas, la que queda enfrente del centro tendría que verse en
   los dos bordes a la vez; con un solo nodo, un lado se queda vacío o la
   pieza cruza la pantalla de un salto. Cada pieza lleva copias a vueltas
   enteras, y cuando la original pasa de un borde al otro su copia hace el
   camino contrario EN EL MISMO FOTOGRAMA: son idénticas y están en el
   mismo sitio, así que el relevo no se ve.

   LA ORIGINAL ES SIEMPRE LA MÁS CERCANA AL CENTRO, así que la pieza del
   frente es siempre la de verdad: la del clip, la del tabulador y la que
   despega. Las copias son solo imagen. */
const BUCLE_MIN = 3;
/* Hasta dónde se ve una pieza, en pasos: pasado LADOS se apaga en 1,5
   pasos más —ver `pintarVista()`—. De aquí sale cuántas vistas necesita
   cada pieza para cubrir los dos lados sin huecos. */
const ALCANCE = LADOS + 1.5;
/* El filtro puesto. Lo escribe `filtrar()`. */
let filtroActivo = 'todos';
const enBucle = () => filtroActivo === 'todos' && mazo.length >= BUCLE_MIN;
const mod = (a, n) => ((a % n) + n) % n;
/* Qué pieza del mazo hay en una posición del carrusel. */
const piezaEn = pos => enBucle() ? mod(Math.round(pos), mazo.length) : Math.round(pos);
/* Cuántas vistas pinta cada pieza con el mazo actual: dos con cuatro
   piezas, tres con tres, una sin bucle. */
const vistasPorPieza = () => enBucle() ? Math.ceil(2 * ALCANCE / mazo.length) : 1;

/* ---- El motor del movimiento ---------------------------
   Antes el carrusel se movía de dos maneras distintas: al arrastrar,
   `actual` era continuo y lo pintaba el JS frame a frame; al pulsar una
   flecha, `actual` saltaba al entero y la interpolación la hacía el CSS
   con una transición de .85s sobre `transform`.

   Eso son dos movimientos con leyes distintas para la misma pieza, y de
   ahí salían las tres cosas que se notaban:

   - **Los fotogramas intermedios no eran del carrusel.** El CSS interpola
     el `translateX` de salida y el de llegada en línea recta. Pero la
     posición real no es lineal en `d` —`dist()` comprime a partir del
     segundo vecino—, así que la pieza pasaba por sitios donde el carrusel
     nunca la habría puesto, y llegaba al suyo por un camino que no era el
     que dibuja la geometría.
   - **La profundidad y el encendido saltaban en el frame 0.** `zIndex` y
     `.tarjeta--activa` se escribían con el valor de DESTINO nada más
     pulsar, así que la pieza entrante se ponía delante y se encendía
     cuando todavía estaba a un ancho de distancia, en vez de al cruzarse.
     Ese adelanto es la mitad de lo que se sentía raro.
   - **Interrumpir cortaba.** Dos clics seguidos reinician la transición
     desde cero, y `--curva` arranca muy rápido: la pieza se frenaba y
     volvía a arrancar de golpe. Y al soltar un arrastre lanzado, la
     velocidad del dedo se tiraba a la basura y empezaba una transición de
     duración fija, igual para un roce que para un manotazo.

   Ahora hay un solo camino: `actual` lo lleva SIEMPRE un muelle, y
   `pintar()` corre en cada frame. Cualquier instante del recorrido es un
   estado válido del carrusel —la misma compresión, el mismo giro, el
   mismo orden en z—, la profundidad cambia al cruzarse de verdad, y
   soltar un swipe lanzado continúa el gesto en vez de reiniciarlo.

   El muelle está CRÍTICAMENTE AMORTIGUADO, que es la frontera exacta
   entre llegar rebotando y llegar arrastrándose. Importa, porque la
   sección 5 del brief prohíbe los rebotes y las entradas elásticas: un
   muelle blando daría justo lo prohibido, y este no oscila nunca por sí
   solo. Lo único que puede pasarse de largo es un lanzamiento muy fuerte,
   y para eso está el tope de `VEL_MAX`. */

/* Rapidez de respuesta, en rad/s. Con amortiguamiento crítico la pieza se
   ve asentada sobre 6/OMEGA ≈ 0,67 s, del orden de los .85 s que duraba
   la transición del CSS, pero con la cola mucho más suave. */
const OMEGA = 9;
/* Tope a la velocidad que un lanzamiento puede inyectar, en piezas por
   segundo. Un muelle crítico solo se pasa de largo si al soltarlo lleva
   más de OMEGA·distancia; el exceso sobre ese punto es lo que se
   convierte en adelantamiento. A 14 el rebasamiento máximo es del 5% de
   un paso: se lee como que la pieza traía inercia, no como un rebote. Un
   swipe rápido de verdad ronda las 4 piezas/s, así que el tope casi nunca
   entra: está para el manotazo. */
const VEL_MAX = 14;
/* Velocidad de salida, en fracción de la que haría falta para pasarse de
   largo. Un muelle crítico soltado desde parado arranca desde velocidad
   cero, y eso, comparado con `--curva` —que salía disparada—, se siente
   como que la pieza tarda en enterarse de que has pulsado.

   Es exactamente lo que ya se aprendió con el vuelo del logo, y el brief
   lo tiene escrito: "la curva arranca con velocidad: con una simétrica el
   logo se quedaba clavado y parecía que no reaccionaba al scroll". Aquí
   pasa lo mismo, así que la solución es la misma: el clic entrega un
   empujón proporcional a lo que queda por recorrer.

   El tope del rebasamiento es 1 —a partir de ahí el muelle se pasa—, así
   que 0,6 deja margen de sobra: responde al instante y sigue sin rebotar
   nunca. */
const ARRANQUE = 0.6;

/* EL ARRASTRE ES LIBRE, CON INERCIA Y CON IMÁN *(13 sep 2026, lo pidió
   Israel)*. Al soltar, el destino es donde lo has dejado más lo que
   proyecta la velocidad, redondeado a la pieza más cercana. Antes era UN
   paso por gesto, arrastraras lo que arrastraras, y se sentía como que el
   carrusel tiraba de ti hacia atrás.

   `DESLIZ` es cuánto sigue deslizando por cada pieza/s de velocidad al
   soltar, en segundos. Medido sobre un paso de ~500 px —la tarjeta a 1.440
   de ventana—: un lanzamiento normal con el ratón ronda los 2 px/ms, o sea
   4 piezas/s, y sigue 1,4 piezas más. Un roce lento no sigue nada.

   `LANZAMIENTO_MAX` pone tope a lo que un lanzamiento recorre desde donde
   se suelta. Con cuatro obras, un manotazo que diera varias vueltas no
   enseña nada: marea. */
const DESLIZ = 0.35;
const LANZAMIENTO_MAX = 4;

let objetivo = 0;    // a dónde va el muelle
let vel = 0;         // velocidad de `actual`, en piezas por segundo
let rafId = 0;       // 0 = quieto
let ultimoT = 0;

/* Solución analítica del muelle crítico, no integración por pasos. Es
   estable con cualquier `dt`: si el navegador se salta 200 ms —otra
   pestaña, una decodificación de imagen—, la pieza aparece donde le toca
   en vez de salir disparada, que es lo que hace un integrador de Euler
   con un dt grande. */
function avanzar(dt){
  const d = actual - objetivo;
  const e = Math.exp(-OMEGA * dt);
  const k = vel + OMEGA * d;
  actual = objetivo + (d + k * dt) * e;
  vel    = (vel - OMEGA * k * dt) * e;
}

function frame(t){
  const dt = Math.min(0.05, Math.max(0, (t - ultimoT) / 1000));
  ultimoT = t;
  avanzar(dt);

  /* Asentado. El umbral va en fracción de pieza: medio milésimo de paso
     es menos de un píxel en pantalla. */
  if(Math.abs(actual - objetivo) < 5e-4 && Math.abs(vel) < 5e-3){
    actual = objetivo;
    vel = 0;
    parar();
  }
  pintar();
  if(rafId) rafId = requestAnimationFrame(frame);
}

function arrancar(){
  if(rafId) return;
  /* `will-change` solo mientras se mueve: mantenerlo fijo deja cuatro
     capas de composición vivas todo el rato para algo que está quieto la
     mayor parte del tiempo. */
  pista.classList.add('moviendo');
  ultimoT = performance.now();
  rafId = requestAnimationFrame(frame);
}

function parar(){
  if(rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  pista.classList.remove('moviendo');
}

/* Poner la pieza en su sitio sin recorrido: al montar y al filtrar. Ahí
   no hay nada que animar porque no se venía de ninguna parte. */
function saltar(i){
  parar();
  actual = objetivo = i;
  vel = 0;
}

/* Por qué pieza se abre el carrusel. Sale del mazo, no de un número
   escrito aquí: manda la ficha que lleve `portada: true`. Si ninguna la
   lleva —o el filtro la ha dejado fuera— se abre por la primera. Es la
   misma regla que el resto del carrusel: el número de piezas y su orden
   viven en las fichas, y reordenarlas no obliga a tocar este archivo.

   Se usa al montar y también al filtrar: acotar el mazo devuelve a la
   pieza de portada siempre que siga dentro, y si el filtro la deja fuera
   cae en la primera. Así la pieza que abre la página es la misma a la
   que se vuelve. */
function arranque(){
  const i = mazo.findIndex(t => t.p.portada);
  return i < 0 ? 0 : i;
}
let pista, puntos, estado, mando, flechas;

function tarjetaDe(p){
  const etiquetas = p.software.map(s => `<li>${s}</li>`).join('');

  /* Mismos derivados que usaba el índice y mismas URLs: el navegador
     no descarga nada nuevo. Lo que cambia es `sizes`, porque la
     tarjeta del carrusel no mide lo que medía la pieza del índice, y
     un `sizes` que miente hace elegir mal el archivo.

     `sizes` sigue a `--tarjeta` en home.css: 74vw en móvil, 31vw hasta
     que topa en 620 px —2.000 px de ventana—. Lo que NO puede seguir es
     el `min(…, 58vh)` de la misma variable, porque `sizes` no sabe de
     alturas: en una ventana baja la tarjeta será más pequeña de lo que
     aquí se declara. El error va del lado bueno —se elige un archivo de
     más, no de menos—, que es lo que no se ve. */
  let cara;
  if(p.hero){
    /* Los descriptores NO son `anchos`, y esto es lo que sostiene que la
       tarjeta pueda crecer. `anchos` es el lado LARGO del archivo —lo
       que mide `derivados.ps1` y lo que dice el nombre—, pero aquí la
       imagen entra con `object-fit:cover` en un cuadrado, así que se
       agota por el lado CORTO. Prometiéndole al navegador el lado largo
       se le está diciendo que el archivo chico da más de lo que da: con
       `anchos`, una tarjeta de 620 px se conformaba con
       `cottage-hero-700.webp`, que solo tiene 393 px de ancho, y la
       ampliaba 1,58 veces. Con el lado corto elige solo.

       Para un master cuadrado los dos números coinciden, que es por lo
       que el fallo llevaba escondido desde que existe el carrusel: solo
       se veía en las dos piezas que no son cuadradas.

       (El 10 sep 2026 se arregló lo mismo en `hero.anchos`, que también
       declaraba el lado largo. Aquel campo alimenta la portada de la
       página de proyecto y la banda de "siguiente"; este de aquí siempre
       tuvo `cuadrado` delante y nunca llegó a fallar.) */
    const [chico, grande] = p.hero.cuadrado ?? p.hero.anchos ?? [700, 1400];
    /* El rótulo solo donde el clic lleva de verdad a alguna parte. En el
       Cupra no hay página, así que no se pinta: `aria-hidden` porque es un
       apoyo visual, no contenido —el enlace ya se anuncia solo. */
    const ver = p.soloGaleria ? ''
      : `<span class="tarjeta__ver" aria-hidden="true"><span class="mono">Ver proyecto</span></span>`;

    /* El clip de la pieza, si la ficha lo trae. Va DESPUÉS de la imagen
       y ANTES del velo: tapa la miniatura y queda por debajo del rótulo
       "Ver proyecto", que tiene que seguir leyéndose sobre el vídeo.

       `preload="none"` no es un detalle de rendimiento, es la condición
       para que esto sea aceptable: sin él, entrar en la home descargaría
       857 KB que casi nadie va a mirar. No se pide un byte hasta que la
       pieza es la elegida. Y `aria-hidden`, porque no aporta información
       que no esté ya en el `alt` de la miniatura y en el título.

       `loop` puede ir aquí sin más porque el archivo viene cerrado sobre
       sí mismo: la cola está fundida sobre la cabeza al generarlo, así
       que termina donde empieza. Enlazando el clip en crudo se vería un
       corte cada cinco segundos —empieza de noche y acaba con la
       explosión—. Ver `derivados.ps1`. */
    const clip = p.hero.clip
      ? `<video class="tarjeta__clip" src="${p.hero.clip}"
                muted loop playsinline preload="none" tabindex="-1"
                aria-hidden="true" disablepictureinpicture></video>`
      : '';

    cara = `<div class="tarjeta__marco sobre-obra" style="--foco:${p.hero.foco ?? '50% 50%'}">
              <img src="${p.hero.web}"
                   srcset="${p.hero.chico} ${chico}w, ${p.hero.web} ${grande}w"
                   sizes="(max-width:860px) 74vw, (max-width:2000px) 31vw, 620px"
                   alt="${p.hero.alt}" loading="lazy" decoding="async"
                   draggable="false">
              ${clip}
              ${ver}
            </div>`;
  }else{
    cara = `<div class="tarjeta__marco">
              <div class="tarjeta__falta">
                <span class="mono">Render pendiente</span>
                <span class="mono mute">${p.titulo}</span>
              </div>
            </div>`;
  }

  /* La pieza es una losa, no un plano: cara frontal más dos cantos. Solo
     se ve el del lado hacia el que gira la tarjeta; el otro lo tapa la
     propia cara. Van vacíos y ocultos para los lectores de pantalla:
     son volumen, no contenido. */
  const marco = `<div class="tarjeta__losa">
                   <span class="tarjeta__canto tarjeta__canto--izq" aria-hidden="true"></span>
                   <span class="tarjeta__canto tarjeta__canto--der" aria-hidden="true"></span>
                   ${cara}
                 </div>`;

  /* El recorte es cuadrado en las cuatro. No se reutiliza `encuadre`,
     que sirve al otro layout: allí la variedad de proporciones era la
     solución, aquí sería el problema. */
  const interior = `
    ${marco}
    <div class="tarjeta__suelo"></div>
    <div class="tarjeta__pie">
      <h3 class="tarjeta__titulo">${p.titulo}</h3>
      ${p.equipo ? `<p class="tarjeta__credito">Proyecto en equipo</p>` : ''}
      <ul class="tarjeta__software">${etiquetas}</ul>
    </div>`;

  /* Cupra va en galería, sin página profunda: su tarjeta no enlaza a
     ninguna parte. Las demás apuntan a projects/<id>.html, que
     todavía no existe. */
  const cuerpo = p.soloGaleria
    ? `<div class="tarjeta__enlace">${interior}</div>`
    : `<a class="tarjeta__enlace" href="projects/${p.id}.html">${interior}</a>`;

  return `<li class="tarjeta">${cuerpo}</li>`;
}

/* Lo que se repinta en cada frame del arrastre: solo geometría.
   Ni translateZ ni scale. Medido sobre la referencia, la tarjeta lateral
   mide 383 px de alto en su centro contra 378 la central: un 1% más
   grande, o sea que están en el mismo plano y sin encoger. Todo el efecto
   de profundidad lo hace el giro y la perspectiva. */
function pintar(){
  const n = mazo.length;
  const bucle = enBucle();
  mazo.forEach((t, i) => {
    /* Con bucle la distancia da la vuelta: la original cae siempre entre
       −n/2 y n/2, lo más cerca del centro que puede estar. */
    let r = i - actual;
    if(bucle) r = mod(r + n / 2, n) - n / 2;
    const lado = r < 0 ? -1 : 1;
    t.vistas.forEach((v, j) => {
      if(v.el.hidden) return;
      /* Las copias, a vueltas enteras de la original: la 1 al otro lado
         del centro, que es la más cercana de las dos; la 2, una vuelta más
         allá por el mismo lado. */
      const d = j === 0 ? r
              : j % 2 ? r - lado * Math.ceil(j / 2) * n
              : r + lado * (j / 2) * n;
      v.d = d;
      pintarVista(v, d);
    });
  });
}

function pintarVista(v, d){
  const a = Math.abs(d);

  /* El borde EXTERIOR es el que se acerca, no el interior. En la
     referencia la tarjeta izquierda mide 428 px en su borde izquierdo
     y 338 en el derecho, y en perspectiva el borde más alto es el más
     cercano. Las piezas se abren hacia fuera y se alejan hacia el
     centro: es un pasillo con punto de fuga detrás de la central, no
     un coverflow de fichas girando a mirarte. Con el signo cambiado se
     construye la metáfora contraria. */
  const giro = -Math.max(-1, Math.min(1, d)) * GEO.giro;

  v.el.style.transform = `translateX(${(dist(d) * GEO.sep * 100).toFixed(3)}%)`;
  /* `perspective()` va aquí dentro y no en un ancestro: entre la tarjeta
     y la losa está el enlace, y `perspective` como propiedad solo llega
     al hijo directo. Ver el porqué largo en home.css. */
  v.losa.style.transform = `perspective(var(--persp)) rotateY(${giro.toFixed(2)}deg)`;

  /* Las piezas cercanas van a plena luz: en la referencia los tres pies
     miden 148, 149 y 148 de brillo, o sea que no se atenúan. Lo que
     distingue a la central es el suelo ámbar y su título.

     Pasado el último lado visible se apagan, pero POCO A POCO y sin que
     nadie se esconda de golpe. Antes había aquí un `visibility:hidden`,
     y `visibility` no transiciona: la pieza no se iba de la pantalla,
     se esfumaba en el sitio en cuanto arrancaba el movimiento. Ahora se
     aleja y se apaga a la vez, y quien la retira de la vista es el
     recorte de la escena, que es lo que debe hacerlo. */
  const op = a <= LADOS ? 1 : Math.max(0, 1 - (a - LADOS) / 1.5);
  v.el.style.opacity = op.toFixed(3);
  /* Ya apagada deja de recibir clics. Esto sí es un salto, pero de algo
     que no se ve. */
  v.el.style.pointerEvents = op < 0.15 ? 'none' : '';
  v.el.style.zIndex     = String(Math.round(100 - a * 10));
  v.el.classList.toggle('tarjeta--activa', a < 0.5);
}

/* Lo que solo cambia cuando el carrusel se asienta: mando, foco y el
   aviso al lector de pantalla. Fuera del bucle del arrastre a propósito. */
function pintarEstado(){
  const n = mazo.length;
  /* El DESTINO, no la posición en vuelo. Mientras el muelle recorre el
     camino, `actual` es fraccionario y redondearlo cambiaría de pieza a
     mitad del trayecto: el punto activo, el foco y el aviso al lector de
     pantalla irían dando tumbos. Lo que la interfaz anuncia es a dónde
     va, y eso se sabe en cuanto se pulsa. */
  const i = piezaEn(objetivo);

  /* Con bucle no hay tope, así que ninguna flecha se apaga. */
  flechas.forEach(b => {
    const destino = i + Number(b.dataset.paso);
    b.disabled = !enBucle() && (destino < 0 || destino > n - 1);
  });

  [...puntos.querySelectorAll('button')].forEach((b, k) => {
    b.setAttribute('aria-current', String(k === i));
  });

  /* Solo la tarjeta central entra en el tabulador. Las laterales se
     siguen pudiendo pulsar con el ratón —eso las trae al centro—, pero
     tabular por enlaces que no se leen bien desorienta. */
  mazo.forEach((t, k) => {
    const enlace = t.el.querySelector('a.tarjeta__enlace');
    if(enlace) enlace.tabIndex = k === i ? 0 : -1;
  });

  if(mazo[i]) estado.textContent = `Piece ${i + 1} of ${n} · ${mazo[i].p.titulo}`;

  /* El fondo coge la temperatura de la pieza al frente. Va aquí y no
     en `ir()` porque el filtro también cambia cuál está al frente sin
     pasar por ahí. */
  pintarTema();
  pintarClips();
}

/* ---- El clip de la pieza -------------------------------
   Una ficha puede traer un clip corto en `hero.clip`. Se reproduce cuando
   su pieza es la elegida y se retira sola al elegir otra, dejando la
   miniatura como estaba. Las fichas sin clip no necesitan nada: aquí no
   hay ningún nombre de proyecto escrito.

   Suena a un `play()` y un `pause()`, y son cuatro reglas que no lo son:

   - **Manda el DESTINO, no la posición en vuelo.** Con el muelle, ir de la
     primera pieza a la cuarta cruza el centro por las dos del medio. Si el
     clip arrancara al cruzarse, esas dos se encenderían de paso durante
     una décima cada una. Se enciende la pieza a la que vas.
   - **Suena antes de verse.** El vídeo empieza a cargar y a correr en
     cuanto la pieza es la elegida, pero no se pinta hasta que además está
     en el centro y tiene fotogramas de verdad —de ahí `--listo`, que lo
     pone `canplay`—. Sin esa condición, la tarjeta enseña un rectángulo
     negro mientras descarga.
   - **Rebobinar es lo último que se hace, no lo primero.** Al dejar de ser
     la elegida, el vídeo se pausa y se funde; volver al segundo 0 se
     espera a que el fundido termine. Rebobinando de golpe se ve el corte
     al primer fotograma POR DEBAJO del fundido, que es justo el salto que
     el fundido venía a evitar.
   - **Fuera de pantalla no se reproduce**, la misma regla que la sala.
     Aquí además decide si se descarga: con `preload="none"`, un visitante
     que no llega a Trabajos no pide el archivo. */

let carruselVisible = false;

function pintarClips(){
  if(reducido) return;
  const i = piezaEn(objetivo);

  mazo.forEach((t, k) => {
    const v = t.clip;
    if(!v) return;
    const elegida = k === i && carruselVisible;

    if(elegida){
      clearTimeout(t.rebobina);
      if(v.dataset.suena) return;        // ya está en marcha
      v.dataset.suena = '1';
      /* `play()` devuelve una promesa que se rechaza si el navegador
         bloquea la reproducción. Va mudo y con `playsinline`, así que no
         debería pasar, pero si pasa el fallo es que se queda la
         miniatura: no hay nada que rescatar y no es un error que deba
         ensuciar la consola. */
      v.play().catch(() => {});
      /* La segunda vez que se elige la pieza, `canplay` NO vuelve a
         dispararse: el archivo ya está descargado y decodificado, así que
         el evento que enciende el clip ya pasó y no va a volver. Sin esta
         línea, la primera visita se ve y las siguientes reproducen un
         vídeo invisible. Si ya hay un fotograma en memoria —readyState 2
         o más— se enciende aquí mismo; si no, lo hará `canplay`. */
      if(v.readyState >= 2) v.classList.add('tarjeta__clip--listo');
    }else{
      if(!v.dataset.suena) return;
      delete v.dataset.suena;
      v.classList.remove('tarjeta__clip--listo');
      v.pause();
      clearTimeout(t.rebobina);
      t.rebobina = setTimeout(() => {
        if(!v.dataset.suena) v.currentTime = 0;
      }, 520);                            // el fundido del CSS dura .5s
    }
  });
}

/* Cambia el destino y deja que el muelle lo alcance. NO pone `vel` a
   cero: si la pieza venía lanzada, sigue lanzada. Eso es lo que hace que
   pulsar dos veces seguidas la flecha se sienta como un solo movimiento
   largo y no como dos empujones encadenados. */
function ir(destino, impulso = 0){
  /* Con bucle el destino no tiene tope: `objetivo` sigue contando vueltas
     y es `piezaEn()` quien dice qué pieza hay ahí. */
  objetivo = enBucle() ? Math.round(destino)
           : Math.max(0, Math.min(mazo.length - 1, Math.round(destino)));

  /* Con qué velocidad sale. Hay dos candidatas —el empujón de salida y lo
     que traía el gesto— y gana la que más empuje HACIA el destino. Así:

     - un clic desde parado arranca de inmediato, en vez de acelerar desde
       cero (ver ARRANQUE);
     - un swipe lanzado conserva su inercia, porque es más rápido que el
       empujón por defecto;
     - un swipe flojo que se queda corto no frena el regreso: manda el
       empujón, y la pieza vuelve a su sitio con decisión en vez de
       arrastrarse;
     - y un gesto que al soltarse iba en contra —te has pasado y estás
       volviendo— no se respeta: iría hacia donde el carrusel no va. */
  const falta = objetivo - actual;
  const salida = falta * OMEGA * ARRANQUE;
  const rumbo = Math.sign(falta);
  let v = impulso;
  if(Math.sign(v) !== rumbo || Math.abs(v) < Math.abs(salida)) v = salida;
  vel = Math.max(-VEL_MAX, Math.min(VEL_MAX, v));

  /* Sin movimiento no hay muelle: se planta en el destino y se pinta una
     vez. El brief pide que todo aparezca sin desplazamiento ni retardo. */
  if(reducido){
    parar();
    actual = objetivo;
    vel = 0;
    pintar();
  }else{
    arrancar();
  }
  pintarEstado();
}

/* A qué posición hay que ir para poner una pieza al frente. Con bucle, a
   la vuelta más cercana: pulsar el punto de la pieza de al lado no puede
   darle media vuelta al mazo. */
function sitioDe(i){
  if(!enBucle()) return i;
  const n = mazo.length;
  const aqui = Math.round(objetivo);
  return aqui + mod(i - aqui + Math.floor(n / 2), n) - Math.floor(n / 2);
}

function pintarPuntos(){
  puntos.innerHTML = mazo.map((t, i) =>
    `<li><button type="button" data-i="${i}" aria-label="Go to ${t.p.titulo}"></button></li>`
  ).join('');
  /* Con una sola pieza en el mazo no hay nada que mandar. */
  mando.hidden = mazo.length < 2;
}

/* Las tarjetas son absolutas y no empujan a su contenedor, así que el
   alto de la pista se mide sobre la más alta. Se remide al filtrar, al
   cambiar de tamaño y cuando terminan de cargar las fuentes: con la
   tipografía definitiva el pie envuelve distinto. */
function medir(){
  const cs = getComputedStyle(pista);
  GEO = {
    sep:  parseFloat(cs.getPropertyValue('--sep'))  || GEO.sep,
    giro: parseFloat(cs.getPropertyValue('--giro')) || GEO.giro,
    comp: parseFloat(cs.getPropertyValue('--comp')) || GEO.comp
  };
  let alto = 0;
  mazo.forEach(t => { alto = Math.max(alto, t.el.offsetHeight); });
  if(alto) pista.style.height = alto + 'px';
}

/* Qué nodos se enseñan: la original de cada pieza que pase el filtro y
   las copias que ese mazo necesite. Las demás se quedan con `hidden`, que
   es además lo que hace que una copia sin usar no descargue nada: su
   imagen va con `loading="lazy"`. */
function mostrarVistas(dentro = () => true){
  const m = vistasPorPieza();
  tarjetas.forEach(t => t.vistas.forEach((v, j) => {
    v.el.hidden = !dentro(t) || j >= m;
  }));
}

/* El filtro NO recrea el DOM: solo decide qué tarjetas entran en el
   mazo. Si repintara la lista, cada filtrado volvería a crear los
   <img> y el navegador volvería a decodificar los mismos renders. */
function filtrar(f){
  filtroActivo = f;
  const dentro = t => f === 'todos' || t.p.categorias.includes(f);
  mazo = tarjetas.filter(dentro);
  mostrarVistas(dentro);
  saltar(arranque());
  pintarPuntos();
  medir();
  pintar();
  pintarEstado();
}

/* ---- Arrastre y swipe -----------------------------------
   Pointer Events, un solo camino para ratón, dedo y lápiz: lo
   que se prueba arrastrando con el ratón en escritorio es
   exactamente el código que corre en un móvil. */

function activarArrastre(){
  let g = null;        // gesto en curso
  let movido = false;  // ha habido arrastre de verdad

  const paso = () => (mazo[0] ? mazo[0].el.offsetWidth : 1) * GEO.sep;

  pista.addEventListener('pointerdown', e => {
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    if(mazo.length < 2) return;
    movido = false;
    g = { id:e.pointerId, x:e.clientX, y:e.clientY,
          base:actual, dx:0,
          /* Velocidad instantánea suavizada, en px/ms. Antes se calculaba
             al soltar como desplazamiento total partido por duración
             total, y eso miente en el gesto más común: arrastrar despacio
             buscando y lanzar al final. Promediado sobre todo el gesto,
             ese lanzamiento sale casi parado. */
          vx:0, lx:e.clientX, lt:performance.now(),
          decidido:false, activo:false };
  });

  pista.addEventListener('pointermove', e => {
    if(!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;

    /* Hasta que el gesto no se declara no se toca nada. Si el dedo va
       hacia abajo es scroll de la página y hay que soltarlo: con
       `touch-action:pan-y` el navegador ya se lo lleva y manda un
       pointercancel, pero el ratón no dispara eso y aquí sí decide. */
    if(!g.decidido){
      if(Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      g.decidido = true;
      g.activo = Math.abs(dx) > Math.abs(dy);
      if(!g.activo){ g = null; return; }
      pista.setPointerCapture(e.pointerId);
      pista.classList.add('arrastrando');
      /* El muelle suelta el mando aquí, no en `pointerdown`: un toque
         que resulta no ser arrastre no tiene por qué congelar una pieza
         en pleno vuelo. Y `base` se toma en este instante justo por lo
         mismo — si se hubiera tomado antes, el muelle habría seguido
         avanzando mientras el dedo recorría el umbral y la pieza daría
         un tirón al engancharse. Cogida en vuelo, se para donde está. */
      parar();
      g.base = actual;
    }

    /* Velocidad instantánea, con un filtro exponencial que se come el
       ruido de un dedo que tiembla sin llegar a añadir retardo. */
    const ahora = performance.now();
    const dt = ahora - g.lt;
    if(dt > 0){
      g.vx = g.vx * 0.7 + ((e.clientX - g.lx) / dt) * 0.3;
      g.lx = e.clientX;
      g.lt = ahora;
    }

    g.dx = dx;
    movido = true;

    let v = g.base - dx / paso();
    /* Sin bucle, en los extremos la pared cede un poco: se lee como tope
       y no como que el carrusel se ha quedado colgado. Con bucle no hay
       extremos y no hay pared. */
    if(!enBucle()){
      const ultimo = mazo.length - 1;
      if(v < 0) v *= 0.35;
      else if(v > ultimo) v = ultimo + (v - ultimo) * 0.35;
    }

    actual = v;
    pintar();
  });

  const soltar = e => {
    if(!g || e.pointerId !== g.id) return;
    const { activo, dx, base, vx, lt } = g;
    g = null;
    pista.classList.remove('arrastrando');
    if(!activo) return;

    /* LA VELOCIDAD AL SOLTAR, Y SOLO SI LA HAY. `vx` es la del último
       movimiento, y si el ratón se ha quedado quieto antes de soltar ya no
       llegan eventos que la bajen: sin esto, arrastrar, pararse a mirar y
       soltar lanzaría el carrusel con una velocidad de hace medio segundo.
       Se apaga en unas decenas de milisegundos de quietud. */
    const quieto = performance.now() - lt;
    const vSuelta = quieto > 120 ? 0 : vx * Math.exp(-quieto / 60);
    /* En piezas por segundo. El signo se da la vuelta porque arrastrar a la
       derecha —vx positiva— hace RETROCEDER en el mazo. */
    const vPiezas = -vSuelta * 1000 / paso();

    /* Donde lo sueltas más lo que desliza, a la pieza más cercana, con tope
       contado desde donde lo soltaste. Ver DESLIZ y LANZAMIENTO_MAX. */
    const suelto = Math.round(actual);
    let destino = Math.round(actual + vPiezas * DESLIZ);
    destino = Math.max(suelto - LANZAMIENTO_MAX, Math.min(suelto + LANZAMIENTO_MAX, destino));

    /* Un gesto corto pero decidido no se queda en el sitio: si el imán lo
       devolvería a la pieza de salida, avanza una en el sentido del gesto.
       Es lo único que queda del "un paso por gesto" de antes. */
    const desde = Math.round(base);
    const umbral = paso() * 0.18;
    if(destino === desde){
      if(dx < -umbral || vSuelta < -0.5) destino = desde + 1;
      else if(dx > umbral || vSuelta > 0.5) destino = desde - 1;
    }

    /* La velocidad del dedo entra en el muelle en vez de perderse. El
       signo se da la vuelta porque arrastrar a la derecha —vx positiva—
       hace RETROCEDER en el mazo, y las unidades pasan de px/ms a piezas
       por segundo dividiendo por lo que mide un paso. Con esto, soltar no
       es el principio de una animación nueva: es el mismo movimiento que
       ya venía, que ahora tiene a dónde ir. */
    ir(destino, vPiezas);
  };

  pista.addEventListener('pointerup', soltar);
  pista.addEventListener('pointercancel', soltar);

  /* EL ARRASTRE CON RATÓN NO FUNCIONABA, y era esto *(13 sep 2026, lo vio
     Israel)*. La tarjeta es un enlace, y al pulsar y mover el ratón sobre
     un enlace el navegador empieza a ARRASTRARLO —como para soltarlo en
     otra pestaña—. Ese arrastre nativo manda un `pointercancel` y el gesto
     del carrusel muere a los pocos píxeles. Medido en Chrome:
     `pointerdown` → `pointermove` → `dragstart` en `.tarjeta__enlace` →
     `pointercancel`. La imagen ya llevaba `draggable="false"`; el enlace
     que la envuelve, no. En táctil no pasaba: un dedo no arrastra enlaces. */
  pista.addEventListener('dragstart', e => e.preventDefault());

  /* Tres cosas en el mismo sitio, y en captura para llegar antes que el
     enlace: un swipe termina en `click` y sin esto abriría la página
     del proyecto; un clic en una tarjeta lateral no abre nada, la trae
     al centro; y el de la central no navega de golpe, DESPEGA. */
  pista.addEventListener('click', e => {
    if(movido){ e.preventDefault(); e.stopPropagation(); movido = false; return; }
    const li = e.target.closest('.tarjeta');
    if(!li) return;
    /* La vista pulsada puede ser una copia: lo que cuenta es DÓNDE está,
       no de qué pieza es. Su sitio es la posición actual más su distancia. */
    const i = mazo.findIndex(t => t.vistas.some(v => v.el === li));
    if(i < 0) return;
    const vista = mazo[i].vistas.find(v => v.el === li);
    const sitio = Math.round(actual + vista.d);
    if(sitio !== Math.round(objetivo)){ e.preventDefault(); ir(sitio); return; }

    /* Con una modificadora pulsada el clic no es "llévame ahí", es
       "ábrelo aparte": eso lo resuelve el navegador y no se toca. Lo
       mismo con quien ha pedido no ver movimiento. */
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const enlace = e.target.closest('a.tarjeta__enlace');
    if(!enlace || reducido) return;
    if(despegar(mazo[i], vista, enlace.href)) e.preventDefault();
  }, true);
}

/* =========================================================
   EL DESPEGUE DE LA PIEZA
   *(4 sep 2026)* Al pulsar la pieza del frente, la losa da una vuelta
   entera mientras viene hacia la cámara, se planta a sangre y le
   entrega la pantalla a la página del proyecto. La pinta está en
   home.css; aquí va el recorrido.

   POR QUÉ SE ESCRIBE FRAME A FRAME Y NO CON `@keyframes`: es el mismo
   argumento del carrusel. La caja cambia de forma —de cuadrada a la de
   la ventana— y el tamaño aparente de algo que se acerca va como 1/z,
   que no es lineal en el tiempo; y el reencuadre tiene que caer en un
   instante concreto del GIRO, no en un porcentaje de la duración.

   EL ATERRIZAJE ES EL CONTRATO. El último fotograma tiene que ser, al
   píxel, el primero de la página de destino: una imagen que ocupa la
   ventana entera, con `object-fit:cover` y `object-position` en el
   `anclaje` de la ficha —que es exactamente lo que hace
   `.portada__lienzo img`—. Si eso se cumple, el encadenado entre las
   dos páginas no se ve; si no, salta. Por eso el filete y el canto se
   disuelven, `--grosor` baja a cero y la caja acaba en (0,0,vw,vh).
   ========================================================= */

const VUELO_MS = 820;

/* La curva. Arranca CON velocidad —esto responde a un clic, igual que
   el muelle del carrusel cuando le das a una flecha— y aterriza a
   velocidad cero, que es lo que permite entregar la pantalla sin un
   frenazo. Media parábola de salida y media smootherstep: la primera
   pone el empujón, la segunda el aterrizaje. */
const suave  = t => t * t * t * (t * (t * 6 - 15) + 10);
const vuelo  = t => 0.5 * (1 - (1 - t) ** 2) + 0.5 * suave(t);
const paso01 = t => t * t * (3 - 2 * t);

/* Lo que hay que deshacer si el visitante vuelve con el botón atrás y el
   navegador le devuelve esta página tal cual la dejó. */
let deshacerVuelo = null;

function despegar(t, vista, destino){
  /* La VISTA pulsada y no la original. Casi siempre son la misma —la del
     frente es la original—, pero con el muelle en pleno vuelo el sitio del
     frente puede ocuparlo una copia, y el clon tiene que nacer encima de
     la que se ve. */
  const losa = vista.losa;
  const cara = losa.querySelector('.tarjeta__marco');
  const foto = cara?.querySelector('img');
  if(!cara || !foto || !foto.currentSrc) return false;   // sin render no hay vuelo
  if(document.querySelector('.despegue')) return false;  // ya se está yendo

  /* DE DÓNDE DESPEGA: la caja de la tarjeta SIN su giro, y el giro
     aparte. *(6 sep 2026)*

     Aquí había una negativa —"no se despega de una pieza que todavía se
     está colocando"— y era ella la que dejaba a tres de las cuatro
     piezas sin animación. El Terminator es la ÚNICA que se puede pulsar
     sin haber movido el mazo: a las otras tres se llega con una flecha,
     un punto o un clic lateral, y la cola del muelle dura mucho más de
     lo que parece. Medido en Chrome: el residuo vale 0,067 a los 400 ms
     —la pieza ya se ve colocada—, cruza el umbral de 0,01 a los 650 y no
     se asienta del todo hasta 1,01 s. Quien pulsaba dentro de esa
     franja, que es justo cuando se pulsa, navegaba en seco.

     El motivo de la negativa era real y sigue siéndolo: el clon copiaba
     la caja TAL COMO ESTABA, y la caja de una losa girada no es su cara.
     Pero eso no se arregla esperando, se arregla copiando el estado de
     verdad. La caja se mide con el giro neutralizado —un reflujo, una
     vez, en el clic, y ya se está navegando— y el ángulo entra como
     punto de partida del vuelo. Así el clon nace encima de la tarjeta al
     píxel y da igual dónde la pille el muelle: si la pieza va a medio
     camino, despega desde ahí, que es donde el visitante la ve.

     Y el muelle NO se para: sigue asentando una losa que ya está
     escondida, y el índice se retira con un fundido de .34 s por delante
     —plantar el mazo de golpe sí se vería—. Cuando el botón atrás
     devuelva la página, hace rato que se asentó. */
  const giroCSS = losa.style.transform;
  losa.style.transform = 'none';
  const r = losa.getBoundingClientRect();
  losa.style.transform = giroCSS;

  /* El mismo giro que le escribe `pintar()`, con la misma ley: si se
     calculara de otra manera, el clon nacería girado de otro modo que la
     tarjeta y el relevo se vería. */
  const g0 = -Math.max(-1, Math.min(1, vista.d)) * GEO.giro;

  const vw = innerWidth, vh = innerHeight;

  /* La página se pide YA, no al final del vuelo: el gesto tiene que
     TAPAR la descarga, no sumarse a ella. Si no, lo único que se
     consigue con una animación bonita es que la web tarde más. */
  const pre = document.createElement('link');
  pre.rel = 'prefetch'; pre.as = 'document'; pre.href = destino;
  document.head.append(pre);

  /* Y el archivo grande del render, que es el que va a enseñar la
     portada de destino. Se cambia en el fotograma en que la cara está
     DE CANTO, así que da igual si llega tarde: o entra sin que se vea o
     no entra y la carga la página, que iba a pedirlo de todos modos. */
  const grande = new Image();
  grande.src = t.p.hero.web;
  /* Y se DESCODIFICA antes de usarlo, no basta con que haya llegado.
     Asignarle a un `<img>` un archivo descargado pero sin descodificar
     paga la descodificación en el fotograma en que se pinta: medido en
     el Cottage, un fotograma de 39 ms justo ahí. Con `decode()` el
     trabajo se hace fuera del hilo y el cambio no cuesta nada. */
  let listo = false;
  grande.decode().then(() => { listo = true; }).catch(() => {});

  const capa = document.createElement('div');
  capa.className = 'despegue';
  capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = `<div class="despegue__caja">
                      <div class="despegue__losa">
                        <span class="tarjeta__canto tarjeta__canto--izq"></span>
                        <span class="tarjeta__canto tarjeta__canto--der"></span>
                        <div class="despegue__espalda"></div>
                      </div>
                    </div>`;
  const caja    = capa.querySelector('.despegue__caja');
  const losaVol = capa.querySelector('.despegue__losa');

  /* La cara es el clon del marco de verdad, con su filete, su velo y su
     encuadre. Lo que no viaja es el `<video>`: un clon empieza a
     cargar de cero y el primer fotograma saldría en negro. El original
     SE MUEVE —y se devuelve si el visitante vuelve atrás—, que es lo
     único que conserva los fotogramas que ya tiene. */
  const clon = cara.cloneNode(true);
  clon.querySelector('.tarjeta__clip')?.remove();
  const clip = cara.querySelector('.tarjeta__clip');
  if(clip){
    clon.insertBefore(clip, clon.querySelector('.tarjeta__ver'));
    clip.play().catch(() => {});
  }
  losaVol.append(clon);
  const fotoVol = clon.querySelector('img');
  fotoVol.src = foto.currentSrc;          // ya descodificada: cero parpadeo
  fotoVol.removeAttribute('srcset');
  fotoVol.removeAttribute('sizes');

  /* El velo de "Ver proyecto" arranca donde estaba: encendido si el
     ratón estaba encima, apagado si el clic vino del teclado. Encenderlo
     porque sí sería anunciar un destino justo cuando ya vas hacia él. */
  const velo = cara.querySelector('.tarjeta__ver');
  const rotulo0 = velo ? parseFloat(getComputedStyle(velo).opacity) || 0 : 0;
  capa.style.setProperty('--rotulo', String(rotulo0));
  document.body.append(capa);

  /* El original desaparece en el mismo fotograma en que aparece el clon
     —que está justo encima, así que no se ve el relevo—, y el resto del
     índice se retira detrás. */
  losa.style.visibility = 'hidden';
  document.body.classList.add('despegando');

  const anclaje = t.p.hero.anclaje || '50% 50%';
  const ladoFin = Math.max(vw, vh);
  const z1      = r.width / ladoFin;      // profundidad final, en unidades de la de salida
  const cx0     = r.left + r.width / 2;
  const cy0     = r.top  + r.height / 2;

  let reencuadrado = false;
  const inicio = performance.now();

  const frame = ahora => {
    const t01 = Math.min(1, (ahora - inicio) / VUELO_MS);
    const e   = vuelo(t01);

    /* El giro manda sobre todo lo demás. El reencuadre —del recorte
       cuadrado a `foco` al de la ventana a `anclaje`— se cuelga de los
       270°, que es el último instante en que la cara está de canto y no
       se ve: así no hay nada que interpolar y no hay nada que se note.

       Sale del ángulo en el que estaba la tarjeta y llega a los 360, que
       es de frente: la vuelta sigue siendo una vuelta entera y el
       reencuadre sigue cayendo donde la cara no se ve. Con `g0` a cero
       —la pieza quieta, que es el caso normal— esto es el `360 * e` de
       antes, sin una milésima de diferencia. */
    const grados = g0 + (360 - g0) * e;
    const m = paso01(Math.max(0, (e - 0.75) / 0.25));

    /* El tamaño va como 1/z, que es lo que hace que se lea como que se
       acerca y no como que crece: casi quieta al principio y encima al
       final. En línea recta la pieza se planta. */
    const lado = r.width / (1 - (1 - z1) * e);

    let W = lado, H = lado;
    let x = cx0 + (vw / 2 - cx0) * e - lado / 2;
    let y = cy0 + (vh / 2 - cy0) * e - lado / 2;
    if(m > 0){
      W += (vw - W) * m;  H += (vh - H) * m;
      x -= x * m;         y -= y * m;
    }

    caja.style.width  = W + 'px';
    caja.style.height = H + 'px';
    caja.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    /* La perspectiva va DENTRO del transform de la losa, como en el
       carrusel y por el mismo motivo: fuera, cualquier antepasado plano
       la aplana y el giro se convierte en un encogido. Y se cierra
       durante el vuelo —de 2,73 anchos a 1,83—, que es la cámara
       acercándose. */
    losaVol.style.transform =
      `perspective(${lado * (2.73 - 0.9 * e)}px) rotateY(${grados}deg)`;

    if(!reencuadrado && grados >= 270){
      reencuadrado = true;
      fotoVol.style.objectPosition = anclaje;
      if(listo) fotoVol.src = grande.src;
      /* El clip se va aquí y de golpe, no con un fundido: la portada de
         destino es una imagen quieta, y medio vídeo por encima del
         render mientras la cara vuelve a verse sí se notaría. */
      if(clip) clip.pause();
    }

    capa.style.setProperty('--grosor', lado * 0.10 * (1 - m) + 'px');
    capa.style.setProperty('--volumen', String(1 - m));
    capa.style.setProperty('--rotulo', String(rotulo0 * Math.max(0, 1 - e / 0.25)));
    capa.style.setProperty('--clip', reencuadrado ? '0' : '1');

    if(t01 < 1){ requestAnimationFrame(frame); return; }

    /* Dos fotogramas antes de navegar, y no es una espera de cortesía:
       la transición entre páginas fotografía la página de salida tal
       como esté pintada. Si se navega en el mismo frame en que se
       escribe el último estado, lo que se fotografía es el anterior — y
       el relevo, que es todo el truco, salta. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      location.href = destino;
    }));
  };

  requestAnimationFrame(frame);

  /* El botón atrás puede devolver esta página viva y tal cual: sin esto,
     el visitante vuelve a un índice apagado, con la pieza escondida y su
     clip dentro de una capa que ya no pinta nada. */
  deshacerVuelo = () => {
    if(clip) cara.insertBefore(clip, cara.querySelector('.tarjeta__ver'));
    capa.remove();
    pre.remove();
    losa.style.visibility = '';
    document.body.classList.remove('despegando');
    deshacerVuelo = null;
  };
  return true;
}

addEventListener('pageshow', e => { if(e.persisted) deshacerVuelo?.(); });

function montarCarrusel(){
  const carrusel = $('#carrusel');
  pista   = $('#carrusel-pista');
  puntos  = $('#carrusel-puntos');
  estado  = $('#carrusel-estado');
  mando   = $('.carrusel__mando');
  flechas = $$('.carrusel__flecha');

  pista.innerHTML = PROYECTOS.map(tarjetaDe).join('');
  tarjetas = PROYECTOS.map((p, i) => {
    const el = pista.children[i];
    return { p, el,
             losa: el.querySelector('.tarjeta__losa'),
             clip: el.querySelector('.tarjeta__clip'),
             rebobina: 0 };
  });

  /* Las copias del bucle. Se crean UNA vez, aquí, y el filtro solo las
     enseña o las esconde: filtrar no recrea un nodo, igual que con las
     originales. Tantas como pide el mazo que da la vuelta, que es el
     entero —con un filtro puesto no hay bucle—. Son solo imagen: sin clip —suena la del
     frente, que es siempre la original—, fuera del tabulador y ocultas
     para los lectores de pantalla, que ya tienen la original. */
  const porPieza = tarjetas.length >= BUCLE_MIN
    ? Math.ceil(2 * ALCANCE / tarjetas.length) : 1;
  tarjetas.forEach(t => {
    t.vistas = [{ el:t.el, losa:t.losa, d:0 }];
    for(let j = 1; j < porPieza; j++){
      pista.insertAdjacentHTML('beforeend', tarjetaDe(t.p));
      const el = pista.lastElementChild;
      el.hidden = true;
      el.classList.add('tarjeta--copia');
      el.setAttribute('aria-hidden', 'true');
      el.querySelector('.tarjeta__clip')?.remove();
      const enlace = el.querySelector('a.tarjeta__enlace');
      if(enlace) enlace.tabIndex = -1;
      t.vistas.push({ el, losa:el.querySelector('.tarjeta__losa'), d:0 });
    }
  });

  /* La losa se dibuja cuando su obra ya está dentro, no antes. El porqué
     —y por qué la clase va en el marco y no en la tarjeta— está en
     home.css, junto a `.tarjeta__marco--puesta`.

     `complete` cubre los dos casos que no dan evento: la imagen que ya
     estaba en caché y llega descodificada antes de que se pueda escuchar
     nada, y la que falló. El `error` no se ignora a propósito: una pieza
     cuyo archivo no responde tiene que enseñar igual su caja, o se va de
     la página entera sin decir por qué.

     La pieza sin render tampoco espera: no tiene `<img>`, y su recuadro
     de "Render pendiente" es justo lo que hay que ver. */
  tarjetas.flatMap(t => t.vistas).forEach(v => {
    const marco = v.el.querySelector('.tarjeta__marco');
    if(!marco) return;
    const foto = marco.querySelector('img');
    const poner = () => marco.classList.add('tarjeta__marco--puesta');
    if(!foto || foto.complete) poner();
    else{
      foto.addEventListener('load',  poner, { once:true });
      foto.addEventListener('error', poner, { once:true });
    }
  });

  /* El clip no se pinta al darle a `play()`, sino cuando tiene fotogramas
     que enseñar. `canplay` puede volver a dispararse después —al rebobinar,
     al recuperar el búfer—, así que se comprueba que la pieza siga siendo
     la elegida antes de encenderlo. */
  tarjetas.forEach(t => {
    if(!t.clip) return;
    t.clip.addEventListener('canplay', () => {
      if(t.clip.dataset.suena) t.clip.classList.add('tarjeta__clip--listo');
    });
  });
  mazo = tarjetas.slice();
  mostrarVistas();
  saltar(arranque());

  flechas.forEach(b => b.addEventListener('click', () => {
    ir(Math.round(objetivo) + Number(b.dataset.paso));
  }));

  puntos.addEventListener('click', e => {
    const b = e.target.closest('button');
    if(b) ir(sitioDe(Number(b.dataset.i)));
  });

  carrusel.addEventListener('keydown', e => {
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    ir(Math.round(objetivo) + (e.key === 'ArrowRight' ? 1 : -1));
  });

  activarArrastre();

  pintarPuntos();
  /* medir() antes que pintar(): es quien lee --sep y --giro del CSS. */
  medir();
  pintar();
  pintarEstado();

  /* Mientras el capítulo no se ve, el clip ni suena ni se descarga. Es la
     misma regla que la sala, y aquí vale doble: la home abre siempre por
     la intro, así que quien no baje a Trabajos no pide el archivo.

     Sin IntersectionObserver se da por visible: mejor que suene de más a
     que no suene nunca. */
  if('IntersectionObserver' in window){
    new IntersectionObserver(([e]) => {
      carruselVisible = e.intersectionRatio > 0;
      pintarClips();
    }, { threshold:[0, 0.01] }).observe(carrusel);
  }else{
    carruselVisible = true;
  }

  /* Al cruzar el punto de ruptura cambia --sep, no solo el alto. */
  addEventListener('resize', () => { medir(); pintar(); });
  /* El pie envuelve distinto cuando entra JetBrains Mono. */
  if(document.fonts) document.fonts.ready.then(medir);
}

function activarFiltro(){
  const botones = $$('.filtro button');
  botones.forEach(b => b.addEventListener('click', () => {
    botones.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    filtrar(b.dataset.filtro);
  }));
}

/* =========================================================
   02 · SOBRE MÍ
   El listado de programas se declara en datos.js: no se deduce
   de las fichas. Ver el porqué allí.
   ========================================================= */

function pintarSoftware(){
  $('#software').innerHTML = SOFTWARE.map(g => `
    <div class="software__grupo" data-revelar>
      <h3 class="software__titulo mono">${g.titulo}</h3>
      <ul class="software__lista">${g.programas.map(p => `<li>${
        p.icono ? `<i class="software__icono" aria-hidden="true"
             style="-webkit-mask-image:url('${p.icono}');mask-image:url('${p.icono}')"></i>` : ''
      }${p.nombre}</li>`).join('')}</ul>
    </div>`).join('');
}

/* =========================================================
   03 · CONTACTO
   Lo que todavía no existe se enseña apagado y marcado, no se
   enlaza a una URL inventada.
   ========================================================= */

function pintarContacto(){
  $('#email').textContent = CONTACTO.email;
  $('#email').href = 'mailto:' + CONTACTO.email;

  /* En escritorio un `tel:` no hace nada útil, pero tampoco estorba: el
     valor de la línea ahí es que el número se lea y se copie. En un móvil
     —que es desde donde la mitad de los leads abren esto— sí marca. */
  const tel = $('#telefono');
  if(CONTACTO.telefono){
    tel.textContent = CONTACTO.telefono;
    tel.href = CONTACTO.telefonoUrl;
  }else{
    tel.hidden = true;
  }

  /* Tres formas del mismo renglón, y la diferencia importa: un enlace de
     salida avisa con ↗ y abre en otra pestaña; una descarga avisa con ↓ y
     NO abre pestaña —abrir un PDF en una pestaña nueva y que además se
     descargue es la peor de las dos cosas—; y lo que todavía no existe se
     queda como texto apagado en vez de desaparecer, para que se lea como
     "esto vendrá" y no como una lista más corta. */
  $('#enlaces').innerHTML = CONTACTO.enlaces.map(e => {
    if(!e.disponible){
      return `<li><span class="mono pendiente">
                <span>${e.etiqueta}</span><span class="contacto__flecha">Pendiente</span></span></li>`;
    }
    if(e.descarga){
      return `<li><a class="mono" href="${e.url}" download="${e.descarga}">
                <span>${e.etiqueta}</span><span class="contacto__flecha">↓</span></a></li>`;
    }
    return `<li><a class="mono" href="${e.url}" target="_blank" rel="noopener">
              <span>${e.etiqueta}</span><span class="contacto__flecha">↗</span></a></li>`;
  }).join('');

  /* El botón CV de la barra es uno solo y hay dos idiomas, así que se
     lleva el marcado como principal. Si ninguno lo está, el primero que
     sea descarga; es la misma regla de reserva que `portada` en el
     carrusel, y evita que la barra se quede muda por un despiste en la
     ficha. */
  const cv = CONTACTO.enlaces.find(e => e.descarga && e.principal)
          ?? CONTACTO.enlaces.find(e => e.descarga);
  const navCv = $('#nav-cv');
  if(cv && cv.disponible){
    navCv.href = cv.url;
    navCv.setAttribute('download', cv.descarga);
    navCv.removeAttribute('aria-disabled');
    navCv.removeAttribute('title');
  }else{
    navCv.removeAttribute('href');
    navCv.removeAttribute('download');
    navCv.setAttribute('aria-disabled','true');
    navCv.title = 'Not available yet';
  }
}

/* =========================================================
   MOVIMIENTO
   Cada sección se anima al entrar en pantalla, una sola vez.
   No cada vez que pasas.
   ========================================================= */

/* Los revelados viven ahora en `comun.js`: los usan también las páginas de
   proyecto y no puede haber dos copias que se separen con el tiempo. */

/* Los números de capítulo cuentan. */
function activarContadores(){
  $$('.cabecera__num').forEach(el => {
    const fin = parseInt(el.dataset.num, 10);
    if(reducido){ el.textContent = el.dataset.num; return; }
    el.textContent = '00';
    const obs = new IntersectionObserver((entradas) => {
      if(!entradas[0].isIntersecting) return;
      obs.disconnect();
      let n = 0;
      const paso = () => {
        el.textContent = String(n).padStart(2,'0');
        if(n++ < fin) setTimeout(paso, 110);
      };
      paso();
    }, { threshold:0.4 });
    obs.observe(el);
  });
}

/* =========================================================
   CAPÍTULO 00 · LA SALA
   Se monta cuando entra en pantalla y se para cuando sale.
   La home abre siempre por aquí: el capítulo 00 no se salta.
   ========================================================= */



/* El vuelo del logo ocupa el primer tramo del capítulo 00. Termina
   bastante antes de que la sala se vaya: si se apurara hasta el
   final, la pieza saldría por el borde del lienzo —que se va con
   la sección— justo antes de llegar a la barra. */
const VUELO_DESDE = 0;
const VUELO_HASTA = 0.85;

/* La barra no entra hasta que la pieza está aterrizando. Su fondo
   es opaco al 82%, así que si aparece antes se traga el logo en
   pleno vuelo y el aterrizaje no se llega a ver. */
const BARRA_DESDE = 0.93;

let sala = null;

function progresoVuelo(){
  const alto = $('.sala').offsetHeight || innerHeight;
  const p = (scrollY / alto - VUELO_DESDE) / (VUELO_HASTA - VUELO_DESDE);
  return Math.max(0, Math.min(1, p));
}

/* El vuelo en sí lo lee la sala sola, frame a frame. Aquí solo se
   resuelve lo que es DOM: cuándo entra la barra y cuándo se hace
   el relevo de la marca. Eso no necesita ir clavado al frame. */
function pintarVuelo(){
  const p = progresoVuelo();

  const enBarra = reducido ? p > BARRA_DESDE : p >= 0.995;
  $('.nav').classList.toggle('visible', p > BARRA_DESDE);
  $('.nav__marca').classList.toggle('entregado', enBarra);

  /* El lienzo de la marca empieza a dibujar antes del relevo, para
     que cuando aparezca ya tenga un frame hecho. */
  if(sala && sala.ok) sala.marcaActiva(p > 0.5);


}

function activarSala(){
  const seccion = $('.sala');
  const canvas  = $('#sala-canvas');

  /* Se monta siempre, aunque la segunda visita entre por Trabajos:
     la marca de la barra es este mismo logo, y sin montar la sala
     no hay logo que poner. El observador solo decide si se dibuja,
     y a la que la sala no se ve, para. */
  sala = montarSala(canvas, {
    logo: 'assets/logo.glb',
    marcaCanvas: $('#marca-canvas'),
    marcaEl: $('.nav__marca'),
    progreso: progresoVuelo
  });

  const obs = new IntersectionObserver(([e]) => {
    if(!sala.ok) return;
    if(e.intersectionRatio > 0) sala.reanudar();
    else sala.pausar();
  }, { threshold:[0, 0.1, 0.5, 1] });

  obs.observe(seccion);

  let pendiente = false;
  addEventListener('scroll', () => {
    if(pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; pintarVuelo(); });
  }, { passive:true });

  /* La sala ya remide su casilla de aterrizaje en su propio
     resize; aquí solo hace falta recalcular el progreso, porque
     al cambiar el alto de la ventana cambia el tramo de vuelo. */
  addEventListener('resize', pintarVuelo);

  $('.sala__entrar').addEventListener('click', () => {
    $('#work').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' });
  });

  pintarVuelo();
}

/* La home abre siempre por la intro, también al recargar y también
   si la URL trae un ancla. Sin esto te deja caído a mitad de página,
   sin capítulo 00 y sin vuelo, que es la mitad del argumento de la
   web. El ancla se retira en la cabecera del HTML —ver el porqué
   allí—; aquí se pone el scroll a cero y se repinta el vuelo. */
function empezarPorLaIntro(){
  if('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* Salvo que se venga de una página de proyecto. Volver no es visitar:
     quien pulsa "volver a trabajos" está deshaciendo un paso, y
     devolverle a la intro le pierde el sitio. El porqué largo, y por qué
     una marca de sesión y no el ancla de la URL, está en `comun.js`.

     `instant` y no `auto`: `auto` respeta el `scroll-behavior: smooth`
     del CSS, y entonces la vuelta se ve como un viaje de cuatro
     pantallas hacia abajo en vez de como llegar donde estabas. Volver
     tiene que ser instantáneo, igual que el botón atrás. */
  const vuelta = tomarVuelta();
  const destino = vuelta && document.querySelector(vuelta);
  if(destino) destino.scrollIntoView({ behavior:'instant', block:'start' });
  else scrollTo(0, 0);

  pintarVuelo();
}

/* Con la restauración de scroll en manual, el navegador deja de mover
   la página al ir atrás o adelante entre anclas: la URL decía
   #work y tú seguías parado en contacto. Si el mando es nuestro,
   el salto también. */
function activarAnclas(){
  addEventListener('popstate', () => {
    const destino = location.hash && document.querySelector(location.hash);
    const modo = reducido ? 'auto' : 'smooth';
    if(destino) destino.scrollIntoView({ behavior: modo });
    else scrollTo({ top:0, behavior: modo });
  });
}

/* =========================================================
   01 · EL SUELO DE PUNTOS
   El fondo del capítulo de Trabajos. Se afinó pieza a pieza en
   `malla.html`, que monta ESTE mismo módulo: no hay dos copias
   que se puedan separar, igual que con `sala.js` e `intro.html`.

   Aquí solo se conecta a tres cosas de la página: dónde está la
   interfaz, qué pieza se está mirando y por dónde va el scroll.
   ========================================================= */

let malla = null;

function activarMalla(){
  const lienzo = $('#malla');
  if(!lienzo) return;
  malla = montarMalla(lienzo);

  /* La malla se apaga donde hay contenido, en TODA la home y no solo
     en Trabajos. Las cajas se leen una vez al montar y otra al
     redimensionar, NUNCA por fotograma: medir el DOM fuerza
     maquetación y es lo caro de todo esto. Lo que cambia al scrollear
     es solo el desplazamiento, y de eso se encarga `desplazar()`. */
  const remedir = () => malla.medir([
    ...$$('.cabecera__linea'), ...$$('.cabecera__pie'),
    ...$$('.carrusel__escena'), ...$$('.carrusel__mando'),
    ...$$('.prosa'), ...$$('.software'), ...$$('.software__nota'),
    ...$$('.contacto__mail'), ...$$('.contacto__enlaces'), ...$$('.pie')
  ]);

  /* Después de dos fotogramas: al montar, el carrusel todavía no ha
     colocado las tarjetas y las cajas saldrían a cero. */
  requestAnimationFrame(() => requestAnimationFrame(remedir));
  addEventListener('resize', remedir);
  /* Con la tipografía definitiva el pie de la tarjeta envuelve
     distinto y la escena cambia de alto. */
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);

  /* La deriva del scroll: la cámara avanza un poco mientras bajas por
     el capítulo, así que el suelo se desplaza a distinta velocidad que
     las tarjetas. Lo que vende la profundidad no es que la superficie
     ondule sola, es que responda a ti.

     Va con el mismo acelerador que el vuelo del logo —un solo
     `requestAnimationFrame` pendiente— para no calcular en cada uno de
     los cientos de eventos de scroll que dispara una rueda. */
  const RECORRIDO = 9;    // unidades de mundo de punta a punta
  /* Cuánta malla queda fuera de Trabajos. No se apaga del todo: si
     desapareciera, la home volvería a ser cuatro cajas y el suelo
     dejaría de ser el mismo suelo. Apagada, acompaña. */
  const LEJOS = 0.42;
  const seccion = $('#work');

  let pendiente = false;
  const alScroll = () => {
    if(pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const y = scrollY;
      const r = seccion.getBoundingClientRect();

      /* La cámara avanza mientras bajas por el capítulo: 0 cuando
         entra por abajo, 1 cuando se va por arriba. */
      const t = (innerHeight - r.top) / (innerHeight + r.height);
      malla.progreso((Math.max(0, Math.min(1, t)) - 0.5) * RECORRIDO);

      /* La presencia sale de lo lejos que esté el centro de la ventana
         del capítulo 01, medido en pantallas. Entera encima de
         Trabajos y bajando a `LEJOS` al alejarse, sin escalones: si se
         mirara por capítulos habría un salto en cada frontera, que es
         justo lo que estamos quitando. */
      const centro = innerHeight / 2;
      const fuera = r.top > centro ? r.top - centro
                  : (r.bottom < centro ? centro - r.bottom : 0);
      const k = Math.min(1, fuera / (innerHeight * 1.15));
      malla.presencia(1 - (1 - LEJOS) * (k * k * (3 - 2 * k)));

      /* La máscara vive en coordenadas del documento y el lienzo va
         fijo: hay que decirle cuánto se ha movido para que siga
         apagándose debajo del texto. */
      malla.desplazar(y);
    });
  };
  addEventListener('scroll', alScroll, { passive:true });
  addEventListener('resize', alScroll);
  alScroll();
}

/* La temperatura de la pieza que se está mirando. Estrena el campo
   `paleta.fondo`, que las fichas llevan desde el principio y que no
   usaba nadie: es la cáscara adaptativa de la sección 4 del brief.

   El color NO lo llevan los puntos, lo lleva la niebla — el porqué,
   medido, está en malla.js. */
let piezaPintada = null;
function pintarTema(){
  if(!malla) return;
  const p = mazo[piezaEn(objetivo)]?.p;
  if(!p || p.id === piezaPintada) return;
  piezaPintada = p.id;
  malla.tema(p.paleta?.fondo || null);
}

/* ---- Arranque ------------------------------------------- */

/* Antes que nada, el ancho real de la ventana. Ver comun.js. */
medirVentana();
montarCarrusel();
activarMalla();
pintarTema();
pintarSoftware();
pintarContacto();
activarFiltro();
activarRevelados();
activarContadores();
activarSala();
activarAnclas();
empezarPorLaIntro();

/* Le dice al guardián del <head> que el módulo ha arrancado. */
document.documentElement.classList.add('listo');
