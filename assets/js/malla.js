/* =========================================================
   MALLA DE PUNTOS — el suelo que sigue bajo el capítulo 01

   No es un fondo decorativo pegado detrás de los proyectos: es
   un plano de suelo con su cámara y su división de perspectiva,
   pensado para leerse como que la sala de la intro continúa por
   debajo. Esa es la diferencia entre profundidad y una rejilla
   dibujada, y es la razón por la que los valores por defecto
   copian el ojo y el campo de visión de `sala.js`.

   Canvas 2D a propósito, no un tercer contexto WebGL. En la home
   ya hay dos lienzos de Three.js —la sala y el relevo del logo—;
   un tercero para lo que matemáticamente es una rejilla proyectada
   sube memoria de GPU y ata este fondo al ciclo de vida de la sala.
   Aquí se apaga y se enciende solo.

   De dónde sale cada cosa que se ve:

   - Más denso hacia el horizonte  → separación uniforme en el
     mundo. Al proyectar, las filas se apiñan solas.
   - Líneas de fuga               → las columnas están en x fijas
     del mundo (múltiplos de `paso`), iguales en todas las filas.
     Si cada fila calculase sus x, las líneas se romperían.
   - Se desvanece a lo lejos      → niebla exponencial, la misma
     ley que usa la sala.
   - Deformación                  → dos senos de periodo largo y
     desfasados, el mismo truco que la flotación del logo: así el
     vaivén no se repite de forma reconocible.

   El coste por fotograma se controla en tres sitios: la tabla de
   senos, el número de cambios de `fillStyle` —la opacidad depende
   sobre todo de la profundidad, que es constante dentro de una
   fila, así que el estilo cambia un puñado de veces por fila y no
   una vez por punto— y los fotogramas por segundo, que van a 30
   porque la animación es casi imperceptible y a 60 se ve igual
   costando el doble.
   ========================================================= */

/* Valores aprobados por Israel en el banco de pruebas (26 ago 2026),
   tras varias vueltas. No son los de partida: los de partida eran
   mucho más tímidos y la cámara era la de la sala. Se dejaron atrás a
   propósito, ver las notas de cada bloque.

   Cualquiera de estos números se mueve en vivo en `malla.html`; el
   botón «Copiar» de ahí escupe exactamente este formato. */
export const VALORES = {
  /* ---- Cámara ----
     NO es la de la sala. Se probaron las dos: la de la intro —40° y
     ojo a 3,2— deja un suelo que se aleja de frente, y esta mira una
     llanura desde muy arriba, con el horizonte casi pegado al borde
     superior. Israel eligió la segunda mirando las dos seguidas. El
     efecto es que la malla se concentra en una banda alta y deja
     limpio todo el cuerpo del capítulo. */
  fov:        75,
  alturaOjo:  14.5,
  horizonte:  0.05,   // 0 = arriba del lienzo, 1 = abajo

  /* ---- Rejilla ---- */
  paso:       1.45,   // separación en el mundo, en x y en z
  /* Dónde empieza el plano, y por qué estos dos números van juntos.

     Israel: "en Sobre mí, abajo sale muy poco, está en negro". No era
     que la malla se desvaneciera: es que ahí NO HABÍA SUELO. Con el
     ojo a 11,5 y la primera fila a 10,5, la fila más cercana caía al
     62% de la pantalla y por debajo no había geometría que pintar.

     Acercar el plano se puede hacer bajando `zCerca` o subiendo
     `alturaOjo`, y las dos tienen precio: bajar zCerca deja el primer
     plano salpicado —el defecto que ya se corrigió una vez— y subir
     alturaOjo inclina la cámara hacia el cenital. Se reparte entre
     las dos para no forzar ninguna. Medido: de 62% a 91%. */
  zCerca:     8,
  /* Ojo: con este `maxPuntos` la válvula sube el paso real a ~1,62.
     Es lo que se aprobó mirando. Para que 1,45 se cumpla de verdad
     hacen falta unos 20000, y el coste sube de ~1,7 a ~2,2 ms. */
  maxPuntos:  15000,

  /* ---- Profundidad ---- */
  niebla:     0.01,   // exp(-(z·niebla)²), la ley de la sala
  opacidad:   0.19,   // la del punto más cercano
  umbral:     0.015,  // por debajo de esto NO se pinta, ver abajo
  zGrueso:    10,     // hasta aquí el punto mide 2 px; después, 1

  /* ---- Onda ----
     Más viva de lo que pedía el encargo original —que hablaba de
     movimiento casi imperceptible—. Se señaló la diferencia y se
     eligió esto a conciencia con las dos versiones delante. */
  amplitud:   1.2,    // unidades de mundo
  periodoX:   30,
  periodoZ:   50,
  velocidad:  0.2,    // radianes por segundo
  velocidad2: 0.2,

  /* ---- Relieve ----
     Una elevación local, para que la superficie no se lea igual en
     todas partes. La onda de arriba es periódica y por tanto uniforme
     por definición: por muy despacio que vaya, el ojo la reconoce como
     un patrón. Un accidente rompe eso.

     No es una gaussiana: la caída es (1 - d²/R²)², que vale cero fuera
     del radio y tiene pendiente cero en el centro y en el borde. Sale
     una loma redonda que se funde sin costura, y —lo que importa para
     el coste— al anularse fuera del radio permite saltarse de golpe
     todas las filas y columnas que no la tocan, en vez de evaluar una
     exponencial en cada punto del plano. */
  relieve:      5.6,   // altura en unidades de mundo; negativo = hondonada
  relieveX:    -21,    // dónde cae, en el mundo
  relieveZ:     94,    // al fondo: rompe la línea del horizonte, que es
                       // donde la retícula se ve más regular y más canta
  relieveRadio: 31.5,  // hasta dónde llega
  relieveDeriva: 0.084,// rad/s; a 0 se queda quieta

  /* ---- Color ----
     Blanco puro. Se descartaron un gris frío y el propio `--mute`, y
     también un crema cálido: aquel entraba en el terreno del ámbar, y
     el ámbar tiene que seguir queriendo decir «esto es interactivo».
     El blanco a opacidad 0,19 no compite con `--signal` porque no es
     un color, es luz. */
  color:      '#ffffff',

  /* ---- El cursor es una luz, no un puntero ----
     La firma de la web, que en el capítulo 01 estaba sin usar. Sube el
     brillo y el tamaño del punto; NO pinta un halo encima ni tiñe de
     ámbar. Dos razones para lo del color: el blanco elegido lo era
     justamente para no competir con --signal, y en este capítulo no
     hay neón, así que un charco ámbar no tendría fuente y se leería
     como efecto de interfaz. Eso fue lo que mató a la estela de humo.

     La regla de «sobre la obra el cursor no ilumina» sale gratis: la
     máscara ya apaga la malla donde hay contenido.

     Tres cosas que hacen que se lea como luz y no como una calcomanía
     redonda pegada al puntero, que es como quedó al primer intento:

     1. Vive EN EL MUNDO, sobre el plano, no en la pantalla. El cursor
        se desproyecta al suelo y la distancia se mide allí. Por eso el
        charco sale elíptico —aplastado hacia el horizonte, ancho cerca—
        que es lo que hace una luz sobre una superficie en perspectiva.
        Un círculo en pantalla delata que es una capa encima.

     2. La caída es r²/(r²+d²) al cuadrado, la ley del inverso del
        cuadrado. Núcleo intenso y cola infinita: NO hay radio donde se
        apague, así que no hay borde que se vea.

     3. Es ADITIVA y pasa por la niebla. Una luz suma radiancia: saca
        del negro puntos que no se veían. Y si hay niebla de por medio,
        la luz llega atenuada, igual que todo lo demás. */
  luzCursor:   0.5,   // 0 lo apaga
  /* Cuánto le perdona la niebla a la luz. A 1 la atraviesa entera; a 0
     la niebla se la come igual que al resto.

     Físicamente lo correcto es 0 —esa luz también viaja hasta la
     cámara—, pero la consecuencia era pésima: la parte densa de la
     malla está lejos, así que la luz se apagaba justo en la única
     banda donde se ve algo, y el efecto no se notaba. A 0,6 la luz
     sigue perdiendo fuerza con la distancia, pero llega. */
  nieblaLuz:   0.6,
  radioLuz:    2.4,   // UNIDADES DE MUNDO, no píxeles. Con el paso a
                      // 1,45 el núcleo no llega a dos puntos de radio:
                      // se enciende un puñado, no una zona

  /* Cuánto tarda un punto en apagarse después de que la luz se vaya,
     en segundos. A 0 se apaga de golpe.

     De aquí sale la estela, y sale sola: no hay nada que dibujar
     detrás del cursor. Cada punto RECUERDA la luz que recibió y la
     va soltando; al mover el ratón, los de atrás todavía están
     bajando. Es una estela emergente, no un elemento añadido.

     Y por eso no choca con lo que el brief descartó dos veces —la
     estela de humo y la de destellos—: aquellas eran una capa pintada
     encima de una escena iluminada. Esto es la propia superficie
     tardando en apagarse, que es lo que hace un fósforo de verdad. */
  estela:      0.35,
  /* Cuándo engorda el punto: cuando la luz que recibe supera a su
     brillo propio por este factor. A 1, engorda donde la luz lo
     duplica; y al triple de eso pasa a 3 px, que es lo que da núcleo.

     Es una RAZÓN y no un brillo absoluto, y ahí está la gracia: un
     umbral absoluto solo se alcanzaba en el primer plano, donde casi
     no hay puntos, así que no engordaba ninguno. Y tampoco es un
     umbral sobre la distancia al puntero, que era el defecto original
     —eso dibuja un círculo de puntos gordos—. */
  brilloGordo: 0.9,
  /* Tope de z al desproyectar: pegado al horizonte la desproyección se
     dispara al infinito y hay que cortarla en algún sitio.

     Tiene que quedar POR ENCIMA de donde la niebla apaga la malla, o
     la luz se corta justo en la banda densa de arriba —que es donde
     más se mira— y parece que no funciona. Con niebla 0,01 y umbral
     0,015 la malla llega hasta z≈159. */
  alcanceLuz:  220,

  /* ---- Relieve bajo el cursor ----
     La superficie se levanta como una sábana con una mano debajo. En
     el MUNDO, no en la pantalla: apartar puntos en pantalla rompe el
     plano y se lee como juguete de partículas, que es lo que el
     encargo pedía evitar. Es el mismo núcleo del relieve fijo.

     El domo es ANCHO y la luz es estrecha, a propósito. Si los dos
     midieran lo mismo, el bulto y el punto brillante coincidirían y se
     leería como una burbuja pegada al puntero —el efecto de interfaz
     que llevamos toda la sesión esquivando—. Con el domo seis veces
     más ancho que la luz, lo que se ve es una loma suave con un punto
     encendido dentro: la luz se posa sobre el terreno en vez de
     arrastrarlo.

     Y tiene que superar a la onda para leerse: con la amplitud en 1,2,
     un domo de 1 se pierde entre las olas. */
  relieveCursor: 1.6, // unidades de mundo; 0 lo apaga, negativo hunde
  radioRelieveCursor: 10,

  /* ---- Cáscara adaptativa ----
     La malla coge la TEMPERATURA de la pieza seleccionada, no su
     color. Sale del campo `paleta.fondo` que ya llevan las fichas
     desde el principio y que no usaba nadie: es la sección 4 del
     brief estrenada donde menos riesgo tiene.

     El fondo de cada ficha es un negro con matiz —cálido, verdoso,
     azulado—, así que se normaliza su tono a brillo pleno antes de
     mezclarlo. Mezclar blanco con un negro solo oscurecería. */
  /* La temperatura NO la llevan los puntos: la lleva la niebla.

     Teñir los puntos fue mi primer intento y estaba mal planteado.
     Medido componiendo sobre el fondo de la página —que es lo que ve
     el ojo, no el color del punto suelto—, la diferencia entre dos
     piezas era de 0,2 niveles sobre 255, y subiendo la saturación al
     tope llegaba a 0,9. Sigue siendo invisible. La razón es de
     superficie: un campo de puntos de 1 px aporta menos de un nivel de
     luminancia al promedio, así que no hay tinta con la que pintar.

     La niebla sí tiene área. Y encima es lo coherente: la sala ya
     tiene niebla de color —0x070910—, así que teñirla por pieza es que
     el aire del sitio coja el humor de la obra que estás mirando. Los
     puntos se quedan blancos, que es lo que se eligió.

     `mezcla` sigue tiñendo los puntos, muy poco y casi por gusto. */
  neblina:    0.07,   // opacidad del velo de niebla teñida; 0 lo apaga
  altoNeblina: 0.55,  // hasta dónde baja, en fracción del lienzo
  mezcla:     0.34,   // cuánto del tono de la pieza entra; 0 lo apaga
  transicion: 1400,   // ms de cruce entre piezas
  /* Cuánto se separa el tono de su propio gris antes de mezclarlo.
     Normalizar a brillo pleno no basta: los fondos del Cottage y del
     Terminator normalizan a 242,255,201 y 255,232,209, que se
     diferencian en cuatro puntos por canal. Sobre puntos de 1 px al
     19% eso es invisible, y de las cuatro piezas solo Ekko cantaba.

     Esto exagera la CROMA sin subir la mezcla, que es la diferencia
     importante: subir la mezcla tiñe más el fondo entero; esto separa
     unas piezas de otras dejando el fondo igual de discreto. */
  saturacion: 2.4,

  /* ---- Máscara de contenido ---- */
  atenuacion: 0.65,   // cuánto queda de la malla bajo la interfaz
  margen:     150,    // px de desvanecido alrededor de cada caja

  /* ---- Sistema ---- */
  fps:        30,     // la mitad de coste que a 60 y se ve igual
  dpr:        1.25,
  deriva:     0,      // desplazamiento de cámara ligado al scroll
  /* Cuánto está presente la malla, de 0 a 1. Lo mueve la página según
     por qué capítulo vas: entera en Trabajos, apagada en los demás.
     Multiplica el brillo de los puntos y el velo de niebla a la vez,
     así que baja el efecto entero y no solo una parte. */
  intensidad: 1
};

/* Tabla de senos. Miles de llamadas a Math.sin por fotograma es
   el cuello de botella real de este efecto; una búsqueda en tabla
   con truncado entero sobra para una onda que casi no se ve. */
const TAM_SENO = 4096;
const MASCARA_SENO = TAM_SENO - 1;
const SENO = new Float32Array(TAM_SENO);
for (let i = 0; i < TAM_SENO; i++) SENO[i] = Math.sin(i / TAM_SENO * Math.PI * 2);
const K_SENO = TAM_SENO / (Math.PI * 2);
/* El `& MASCARA_SENO` sobre un índice negativo da la vuelta como
   toca, que es justo lo que se quiere de una función periódica. */
const seno = a => SENO[(a * K_SENO | 0) & MASCARA_SENO];

/* Escalones de opacidad. Cuantizar permite que `fillStyle` cambie
   un puñado de veces por fila en vez de una vez por punto. */
const ESCALONES = 14;

/* Valores que se pueden cambiar sin rehacer la retícula: no tocan
   dónde caen los puntos en el mundo, solo cómo se pintan o cuánto
   suben. Rehacerla por mover un deslizador de onda es tirar trabajo. */
const SIN_GEOMETRIA = new Set([
  'deriva', 'fps', 'relieve', 'relieveX', 'relieveZ',
  'relieveRadio', 'relieveDeriva', 'velocidad', 'velocidad2',
  'periodoX', 'periodoZ', 'luzCursor', 'radioLuz', 'brilloGordo',
  'alcanceLuz', 'relieveCursor', 'radioRelieveCursor', 'transicion',
  'estela', 'saturacion', 'neblina', 'altoNeblina'
  /* `nieblaLuz` NO va aquí: se precalcula por fila en trazarFilas, así
     que cambiarlo obliga a rehacer la retícula. */
]);

const CELDAS_X = 44;   // resolución del mapa de atenuación
const CELDAS_Y = 28;

const limitar = (v, a, b) => v < a ? a : (v > b ? b : v);

/**
 * Monta la malla sobre un lienzo.
 *
 * @param {HTMLCanvasElement} lienzo
 * @param {object} opciones      parciales de VALORES
 * @returns handle con ajustar / progreso / medir / estadisticas / destruir
 */
export function montarMalla(lienzo, opciones = {}) {
  const ctx = lienzo.getContext('2d', { alpha: true });
  if (!ctx) return nula();

  const v = Object.assign({}, VALORES, opciones);
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;          // lienzo en píxeles de dispositivo
  let cx = 0, cy = 0, f = 0; // centro óptico y distancia focal
  let filas = [];            // [{ z, escala, j0, j1, tam, base, off }]
  let puntos = 0;
  let celdas = 0;            // puntos de la retícula, para el buffer
  let carga = null;          // memoria de luz de cada punto (la estela)
  let mascara = new Float32Array(CELDAS_X * CELDAS_Y).fill(1);
  let cajas = [];            // rectángulos protegidos, en coords del documento
  let desplazamiento = 0;    // scroll con el que se horneó la máscara

  let vivo = false, corriendo = false, pedido = 0;
  let t0 = performance.now(), ultimo = 0, ms = 0, ultimoPintado = 0;
  /* Cuenta de pintados de verdad. El banco medía el ritmo de la
     página —60— y no el de la malla, que va a 30: dos números muy
     distintos y el interesante es este. */
  let pintados = 0;

  /* Cursor. En táctil no hay puntero y se queda fuera: la malla vive
     igual, solo que sin luz que la recorra. */
  let raton = { x: -9999, y: -9999, dentro: false };

  /* Tono de la pieza seleccionada. `destino` es a dónde vamos y
     `tono` dónde estamos: entre los dos se cruza despacio, porque el
     movimiento aquí tiene que ser el color cambiando y no un pulso. */
  let tono = null, destino = null, ultimoHex = null;

  /* El destino se calcula aparte porque hay que rehacerlo cuando cambia
     `saturacion`: si no, mover ese mando no haría nada hasta la
     siguiente pieza, y en el banco parecería roto. */
  function fijarDestino(hex) {
    ultimoHex = hex || null;
    if (!hex) { destino = null; tono = null; return; }
    const [r, g, b] = aRGB(hex);
    const max = Math.max(r, g, b);
    if (max < 4) { destino = [255, 255, 255]; return; }
    /* Primero a brillo pleno: interesa el matiz, no la luminosidad.
       Después se separa del gris propio, o las piezas no se
       distinguen entre sí. */
    const n = [r * 255 / max, g * 255 / max, b * 255 / max];
    const gris = (n[0] + n[1] + n[2]) / 3;
    destino = n.map(c => limitar(gris + (c - gris) * v.saturacion, 0, 255));
  }

  /* Cadenas rgba precalculadas, una por escalón. Construirlas en
     el bucle sería basura para el recolector en cada fotograma. */
  let tintas = [];
  let ultimaTinta = '';
  /* El degradado de la niebla teñida se cachea: crearlo por fotograma
     sería una asignación por frame para algo que solo cambia cuando
     cambia el tono o el tamaño del lienzo. */
  let neblina = null, firmaNeblina = '';
  function prepararTintas() {
    const base = aRGB(v.color);
    let r = base[0], g = base[1], b = base[2];
    if (tono && v.mezcla > 0) {
      r += (tono[0] - r) * v.mezcla;
      g += (tono[1] - g) * v.mezcla;
      b += (tono[2] - b) * v.mezcla;
    }
    r = r | 0; g = g | 0; b = b | 0;
    const firma = r + ',' + g + ',' + b;
    if (firma === ultimaTinta && tintas.length) return;
    ultimaTinta = firma;
    tintas = new Array(ESCALONES + 1);
    for (let i = 0; i <= ESCALONES; i++) {
      tintas[i] = `rgba(${firma},${(i / ESCALONES).toFixed(4)})`;
    }
    neblina = null;   // el velo se rehace con el tono
  }

  /* Velo de niebla teñida. Es una banda que arranca en el horizonte y
     baja desvaneciéndose, que es donde la niebla se acumula de verdad:
     hacia el fondo hay más aire entre tú y el suelo. */
  function prepararNeblina() {
    const t = tono || [255, 255, 255];
    const r = t[0] | 0, g = t[1] | 0, b = t[2] | 0;
    const firma = `${r},${g},${b},${H},${v.neblina},${v.altoNeblina},${v.horizonte}`;
    if (neblina && firma === firmaNeblina) return;
    firmaNeblina = firma;
    const hasta = Math.min(H, cy + H * v.altoNeblina);
    const gr = ctx.createLinearGradient(0, cy, 0, hasta);
    gr.addColorStop(0,    `rgba(${r},${g},${b},${v.neblina})`);
    gr.addColorStop(0.35, `rgba(${r},${g},${b},${(v.neblina * 0.55).toFixed(4)})`);
    gr.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    neblina = { gr, cy, hasta };
  }
  prepararTintas();

  /* ---- Geometría --------------------------------------------
     Se rehace solo al cambiar el tamaño o los valores, nunca por
     fotograma: la retícula en el mundo no se mueve, lo único que
     cambia con el tiempo es la altura de cada punto. */
  function construir() {
    const rect = lienzo.getBoundingClientRect();
    const dpr = v.dpr;
    W = Math.max(1, Math.round(rect.width  * dpr));
    H = Math.max(1, Math.round(rect.height * dpr));
    lienzo.width = W; lienzo.height = H;

    cx = W / 2;
    cy = H * v.horizonte;
    f  = (H / 2) / Math.tan(v.fov * Math.PI / 360);

    let paso = v.paso;
    for (let intento = 0; intento < 12; intento++) {
      const r = trazarFilas(paso);
      celdas = r.n;
      if (r.n <= v.maxPuntos) { filas = r.filas; puntos = r.n; break; }
      /* Válvula: en una pantalla enorme la cuenta se dispara. Se
         separa la retícula en vez de recortarla por detrás, que
         dejaría un corte visible a media distancia. */
      paso *= 1.12;
      filas = r.filas; puntos = r.n;
    }
    v.pasoReal = paso;
    /* Un float por punto de la retícula: 13.000 puntos son 52 KB. Se
       tira y se rehace con la geometría, así que la estela se corta al
       redimensionar; es un parpadeo que nadie ve mientras arrastra el
       borde de la ventana. */
    if (!carga || carga.length !== celdas) carga = new Float32Array(celdas);
    else carga.fill(0);
    remapearMascara();
  }

  function trazarFilas(paso) {
    const salida = [];
    let n = 0;
    /* La última fila la decide la niebla, no un número: se para
       cuando el punto ya no llegaría al umbral de visibilidad. */
    for (let z = v.zCerca, i = 0; i < 4000; z += paso, i++) {
      const nieb = Math.exp(-((z * v.niebla) ** 2));
      const base = v.opacidad * nieb;
      if (base < v.umbral && i > 2) break;

      const escala = f / z;
      /* Anchura del mundo que cubre la pantalla a esta profundidad,
         con un margen para que la onda no destape los bordes. */
      const xMax = (W / 2 + escala * v.amplitud * 2) / escala + paso;
      const j0 = Math.ceil(-xMax / paso);
      const j1 = Math.floor(xMax / paso);
      const cuenta = j1 - j0 + 1;
      if (cuenta <= 0) continue;

      /* La niebla que se le aplica a la LUZ se guarda aparte y suavizada
         con un exponente: la luz la atraviesa mejor que el brillo de
         reposo. Se calcula aquí, una vez por fila, y no por punto. */
      const nieblaLuz = Math.pow(nieb, 1 - v.nieblaLuz);
      /* `off` es dónde empieza esta fila dentro del buffer de carga de
         la estela. Cada punto de la retícula necesita su casilla para
         acordarse de la luz que le tocó. */
      salida.push({ z, escala, j0, j1, base, nieblaLuz, off: n, tam: z < v.zGrueso ? 2 : 1 });
      n += cuenta;
      if (n > v.maxPuntos * 4) break;   // corte duro de emergencia
    }
    return { filas: salida, n };
  }

  /* ---- Máscara de contenido ---------------------------------
     Se hornea una sola vez por cambio de tamaño, no por fotograma.
     Leer las cajas del DOM en cada frame es caro y frágil; el
     resultado que se ve es el mismo, porque la interfaz no se
     mueve mientras miras. */
  /* Las cajas se guardan en coordenadas del DOCUMENTO, no de la
     ventana. El lienzo va fijo y el contenido pasa por delante: si se
     guardaran relativas a la ventana, la máscara dejaría de coincidir
     con la interfaz en cuanto scrolleas un píxel.

     Medir el DOM es lo caro —fuerza maquetación—, así que se hace una
     vez; lo que se mueve con el scroll es solo el desplazamiento, que
     lo pasa la página con `desplazar()`. */
  function medir(elementos) {
    const desliz = scrollY;
    cajas = [];
    for (const el of elementos || []) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      cajas.push({
        x0: r.left, y0: r.top + desliz,
        x1: r.right, y1: r.bottom + desliz
      });
    }
    remapearMascara();
  }

  function remapearMascara() {
    mascara.fill(1);
    if (!cajas.length || v.atenuacion >= 1) return;
    const rect = lienzo.getBoundingClientRect();
    const anchoCelda = rect.width  / CELDAS_X;
    const altoCelda  = rect.height / CELDAS_Y;

    for (let cyi = 0; cyi < CELDAS_Y; cyi++) {
      /* Las cajas están en coordenadas del documento y el lienzo va
         fijo, así que la celda se lleva al documento sumando el
         desplazamiento del scroll. */
      const py = (cyi + 0.5) * altoCelda + desplazamiento;
      for (let cxi = 0; cxi < CELDAS_X; cxi++) {
        const px = (cxi + 0.5) * anchoCelda;
        let m = 1;
        for (const c of cajas) {
          const dx = px < c.x0 ? c.x0 - px : (px > c.x1 ? px - c.x1 : 0);
          const dy = py < c.y0 ? c.y0 - py : (py > c.y1 ? py - c.y1 : 0);
          const d = Math.sqrt(dx * dx + dy * dy);
          const k = limitar(d / v.margen, 0, 1);
          /* Curva suave: un desvanecido lineal deja un borde
             visible justo donde más se mira. */
          const suave = k * k * (3 - 2 * k);
          m = Math.min(m, v.atenuacion + (1 - v.atenuacion) * suave);
        }
        mascara[cyi * CELDAS_X + cxi] = m;
      }
    }
  }

  /* ---- Pintado ---------------------------------------------- */
  function pintar(ahora) {
    const arranque = performance.now();
    const t = (ahora - t0) / 1000;
    const dt = Math.min(0.2, (ahora - (ultimoPintado || ahora)) / 1000);
    ultimoPintado = ahora;

    /* Cruce de temperatura. Exponencial y no lineal: arranca y frena
       solo, y da igual a qué ritmo se pinte. */
    if (destino) {
      if (!tono) tono = destino.slice();
      else {
        const k = 1 - Math.exp(-dt * 4000 / Math.max(1, v.transicion));
        for (let i = 0; i < 3; i++) tono[i] += (destino[i] - tono[i]) * k;
      }
      prepararTintas();
    }

    ctx.clearRect(0, 0, W, H);

    /* La niebla teñida va DEBAJO de los puntos: es aire entre tú y el
       suelo, no un filtro puesto encima de la malla. */
    const inten = limitar(v.intensidad, 0, 1);
    if (inten <= 0.004) { pintados++; puntos = 0; ms = performance.now() - arranque; return; }

    if (v.neblina > 0 && tono) {
      prepararNeblina();
      /* La intensidad se aplica con `globalAlpha` y no rehaciendo el
         degradado: cambia en cada fotograma con el scroll, y crear un
         degradado por frame es una asignación por frame para nada. */
      ctx.globalAlpha = inten;
      ctx.fillStyle = neblina.gr;
      ctx.fillRect(0, neblina.cy, W, neblina.hasta - neblina.cy);
      ctx.globalAlpha = 1;
    }

    const kx1 = (Math.PI * 2) / v.periodoX;
    const kz1 = (Math.PI * 2) / v.periodoZ;
    const kx2 = (Math.PI * 2) / (v.periodoX * 1.7);
    const kz2 = (Math.PI * 2) / (v.periodoZ * 0.62);
    const fase1 = t * v.velocidad;
    const fase2 = t * v.velocidad2;
    const amp = v.amplitud * 0.5;
    const alturaOjo = v.alturaOjo;
    const paso = v.pasoReal || v.paso;
    const escX = CELDAS_X / W, escY = CELDAS_Y / H;

    /* Relieve: el centro puede pasear muy despacio para que la loma no
       quede clavada siempre en el mismo sitio. A deriva 0 no se mueve. */
    const hayRelieve = v.relieve !== 0 && v.relieveRadio > 0;
    const rDer = t * v.relieveDeriva;
    const rlx = v.relieveX + (hayRelieve ? seno(rDer) * v.relieveRadio * 0.8 : 0);
    const rlz = v.relieveZ + (hayRelieve ? seno(rDer * 0.61 + 1.7) * v.relieveRadio * 0.5 : 0);
    const R2 = v.relieveRadio * v.relieveRadio;

    /* El cursor, desproyectado sobre el plano. Una sola vez por
       fotograma y sirve para la luz y para el domo: las dos viven en
       el mundo, que es lo que hace que se lean como parte de la escena
       y no como algo pintado por encima del lienzo.

       Si el puntero cae por encima del horizonte no corta el suelo en
       ninguna parte, así que no hay ni luz ni relieve. */
    /* Altura de la superficie en un punto del mundo: la onda más la
       loma fija. El domo del cursor NO entra aquí, o se realimentaría
       consigo mismo. */
    const altura = (x, zm) => {
      let w = amp * (seno(kx1 * x + kz1 * zm + fase1) +
                     seno(kx2 * x - kz2 * zm + fase2));
      if (hayRelieve) {
        const dx = x - rlx, dz = zm - rlz;
        const q = 1 - (dx * dx + dz * dz) / R2;
        if (q > 0) w += v.relieve * q * q;
      }
      return w;
    };

    let cursorX = 0, cursorZ = 0, sobreSuelo = false;
    if (raton.dentro) {
      const dy = raton.y - cy;
      if (dy > 1) {
        /* Desproyectar sobre el plano LLANO da un punto equivocado: la
           superficie está ondulada, así que el suelo que ves bajo el
           puntero no está a la altura del plano, y el error crece con
           la amplitud de la onda. Se corrige en dos pasadas —evaluar
           la altura ahí y volver a desproyectar—, que es lo que hace
           que la luz y el domo caigan DONDE APUNTAS y no separados de
           tu cursor. */
        let escalaC = dy / alturaOjo;
        for (let i = 0; i < 2; i++) {
          cursorZ = f / escalaC - v.deriva;
          cursorX = (raton.x - cx) / escalaC;
          if (cursorZ <= 0) break;
          const h = altura(cursorX, cursorZ);
          const denom = alturaOjo - h;
          if (denom < 0.4) break;
          escalaC = dy / denom;
        }
        sobreSuelo = cursorZ > 0 && cursorZ < v.alcanceLuz;
      }
    }
    const hayLuz  = sobreSuelo && v.luzCursor > 0 && v.radioLuz > 0;
    /* El descuento por fotograma sale del tiempo transcurrido, no del
       número de fotogramas: así la estela dura lo mismo a 30 que a 60,
       y no se alarga cuando el navegador estrangula el ritmo. */
    const hayEstela = v.estela > 0 && carga && carga.length === celdas;
    const desc = hayEstela ? Math.exp(-dt / v.estela) : 0;
    const hayDomo = sobreSuelo && v.relieveCursor !== 0 && v.radioRelieveCursor > 0;
    const RL2 = v.radioLuz * v.radioLuz;
    const RC2 = v.radioRelieveCursor * v.radioRelieveCursor;

    let tintaActual = -1;
    let dibujados = 0;

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      /* La deriva del scroll mueve la cámara, no los puntos: por
         eso se suma a la z y la perspectiva reacciona entera. */
      const z = fila.z + v.deriva;
      if (z <= 0.5) continue;
      const escala = f / z;
      const base = fila.base;
      const nieblaLuz = fila.nieblaLuz;
      const tam = fila.tam;

      /* Lo que solo depende de la fila, fuera del bucle interior. */
      const ph1 = kz1 * z + fase1;
      const ph2 = -kz2 * z + fase2;

      /* Franja de x donde la loma tiene algo que decir en esta fila.
         Fuera de ella no se evalúa: es la ventaja de un núcleo con
         soporte compacto frente a una gaussiana.

         Ojo, se compara contra `fila.z` y no contra `z`: la loma está
         clavada en el mundo y `z` lleva sumada la deriva de la cámara.
         Con `z` la loma viajaría con el scroll en vez de quedarse. */
      const dz = fila.z - rlz;
      const dz2 = dz * dz;
      const tocaFila = hayRelieve && dz2 < R2;
      let xIni = 0, xFin = -1;
      if (tocaFila) {
        const medio = Math.sqrt(R2 - dz2);
        xIni = rlx - medio; xFin = rlx + medio;
      }

      /* Lo mismo para el domo del cursor: soporte compacto, así que
         las filas que no lo tocan ni se enteran. */
      const dzc = fila.z - cursorZ;
      const dzc2 = dzc * dzc;
      const tocaCursor = hayDomo && dzc2 < RC2;
      let cIni = 0, cFin = -1;
      if (tocaCursor) {
        const medio = Math.sqrt(RC2 - dzc2);
        cIni = cursorX - medio; cFin = cursorX + medio;
      }

      for (let j = fila.j0; j <= fila.j1; j++) {
        const x = j * paso;
        let w = amp * (seno(kx1 * x + ph1) + seno(kx2 * x + ph2));

        if (tocaFila && x > xIni && x < xFin) {
          const dx = x - rlx;
          const q = 1 - (dz2 + dx * dx) / R2;
          w += v.relieve * q * q;
        }
        if (tocaCursor && x > cIni && x < cFin) {
          const dx = x - cursorX;
          const q = 1 - (dzc2 + dx * dx) / RC2;
          w += v.relieveCursor * q * q;
        }

        const sx = cx + escala * x;
        if (sx < -4 || sx > W + 4) continue;
        const sy = cy + escala * (alturaOjo - w);
        if (sy < -4 || sy > H + 4) continue;

        const celda = ((sy * escY) | 0) * CELDAS_X + ((sx * escX) | 0);
        const velo = (mascara[celda] || 0) * inten;
        let a = base * velo;

        /* La luz, medida sobre el suelo y no sobre la pantalla. Suma
           en vez de multiplicar: una lámpara saca del negro lo que no
           se veía, no solo realza lo que ya brillaba. Pasa por la
           niebla —`nieb`— porque la luz también la atraviesa, y por la
           máscara, y de ahí sale gratis la regla de que sobre la obra
           el cursor deja de iluminar. */
        let tamPunto = tam;
        let luzAqui = 0;
        if (hayLuz) {
          const dxl = x - cursorX, dzl = fila.z - cursorZ;
          const caida = RL2 / (RL2 + dxl * dxl + dzl * dzl);
          luzAqui = v.luzCursor * caida * caida * nieblaLuz * velo;
        }

        /* La estela. Subida instantánea y bajada exponencial: el punto
           se enciende de golpe cuando le llega la luz y luego la va
           soltando. Moviendo el ratón, los de atrás siguen bajando y la
           estela aparece sin dibujar nada detrás del cursor.

           El descuento se hace SIEMPRE, haya luz o no; si solo se
           hiciera cuando el puntero está dentro, al salirse del lienzo
           la estela se quedaría congelada encendida. */
        if (hayEstela) {
          const idx = fila.off + (j - fila.j0);
          let c = carga[idx] * desc;
          if (luzAqui > c) c = luzAqui;
          carga[idx] = c < 0.0004 ? 0 : c;
          luzAqui = c;
        }

        if (luzAqui > 0) {
          a += luzAqui;
          /* El punto engorda cuando la luz LE GANA a su brillo propio.
             Comparar contra el brillo del punto sin luz hace que el
             efecto funcione igual de cerca que de lejos, en vez de solo
             en el primer plano. */
          const propio = base * velo;
          if (luzAqui > propio * v.brilloGordo) {
            tamPunto = tam + (luzAqui > propio * v.brilloGordo * 3 ? 2 : 1);
          }
        }
        /* Por debajo del umbral NO se desvanece: se deja de pintar.
           Un punto a opacidad 0,004 sobre un negro casi puro no se
           lee como punto, se lee como suciedad en bloques en cuanto
           el panel es de 8 bits. */
        if (a < v.umbral) continue;

        const nivel = (a / v.opacidad * ESCALONES + 0.5) | 0;
        if (nivel !== tintaActual) {
          tintaActual = nivel;
          ctx.fillStyle = tintas[nivel > ESCALONES ? ESCALONES : nivel];
        }
        ctx.fillRect(sx | 0, sy | 0, tamPunto, tamPunto);
        dibujados++;
      }
    }

    puntos = dibujados;
    pintados++;
    ms = performance.now() - arranque;
  }

  /* ---- Bucle -------------------------------------------------
     A 30 fps por defecto. La animación que pide el encargo es casi
     imperceptible: a 60 se ve exactamente igual y cuesta el doble. */
  function marco(ahora) {
    if (!corriendo) return;
    pedido = requestAnimationFrame(marco);
    const intervalo = 1000 / v.fps;
    if (ahora - ultimo < intervalo - 1) return;
    ultimo = ahora;
    pintar(ahora);
  }

  function arrancar() {
    if (corriendo || !vivo) return;
    /* Con movimiento reducido la profundidad se queda y el
       movimiento se va: un fotograma fijo, no un fondo vacío. */
    if (reducido) { pintar(performance.now()); return; }
    corriendo = true;
    ultimo = 0;
    pedido = requestAnimationFrame(marco);
  }

  function parar() {
    corriendo = false;
    if (pedido) cancelAnimationFrame(pedido);
    pedido = 0;
  }

  /* El puntero, en píxeles del lienzo. `pointermove` en la ventana y
     no en el lienzo porque el lienzo está debajo de toda la interfaz
     y nunca recibiría el evento. */
  function alMover(e) {
    const r = lienzo.getBoundingClientRect();
    raton.x = (e.clientX - r.left) * v.dpr;
    raton.y = (e.clientY - r.top) * v.dpr;
    raton.dentro = e.pointerType !== 'touch' &&
                   e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
  }
  function alSalir() { raton.dentro = false; }
  addEventListener('pointermove', alMover, { passive: true });
  addEventListener('pointerleave', alSalir, { passive: true });

  /* Se deja de dibujar en cuanto la sección sale de pantalla,
     misma regla que la sala. */
  const centinela = new IntersectionObserver(es => {
    vivo = es[0].isIntersecting;
    vivo ? arrancar() : parar();
  }, { rootMargin: '120px' });
  centinela.observe(lienzo);

  /* EL OBSERVADOR COMPRUEBA QUE LA CAJA HAYA CAMBIADO DE VERDAD
     *(13 sep 2026)*. `construir()` no es barato ni inocuo: reasigna
     `canvas.width/height` —que borra el lienzo— y tira el buffer de la
     estela, así que llamarlo de más se ve. Y el `ResizeObserver` avisa
     por cosas que no cambian un píxel del lienzo: un cambio de
     maquetación alrededor, o —el caso que lo destapó— el plegado de la
     barra de direcciones de un iPhone al scrollear. El alto ya se
     sostiene con `100lvh` en `base.css`; esta guardia es la red para
     donde `lvh` no llegue, y de paso deja gratis cualquier aviso que no
     traiga tamaño nuevo.

     Se compara contra `W`/`H` con la MISMA cuenta que hace
     `construir()`, no contra la caja en px CSS: lo que importa es si el
     lienzo va a medir otra cosa. Y la guardia va aquí y NO dentro de
     `construir()`, porque `ajustar()` también lo llama para rehacer la
     retícula cuando cambia un valor y ahí el tamaño no se mueve. */
  const observador = new ResizeObserver(() => {
    const r = lienzo.getBoundingClientRect();
    if (Math.max(1, Math.round(r.width  * v.dpr)) === W &&
        Math.max(1, Math.round(r.height * v.dpr)) === H) return;
    construir();
    if (reducido) pintar(performance.now());
  });
  observador.observe(lienzo);

  construir();
  vivo = true;
  arrancar();

  return {
    /** Cambia valores en caliente. Rehace la geometría si hace falta. */
    ajustar(parciales) {
      let geometria = false, tinta = false;
      for (const k in parciales) {
        if (v[k] === parciales[k]) continue;
        if (k === 'saturacion') { fijarDestino(ultimoHex); tinta = true; }
        else if (k === 'color' || k === 'mezcla') tinta = true;
        else if (!SIN_GEOMETRIA.has(k)) geometria = true;
        v[k] = parciales[k];
      }
      if (tinta) prepararTintas();
      if (geometria) construir();
      if (reducido || !corriendo) pintar(performance.now());
    },
    /** Desplazamiento de cámara ligado al scroll, en unidades de mundo. */
    progreso(unidades) { v.deriva = unidades; },

    /** Cuánto está presente la malla, de 0 a 1. A 0 no se dibuja nada. */
    presencia(x) { v.intensidad = limitar(x, 0, 1); },

    /**
     * Scroll de la página, para que la máscara siga a la interfaz.
     * El lienzo va fijo y el contenido pasa por delante, así que las
     * cajas se guardan en coordenadas del documento y aquí solo se
     * dice cuánto se ha movido. La máscara se rehornea solo cuando el
     * desplazamiento cambia de verdad: quieto no cuesta nada.
     */
    desplazar(y) {
      if (Math.abs(y - desplazamiento) < 4) return;
      desplazamiento = y;
      remapearMascara();
    },

    /**
     * Temperatura de la pieza que se está mirando. Se le pasa el
     * `paleta.fondo` de la ficha tal cual.
     *
     * El tono se normaliza a brillo pleno antes de guardarlo: esos
     * fondos son negros con matiz —#0B0A09 cálido, #12130F verdoso,
     * #0A0F12 azulado— y mezclar blanco con un negro solo oscurece.
     * Lo que se quiere es el MATIZ, no la luminosidad.
     */
    tema(hex) {
      fijarDestino(hex);
      if (!destino) { prepararTintas(); return; }
      if (!corriendo) { tono = destino.slice(); prepararTintas(); pintar(performance.now()); }
    },
    /** Rehornea el mapa de atenuación a partir de elementos del DOM. */
    medir,
    valores() { return Object.assign({}, v); },
    estadisticas() { return { puntos, ms, pintados, fps: v.fps, paso: v.pasoReal || v.paso, filas: filas.length }; },
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

function nula() {
  const no = () => {};
  return { ajustar: no, progreso: no, medir: no, destruir: no,
           valores: () => ({}), estadisticas: () => ({ puntos: 0, ms: 0 }) };
}

function aRGB(hex) {
  const s = hex.replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/./g, c => c + c) : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
