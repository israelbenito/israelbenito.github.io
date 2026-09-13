/* =========================================================
   COMÚN
   Lo que usan la home y las páginas de proyecto. Vive aquí y
   no duplicado en cada una por la misma razón que `sala.js`
   lo comparten `intro.html` e `index.html`: dos copias de la
   misma idea se separan con el tiempo, y la que se queda
   atrás no avisa.
   ========================================================= */

export const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* EL ANCHO DE VERDAD DE LA VENTANA, SIN LA BARRA DE SCROLL *(11 sep 2026)*.
   `100vw` la INCLUYE, así que cualquier cosa que se saque a sangre con ese
   número se pasa de largo justo lo que mide la barra — 19 px en Chrome de
   escritorio— y la página coge scroll horizontal.

   Era el desborde de 8 px de la sección 8 del brief, y el diagnóstico que
   había allí estaba equivocado: culpaba a `.pases__fija` y a
   `.siguiente__img`. Medido apagando candidatos uno a uno, `.siguiente__img`
   no puede ser —la recorta su propia caja— y `.pases__fija` dejó de tener
   estilos al retirarse el tren. El único culpable es la banda a sangre del
   corto, así que **solo desbordaba el Terminator**, que es la única página
   con vídeo: 1.269 contra 1.261 a 1280 px de ventana.

   No se puede sacar en CSS puro: `100%` mide el contenedor, no la raíz.
   Así que se mide y se publica como variable. **`clientWidth` de la raíz ES
   ese número**, por definición.

   VA CON RESERVA EN EL CSS —`var(--vw, 100vw)`—, así que si este módulo no
   llega la página se comporta como antes en vez de romperse. */
export function medirVentana(){
  const publicar = () => document.documentElement.style
    .setProperty('--vw', document.documentElement.clientWidth + 'px');
  publicar();
  addEventListener('resize', publicar);
}

/* Cada sección se anima al entrar en pantalla, UNA SOLA VEZ. No cada vez
   que pasas por delante: el brief lo pide así y además repetirlo convierte
   el scroll de vuelta en un espectáculo que nadie pidió.

   Sin IntersectionObserver, o con reduced-motion, todo aparece de golpe.
   Eso no es degradar: es exactamente lo que el brief pide para quien ha
   dicho que no quiere movimiento. */
export function activarRevelados(raiz = document){
  const objetivos = $$('[data-revelar]', raiz);
  if(reducido || !('IntersectionObserver' in window)){
    objetivos.forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach(e => {
      if(!e.isIntersecting) return;
      e.target.classList.add('visible');
      obs.unobserve(e.target);
    });
  }, { rootMargin:'0px 0px -12% 0px', threshold:0.12 });

  objetivos.forEach(el => obs.observe(el));
}

/* El mes y el año de una ficha, para la ficha técnica. Los campos siguen
   en las fichas desde que la fecha salió del índice el 25 ago 2026: en una
   rejilla la fecha solo invitaba a comparar cuál es la pieza más vieja,
   pero en la ficha de un proyecto informa. */
const MESES = ['January','February','March','April','May','June',
               'July','August','September','October','November','December'];
export function fechaLarga(p){
  if(!p.anio) return null;
  return p.mes ? `${MESES[p.mes - 1]} ${p.anio}` : String(p.anio);
}

/* ---- La vuelta a la home --------------------------------
   La home ARRANCA SIEMPRE POR LA INTRO: la sección 7 del brief lo pide y
   para conseguirlo la cabecera del HTML retira el ancla de la URL antes
   de que el destino exista en el DOM. Eso arregla un fallo real —Chrome
   no salta al ancla al cargar, sino cuando la maquetación se asienta, y
   la página se quedaba quieta seis segundos y luego se iba sola hacia
   abajo— pero se lleva por delante un caso que no es una visita: **volver
   de una página de proyecto**.

   Quien pulsa "volver a trabajos" no está llegando a la web, está
   deshaciendo un paso. Enseñarle la intro otra vez es perderle el sitio.

   Se resuelve con una marca de sesión y no con el ancla, a propósito: el
   ancla es de la URL y por tanto se comparte y se copia, y volvería a
   colar a un visitante nuevo directo a Trabajos. Esto vive en la pestaña,
   dura un salto y no viaja a ninguna parte.

   El `try` no es paranoia: `sessionStorage` LANZA, no devuelve null, en
   navegación privada de algunos navegadores y con las cookies de terceros
   bloqueadas en un iframe. Si falla, se pierde la vuelta y se ve la
   intro, que es el comportamiento de antes. */
const VUELTA = 'ib-vuelta';

export function marcarVuelta(hash){
  try{ sessionStorage.setItem(VUELTA, hash); }catch(e){}
}

/* Se lee UNA vez y se borra: la marca vale para el salto que viene y no
   para el siguiente recargar. Si no se borrase, refrescar la home te
   dejaría en Trabajos para siempre. */
export function tomarVuelta(){
  try{
    const v = sessionStorage.getItem(VUELTA);
    if(v) sessionStorage.removeItem(VUELTA);
    return v;
  }catch(e){ return null; }
}
