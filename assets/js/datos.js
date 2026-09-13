/* =========================================================
   MODELO DE DATOS
   Cada proyecto es una ficha, no maquetación a mano. Añadir
   un proyecto es rellenar un objeto de esta lista.

   Los campos técnicos que Israel todavía no ha dado van a
   null a propósito: la interfaz los oculta. NO se inventan
   cifras de tris ni de mapas — un lead los lee en serio.
   ========================================================= */

/* Listado de programas de "Sobre mí". Es una lista declarada, no
   agregada desde las fichas: hay herramientas que se usan en todos
   los proyectos sin ser el software de modelado —Photoshop, Claude—
   y otras que están en el arsenal aunque todavía no aparezcan en
   ninguna pieza publicada. Deducirlo de las fichas las dejaba fuera.

   El `software` de cada proyecto sigue siendo suyo y es lo que irá
   en su ficha técnica; esta lista es otra cosa.

   Etiquetas descriptivas, nunca autoevaluación tipo "experto". */
/* Cada programa puede llevar `icono` (26 ago 2026). Se dibuja con máscara
   CSS, no como imagen: el archivo aporta la silueta y el color lo pone la
   paleta. Por eso da igual de qué color venga el original —los SVG de Maya
   y V-Ray son de trazo negro y se verían sobre el fondo igualmente— y por
   eso la sección 4 se sostiene: no entran doce colores de marca nuevos.

   El requisito NO es que sea SVG, es que tenga FONDO TRANSPARENTE. Un
   icono de aplicación con su baldosa opaca enmascara como un cuadrado
   sólido y no sirve.

   `icono: null` significa "todavía no hay archivo válido", y la entrada se
   pinta solo con su nombre. XGen es null permanente: no es un producto,
   es un conjunto de herramientas dentro de Maya y no tiene logo propio. */
export const SOFTWARE = [
  { titulo:'Core', programas:[
    { nombre:'Maya',              icono:'assets/iconos/maya.svg' },
    { nombre:'Substance Painter', icono:'assets/iconos/substance-painter.png' },
    { nombre:'Arnold',            icono:'assets/iconos/arnold.png' }
  ]},
  { titulo:'Regular', programas:[
    { nombre:'V-Ray',              icono:'assets/iconos/v-ray.svg' },
    { nombre:'SpeedTree',          icono:'assets/iconos/speedtree.png' },
    { nombre:'Marvelous Designer', icono:'assets/iconos/marvelous-designer.png' },
    { nombre:'Claude',             icono:'assets/iconos/claude.png' },
    { nombre:'ChatGPT',            icono:'assets/iconos/chatgpt.png' },
    { nombre:'Photoshop',          icono:'assets/iconos/photoshop.png' }
  ]},
  { titulo:'Supporting', programas:[
    { nombre:'ZBrush',         icono:'assets/iconos/zbrush.png' },
    { nombre:'XGen',           icono:null },
    /* EmberGen es el único que entra sabiendo que no cumple (26 ago 2026).
       Su PNG es el icono de aplicación entero: la baldosa y la mariposa son
       igual de opacas, y lo que las separa es el color, que la máscara
       tira. Sale como una gota rellena, sin dibujo dentro. Se monta igual
       por decisión de Israel —no aparece la marca suelta por ninguna
       parte— y se cambia en cuanto exista. */
    { nombre:'EmberGen',       icono:'assets/iconos/embergen.png' },
    /* LiquiGen es el SEGUNDO que entra sabiendo que no cumple (8 sep 2026),
       y es el mismo defecto que su hermano EmberGen: el alfa es una silueta
       RELLENA. Todo el dibujo -el degradado cian que lo hace leer como
       liquido- es color, y la mascara lo tira.

       Se penso que aqui la silueta salvaba el caso, porque una gota se
       reconoce como gota. NO ES ASI, y se vio pintando los dos iconos
       ampliados y tenidos de `--mute`, que es como los ve la mascara: lo
       que queda es un CIRCULO con dos puntos al lado. No una gota.

       Y va justo detras de EmberGen en la misma linea, asi que el problema
       no se suma, se multiplica: dos manchas grises casi iguales seguidas
       se leen como un icono repetido. Entra igual por decision de Israel,
       como entro EmberGen. La salida barata, si algun dia molesta, es
       `icono:null` como XGen -el nombre solo, sin mancha-. */
    { nombre:'LiquiGen',       icono:'assets/iconos/liquigen.png' },
    { nombre:'Unreal Engine',  icono:'assets/iconos/unreal-engine.png' }
  ]}
];

export const PROYECTOS = [
  {
    id: 'spring-cottage',
    titulo: 'Spring Cottage',
    anio: 2025,
    mes: 6,
    categorias: ['entorno'],
    rol: 'Solo project',
    equipo: false,
    credito: null,

    software: ['Maya','Substance Painter','Arnold','SpeedTree'],
    tris: null,
    texturas: null,
    materiales: null,
    trimSheet: null,

    /* Verde bosque (26 ago 2026). El `#12130F` de antes era un negro
       con un punto de verde tan leve que, al teñir con él la niebla del
       fondo del capítulo 01, no se distinguía del Terminator: 1,5
       niveles de diferencia percibida sobre 255. Elegido por Israel
       mirando el efecto, no muestreado del render. */
    paleta: { fondo:'#152A14', texto:'#F3F5E9', acento:'#FF8A2B' },

    /* EL MASTER PASA A SER EL DE 4K (7 sep 2026) —2158 × 3840—, el
       mismo render reexportado. El de antes tenía 1214 × 2160 y de él
       salía un derivado de 682 × 1214 que la portada a sangre ampliaba
       3,75 veces en una ventana de 2560: se veía pixelada, y así lo
       vio Israel.

       Ahora el archivo grande es de 1600 × 2847 —1,6× en esa misma
       ventana, y el nombre lleva el lado largo, que es como los
       nombra `derivados.ps1`—. No se saca a tamaño completo porque
       ESTE ARCHIVO TAMBIÉN ES LA TARJETA DEL CARRUSEL y se descarga en
       la home: 866 KB contra los 1,5 MB del master entero.

       Y es uno solo para las dos cosas a propósito: el despegue de la
       tarjeta acaba entregándole la pantalla a esta misma portada, así
       que si fueran dos archivos el de destino llegaría sin descargar
       justo en ese fotograma. Ver la sección 5 del brief. */
    hero: {
      web:  'assets/web/cottage-hero-2847.webp',
      chico:'assets/web/cottage-hero-700.webp',
      /* LOS ANCHOS REALES, no el lado largo (10 sep 2026). Este campo va
         tal cual al descriptor `w` de dos `srcset` —la portada a sangre
         y la banda de "siguiente proyecto"—, así que es una promesa
         sobre el ANCHO del archivo. Decía [700, 2847], que es el lado
         largo: le prometía al navegador 1.247 px que este archivo no
         tiene, y sobre todo hacía pasar por 700 uno que solo da 393. En
         una pantalla de doble densidad eso basta para que se quede con
         el pequeño y lo amplíe 1,75 veces.

         El dato correcto llevaba desde el 3 sep escrito aquí al lado, en
         `cuadrado`: en un vertical las dos cosas coinciden, porque el
         recorte cuadrado se agota justo por el ancho.

         Solo lo padecía el Cottage. El Terminator es apaisado, así que
         su lado largo ES su ancho, y las otras dos tienen masters
         cuadrados. */
      anchos: [393, 1600],
      /* Lo que da cada archivo AL RECORTARLO A CUADRADO, que es lo que
         hace la tarjeta del carrusel. No es lo mismo que `anchos`: aquel
         es el lado LARGO —lo que mide `derivados.ps1` y lo que dice el
         nombre del fichero—, y un recorte cuadrado se agota por el lado
         CORTO. Aquí son 393 × 700 y 1600 × 2847, así que la tarjeta
         dispone de 393 y 1600 px, no de 700 y 2847.
         Ver `hero.cuadrado` en la sección 6 del brief. */
      cuadrado: [393, 1600],
      alt:  'Spring Cottage: an ivy-covered stone house at the end of a flagstone path',
      encuadre: '9 / 16',
      /* 9:16 recortado a cuadrado deja fuera casi la mitad de la
         altura. Pegado arriba entra la casa entera —chimenea, hiedra
         y puerta— y las primeras losas del camino. Centrado le cortaba
         la chimenea y sobraba camino. El render completo, con el camino
         de arriba abajo, vive en la página del proyecto. */
      foco: '50% 6%'
    },
    /* La galería de la página de proyecto (27 ago 2026). El render de
       noche y el segundo plano de la escena, que llevaban en masters
       desde el 25 de agosto sin usarse porque no había página donde
       ponerlos. Mismo formato que `hero`: el navegador elige archivo con
       el `srcset` y `anchos` dice lo que mide cada uno de verdad.

       El de noche SALE DEL MASTER DE 4K desde el 8 sep 2026, igual que
       el de día: 2158 × 3840, a 2847 de lado largo, que son 1600 de
       ancho. Antes venía de un master de 1214 × 2160 y daba 787 px, y
       la ranura de la galería mide 1180 —el navegador lo ampliaba 1,5
       veces—. Con el de día abriendo la lista a 1600, la diferencia se
       veía en el salto de una imagen a la siguiente.

       (Ese 787 ya era el segundo intento: hasta el 7 sep 2026 salía a
       682 × 1214, y no por la regla de no ampliar sino porque el tope
       de `derivados.ps1` se medía por el ancho del master en vez de por
       su lado largo. Ver el script.) */
    galeria: [
      /* EL RENDER DE DÍA ABRE LA GALERÍA *(7 sep 2026, lo pidió Israel)*,
         y son los mismos dos archivos que la portada. No es un descuido
         ni una duplicación: la portada va a sangre, o sea que recorta el
         9:16 a la forma de la ventana y en una apaisada se queda con una
         franja del centro. Aquí se ve ENTERO, con el camino de losas de
         arriba abajo — que es justo lo que la nota del `foco` decía que
         vivía en la página del proyecto y hasta hoy no estaba.

         Y no cuesta un byte: el navegador ya tiene ese archivo de la
         portada, así que la galería lo saca de la caché. */
      /* Los dos verticales declaran sus ANCHOS REALES, no el lado largo:
         393 y 1600. Ver la nota de `hero.anchos` más arriba. El segundo
         plano es cuadrado, así que ahí las dos medidas coinciden. */
      { web:'assets/web/cottage-hero-2847.webp',    chico:'assets/web/cottage-hero-700.webp',
        anchos:[393,1600], grande:{ web:'assets/web/cottage-hero-2847.webp', ancho:1600 },
        alt:'Spring Cottage by day, the full render: the ivy-covered stone house at the end of the flagstone path, with the garden in the foreground' },
      { web:'assets/web/cottage-noche-2847.webp',   chico:'assets/web/cottage-noche-700.webp',
        anchos:[393,1600], grande:{ web:'assets/web/cottage-noche-2847.webp', ancho:1600 },
        alt:'Spring Cottage at night: the house lit from within, the garden in half-light' },
      { web:'assets/web/cottage-segundo-1400.webp', chico:'assets/web/cottage-segundo-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/cottage-segundo-2560.webp', ancho:2560 },
        alt:'A second angle on the scene: the garden and the path seen from the other side' }
    ],
    video: null,

    /* Las sillas del jardín, con los cuatro pases. Comprobado que encajan
       al píxel: sobre el master de 4096, la caja del alfa de beauty,
       normales y checker es idéntica, y el wireframe se sale 6 px por
       abajo porque su trazo monta sobre el borde de la silueta. A los 900
       px a los que se ven, eso es píxel y medio. */
    assets: [
      { nombre:'Garden chairs', encuadre:'1400 / 1400',
        cifras:{ tris:'6.5K', sets:1, resolucion:'2048 × 2048' },
        pases:{ beauty:'assets/web/sillas-beauty-1400.webp', wireframe:'assets/web/sillas-wireframe-900.webp', normal:'assets/web/sillas-normal-900.webp', checker:'assets/web/sillas-checker-900.webp' } }
    ],
    heroProvisional: false
  },

  {
    id: 'terminator',
    titulo: 'Terminator · Future War',
    /* La pieza por la que se abre el carrusel (26 ago 2026). Es una
       marca en la ficha y no un número en el JS: así reordenar el mazo
       —o meter la quinta pieza— no obliga a tocar código. Solo una
       ficha debería llevarla; si no la lleva ninguna, se abre por la
       primera. */
    portada: true,
    anio: 2026,
    mes: 6,
    categorias: ['entorno','props'],

    /* Proyecto en equipo. El T-800 NO es suyo. El crédito va
       visible, sin letra pequeña — y por eso `rol` es campo fijo
       en todos los proyectos: si solo apareciera aquí, parecería
       una excusa puesta donde hacía falta. */
    rol: 'Rifle, skulls, debris, explosion and environment assets',
    equipo: true,
    /* El T-800 lo modeló el equipo en conjunto, no una persona *(27 ago
       2026, dato de Israel)*. Antes decía "un compañero de equipo,
       pendiente de nombre", que era doblemente falso: ni fue uno solo ni
       había un nombre que buscar. Y eso cierra el pendiente que había en
       la sección 8 para dar con él. */
    credito: 'T-800 robot modelled collectively by the project team.',

    /* EmberGen entra el 27 ago 2026, dicho por Israel. Es el primer dato
       de software CONFIRMADO de esta pieza —el resto de la lista sigue
       siendo una suposición razonable, ver la sección 8— y además encaja
       con lo que dice `rol`: la explosión es suya, y EmberGen es
       precisamente con lo que se hace una explosión. */
    software: ['Maya','Substance Painter','Arnold','ZBrush','EmberGen'],
    tris: null,
    texturas: null,
    materiales: null,
    trimSheet: null,

    paleta: { fondo:'#0B0A09', texto:'#F3F1EC', acento:'#FF8A2B' },

    /* `encuadre` es la proporción del marco en la página de proyecto;
       `foco` es otra cosa y sirve al carrusel, que recorta TODAS las
       piezas a cuadrado. Va tal cual a `object-position`.

       Portada nueva (26 ago 2026): un encuadre cerrado sobre el T-800,
       en lugar del plano ancho de 21:10 que había antes. Con él decae
       la razón del `foco: '0% 50%'` anterior: aquel master era ancho y
       llevaba el rótulo "TERMINATOR 2 · JUDGMENT DAY" abajo a la
       derecha, así que un cuadrado centrado lo partía a mitad de
       palabra. Este solo mide 1392 de ancho por 1061 de alto, y el
       cuadrado centrado —de 165 a 1226— se traga el rótulo entero y
       deja la cabeza del robot en su sitio.

       Ojo con lo que esto cambia: el plano anterior enseñaba la
       explosión, el rifle y la chatarra, que es exactamente lo suyo.
       Este lo preside el T-800, que NO es suyo. El crédito bajo la
       pieza pasa de ser una nota a ser imprescindible. */
    hero: {
      web:  'assets/web/terminator-hero-1392.webp',
      chico:'assets/web/terminator-hero-700.webp',
      anchos: [700, 1392],
      /* El recorte cuadrado del carrusel se agota por el lado corto, que
         aquí es el ALTO: los archivos son 700 × 534 y 1392 × 1061. Ver
         `hero.cuadrado` en el Cottage y en la sección 6 del brief. */
      cuadrado: [534, 1061],
      alt:  'Future War cover shot: the T-800 in the foreground with an explosion and the M_25 rifle to its left',
      encuadre: '21 / 16',
      foco: '50% 50%',

      /* El anclaje del recorte de la PORTADA a sangre (27 ago 2026), que
         es otra cosa que `foco` y que `encuadre` — los tres dicen algo
         distinto sobre la misma imagen y el porqué está en proyecto.js.

         Va al 0% de altura, no al centro, y esto NO es un valor por
         defecto disfrazado: la portada recorta con la forma de la
         ventana, así que en un portátil apaisado se come un buen trozo
         de vertical. Anclando arriba, lo que se pierde sale SIEMPRE de
         abajo — que es donde está el rótulo "TERMINATOR 2 · JUDGMENT
         DAY" quemado en el master, lo que la sección 8 del brief lleva
         señalando como el defecto de esta imagen. Y la cabeza del
         T-800, que es lo que preside el plano, no se toca nunca.

         Al centro se comía la cabeza. Que no lo "corrija" nadie. */
      anclaje: '50% 0%',

      /* El clip de la tarjeta del carrusel. Se reproduce cuando la pieza
         llega al centro y se retira sola al salir; una ficha sin `clip`
         se queda con su miniatura y no hay que escribir ningún caso
         especial para ella.

         NO es lo mismo que `video`, que está más abajo: aquel es el corto
         entero, 19 MB y 30 s, y va a la galería de la página de proyecto.
         Este pesa 857 KB, dura 4,3 s, suena en bucle y existe solo para
         la tarjeta.

         Sale de `clip-explosion.mp4` en la carpeta de masters, recortado
         a cuadrado sobre el área útil del original —que trae barras
         negras quemadas: los 1920×1080 son en realidad 1920×908 a partir
         de y=86—. La receta exacta, y por qué el cuadrado empieza en
         x=560 y no en el centro, están en `derivados.ps1`.

         Va cuadrado y no en tira ancha porque la tarjeta es cuadrada:
         así llena el bloque como la miniatura y no se amplía ni un
         píxel. */
      clip: 'assets/video/terminator-tarjeta-800.mp4'
    },
    /* Los renders de dos de sus assets (13 sep 2026), DEBAJO del corto —el
       orden lo pone la cáscara, ver `.video` en proyecto.css—. Primero la
       chatarra, que es exactamente lo que dice `rol`.

       La lupa abre a 1920 y no a 2560: es lo que miden los masters, y el
       script no amplía. */
    galeria: [
      { web:'assets/web/chatarra-escena-1400.webp', chico:'assets/web/chatarra-escena-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/chatarra-escena-1920.webp', ancho:1920 },
        alt:'Scrap metal assets on a grey floor: rusted and teal sheet panels, a bent rod, a pipe, a wheel and steel beams' },
      { web:'assets/web/columpio-escena-1400.webp', chico:'assets/web/columpio-escena-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/columpio-escena-1920.webp', ancho:1920 },
        alt:'A battered swing set asset on a grey floor: bent metal frame, two hanging seats and a third one broken loose' }
    ],

    /* El corto, para la galería de la página de proyecto. Es la versión
       WEB: 1280 px y 3,5 MB, contra los 19,5 MB del original, que desde
       el 27 ago 2026 vive en la carpeta de masters y no aquí. Estuvo en
       el repositorio porque la web lo necesitaba tal cual y no había con
       qué comprimirlo; las dos cosas dejaron de ser verdad el día que
       entró ffmpeg.

       `videoPortada` es lo que se ve antes de darle al play y lo único
       que se ve en móvil, que es lo que pide la sección 7. Sale del
       segundo 25,8, ya con el T-800 y el rifle en cuadro y el fuego
       detrás — y sin la cartela de Lightbox Academy con la que abre el
       corto. */
    video: 'assets/video/terminator-corto-1280.mp4',
    videoPortada: 'assets/web/terminator-corto-1280-portada.webp',

    /* La proporción del archivo. YA NO ES UN APAÑO (10 sep 2026).

       Hasta hoy este campo decía `1280 / 604` y significaba otra cosa:
       el área ÚTIL dentro de un derivado que traía las barras negras
       quemadas del master. Tapaba con CSS lo que se veía y no lo que se
       descargaba —116 líneas de negro por fotograma—. Ahora el recorte
       está hecho en origen, en `derivados.ps1`, y el archivo mide
       1280 × 606 sin una sola línea de negro.

       PERO EL CAMPO NO DESAPARECE, y el pendiente que decía "borrarlo"
       se equivocaba en esto: daba por hecho que sin barras el corto
       sería 16/9, que es lo que se asume cuando el campo falta. No lo
       es. La imagen de verdad es 2,11:1 —cinemascope—, así que sin
       declararlo el marco reservaría 16/9 y `object-fit:cover` se
       comería un 12% del ancho por los lados.

       Lo que cambia es lo que el campo SIGNIFICA: antes era un recorte
       sobre un archivo que mentía, ahora es la proporción real de un
       archivo que no miente. Sigue haciendo falta porque el marco tiene
       que medir antes de que el vídeo cargue —va con `preload="none"`—
       y una caja de altura cero nunca llega al umbral del observador. */
    videoEncuadre: '1280 / 606',

    assets: [
      { nombre:"Rifle M_25", encuadre:"2200 / 1074",
        cifras:{ tris:"250K", altaPoly:true, sets:5, resolucion:"4096 × 4096" },
        pases:{ beauty:"assets/web/m_25-beauty-2200.webp", wireframe:"assets/web/m_25-wireframe-2200.webp", normal:"assets/web/m_25-normal-2200.webp", checker:"assets/web/m_25-checker-2200.webp" } },
      { nombre:"Skull",      encuadre:"1591 / 2200",
        cifras:{ tris:"38K", altaPoly:true, sets:5, resolucion:"4096 × 4096" },
        pases:{ beauty:"assets/web/calavera-beauty-2200.webp", wireframe:"assets/web/calavera-wireframe-2200.webp", normal:"assets/web/calavera-normal-2200.webp", checker:"assets/web/calavera-checker-2200.webp" } }
    ],

    /* Ya no tira del rifle: la portada es un plano del entorno.
       Sale el T-800, que no es suyo — por eso el índice imprime
       "Proyecto en equipo" bajo la pieza y no en letra pequeña. */
    heroProvisional: false
  },

  {
    id: 'ekko',
    titulo: 'Ekko Props · Arcane',
    anio: 2026,
    mes: 2,
    categorias: ['props'],
    rol: 'Solo project',
    equipo: false,
    credito: null,

    software: ['Maya','Substance Painter','Arnold'],
    tris: null,
    texturas: null,
    materiales: null,
    trimSheet: null,

    paleta: { fondo:'#0A0F12', texto:'#EEF9FD', acento:'#FF8A2B' },

    hero: {
      web:  'assets/web/reloj-beauty-1400.webp',
      chico:'assets/web/reloj-beauty-700.webp',
      alt:  "Ekko's chronometer, a stylised prop inspired by Arcane",
      encuadre: '4 / 5',
      /* El master ya es cuadrado y la pieza está centrada: el carrusel
         no recorta nada. `foco` se declara igual para que las cuatro
         fichas digan lo mismo y no parezca un olvido, y lo mismo
         `cuadrado` — aquí coincide con los anchos por defecto porque los
         archivos son 700 × 700 y 1400 × 1400. */
      cuadrado: [700, 1400],
      foco: '50% 50%'
    },
    /* Las tres piezas del proyecto, cada una en su escena (10 sep 2026,
       las trajo Israel). Hasta hoy esta página enseñaba el reloj tres
       veces —portada, y otra vez abajo en el visor— y ni la espada ni el
       aerodeslizador aparecían por ninguna parte, aunque el título diga
       que el proyecto son tres props.

       NO ABRE CON LA PORTADA, al revés que el Cottage y que el Hard
       surface. Allí el hero no sale en ningún otro sitio de la página y
       repetirlo en la galería es enseñarlo entero después de haberlo
       recortado a sangre; aquí el hero ES el beauty del visor, así que
       meterlo también arriba serían tres pases del mismo reloj antes de
       llegar a las otras dos piezas.

       Los tres masters traen su propio fondo —ninguno tiene alfa—, así
       que no hay nada compuesto sobre `--void` y ninguno arrastra el
       rectángulo negro de la sección 8. */
    galeria: [
      { web:'assets/web/reloj-escena-1400.webp',  chico:'assets/web/reloj-escena-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/reloj-escena-2560.webp', ancho:2560 },
        alt:"Ekko's chronometer hanging above its exploded-view sheet, the movement parts laid out around it" },
      { web:'assets/web/skate-escena-1400.webp',  chico:'assets/web/skate-escena-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/skate-escena-2560.webp', ancho:2560 },
        alt:"Ekko's hoverboard beside its dimensioned technical drawing, with the rotor and engraving details called out" },
      /* La espada se sale de los 1400 por lo mismo que los verticales del
         Cottage: es 1920 × 3413, y en la ranura de 1180 de la galería un
         archivo de 787 de ancho se ampliaría 1,5 veces. Ver el script.

         Y OJO CON `anchos` AQUÍ: son los ANCHOS REALES de los dos
         archivos —394 y 1602—, no el 700 y el 2847 que llevan en el
         nombre. Esos dos son el LADO LARGO, que es lo que mide
         `derivados.ps1`, y en un vertical las dos cosas dejan de
         coincidir. Este campo va tal cual al descriptor `w` del
         `srcset`, o sea que es una promesa sobre el ancho del archivo:
         diciendo 2847 se le prometen al navegador 1.245 px que no
         existen. Es la misma distinción que obligó a inventar
         `hero.cuadrado` el 3 sep 2026, y por eso aquí NO se copia el
         `[700,2847]` de los verticales del Cottage. */
      { web:'assets/web/espada-escena-2847.webp', chico:'assets/web/espada-escena-700.webp',
        anchos:[394,1602], grande:{ web:'assets/web/espada-escena-2847.webp', ancho:1602 },
        alt:"Ekko's sword lying diagonally on crimson fabric, with its turquoise blade and ring pommel" }
    ],
    video: null,

    /* LAS TRES PIEZAS, CADA UNA CON SUS CUATRO PASES (10 sep 2026, los
       renderizó Israel). Hasta hoy aquí solo estaba el reloj, y esa era
       justo la pega que dejó abierta el llenar la galería esa misma
       mañana: las tres piezas se veían arriba y solo una tenía desglose.

       Durante unas horas esto montó el TREN, porque el visor se convertía
       en abanico de cartas con dos piezas o más. Esa misma noche el tren
       se retiró del sitio entero —ver la sección 7 del brief—, así que
       las tres van apiladas, una debajo de otra, cada una en su acto. Un
       `assets[]` de tres piezas ya no cambia la mecánica de la página:
       solo añade dos actos más.

       El orden es el mismo que el de `galeria[]` —reloj, skate, espada—
       para que quien baje no tenga que reordenar nada en la cabeza.

       El reloj vuelve a ser el hero y el primer vagón: es la pieza que
       abre la página y la que el carrusel enseña en su tarjeta. */
    assets: [
      { nombre:'Chronometer', encuadre:'1400 / 1400',
        cifras:{ tris:'20K', sets:3, resolucion:'4096 × 4096' },
        pases:{ beauty:'assets/web/reloj-beauty-1400.webp', wireframe:'assets/web/reloj-wireframe-1400.webp', normal:'assets/web/reloj-normal-1400.webp', checker:'assets/web/reloj-checker-1400.webp' } },
      { nombre:'Hoverboard',  encuadre:'1400 / 972',
        cifras:{ tris:'40K', sets:4, resolucion:'4096 × 4096' },
        pases:{ beauty:'assets/web/skate-beauty-1400.webp', wireframe:'assets/web/skate-wireframe-1400.webp', normal:'assets/web/skate-normal-1400.webp', checker:'assets/web/skate-checker-1400.webp' } },
      /* La espada es 272 × 1400: el recorte a su silueta la deja en
         0,19:1, que es lo que mide una espada. En el cuadro cuadrado de
         900 del visor se lleva 175 px de ancho y todo el alto, con
         mucho aire a los lados. No es un fallo de la ficha ni del
         derivado — es la forma de la pieza contra un marco cuadrado.
         Ver la sección 10 del brief, que lo tiene abierto. */
      { nombre:'Sword',       encuadre:'272 / 1400',
        cifras:{ tris:'12K', sets:2, resolucion:'4096 × 4096' },
        pases:{ beauty:'assets/web/espada-beauty-1400.webp', wireframe:'assets/web/espada-wireframe-1400.webp', normal:'assets/web/espada-normal-1400.webp', checker:'assets/web/espada-checker-1400.webp' } }
    ],
    heroProvisional: false
  },

  /* Esta casilla dejó de ser una pieza suelta y pasó a ser una SECCIÓN
     (26 ago 2026): hay un segundo coche en camino y se nombra por la
     disciplina para que quepa sin rediseñar. Hasta que llegue, enseña solo
     el Formentor.

     El `id` se cambia AHORA, con la página todavía sin existir, porque es
     cuando sale gratis: en cuanto `projects/hard-surface.html` esté
     publicado, cambiarlo rompe la URL. */
  {
    id: 'hard-surface',
    titulo: 'Hard surface',
    anio: 2025,
    mes: 11,
    categorias: ['props'],
    rol: 'Solo project',
    equipo: false,
    credito: null,

    software: ['Maya','Substance Painter','V-Ray'],
    /* LAS ÚNICAS CIFRAS QUE VAN A NIVEL DE PROYECTO *(11 sep 2026)*, y no
       por incoherencia: las de las otras tres viven en su pieza del
       desglose, que es donde son exactas. Aquí NO HAY DESGLOSE —el
       Formentor no tiene un solo pase, es el pendiente del wireframe— así
       que no existe la pieza donde colgarlas.

       Y aquí decirlo a nivel de proyecto no inventa nada: hoy la sección
       Hard surface ES el Formentor y nada más, así que las cifras de la
       pieza son literalmente las del proyecto.

       EL DÍA QUE ENTRE EL SEGUNDO COCHE ESTO DEJA DE SER CIERTO, y hay que
       moverlas a `assets[]` como las demás. Que quede escrito aquí, que es
       donde se va a mirar. */
    tris: '150K · high poly',
    texturas: '1 texture set · 2048 × 2048',
    materiales: null,
    trimSheet: null,

    /* Rojizo agrisado (26 ago 2026), por el mismo motivo que el
       Cottage: el `#0C0D10` anterior era un negro azulado que se
       confundía con el de Ekko al teñir la niebla. Elegido por Israel
       mirando el efecto. */
    paleta: { fondo:'#351C17', texto:'#F3F1EC', acento:'#FF8A2B' },

    hero: {
      web:  'assets/web/cupra-beauty-1400.webp',
      chico:'assets/web/cupra-beauty-700.webp',
      alt:  'Cupra Formentor, hard surface rendered in V-Ray',
      encuadre: '4 / 3',
      /* Master cuadrado y coche centrado: sin recorte. Los archivos son
         700 × 700 y 1400 × 1400, así que `cuadrado` coincide con los
         anchos por defecto; se declara igual, como `foco`. */
      cuadrado: [700, 1400],
      foco: '50% 50%'
    },
    /* La galería deja de estar vacía (10 sep 2026, lo pidió Israel).
       Son los dos renders que hay en `Portfolio-masters/cupra/`, y el
       primero es el mismo archivo de la portada.

       ABRE CON LA PORTADA, como el Cottage desde el 7 sep 2026 y por el
       mismo motivo: arriba va a sangre, o sea recortada a la forma de la
       ventana, y en una apaisada de un master cuadrado eso se come el
       aire de arriba y de abajo. Aquí se ve el coche entero. Y no cuesta
       un byte — el navegador ya tiene ese archivo de la portada.

       El verde es el re-render en V-Ray de nov 2025, y es el único
       material de esta pieza que no se estaba enseñando en ninguna
       parte. Trae su propio fondo con suelo y reflejo, así que es el
       único derivado del proyecto que no está compuesto sobre `--void`
       —su master no tiene alfa—. */
    galeria: [
      { web:'assets/web/cupra-beauty-1400.webp', chico:'assets/web/cupra-beauty-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/cupra-beauty-2560.webp', ancho:2560 },
        alt:'The Cupra Formentor in grey, front three-quarter view, the whole car inside the frame' },
      { web:'assets/web/cupra-vray-1400.webp',   chico:'assets/web/cupra-vray-700.webp',
        anchos:[700,1400], grande:{ web:'assets/web/cupra-vray-2560.webp', ancho:2560 },
        alt:'The Formentor in dark green on a reflective floor, lit at night: the V-Ray re-render' }
    ],
    video: null,
    assets: [],

    /* Pasa a tener página propia como las otras tres (26 ago 2026),
       revirtiendo el "galería, sin página profunda" de la sección 3 del
       brief. El motivo es el carrusel: era la única pieza sin enlace y por
       tanto la única sin el rótulo "Ver proyecto", y esa excepción se leía
       como un fallo, no como una decisión.

       Consecuencia: `projects/cupra.html` pasa a hacer falta. Hasta que
       exista da 404, igual que las otras tres.

       El mecanismo se queda por si una pieza futura sí debe ir sin página:
       poniendo esto a true, la tarjeta deja de ser enlace y pierde el
       rótulo, sin tocar código. */
    soloGaleria: false,
    heroProvisional: false
  }
];

export const CONTACTO = {
  email: 'infoisraelbenito@gmail.com',

  /* El teléfono va en dos campos y no en uno, y la diferencia importa.

     `telefono` es lo que se lee, agrupado como se agrupa un móvil español.
     `telefonoUrl` es lo que se marca, y lleva el prefijo internacional
     pegado y sin espacios porque un `tel:` con espacios lo interpreta mal
     algún cliente.

     **El +34 no es adorno.** Este portfolio existe para trabajar con
     estudios, y muchos están fuera de España: un número sin prefijo desde
     un móvil extranjero no marca, y quien lo intenta no vuelve a
     intentarlo. Por eso el prefijo también se ve, no solo se marca. */
  telefono: '+34 637 684 620',
  telefonoUrl: 'tel:+34637684620',

  ubicacion: 'Logroño, Spain',
  /* `descarga` es el nombre con el que el archivo se GUARDA en el
     ordenador de quien lo baja, no la URL. Los archivos del repositorio
     van con nombres web —sin espacios ni acentos— porque son una URL;
     pero un lead que se descarga tres CV el mismo día necesita distinguir
     el tuyo en su carpeta de descargas, y "israel-benito-cv-es.pdf" ahí
     no dice nada. Lo bonito lo pone el atributo `download` del enlace.

     `principal: true` marca cuál se lleva el botón CV de la barra, que es
     uno solo y no puede ofrecer los dos. Misma regla que `portada` en el
     carrusel: lo manda la ficha, no un número escrito en el JS. Si
     ninguno la lleva, se coge el primero que sea descarga.

     **VA EL INGLÉS DESDE EL 10 SEP 2026**, y este es exactamente el caso
     que la decisión anterior tenía previsto. Decía: "va el español,
     aunque el mercado sea internacional, porque toda la web está en
     español y el que la está leyendo lo lee en español — si algún día la
     web se traduce, esta decisión se cae sola". La web está en inglés,
     así que se cayó sola. El razonamiento no cambia, solo el idioma al
     que apunta: el visitante lee la web en inglés y ese es el CV que
     espera. El español queda a un clic aquí arriba.

     Y por eso el `descarga` de los dos se intercambia: el que no lleva
     marca de idioma en el nombre del archivo es el del idioma de la web.
     Quien baja los dos el mismo día tiene que poder distinguirlos en su
     carpeta, y el que necesita la aclaración es el otro. */
  enlaces: [
    { etiqueta:'ArtStation', url:'https://israelbenito.artstation.com/', disponible:true },
    { etiqueta:'LinkedIn',   url:'https://www.linkedin.com/in/israel-benito-18709727a/', disponible:true },
    { etiqueta:'CV (PDF) · Spanish', url:'assets/cv/israel-benito-cv-es.pdf', disponible:true,
      descarga:'Israel Benito — CV (Spanish).pdf' },
    { etiqueta:'CV (PDF) · English', url:'assets/cv/israel-benito-cv-en.pdf', disponible:true,
      descarga:'Israel Benito — CV.pdf', principal:true }
  ]
};


/* Sin uso en la home desde que la fecha salió del pie del índice
   (25 ago 2026). Se queda: la ficha técnica de cada proyecto la
   necesita, y `mes` y `anio` siguen en las fichas. */
const MESES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fecha(p){
  return MESES[p.mes - 1] + ' ' + p.anio;
}
