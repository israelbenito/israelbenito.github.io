/* =========================================================
   PÁGINA DE PROYECTO
   Un solo módulo para las cuatro. Cada página es una cáscara
   de HTML que dice qué ficha le toca —`<body data-proyecto>`—
   y todo lo demás se pinta desde `datos.js`.

   Es la regla del modelo de datos: añadir un proyecto tiene
   que ser rellenar una ficha, no rediseñar. Si alguna vez hay
   una quinta pieza, su página son veinte líneas de HTML y
   ni una de este archivo.

   ORDEN DE LA PÁGINA, y no es el intuitivo: la ficha técnica
   va ANTES de la galería. El lead ya vio el render en el
   índice; lo que quiere saber al entrar aquí es si esto es
   serio. Está en la sección 5 del brief y no es negociable
   por gusto.
   ========================================================= */

import { PROYECTOS, CONTACTO, SOFTWARE } from './datos.js';
import { montarMalla } from './malla.js';
import { reducido, $, $$, activarRevelados, fechaLarga, marcarVuelta, medirVentana } from './comun.js';

/* Las fichas declaran las rutas desde la raíz del sitio —`assets/…`—
   porque es donde vive la home. Estas páginas cuelgan de `projects/`,
   así que hay que subir un nivel.

   Se hace aquí y no con `<base href="../">`, que sería una línea: con
   `base`, un enlace de solo fragmento como `#galeria` deja de apuntar
   dentro de la página y se convierte en una navegación al directorio
   padre. Es un fallo silencioso y desagradable de encontrar. */
const RAIZ = '../';
const ruta = u => (u && !/^(https?:|data:|\/)/.test(u)) ? RAIZ + u : u;

const ficha = PROYECTOS.find(p => p.id === document.body.dataset.proyecto);

/* Sin ficha no hay página. Puede pasar de verdad: alguien duplica una
   cáscara para una pieza nueva y se olvida de crear el objeto en
   datos.js. Mejor decirlo que pintar una página vacía. */
if(!ficha){
  document.body.innerHTML =
    '<p style="padding:80px;font-family:monospace">No project entry with the id ' +
    `"${document.body.dataset.proyecto}" in datos.js.</p>`;
  throw new Error('Project entry not found');
}

/* ---- La cáscara adaptativa ------------------------------
   El tema cambia por proyecto y sale de los propios renders. Los tokens
   ya estaban declarados en base.css esperando a esto.

   EL FONDO DE LA PÁGINA NO ENTRA *(6 sep 2026, decisión de Israel)*. Aquí
   se escribía también `--fondo` con `paleta.fondo`, y en el Cottage eso
   deja la página entera de un verde bosque saturado: se ve como una
   página teñida, no como una pieza con temperatura. El comentario que
   había aquí ya avisaba de que "es donde esto se pone interesante" y
   listaba el rectángulo negro de los derivados; visto en pantalla, el
   verde se cae por sí solo antes de llegar a ese problema.

   `paleta.fondo` NO se toca y no es un campo muerto: sigue siendo la
   temperatura de la niebla del suelo de puntos, aquí y en la home —línea
   `malla.tema(...)` al final del archivo—. Y ahí sí funciona por lo que
   la sección 6 del brief ya tenía medido: la niebla tiene ÁREA y
   degradado, así que un color se lee como aire; un relleno plano al 100%
   de la página se lee como un tinte.

   Efecto de lado que hay que saber: con el fondo otra vez en `--void`,
   el rectángulo negro que los derivados JPEG dibujan alrededor de la
   obra deja de verse. **No está arreglado**, está tapado — sigue en la
   sección 8, y la primera superficie de color que se monte lo devuelve. */
function pintarTema(){
  const p = ficha.paleta;
  if(!p) return;
  const r = document.documentElement.style;
  if(p.texto)  r.setProperty('--texto', p.texto);
  if(p.acento) r.setProperty('--acento', p.acento);
}

/* ---- Cabecera y hero ------------------------------------ */

function pintarCabecera(){
  document.title = `${ficha.titulo} — Israel Benito`;

  $('#titulo').textContent = ficha.titulo;
  $('#volver').href = RAIZ + 'index.html#work';
  $('#volver').dataset.aHome = '#work';

  /* Las categorías son las mismas con las que filtra el índice. Aquí no
     filtran nada: dicen de qué va la pieza. */
  $('#categorias').innerHTML = (ficha.categorias || [])
    .map(c => `<li>${c === 'entorno' ? 'Environment' : 'Props'}</li>`).join('');

  const lienzo = $('#portada-lienzo');
  if(!ficha.hero){ $('#portada').classList.add('portada--sin-render'); return; }

  const [chico, grande] = ficha.hero.anchos ?? [700, 1400];

  /* TRES CAMPOS DE ENCUADRE Y NO SON REDUNDANTES, que es lo primero que
     parece al verlos juntos en la ficha:

       `foco`     — el punto del recorte CUADRADO de la tarjeta del
                    carrusel. No pinta nada en esta página.
       `anclaje`  — el punto del recorte de la portada a sangre, que
                    tiene la forma de la VENTANA y por tanto cambia con
                    ella. En el Terminator va al 0% de altura para que
                    lo que se corte salga siempre de abajo.
       `encuadre` — la proporción del render. Aquí solo manda en
                    estrecho, donde la portada deja de recortar y vuelve
                    a enseñar la imagen entera; ver proyecto.css.

     Los tres dicen algo distinto sobre la misma imagen y por eso son
     tres. Ver la sección 6 del brief. */
  lienzo.style.setProperty('--anclaje',  ficha.hero.anclaje  || '50% 50%');
  lienzo.style.setProperty('--encuadre', ficha.hero.encuadre || '16 / 9');

  /* `sizes="100vw"` porque va a sangre: el navegador tiene que elegir
     pensando en el ancho de la ventana, no en el de una columna. */
  lienzo.innerHTML = `
    <img src="${ruta(ficha.hero.web)}"
         srcset="${ruta(ficha.hero.chico)} ${chico}w, ${ruta(ficha.hero.web)} ${grande}w"
         sizes="100vw"
         alt="${ficha.hero.alt || ficha.titulo}"
         fetchpriority="high" decoding="async">`;
}

/* ---- El encogimiento de la portada ----------------------
   *(27 ago 2026, tarde)* La escena está clavada dentro de una pista de
   tres pantallas, y mientras se recorre, el render ENCOGE de tamaño
   completo a la mitad y, ya pequeño, se disuelve.

   Es el gesto de apertura de sondaven.com, la referencia que trajo
   Israel. Antes de copiarlo se midió allí, y lo que se copia no son los
   píxeles sino DOS DECISIONES:

   1. LA ESCALA ES LINEAL. Medido en el original: 0,911 · 0,822 · 0,733
      · 0,644 · 0,555 en tramos iguales de scroll. Exactamente −0,089
      cada 400 px, sin curva y sin acelerón. Una curva de suavizado aquí
      haría que la imagen "salga corriendo" al principio y se arrastre
      al final; lineal, se lee como que se aleja a velocidad constante,
      que es lo que hace un objeto de verdad.

   2. LA OPACIDAD NO SE TOCA HASTA EL FINAL. En el original se mantiene
      en 1 hasta el 83% del recorrido de la escala y ahí cae a cero.
      Primero encoge del todo A PLENA VISTA, y solo cuando ya es pequeña
      se va. Desvaneciendo a la vez que encoge, el gesto se pierde: se
      lee como que la imagen se apaga, no como que se aleja.

   El bajar acompaña al encoger para que la composición converja hacia
   el centro en vez de quedarse flotando arriba.

   Se hace en JS y no con una animación conducida por CSS —que es lo que
   mueve todo lo demás de la página— por una razón concreta: aquí el
   recorrido lo marca una pista pegada, y en CSS eso obliga a escribir
   los tramos como porcentajes de la altura de la pista, con lo que
   cambiar `300svh` desajusta todos los números en silencio. Así el JS
   lee la altura real y los números de aquí abajo siguen queriendo decir
   lo que dicen. Es un solo `transform` sobre un solo elemento dentro de
   un `requestAnimationFrame`, y no mide el DOM por fotograma. */

/* ---- El recorrido, en dos actos -------------------------
   ACTO A · encoge en su sitio, lineal, como en la referencia.
   ACTO B · SE VA AL FONDO. Sigue encogiendo, pero además sube hacia el
            punto de fuga de la malla y se apaga en su niebla.

   El acto B es de Israel y arregla algo que el primer montaje hacía mal:
   la imagen encogía, se quedaba pequeña y **se disolvía mientras el
   visitante seguía scrolleando sin que la página bajara**. Dos gestos
   sin relación pasando a la vez, y uno de ellos era esperar. Ahora el
   scroll hace UNA cosa: la portada se aleja y, a la vez y por el mismo
   gesto, la ficha técnica sube. Ver también el solape en proyecto.css.

   POR QUÉ SUBE. La malla es un suelo en perspectiva y su punto de fuga
   está declarado en `malla.js`: `horizonte: 0.05`, o sea al 5% de la
   altura de la pantalla. Una miniatura que se aleja tiene que ir HACIA
   AHÍ; alejarse quedándose en el centro es encoger, no alejarse. Se
   apunta un poco por debajo del 5% para no meterla bajo la barra.

   Si algún día se cambia `horizonte` en malla.js, este número va detrás.

   POR QUÉ LA ESCALA DEL ACTO B ES GEOMÉTRICA Y NO LINEAL. Al alejarse,
   el tamaño aparente de un objeto va como 1/z. Restando en línea recta,
   la miniatura se planta en un tamaño y se queda ahí una eternidad
   pareciendo que no avanza. Multiplicando por una fracción fija en cada
   tramo —que es lo que hace una potencia— el objeto se lee como que se
   aleja a velocidad constante y desaparece de verdad.

   Y EL VERTICAL ARRANCA SUAVE, con `b²`. En el acto A la imagen baja un
   poco; en el B tiene que subir. Interpolando en línea recta habría un
   tirón en el cambio de sentido, justo en el momento en que el visitante
   está mirando. Con la curva cuadrática la velocidad vertical sale de
   cero y el giro no se nota. */

/* Dónde acaba el acto A, en fracción del recorrido. */
const FASE_A       = 0.55;
/* Tamaño al acabar de encoger en su sitio, y al desaparecer al fondo. */
const ESCALA_MEDIA = 0.45;
const ESCALA_FONDO = 0.06;
/* Cuánto baja durante el acto A, en fracción de pantalla. */
const BAJADA       = 0.08;
/* El punto de fuga de la malla, ver arriba. */
const HORIZONTE    = 0.09;
/* La niebla se la come al final, no mientras encoge. */
const INICIO_NIEBLA = 0.78;

function activarPortada(){
  const portada = $('#portada');
  if(!portada) return;

  const escena = document.querySelector('.portada__fija');
  const cue    = $('#portada-cue');

  const alScroll = () => {
    /* El aviso de bajar se retira siempre, también con movimiento
       reducido: eso no es una animación, es que ya no hace falta. */
    if(cue) cue.style.setProperty('--cue', String(1 - Math.min(1, scrollY / 140)));
    if(reducido || !escena) return;

    /* El recorrido útil es la pista MENOS la pantalla que ocupa la
       escena clavada: cuando se ha scrolleado esa diferencia, el
       `sticky` se despega y la portada se va. */
    const recorrido = portada.offsetHeight - innerHeight;
    if(recorrido <= 0) return;
    const t = Math.min(1, Math.max(0, scrollY / recorrido));

    const a = Math.min(1, t / FASE_A);
    const b = Math.max(0, (t - FASE_A) / (1 - FASE_A));

    const escala = b <= 0
      ? 1 - (1 - ESCALA_MEDIA) * a
      : ESCALA_MEDIA * Math.pow(ESCALA_FONDO / ESCALA_MEDIA, b);

    const baja = a * BAJADA * innerHeight;
    const alFondo = (HORIZONTE - 0.5) * innerHeight;   // negativo: sube
    const y = baja + (alFondo - baja) * (b * b);

    escena.style.setProperty('--encoge', escala.toFixed(4));
    escena.style.setProperty('--baja', y.toFixed(1) + 'px');
    escena.style.setProperty('--desvanece',
      (1 - Math.min(1, Math.max(0, (t - INICIO_NIEBLA) / (1 - INICIO_NIEBLA)))).toFixed(3));
    /* La salida se retira con el acto B: en cuanto la portada empieza a
       irse, el botón deja de pertenecer a lo que se está mirando y la
       ficha técnica ya está subiendo por debajo. La barra sigue teniendo
       "01 · Trabajos", que va al mismo sitio. */
    escena.style.setProperty('--sale', (1 - Math.min(1, b * 1.6)).toFixed(3));
  };

  let pendiente = false;
  addEventListener('scroll', () => {
    if(pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; alScroll(); });
  }, { passive:true });
  addEventListener('resize', alScroll);
  alScroll();
}

/* ---- El tren del desglose, RETIRADO ---------------------
   *(10 sep 2026, lo pidió Israel)* Aquí vivían el tren, el abanico de
   cartas, el vuelo de la carta elegida y el papel que se comba: unas
   ochocientas líneas que convertían el desglose en una pista pegada
   donde el scroll no bajaba la página, sino que alimentaba una
   animación —cada pieza viajaba al centro, APARCABA mientras se le
   daban los cuatro pases, y se iba al seguir bajando—.

   Se quita entero y de las CUATRO páginas, el Terminator incluido, que
   era la única que lo tenía de verdad y la única cuya puesta en escena
   estaba aprobada. La razón es de lectura, no de código: el visitante
   baja para leer la página, y ahí la página dejaba de bajar. «Que fluya
   sin más.»

   LO QUE QUEDA ES LA LISTA APILADA, y no es un plan B: es la
   composición de la carta aparcada —rótulo arriba, obra grande en medio,
   los cuatro pases en fila debajo—, que el 7 sep 2026 se sacó de
   `.pases--tren` justo para que valiera en los dos sitios. O sea que
   cada pieza sigue siendo un acto; lo único que se va es que crucen la
   pantalla.

   Con esto se van también, y conviene saberlo antes de echarlas de
   menos: la pista pegada y su repliegue, `partirEnTiras`, el despeje
   del mazo, el encuadre común de todas las cartas, `visor--frente` y
   el desborde de 8 px del `100vw` de `.pases__fija`, que era una
   casilla abierta de la sección 8 y se cierra sola al no haber pista.

   Si algún día se quiere recuperar, está entero en el historial —commit
   anterior a este— y el argumento en `docs/pagina-de-proyecto.md`. No
   se vuelve a montar sin releer por qué se quitó. */
/* ---- La lupa de la galería ------------------------------
   *(10 sep 2026, lo pidió Israel)* Al pulsar un render de la galería se
   abre a tamaño de pantalla, con el archivo grande. El porqué del gesto
   —y por qué el botón es la imagen entera y no un icono— está en
   `pintarGaleria`.

   LO QUE HACE QUE ESTO VALGA LA PENA NO ES EL MODAL, ES EL ARCHIVO. La
   galería ya enseña sus renders a 1.178 px con archivos de 1.400, así
   que una lupa montada sobre ESOS archivos habría enseñado lo mismo
   estirado — que es justo lo contrario de lo que promete. Por eso entró
   antes la tercera talla en `derivados.ps1`: 2.560 px en las apaisadas y
   lo que dé el master en las verticales.

   LA IMAGEN CABE ENTERA EN LA PANTALLA *(11 sep 2026, lo pidió Israel)*.
   La primera versión la enseñaba a tamaño natural y dejaba que la capa
   hiciera scroll, con el argumento de que así una vertical se veía más
   grande. En la práctica lo que se veía era un render recortado por los
   bordes, y una obra no se enseña a trozos. Ahora se ajusta a lo que
   quepa —94vw y 94svh— y se ve completa.

   LO QUE ESO CUESTA, dicho claro: en las verticales, más pequeña que en
   la propia galería. El render de día del Cottage sale a unos 646 px de
   ancho contra los 1.178 de la página. Es el precio de verla entera y se
   pagó a sabiendas. En las apaisadas no se paga nada: siguen ganando el
   doble.

   Y SIGUE SIN AMPLIARSE NUNCA. `--ancho` son los píxeles reales del
   archivo, así que el tope es el menor de tres: 94vw, lo que deje el alto
   y el propio archivo. Si la pantalla da para más, sobra fondo.

   LA ANIMACIÓN SALE DE LA MINIATURA, no del centro de la nada: se mide
   la caja del render en la galería y la caja final, y la imagen viaja de
   una a otra. Es lo que hace que se lea como "esto se amplía" y no como
   "ha aparecido una ventana".

   Y ARRANCA CON LA MINIATURA PUESTA, que es el detalle que la hace
   inmediata: el archivo grande tarda en llegar y esperarlo dejaría el
   gesto colgado. La miniatura ya está descodificada, así que se pinta al
   instante, se anima, y el grande la sustituye cuando llega. Como los dos
   tienen la misma proporción, al cambiar no se mueve nada: solo se pone
   nítida. */
function activarLupa(){
  const disparos = $$('.galeria__ampliar');
  if(!disparos.length) return;

  const capa = document.createElement('div');
  capa.className = 'lupa';
  capa.hidden = true;
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.innerHTML =
    `<button class="lupa__cerrar mono" type="button" aria-label="Close">ESC ✕</button>
     <div class="lupa__pista"><img class="lupa__img" alt=""></div>`;
  document.body.append(capa);

  const img    = $('.lupa__img', capa);
  const cerrar = $('.lupa__cerrar', capa);
  let abridor  = null;

  const abrir = (boton) => {
    abridor = boton;
    const mini = boton.closest('.galeria__pieza')?.querySelector('img');
    img.alt = mini ? mini.alt : '';
    /* La miniatura primero: ya está descodificada, así que la capa se
       pinta en el mismo fotograma del clic. El grande entra detrás. */
    img.src = mini ? mini.currentSrc : boton.dataset.grande;
    capa.style.setProperty('--ancho', boton.dataset.ancho + 'px');
    capa.hidden = false;
    /* EL SCROLL DE FONDO SE PARA POR LOS DOS SITIOS, y hace falta:
       `peso.stop()` corta la rueda y el táctil que pasan por Lenis, pero
       no la barra de scroll ni las flechas del teclado, que siguen siendo
       del navegador. La clase se encarga de esos. Al cerrar se deshacen
       las dos, en el orden inverso.

       Y SE COMPENSA EL ANCHO DE LA BARRA, que si no la página da un salto
       lateral. Al quitarle el scroll al documento desaparece su barra, y
       eso son 15 px de ancho que aparecen de golpe: medido, `clientWidth`
       pasa de 2545 a 2560, así que todo lo centrado se corre 7 px y al
       cerrar vuelve. Detrás de la capa casi no se ve; el salto de vuelta,
       sí. El relleno ocupa exactamente lo que ocupaba la barra. */
    const barra = innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('sin-scroll');
    if(barra > 0) document.documentElement.style.paddingRight = barra + 'px';
    peso?.stop();
    cerrar.focus();

    crecer(mini);
    /* El archivo grande, por detrás. Se pide DESPUÉS de pintar y animar,
       así que el gesto no espera a la red. Al llegar solo cambia la
       nitidez: misma proporción, misma caja. */
    if(boton.dataset.grande && boton.dataset.grande !== img.src){
      const grande = new Image();
      grande.decoding = 'async';
      grande.onload = () => { if(!capa.hidden && abridor === boton) img.src = grande.src; };
      grande.src = boton.dataset.grande;
    }
  };

  /* LA AMPLIACIÓN, de la miniatura a su sitio. Se mide dónde está el
     render en la página y dónde acaba de quedar la imagen en la capa, y
     se recorre la diferencia — la técnica de siempre: primero se le pone
     la transformación que la devuelve al origen, y después se le quita.

     Se anima `transform` y nada más, que es lo único que no cuesta
     maquetación. Y sin rebote, que la sección 5 lo prohíbe: sale con
     velocidad y frena, como todo lo demás de esta web.

     Con movimiento reducido no ocurre: la imagen aparece puesta. */
  const crecer = (mini) => {
    if(reducido || !mini || !img.getAnimations) return;
    const desde = mini.getBoundingClientRect();
    const hasta = img.getBoundingClientRect();
    if(!desde.width || !hasta.width) return;

    const escala = desde.width / hasta.width;
    const dx = (desde.left + desde.width  / 2) - (hasta.left + hasta.width  / 2);
    const dy = (desde.top  + desde.height / 2) - (hasta.top  + hasta.height / 2);

    img.animate(
      [{ transform:`translate(${dx}px, ${dy}px) scale(${escala})`, opacity:.6 },
       { transform:'none', opacity:1 }],
      { duration:420, easing:'cubic-bezier(.22,.61,.24,1)' }
    );
    capa.animate([{ opacity:0 }, { opacity:1 }], { duration:260, easing:'ease-out' });
  };

  const cerrarLupa = () => {
    if(capa.hidden) return;
    capa.hidden = true;
    document.documentElement.classList.remove('sin-scroll');
    document.documentElement.style.paddingRight = '';
    peso?.start();
    /* Se suelta el archivo grande: son entre 238 KB y 1,2 MB
       descodificados en memoria, y volver a abrir lo saca de la caché
       del navegador sin pedir red. */
    img.removeAttribute('src');
    capa.scrollTop = 0;
    abridor?.focus();
    abridor = null;
  };

  disparos.forEach(b => b.addEventListener('click', () => abrir(b)));

  /* Se cierra pulsando el fondo, no la imagen. Con una vertical la capa
     hace scroll, y ahí un clic en la obra mientras se recorre sería
     cerrarla sin querer. */
  capa.addEventListener('click', e => {
    if(e.target === capa || e.target.closest('.lupa__cerrar')) cerrarLupa();
  });

  /* El foco no se sale: dentro solo hay una cosa que pulsar, así que el
     tabulador vuelve siempre a ella. Y al cerrar, el foco regresa al
     render desde el que se abrió — sin eso, quien navega con teclado
     acaba al principio de la página. */
  addEventListener('keydown', e => {
    if(capa.hidden) return;
    if(e.key === 'Escape'){ cerrarLupa(); }
    else if(e.key === 'Tab'){ e.preventDefault(); cerrar.focus(); }
  });
}

/* ---- El monograma de la barra ---------------------------
   *(27 ago 2026)* El mismo logo en metal que aterriza en la barra de la
   home, con las mismas luces. Lo monta `marca.js`, que es UN SOLO
   módulo para los dos sitios — ver su cabecera.

   Aquí se carga solo desde el `.glb`, porque en estas páginas no hay
   vuelo del que recogerlo.

   SE CARGA APARTE Y AL FINAL, y esa es la decisión que hay detrás:
   Three y el cargador de glb son unos 240 KB para un logo de 26 px que
   se dibuja UNA VEZ y no se mueve. Se aceptan por dos razones —van con
   `defer`, así que no bloquean nada, y quien llega por el carrusel de
   la home ya los tiene en caché, que es por donde llega casi todo el
   mundo—. Quien caiga aquí desde un enlace compartido los paga, y por
   eso van los últimos y por eso la página entera funciona sin ellos.

   Si algún día pesan de más, la salida es sacar una imagen del propio
   render con alfa: la marca es estática, así que un WebP de 2 KB da
   exactamente el mismo píxel. No se hizo ahora porque una imagen
   horneada se queda vieja en silencio el día que el logo cambie,
   mientras que esto sigue al `.glb` solo. */
async function activarMarca(){
  const lienzo = $('#marca-canvas');
  if(!lienzo) return;

  /* Los `<script defer>` de Three van antes que este módulo en el HTML y
     el navegador los ejecuta en orden, así que a estas alturas THREE
     debería estar. El `if` no es paranoia: basta con que alguien mueva
     una etiqueta de sitio, o que el CDN tarde, para que no lo esté — y
     entonces la marca se perdería en silencio en vez de esperar un
     momento. Si al terminar de cargar la página sigue sin haber THREE,
     `montarMarca` devuelve un objeto vacío y la barra se queda con su
     texto. */
  if(!window.THREE){
    await new Promise(r => addEventListener('load', r, { once:true }));
    if(!window.THREE) return;
  }

  const { montarMarca } = await import('./marca.js');
  montarMarca(lienzo, {
    logo: RAIZ + 'assets/logo.glb',
    /* La clase enciende el lienzo con un fundido cuando ya hay algo
       dibujado. Sin esto se ve el hueco vacío mientras carga. */
    alEstar: () => lienzo.closest('.nav__marca')?.classList.add('puesta')
  });
}

/* ---- El peso del scroll ---------------------------------
   *(27 ago 2026, tarde)* Lenis. La rueda deja de saltar de golpe y la
   posición persigue al destino con interpolación. Es buena parte de por
   qué las webs de referencia se sienten como se sienten, y no se puede
   conseguir con CSS: `scroll-behavior: smooth` solo suaviza los saltos
   a un ancla, no la rueda.

   Va copiada en `vendor/` y no enlazada a un CDN — el porqué está en su
   LEEME. Y lo que hace que se pueda meter aquí sin romper nada es que
   hace SCROLL NATIVO DE VERDAD: `position: sticky`,
   `animation-timeline: view()` y `scrollY` siguen valiendo. Una
   librería de scroll que moviera el contenido con un `transform`
   rompería las tres cosas a la vez.

   POR AHORA SOLO EN LAS PÁGINAS DE PROYECTO. La home no lo lleva, y no
   por olvido: allí hay un carrusel que ya interpola su propia posición
   con un muelle, el vuelo del logo atado al scroll y la deriva de la
   malla. Meter un segundo interpolador debajo de todo eso hay que
   probarlo pieza por pieza, y hoy toca el Terminator.

   Con movimiento reducido no se monta. Alguien que ha pedido que no le
   muevan la pantalla no quiere que además el scroll tenga inercia. */
let peso = null;

async function activarPeso(){
  if(reducido) return;
  try{
    const { default: Lenis } = await import('./vendor/lenis.mjs');
    peso = new Lenis({
      /* Interpolación por amortiguación en vez de duración fija: así el
         peso no depende de lo largo que sea el gesto. 0,1 da una inercia
         que se nota sin llegar a sentirse pastosa — más bajo y el scroll
         parece que va con retraso, que es la queja de siempre con estas
         librerías. */
      lerp: 0.1,
      /* El táctil se queda como está. El scroll con inercia de un móvil
         ya lo hace el sistema, y suavizarlo por encima da el efecto de
         goma que hace que la gente crea que la web va lenta. */
      smoothWheel: true,
      syncTouch: false
    });
    const paso = (t) => { peso.raf(t); requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }catch(e){
    /* Si el módulo no carga, la página se queda con el scroll del
       navegador. Se pierde el peso y no se pierde nada más. */
    console.warn('Lenis no se ha podido cargar; scroll normal.', e);
  }
}

/* ---- Ficha técnica --------------------------------------
   Lo que hace que esta página valga para un lead. Las filas cuyo dato
   sea `null` NO se pintan: están a null a propósito porque Israel
   todavía no ha dado las cifras, y un lead las lee en serio — inventarse
   un número de tris es la forma más rápida de perder una entrevista.

   Cuando lleguen los datos, esta sección se llena sola. */
function pintarDatos(){
  const filas = [
    ['Role',         ficha.rol],
    ['Date',         fechaLarga(ficha)],
    ['Software',     (ficha.software || []).join(' · ') || null],
    ['Triangles',    ficha.tris],
    ['Textures',     ficha.texturas],
    ['Materials',    ficha.materiales],
    ['Trim sheet',   ficha.trimSheet]
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  /* Cada fila se revela por su cuenta y con retardo creciente, no el
     bloque entero de golpe. Es la diferencia entre que la ficha aparezca
     y que la ficha SE LEA: escalonadas, el ojo las recorre en el orden en
     que están escritas.

     El retardo se corta a la quinta para que la última fila no se haga
     esperar medio segundo. Escalonar no es hacer cola. */
  $('#datos').innerHTML = filas.map(([k, v], i) => `
    <div class="dato" style="--i:${Math.min(i, 4)}">
      <dt class="mono mute">${k}</dt>
      <dd>${v}</dd>
    </div>`).join('');

  /* El crédito del trabajo en equipo va aquí, a tamaño de lectura y no
     en letra pequeña. En el Terminator el T-800 no es suyo, y desde que
     la portada la preside el robot esto dejó de ser una nota para pasar
     a ser imprescindible. */
  const credito = $('#credito');
  if(ficha.equipo && ficha.credito){
    credito.textContent = ficha.credito;
  }else{
    credito.hidden = true;
  }

  /* Aquí hubo un aviso de "los datos de recuento, texturas y materiales
     todavía no están publicados", que se quitó el 27 ago 2026 por
     decisión de Israel. La idea era que un lead entendiera que faltan en
     vez de creer que se olvidaron; en la página, lo que hacía era
     SEÑALAR EL HUECO. Una ficha con rol, fecha y software se lee entera;
     la misma ficha con un cartel debajo diciendo lo que no hay se lee
     como incompleta.

     Que las filas a `null` no se pinten sigue en pie, y eso es lo que
     importaba: no se inventan cifras. Cuando lleguen, la ficha se llena
     sola. */
}

/* ---- Galería --------------------------------------------
   Beauty shots y vídeo. El vídeo va SILENCIADO, en bucle y sin
   controles, con una pausa discreta; en móvil, solo el fotograma de
   portada, que es lo que pide la sección 7. */
function pintarGaleria(){
  const seccion = $('#galeria');
  const lista = $('#galeria-lista');
  const imagenes = ficha.galeria || [];

  if(!imagenes.length && !ficha.video){ seccion.hidden = true; return; }

  /* Sin `data-revelar`: la cortina de la galería la conduce el scroll,
     como todo lo que hay por debajo de la portada. Ver el bloque de la
     escena en proyecto.css. Una imagen que se descubre se lee como que
     la enseñan; la misma apareciendo por opacidad se lee como que
     estaba cargando. */
  /* EL BOTÓN DE AMPLIAR, ARRIBA A LA DERECHA DE CADA RENDER *(11 sep
     2026, decisión de Israel)*. La primera versión no tenía botón: se
     pulsaba el render entero y lo anunciaba el cursor. Se avisó de que un
     control encima de la obra choca con la sección 4 —los efectos viven
     donde no hay obra— y Israel lo pidió igual, con el aviso delante.

     Y una cosa que el botón hace mejor que el cursor, que conviene tener
     escrita: **en táctil no hay cursor**, así que aquella versión no
     anunciaba nada en un teléfono. El botón sí.

     VA VISIBLE DESDE EL PRINCIPIO, no al pasar el ratón: un control que
     aparece al acercarse no existe para quien no tiene ratón, y la regla
     del 7 sep dice que un botón tiene que estar entero desde que se ve.
     Lo discreto lo pone el tamaño y el color, no el esconderlo.

     SIN `grande` NO HAY BOTÓN, y no hay ningún caso especial escrito en
     el resto del código: la imagen se queda como estaba. Una ficha vieja
     no se rompe, y un render al que todavía no se le haya sacado la talla
     grande simplemente no amplía. */
  lista.innerHTML = imagenes.map(g => {
    const [chico, grande] = g.anchos ?? [700, 1400];
    const alt = g.alt || '';
    const ampliar = g.grande
      ? `<button class="galeria__ampliar" type="button"
                 data-grande="${ruta(g.grande.web)}" data-ancho="${g.grande.ancho}"
                 aria-label="View larger: ${alt}">
           <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
             <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>
           </svg>
         </button>`
      : '';
    return `<figure class="galeria__pieza">
              <img src="${ruta(g.web)}"
                   srcset="${ruta(g.chico)} ${chico}w, ${ruta(g.web)} ${grande}w"
                   sizes="(max-width:900px) 92vw, 1180px"
                   alt="${alt}" loading="lazy" decoding="async">
              ${ampliar}
            </figure>`;
  }).join('');

  const cajaVideo = $('#video');
  if(!ficha.video){ cajaVideo.hidden = true; return; }

  /* CON SONIDO, CON BARRA DE REPRODUCCIÓN Y SIN ARRANCAR SOLO. Esto
     revisa lo que la sección 7 del brief decía del vídeo —"silenciado, en
     bucle, sin controles, con pausa discreta"—, y el motivo es que aquella
     regla se escribió para un vídeo que hacía de ambiente. Aquí no lo es:
     es un corto de veintisiete segundos con banda sonora, en la página de
     su propio proyecto, y quien ha bajado hasta aquí ha venido a verlo.

     Las tres cosas van juntas y no se pueden separar: un vídeo con sonido
     NO puede arrancar solo —todos los navegadores lo bloquean, y con
     razón—, así que hace falta que el visitante le dé al play, y para eso
     hace falta un control visible. Quitar el `muted` sin quitar el
     autoplay habría dado un vídeo que no arranca y nadie sabe por qué.

     `controls` nativo y no el botón discreto de antes: una barra de
     verdad trae posición, volumen y pantalla completa, y en un corto con
     sonido eso no es adorno, es poder mirarlo.

     El clip de la tarjeta del carrusel sigue mudo, en bucle y sin
     controles. Ahí la regla original sigue siendo la buena: es ambiente. */
  /* EL RECORTE DE LAS BANDAS NEGRAS. El corto del Terminator son
     1280×720 de archivo pero 1280×604 de imagen, a partir de y=58:
     el master traía las barras QUEMADAS y el derivado las heredó. Sin
     esto, el vídeo se ve con un pilarón negro arriba y otro abajo
     dentro de su marco, y eso no se lee como formato, se lee como
     error.

     Medido con `cropdetect` sobre el propio derivado, no supuesto —es
     la misma regla que ya se aplicó al recortar el clip de la tarjeta:
     "Se mide con cropdetect, no se supone".

     Va en la ficha y no aquí porque es un dato del archivo, y el
     siguiente vídeo que entre no tiene por qué traer barras. Sin el
     campo se asume 16/9, que es no recortar nada. */
  cajaVideo.style.setProperty('--video-encuadre', ficha.videoEncuadre || '16 / 9');

  cajaVideo.innerHTML = `
    <video id="video-el" controls playsinline preload="none"
           ${ficha.videoPortada ? `poster="${ruta(ficha.videoPortada)}"` : ''}
           aria-label="${ficha.titulo} project video"></video>`;

  const v = $('#video-el');

  /* La fuente se pone al acercarse, no al cargar la página: son casi 4 MB
     y no los paga quien no baja hasta la galería. `metadata` y no `auto`
     porque con eso ya salen la duración y la barra, que son unos pocos KB
     —el archivo lleva el índice al principio, `+faststart`—, y el resto
     no se descarga hasta que se pulsa play. */
  const ponerFuente = () => {
    if(v.src) return;
    v.preload = 'metadata';
    v.src = ruta(ficha.video);
  };

  if('IntersectionObserver' in window){
    new IntersectionObserver(([e]) => {
      if(e.isIntersecting){ ponerFuente(); return; }
      /* Fuera de pantalla se pausa. Con sonido esto deja de ser una
         optimización y pasa a ser educación: un corto sonando en una
         sección que ya no estás mirando es exactamente lo que hace que se
         cierre la pestaña. */
      if(!v.paused) v.pause();
    }, { threshold:0.15 }).observe(cajaVideo);
  }else{
    ponerFuente();
  }
}

/* ---- Visor de pases -------------------------------------
   Cuatro botones por asset: beauty, wireframe, normales y checker de
   texel density. Si un asset solo trae beauty, los botones NO aparecen:
   un visor con un solo pase es una imagen con adornos.

   LAS CUATRO IMÁGENES VAN APILADAS, no se sustituye el `src`. Dos
   razones y las dos son el mismo requisito del brief —"si saltan al
   cambiar de pase, el efecto se rompe"—: cambiando el `src` hay un
   parpadeo mientras el navegador decodifica, y la caja se recalcula.
   Apiladas en el mismo cuadro y cruzando la opacidad, el cambio es
   exactamente lo que promete: la misma cámara, otra información.

   Comprobado el 27 ago 2026 que los pases encajan de verdad: sobre el
   master de 4096, la caja del alfa de beauty, normales y checker es
   idéntica al píxel, y el wireframe se sale entre 4 y 8 px porque su
   trazo monta sobre el borde de la silueta. A los 900 px a los que se
   ven, píxel y medio. */

const NOMBRES = { beauty:'Beauty', wireframe:'Wireframe', normal:'Normals', checker:'Checker' };
const ORDEN = ['beauty', 'wireframe', 'normal', 'checker'];

function pintarVisor(){
  const seccion = $('#pases');
  const assets = ficha.assets || [];
  if(!assets.length){ seccion.hidden = true; return; }

  /* La entrada del capítulo promete los cuatro pases, y va escrita en las
     cuatro cáscaras porque es la misma frase en todas. Si algún día entra
     un asset con beauty y nada más, esa frase pasaría a ser mentira: aquí
     no habría desglose, habría una imagen. Se retira sola.

     Hoy no se dispara —el rifle, la calavera, el reloj y las sillas
     tienen los cuatro—, y ese es justo el motivo de dejarlo escrito: el
     caso que no ocurre es el que nadie comprueba. */
  const hayDesglose = assets.some(a => ORDEN.filter(k => a.pases && a.pases[k]).length > 1);
  if(!hayDesglose) $('#pases .seccion__entrada').hidden = true;

  /* LA FORMA DEL MARCO, en píxeles reales del derivado. El marco toma la
     forma de la obra desde el 10 sep 2026 —ver proyecto.css—, y la
     proporción se DECLARA porque el cuadro tiene que medir antes de que
     sus capas carguen: van con `loading="lazy"` y encima llevan la
     cortina conducida por el scroll. Es el caso de `videoEncuadre`.

     Sin el campo cae en 1 / 1, que es lo que había hasta hoy y lo que le
     va bien a una pieza cuadrada. Así una ficha vieja no se rompe: se
     comporta como antes. */
  const encuadre = (a) => {
    const [w, h] = String(a.encuadre || '1 / 1').split('/').map(n => parseFloat(n));
    return (w > 0 && h > 0) ? `--enc-w:${w};--enc-h:${h}` : '';
  };

  /* LAS CIFRAS DE CADA PIEZA *(11 sep 2026, las dio Israel)*. Van pegadas
     a la pieza que describen y no en la ficha técnica de arriba, y el
     motivo es que serían FALSAS ahí: el Terminator tiene dos piezas y el
     Ekko tres, así que una cifra de proyecto obligaría a sumar o a
     promediar, y eso es inventar un dato. Aquí cada número es de la pieza
     que se está mirando y no hay nada que interpretar.

     El Hard surface es la excepción y la lleva a nivel de proyecto: no
     tiene desglose donde colgarla. Ver su ficha.

     El `high poly` NO ES DECORACIÓN. Israel lo escribió solo en tres de
     las seis piezas —rifle, calavera y Formentor—, así que en esas el
     recuento es el del modelo denso y en las otras no. Borrarlo sería
     hacer pasar por lo mismo dos cifras que no lo son, y es exactamente
     el tipo de dato que un lead lee en serio.

     Cada línea lleva su icono, dibujado con MÁSCARA CSS igual que los del
     listado de programas: el archivo pone la silueta y el color lo pone
     `--mute`. Los genera `derivados.ps1`. */
  const CIFRAS = [
    ['tris',        'tris.png',        c => `${c.tris} tris${c.altaPoly ? ' · high poly' : ''}`],
    ['sets',        'texture-set.png', c => `${c.sets} texture set${c.sets === 1 ? '' : 's'}`],
    ['resolucion',  'texture-res.png', c => c.resolucion]
  ];

  const cifras = (a) => {
    const c = a.cifras;
    if(!c) return '';
    /* Cada dato se pinta solo si existe: una pieza a la que le falte el
       recuento enseña los otros dos en vez de un hueco o un "null". */
    const filas = CIFRAS.filter(([k]) => c[k] !== null && c[k] !== undefined && c[k] !== '')
      .map(([, icono, texto]) => `
        <li class="cifra">
          <i class="cifra__icono" aria-hidden="true"
             style="-webkit-mask-image:url('${ruta('assets/iconos/' + icono)}');mask-image:url('${ruta('assets/iconos/' + icono)}')"></i>
          <span>${texto(c)}</span>
        </li>`).join('');
    return filas ? `<ul class="cifras mono">${filas}</ul>` : '';
  };

  $('#pases-lista').innerHTML = assets.map((a, i) => {
    const disponibles = ORDEN.filter(k => a.pases && a.pases[k]);
    /* El primero de la pila —el beauty— lleva además `--fondo`, que lo
       deja encendido siempre. Es lo que evita que se vea el fondo de la
       página por el hueco que deja un fundido cruzado; el porqué, con
       la cuenta, está en proyecto.css. */
    const capas = disponibles.map((k, j) => `
      <img class="visor__capa${j === 0 ? ' visor__capa--activa visor__capa--fondo' : ''}"
           data-pase="${k}" src="${ruta(a.pases[k])}"
           alt="${a.nombre}, pase ${NOMBRES[k].toLowerCase()}"
           loading="lazy" decoding="async" draggable="false">`).join('');

    /* Un solo pase: sin botonera.

       Los botones llevaban un `--i` con su posición, que era lo que
       escalonaba su entrada. Se fue con la animación *(7 sep 2026, lo
       paró Israel)*: la botonera se ve entera desde el primer momento.
       Ver el bloque de la escena en proyecto.css. */
    const mando = disponibles.length < 2 ? '' : `
      <div class="visor__mando mono" role="group" aria-label="${a.nombre} passes">
        ${disponibles.map((k, j) => `
          <button type="button" data-pase="${k}"
                  aria-pressed="${j === 0}"><span>${NOMBRES[k]}</span></button>`).join('')}
      </div>`;

    /* EL ORDEN DEL ACTO, y es lo que hace que un asset se lea como una
       pieza y no como una celda de una tabla: primero la PIEZA, que se
       descubre con la cortina y se asienta, y a media cortina entra su
       nombre.

       LA BOTONERA NO ENTRA: está entera desde que se ve *(7 sep 2026,
       lo paró Israel)*. Llegaba la última y escalonada, con el
       argumento de que así se leía como "aquí viene la pieza... y ahora
       puedes darle la vuelta". Mirado en la página, lo que se veía era
       una botonera a medio montar — y un control a medias no invita a
       pulsarlo, parece que no ha cargado.

       El escalonado NO son retardos en milisegundos: son tramos distintos
       del recorrido del scroll, y quién va antes lo decide la geometría.
       El cuadro mide 900 px y el panel unos 200, y los dos van centrados
       en la misma fila, así que el borde de arriba del cuadro asoma por
       la pantalla mucho antes que el del panel y empieza a descubrirse
       solo. Ver el bloque de la escena en proyecto.css. */
    /* `.visor__pieza` era lo que GIRABA dentro del tren, y por eso
       existía: la perspectiva tiene que vivir un solo nivel por encima
       de lo que rota. Retirado el tren *(10 sep 2026)* ya no gira nada,
       pero el div se queda porque es lo que centra la columna —rótulo,
       obra y botonera— y quitarlo movería la composición aprobada para
       ahorrar un elemento. Ver proyecto.css. */
    /* EL RÓTULO ARRIBA, LA OBRA EN MEDIO Y LA BOTONERA DEBAJO *(7 sep
       2026, lo pidió Israel)*. El nombre estaba pegado a los botones,
       en un solo bloque bajo la imagen, y ahí pasaban dos cosas: se
       leía después de la pieza que nombra, y se leía como parte del
       control.

       Ahora el orden del DOM ES el orden en pantalla —se fue el
       `order:-1` que tenía el cuadro—, así que lo que se lee, lo que se
       tabula y lo que se ve van en el mismo orden. */
    return `<article class="visor" data-visor="${i}" data-nombre="${a.nombre}">
              <div class="visor__pieza">
                <div class="visor__panel">
                  <span class="visor__indice mono"
                        aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${String(assets.length).padStart(2, '0')}</span>
                  <h3 class="visor__nombre">${a.nombre}</h3>
                  ${cifras(a)}
                </div>
                <div class="visor__cuadro" style="${encuadre(a)}">
                  <div class="visor__pila">${capas}</div>
                </div>
                ${mando}
              </div>
            </article>`;
  }).join('');

  /* Un solo escuchador para toda la sección en vez de uno por botón. */
  $('#pases-lista').addEventListener('click', e => {
    const b = e.target.closest('.visor__mando button');
    if(!b) return;
    const visor = b.closest('.visor');
    $$('.visor__mando button', visor).forEach(o =>
      o.setAttribute('aria-pressed', String(o === b)));
    $$('.visor__capa', visor).forEach(c =>
      c.classList.toggle('visor__capa--activa', c.dataset.pase === b.dataset.pase));
  });
}

/* ---- Siguiente proyecto ---------------------------------
   Encadenado EN BUCLE, no vuelve al índice. La idea es que se pueda
   recorrer la obra entera sin volver atrás nunca; devolver al índice
   entre pieza y pieza rompe eso y obliga a elegir otra vez.

   El orden y la vuelta salen del mazo, como en el carrusel: en ninguna
   parte de este archivo hay un 4 escrito. */
function pintarSiguiente(){
  const i = PROYECTOS.indexOf(ficha);
  const sig = PROYECTOS[(i + 1) % PROYECTOS.length];
  if(!sig || sig === ficha){ $('#siguiente').hidden = true; return; }

  const a = $('#siguiente-enlace');
  a.href = `${sig.id}.html`;     // hermana suya, en esta misma carpeta
  $('#siguiente-titulo').textContent = sig.titulo;

  if(sig.hero){
    const [chico, grande] = sig.hero.anchos ?? [700, 1400];
    /* Ahora es una banda a sangre y del alto de media pantalla, no una
       miniatura de 620 px al lado del título: `sizes` va a `100vw` y el
       recorte lo lleva `foco`, que es el mismo punto de enfoque que usa
       el carrusel de la home. Aquí sí vale reutilizarlo —los dos son un
       recorte de la pieza reducida a portada— y por eso no hace falta
       un campo nuevo. */
    $('#siguiente-img').outerHTML = `
      <img id="siguiente-img" class="siguiente__img"
           src="${ruta(sig.hero.web)}"
           srcset="${ruta(sig.hero.chico)} ${chico}w, ${ruta(sig.hero.web)} ${grande}w"
           sizes="100vw"
           style="--foco:${sig.hero.foco ?? '50% 50%'}"
           alt="${sig.hero.alt || sig.titulo}" loading="lazy" decoding="async">`;
  }
}

/* ---- Pie y navegación ----------------------------------- */

function pintarPie(){
  $('#anio').textContent = new Date().getFullYear();
  $('#pie-mail').textContent = CONTACTO.email;
  $('#pie-mail').href = 'mailto:' + CONTACTO.email;

  /* Todo lo que vuelve a la home: los enlaces de la barra y el botón de
     volver a trabajos. Desde aquí son una navegación de verdad y no un
     salto dentro de la página.

     El ancla se pone igual —hace falta para que el enlace signifique algo
     sin JavaScript y para el menú contextual del navegador—, pero al
     pulsar se deja además una MARCA DE SESIÓN, porque el ancla sola no
     basta: la home la retira en su cabecera antes de que el destino
     exista. Sin esto, pulsar "volver a trabajos" te devolvía a la intro,
     que es exactamente perder el sitio. Ver `comun.js`. */
  $$('[data-a-home]').forEach(a => {
    if(!a.getAttribute('href') || a.getAttribute('href') === '#'){
      a.href = RAIZ + 'index.html' + a.dataset.aHome;
    }
    a.addEventListener('click', () => marcarVuelta(a.dataset.aHome));
  });

  const cv = CONTACTO.enlaces.find(e => e.descarga && e.principal)
          ?? CONTACTO.enlaces.find(e => e.descarga);
  const navCv = $('#nav-cv');
  if(cv && cv.disponible){
    navCv.href = ruta(cv.url);
    navCv.setAttribute('download', cv.descarga);
  }else{
    navCv.removeAttribute('href');
    navCv.setAttribute('aria-disabled', 'true');
  }
}

/* ---- La escena ------------------------------------------
   Los títulos entran PALABRA A PALABRA desde debajo de una máscara, no
   como un bloque que se desvanece. Para eso hace falta una caja por
   palabra —la que recorta— y otra dentro —la que se mueve—: un solo
   elemento no puede recortarse a sí mismo y desplazarse a la vez.

   Se parte aquí y no en el HTML por lo de siempre: el HTML de estas
   páginas son cuatro cáscaras iguales y el texto de los rótulos no
   puede venir troceado a mano en cada una. Y el título del siguiente
   proyecto ni siquiera existe en el HTML, lo pinta la ficha.

   El texto sigue siendo texto: hay un espacio de verdad entre palabra
   y palabra, así que un lector de pantalla lee la frase entera y se
   puede seleccionar y copiar con el ratón.

   `--i` es el número de palabra, y de él sale el escalonado: cada una
   entra un tramo de scroll después que la anterior. Ver el bloque de
   la escena en proyecto.css. */
function partirEnLetras(el){
  if(!el || el.dataset.partido) return;
  const texto = el.textContent.trim();
  if(!texto) return;

  el.textContent = '';

  /* EL TEXTO DE VERDAD, para lectores de pantalla, y las letras aparte
     marcadas como decoración. Partir una frase en letras y dejarlas
     desnudas hace que algunos lectores la deletreen —"de, e, ese,
     ge…"—, que es peor que no animar nada. Con esta pareja, el lector
     oye la frase entera y el ojo ve las letras. */
  const paraLeer = document.createElement('span');
  paraLeer.className = 'sr';
  paraLeer.textContent = texto;
  el.append(paraLeer);

  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');

  /* El escalonado corre por TODA la frase, no por palabra: si se
     reiniciara en cada una, las tres primeras letras de cada palabra
     entrarían a la vez y se vería la costura. Corrido, la onda cruza el
     título de lado a lado. */
  let n = 0;
  texto.split(/\s+/).forEach((palabra, w) => {
    if(w) visual.append(' ');
    /* La caja de la palabra es la que RECORTA, y va por palabra y no
       por letra para que el título siga partiendo por donde parte una
       frase cuando no cabe. */
    const caja = document.createElement('span');
    caja.className = 'palabra';
    for(const ch of palabra){
      const letra = document.createElement('span');
      letra.className = 'letra';
      letra.style.setProperty('--i', n++);
      letra.textContent = ch;
      caja.append(letra);
    }
    visual.append(caja);
  });

  el.append(visual);
  el.dataset.partido = '1';
}

/* Va DESPUÉS de pintarlo todo: parte lo que ya está escrito, incluido
   el título del siguiente proyecto, que lo acaba de poner la ficha. */
function activarEscena(){
  $$(".seccion__titulo").forEach(partirEnLetras);
  partirEnLetras($("#siguiente-titulo"));
}

/* ---- El suelo de puntos ---------------------------------
   El mismo módulo que la home. Aquí hace dos cosas: que la página se lea
   como el mismo espacio que el índice del que vienes, y llevar el color
   de la pieza en la niebla —que es donde la cáscara adaptativa se ve de
   verdad, porque la niebla tiene área y los puntos no—.

   Va a presencia fija y sin deriva por scroll: en la home la deriva
   existe porque el carrusel se queda quieto mientras bajas y el suelo
   tiene que moverse a otra velocidad. Aquí baja toda la página, y mover
   además la cámara del suelo es movimiento sobre movimiento. */
let malla = null;
function activarMalla(){
  const lienzo = $('#malla');
  if(!lienzo) return;
  malla = montarMalla(lienzo);
  malla.tema(ficha.paleta?.fondo || null);
  malla.presencia(0.55);

  /* La portada entera, y no solo su texto: es una imagen a sangre que
     tapa la pantalla, así que ahí debajo no hay malla que iluminar. */
  /* EL DESGLOSE SIGUE SIN ENTRAR EN LA MÁSCARA, y desde el 10 sep 2026
     ya no por el motivo que decía aquí. El motivo era el tren: las
     piezas estaban absolutas y cruzando la pantalla, así que cualquier
     caja que se guardara de ellas era mentira dos segundos después.
     Retirado el tren, las piezas están quietas y se podrían medir.

     No se meten, y es una decisión pendiente de mirar con ojos y no de
     medir: los derivados llevan alfa desde esa misma mañana, o sea que
     las piezas YA NO SON OPACAS —entre el 60 y el 75% de su área es
     transparencia— y por ahí se ve la malla. Meterlas en la máscara
     apagaría el fondo en todo el rectángulo de la obra, transparencia
     incluida, que es un recorte cuadrado alrededor de una pieza que
     flota. Dejarlas fuera hace que el cursor ilumine por los huecos de
     la pieza, que es lo contrario de la regla de la sección 4.
     Ninguna de las dos es obviamente la buena; se decide viéndolo. */
  const remedir = () => malla.medir([
    ...$$('.datos'),
    ...$$('.galeria__pieza'), ...$$('.video'),
    ...$$('.siguiente__caja'), ...$$('.pie')
  ]);
  requestAnimationFrame(() => requestAnimationFrame(remedir));
  addEventListener('resize', remedir);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);

  let pendiente = false;
  const alScroll = () => {
    if(pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; malla.desplazar(scrollY); });
  };
  addEventListener('scroll', alScroll, { passive:true });
  addEventListener('resize', alScroll);
  alScroll();
}

/* ---- Arranque ------------------------------------------- */

/* Lo PRIMERO: publica `--vw` para que nada se maquete con el ancho
   equivocado ni un fotograma. Ver `medirVentana` en comun.js. */
medirVentana();
pintarTema();
pintarCabecera();
pintarDatos();
pintarGaleria();
pintarVisor();
pintarSiguiente();
pintarPie();
activarMalla();
activarPeso();
activarMarca();
activarPortada();
activarEscena();
activarLupa();
/* La portada es lo ÚNICO que sigue con revelado de disparo, y es a
   propósito: está en pantalla desde que carga la página, así que no hay
   scroll que pueda conducirla. Todo lo que viene por debajo va atado al
   scroll — ver proyecto.css. */
activarRevelados();

document.documentElement.classList.add('listo');
