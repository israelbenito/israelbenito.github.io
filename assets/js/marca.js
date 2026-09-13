/* =========================================================
   LA MARCA
   El monograma IB de la barra de navegación, en metal de
   verdad y con las mismas luces que lo iluminan dentro de la
   sala. Un solo módulo para los dos sitios donde aparece:

   · En la HOME es el RELEVO del vuelo. El logo viaja desde el
     centro de la sala hasta la barra, pero no puede quedarse
     en el lienzo de la sala —ese lienzo se va con el capítulo
     00—, así que al aterrizar este segundo lienzo, del tamaño
     de la marca, lo recoge y se queda con él. Ahí la pieza
     llega ya cargada y se le pasa en `pieza`.

   · En las PÁGINAS DE PROYECTO no hay vuelo del que aterrizar,
     así que la marca se carga sola desde el `.glb` y se pinta
     al montar.

   VIVE APARTE Y NO DENTRO DE `sala.js` desde el 27 ago 2026,
   que es cuando dejó de ser cosa de una sola página. La regla
   es la misma que llevó `malla.js` fuera de la home y los
   revelados a `comun.js`: dos copias de la misma idea se
   separan con el tiempo, y la que se queda atrás no avisa.
   Aquí eso se vería enseguida —la marca de la barra dejaría de
   parecerse a la que aterriza— pero en otro sitio no.

   POR QUÉ LAS CONSTANTES DE ENCUADRE ESTÁN AQUÍ Y NO EN LA
   SALA: `LOGO_FIT` y `MARGEN_MARCA` los usan a la vez el
   encuadre de esta marca y el cálculo del tamaño de aterrizaje
   del vuelo. Si se separan, el relevo salta —se ve el cambio
   de una pieza a otra—. Estando aquí, la sala los importa y no
   pueden desincronizarse.

   Necesita `window.THREE` y, para cargarse sola, también
   `THREE.GLTFLoader`. Si no están, no monta y no rompe nada:
   la barra se queda con el texto "IB", que es lo que leen los
   lectores de pantalla y lo único que se ve sin WebGL.
   ========================================================= */

/* El tamaño al que se encaja la pieza, y el aire que le deja la marca
   alrededor. Los importa `sala.js` para calcular el aterrizaje. */
export const LOGO_FIT = 5.0;
export const MARGEN_MARCA = 1.12;

/* Dónde está el logo dentro de la sala. Las luces de aquí abajo se
   colocan con el MISMO desplazamiento relativo que tienen allí: copiar
   su posición absoluta las dejaría apuntando a cualquier parte, y la
   marca dejaría de parecerse a la pieza que aterriza. */
export const LOGO_Y = 3.7;
export const LOGO_Z = -3;

export const METAL = { color:0xD8DBDE, roughness:0.28, metalness:0.88 };

export function montarMarca(canvas, opciones){
  opciones = opciones || {};
  var pieza = opciones.pieza || null;          // ya cargada (la home)
  var ruta  = opciones.logo  || 'assets/logo.glb';
  /* La home la enciende cuando el vuelo aterriza; las páginas de
     proyecto, en cuanto está. */
  var viva  = opciones.viva !== false;

  var noop = function(){};
  if(!canvas || !window.THREE) return { activar:noop, medir:noop, pintar:noop, ok:false };

  var rend;
  try{
    /* `preserveDrawingBuffer` porque esta marca se dibuja UNA VEZ y se
       queda: no hay bucle que la repinte si el navegador decide vaciar
       el búfer. */
    rend = new THREE.WebGLRenderer({
      canvas:canvas, antialias:true, alpha:true, preserveDrawingBuffer:true
    });
  }catch(e){
    console.warn('marca: sin WebGL —', e.message);
    return { activar:noop, medir:noop, pintar:noop, ok:false };
  }

  /* Nunca por debajo de 2: la marca son 26 px de filete fino y en una
     pantalla sin retina se deshilacha. A este tamaño el búfer extra no
     cuesta nada. */
  rend.setPixelRatio(Math.min(Math.max(devicePixelRatio || 1, 2), 3));

  var esc = new THREE.Scene();
  var cam = null;
  var lista = false;

  function colocar(obj){
    /* Material propio y no el de la sala: compartirlo ataría el brillo
       de la marca a lo que le pase al logo de allí. */
    obj.traverse(function(o){
      if(o.isMesh) o.material = new THREE.MeshStandardMaterial(METAL);
    });
    obj.position.set(0,0,0);
    esc.add(obj);

    var l1 = new THREE.SpotLight(0xCFE0F5, 9.0, 40, 0.5, 0.75, 1.0);
    l1.position.set(-4.5, 8.5 - LOGO_Y, 4.5 - LOGO_Z);
    l1.target.position.set(0,0,0);
    /* Contraluz frío por el otro lado: los cantos biselados necesitan
       una segunda fuente o la mitad derecha se apaga. */
    var l2 = new THREE.PointLight(0xBFD4EE, 3.0, 20, 1.2);
    l2.position.set(4.2, 4.6 - LOGO_Y, 1.6 - LOGO_Z);
    esc.add(l1, l1.target, l2, new THREE.AmbientLight(0x1A2333, 0.5));

    var h = LOGO_FIT * MARGEN_MARCA;
    cam = new THREE.OrthographicCamera(-h/2, h/2, h/2, -h/2, 0.1, 60);
    cam.position.set(0, 0, 20);
    cam.lookAt(0,0,0);

    lista = true;
    medir();
  }

  /* Está quieta: un dibujado basta. Un bucle aquí sería pagar un
     fotograma por segundo de visita a cambio de nada. */
  function pintar(){
    if(lista && viva) rend.render(esc, cam);
  }

  function activar(v){
    if(v === viva) return;
    viva = v;
    if(v) pintar();
  }

  function medir(){
    var w = canvas.clientWidth || 26, h = canvas.clientHeight || 26;
    rend.setSize(w, h, false);
    pintar();
  }

  canvas.addEventListener('webglcontextrestored', pintar);

  if(pieza){
    colocar(pieza.clone(true));
  }else if(THREE.GLTFLoader){
    /* Se encaja por caja envolvente, igual que en la sala: así da igual
       el pivote con el que se exporte el `.glb`. */
    new THREE.GLTFLoader().load(ruta, function(gltf){
      var obj = gltf.scene;
      var caja = new THREE.Box3().setFromObject(obj);
      var tam = caja.getSize(new THREE.Vector3());
      var centro = caja.getCenter(new THREE.Vector3());
      obj.position.sub(centro);
      var grupo = new THREE.Group();
      grupo.add(obj);
      grupo.scale.setScalar(LOGO_FIT / Math.max(tam.x, tam.y));
      colocar(grupo);
      if(typeof opciones.alEstar === 'function') opciones.alEstar();
    }, null, function(){
      console.warn('marca: logo.glb no cargó');
    });
  }

  addEventListener('resize', medir);

  return { activar:activar, medir:medir, pintar:pintar, ok:true };
}
