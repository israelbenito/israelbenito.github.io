/* =========================================================
   LA SALA
   Capítulo 00 de la home. Construida en WebGL: la sala es
   fondo y el logo es sujeto. Ante la duda, quitar.

   montarSala(canvas) devuelve { pausar, reanudar }. La home
   la para cuando sale de pantalla — abajo no se ve y no
   tiene sentido pagar el frame.
   ========================================================= */

import { montarMarca, LOGO_FIT, MARGEN_MARCA, LOGO_Y, LOGO_Z, METAL } from './marca.js';

export function montarSala(canvas, opciones){
  opciones = opciones || {};
  var marcaCanvas = opciones.marcaCanvas || null;   // lienzo de la barra
  var marcaEl     = opciones.marcaEl || null;       // casilla donde aterriza
  var progreso    = opciones.progreso || null;      // 0..1 del vuelo del logo

  var AMBER = 0xFF8A2B;
  var coarse  = matchMedia('(pointer: coarse)').matches;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sin WebGL la página sigue viva: se marca el contenedor y el CSS
     enseña el fondo plano. Se comprueba montando el renderer de
     verdad — pedir un contexto de prueba en este mismo canvas se lo
     robaría a three. */
  var renderer;
  try{
    if(!window.THREE) throw new Error('three.js no cargó');
    renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true});
  }catch(e){
    console.warn('sala: sin WebGL —', e.message);
    if(canvas.parentNode) canvas.parentNode.classList.add('sin-webgl');
    return { pausar:noop, reanudar:noop, ok:false };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060A);
  scene.fog = new THREE.FogExp2(0x070910, 0.042);

  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(0, 3.2, 13);

  var world = new THREE.Group();

  var foot = [
    new THREE.Vector3(-19,0, 15), new THREE.Vector3(-13,0, -2),
    new THREE.Vector3(-9.5,0,-14), new THREE.Vector3( 9.5,0,-14),
    new THREE.Vector3( 13,0, -2), new THREE.Vector3( 19,0, 15)
  ];
  var path = new THREE.CatmullRomCurve3(foot, false, 'catmullrom', 0.25);

  var N = 84, H = 10;
  var slats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, H, 0.5),
    new THREE.MeshStandardMaterial({color:0x1B2028, roughness:0.72, metalness:0.25}), N);
  var m4=new THREE.Matrix4(), q=new THREE.Quaternion(), up=new THREE.Vector3(0,1,0), sc=new THREE.Vector3(1,1,1);
  var pts = path.getSpacedPoints(N-1);
  for(var i=0;i<N;i++){
    var p=pts[i], tg=path.getTangentAt(i/(N-1));
    q.setFromAxisAngle(up, Math.atan2(tg.x,tg.z));
    m4.compose(new THREE.Vector3(p.x,H/2,p.z), q, sc);
    slats.setMatrixAt(i,m4);
  }
  world.add(slats);

  function glowTex(soft){
    var c=document.createElement('canvas'); c.width=c.height=128;
    var g=c.getContext('2d'), rg=g.createRadialGradient(64,64,0,64,64,64);
    rg.addColorStop(0,'rgba(255,200,140,'+(soft?0.55:0.95)+')');
    rg.addColorStop(0.35,'rgba(255,140,50,'+(soft?0.14:0.3)+')');
    rg.addColorStop(1,'rgba(255,110,20,0)');
    g.fillStyle=rg; g.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(c);
  }
  var GT = glowTex(true), GT_HOT = glowTex(false);

  function neon(y, radius, tint, hs, ho, count){
    var g=new THREE.Group();
    var p3=new THREE.CatmullRomCurve3(foot.map(function(v){return new THREE.Vector3(v.x,y,v.z);}),false,'catmullrom',0.25);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(p3,140,radius,8,false),
          new THREE.MeshBasicMaterial({color:tint, fog:true})));
    var h=p3.getSpacedPoints(count);
    for(var i=0;i<h.length;i++){
      var s=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:AMBER,
        blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:ho,fog:true}));
      s.position.copy(h[i]); s.scale.set(hs,hs,1); g.add(s);
    }
    return g;
  }
  world.add(neon(0.14, 0.04, 0xFFC98F, 1.5, 0.30, 44));
  world.add(neon(H-0.7, 0.028, 0x8A5A32, 1.0, 0.12, 30));

  var lp = path.getSpacedPoints(4);
  for(var i=0;i<lp.length;i++){
    var L=new THREE.PointLight(AMBER,0.85,22,2);
    L.position.set(lp[i].x*0.88,0.6,lp[i].z*0.88); world.add(L);
  }
  scene.add(new THREE.AmbientLight(0x1A2333,0.4));

  var grid=new THREE.GridHelper(70,12,AMBER,AMBER);
  grid.material.transparent=true; grid.material.opacity=0.055; grid.position.y=0.01;
  world.add(grid);

  /* ---- logo IB ----
     El .glb entra sin sus materiales: se le aplica el metal
     de la sala para que reciba la luz real.

     LA POSICIÓN, EL ENCAJE Y EL METAL VIENEN DE `marca.js` y no se
     declaran aquí: los comparten el logo de esta sala, el encuadre de
     la marca de la barra y el cálculo del tamaño de aterrizaje del
     vuelo. Declarados en dos sitios se separan, y cuando se separan el
     relevo salta — se ve el cambio de una pieza a otra al aterrizar. */
  var metal = new THREE.MeshStandardMaterial(METAL);

  var logo=new THREE.Group();
  logo.name='logo';
  logo.position.set(0, LOGO_Y, LOGO_Z);
  world.add(logo);

  var rim=new THREE.SpotLight(0xCFE0F5,8.0,17,0.42,0.75,1.15);
  rim.position.set(-4.5,8.5,4.5); rim.target=logo;

  /* Contraluz frío por el otro lado: los cantos biselados necesitan
     una segunda fuente o la mitad derecha se apaga. */
  var rim2=new THREE.PointLight(0xBFD4EE,2.6,8,1.4);
  rim2.position.set(4.2,4.6,1.6);
  world.add(rim, rim.target, rim2);

  scene.add(world);

  /* Centra el modelo en su propio origen y lo encaja en LOGO_FIT,
     venga con la escala y el pivote que venga de Maya. */
  function mountLogo(obj){
    obj.traverse(function(o){ if(o.isMesh){ o.material=metal; } });
    obj.updateMatrixWorld(true);
    var box=new THREE.Box3().setFromObject(obj);
    var size=box.getSize(new THREE.Vector3());
    var ctr=box.getCenter(new THREE.Vector3());
    obj.position.sub(ctr);
    var holder=new THREE.Group();
    holder.add(obj);
    holder.scale.setScalar(LOGO_FIT/Math.max(size.x,size.y));
    logo.add(holder);
    buildReflection();
    montarMarcaAqui(holder);
  }

  /* =========================================================
     LA MARCA
     El logo no puede quedarse en este canvas: el canvas se va
     con el capítulo 00. Así que el vuelo termina en un relevo —
     la pieza aterriza sobre la barra y un segundo lienzo, del
     tamaño de la marca, la recoge y se queda con ella.

     LO MONTA `marca.js`, que desde el 27 ago 2026 vive aparte
     porque la barra de las páginas de proyecto necesita la
     misma marca. Aquí se le pasa la pieza YA CARGADA: allí no
     hay vuelo y se carga sola, pero en la home sería descargar
     el `.glb` dos veces para el mismo objeto.

     Las constantes de encuadre —`LOGO_FIT`, `MARGEN_MARCA`— y
     la posición del logo en la sala vienen de ese módulo, no
     de aquí: las comparten el encuadre de la marca y el cálculo
     del tamaño de aterrizaje, y si se separan, el relevo salta.
     ========================================================= */
  var marca = null;

  function montarMarcaAqui(holder){
    if(!marcaCanvas) return;
    marca = montarMarca(marcaCanvas, { pieza:holder, viva:false });
  }

  function pintarMarca(){ if(marca) marca.pintar(); }
  function marcaActiva(v){ if(marca) marca.activar(v); }
  function medirMarca(){ if(marca) marca.medir(); }
  /* =========================================================
     EL VUELO
     El logo viaja desde el centro de la sala hasta la casilla de
     la marca. El destino se calcula desproyectando esa casilla
     sobre el plano donde vive el logo, así que sigue cuadrando
     aunque cambien la ventana, el margen o la tipografía.
     ========================================================= */
  var vuelo = 0;
  var REPOSO = new THREE.Vector3(0, LOGO_Y, LOGO_Z);
  var reposo = new THREE.Vector3(), origen = new THREE.Vector3();
  var proyectado = new THREE.Vector3();
  var destino = new THREE.Vector3(), destinoOk = false, escalaMarca = 1;

  /* El punto de pantalla desde el que despega: donde se ve el logo
     con la página sin scrollear. Es un punto fijo del viewport, no
     del documento, y se recalcula solo — así no se estropea si
     alguien entra a mitad del capítulo por un enlace.

     Anclarlo al centro de la sala era el error: la sala se va hacia
     arriba más deprisa de lo que el logo baja hacia la barra, y
     había un tramo en el que la pieza se salía por el borde de
     arriba. Despegando de un punto fijo se cuenta además lo que
     interesa — el logo se desengancha de la sala y se va solo. */
  var despegue = { x:0, y:0 };

  function puntoDespegue(){
    var c = canvas.getBoundingClientRect();
    proyectado.copy(REPOSO).project(camera);
    /* Sin sumar c.left/c.top a propósito: eso es la posición del
       logo con el lienzo pegado al borde superior, o sea, con la
       página arriba del todo. */
    despegue.x = ( proyectado.x*0.5 + 0.5) * c.width;
    despegue.y = (-proyectado.y*0.5 + 0.5) * c.height;
    return despegue;
  }
  var cajaMarca = null;
  var rayoM = new THREE.Raycaster(), ndcM = new THREE.Vector2();
  var planoM = new THREE.Plane(), normalM = new THREE.Vector3();
  var qFlote = new THREE.Quaternion(), eFlote = new THREE.Euler();
  var mirilla = new THREE.Object3D();

  /* Eje de la vuelta que da el logo mientras viaja a la barra.
     Y = voltereta de moneda: enseña el canto biselado y el metal
     pillando el contraluz. Tiene un pero — el modelo es una chapa
     de proporción 1:31, así que al pasar por los 90° y los 270°
     queda casi de perfil y por un par de frames desaparece. A la
     velocidad del vuelo se lee como destello; si algún día molesta,
     esta línea a (0,0,1) lo convierte en pirueta dentro del plano
     de la pantalla: siempre visible, pero menos 3D. */
  var GIRO_EJE = new THREE.Vector3(0, 1, 0);
  var qGiro = new THREE.Quaternion();

  /* La barra entra con un translateY y encima con transición, así
     que su rectángulo mientras está escondida no sirve: anular la
     transformación para medir tampoco vale, porque al anularla
     arranca la transición y getBoundingClientRect sigue devolviendo
     el valor viejo.

     Las medidas de maquetación no se enteran de las
     transformaciones. Se suman subiendo por la cadena de
     offsetParent hasta la barra, que al ser fija arranca en el
     origen del viewport: el resultado son coordenadas de pantalla
     limpias. */
  function medirCaja(){
    if(!marcaEl || !marcaEl.offsetParent){ cajaMarca = null; return; }
    var x = 0, y = 0;
    for(var n = marcaEl; n; n = n.offsetParent){
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    cajaMarca = {
      left:   x,
      top:    y,
      width:  marcaEl.offsetWidth,
      height: marcaEl.offsetHeight
    };
  }

  /* Traduce un punto de la pantalla al plano donde vive el logo.
     Como el lienzo se va con el scroll, un punto fijo de pantalla
     es un punto que se mueve en el mundo: por eso el cálculo se
     rehace cada frame. */
  function puntoEnPlano(px, py, salida){
    var c = canvas.getBoundingClientRect();
    if(c.width < 1 || c.height < 1) return false;
    camera.updateMatrixWorld();
    ndcM.set(((px - c.left)/c.width)*2 - 1, -((((py - c.top)/c.height)*2) - 1));
    rayoM.setFromCamera(ndcM, camera);
    camera.getWorldDirection(normalM);
    planoM.setFromNormalAndCoplanarPoint(normalM, REPOSO);
    return rayoM.ray.intersectPlane(planoM, salida) !== null;
  }

  function calcularDestino(){
    destinoOk = false;
    if(!cajaMarca) return;
    var c = canvas.getBoundingClientRect();
    if(c.width < 1 || c.height < 1) return;

    if(!puntoEnPlano(cajaMarca.left + cajaMarca.width/2,
                     cajaMarca.top  + cajaMarca.height/2, destino)) return;

    var d = camera.position.distanceTo(REPOSO);
    var altoMundo = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    var porPx = altoMundo / c.height;
    escalaMarca = (cajaMarca.height / MARGEN_MARCA) * porPx / LOGO_FIT;
    destinoOk = true;
  }

  /* Sale con velocidad desde el primer píxel de scroll y frena al
     llegar. La curva simétrica anterior tenía pendiente cero al
     principio: el logo se quedaba clavado mientras la sala se iba
     hacia arriba por debajo, y eso se leía como que no reaccionaba.
     Exponente 1.7: se mueve desde el arranque sin plantarse en la
     esquina a la primera de cambio. */
  function suave(x){
    if(x<=0) return 0;
    if(x>=1) return 1;
    return 1 - Math.pow(1-x, 1.7);
  }

  /* El progreso lo pregunta el bucle en cada frame; no se lo
     empuja nadie desde fuera. Con dos relojes distintos —el del
     scroll y el del render— el logo se dibuja con el dato del
     frame anterior, y en un salto de scroll se queda colgado
     donde estaba. */
  function leerVuelo(){
    if(reduced || !progreso) return 0;
    var p = progreso();
    return p > 0 ? (p < 1 ? p : 1) : 0;
  }

  /* Monograma de reserva: solo si el .glb no carga. */
  function fallbackLogo(){
    function shapeI(){var s=new THREE.Shape();s.moveTo(0,0);s.lineTo(22,0);s.lineTo(22,100);s.lineTo(0,100);s.closePath();return s;}
    function shapeB(){
      var s=new THREE.Shape();
      s.moveTo(0,0); s.lineTo(0,100); s.lineTo(45,100);
      s.bezierCurveTo(72,100,80,90,80,77); s.bezierCurveTo(80,64,72,56,60,53);
      s.bezierCurveTo(76,50,88,41,88,26); s.bezierCurveTo(88,10,74,0,46,0); s.closePath();
      var a=new THREE.Path(); a.moveTo(22,58); a.lineTo(42,58);
      a.bezierCurveTo(56,58,62,63,62,71); a.bezierCurveTo(62,79,56,84,42,84); a.lineTo(22,84); a.closePath();
      var b=new THREE.Path(); b.moveTo(22,16); b.lineTo(44,16);
      b.bezierCurveTo(60,16,68,20,68,29); b.bezierCurveTo(68,37,60,42,44,42); b.lineTo(22,42); b.closePath();
      s.holes.push(a,b); return s;
    }
    var ext={depth:16,bevelEnabled:true,bevelThickness:2.4,bevelSize:2.4,bevelSegments:4,curveSegments:14};
    var g=new THREE.Group();
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shapeI(),ext),metal));
    var mb=new THREE.Mesh(new THREE.ExtrudeGeometry(shapeB(),ext),metal);
    mb.position.x=36; g.add(mb);
    return g;
  }

  var RUTA_LOGO = opciones.logo || 'assets/logo.glb';
  if(THREE.GLTFLoader){
    new THREE.GLTFLoader().load(RUTA_LOGO,
      function(gltf){ mountLogo(gltf.scene); },
      undefined,
      function(){ console.warn('logo.glb no cargo - monograma de reserva'); mountLogo(fallbackLogo()); });
  }else{
    console.warn('GLTFLoader no disponible - monograma de reserva');
    mountLogo(fallbackLogo());
  }

  /* El reflejo es una copia volteada de la sala. Se construye cuando
     el logo ya está dentro, si no la sala se refleja sin él. */
  var mirrorLogo=null;
  function buildReflection(){
    var mirror=world.clone(true);
    mirror.scale.y=-1; mirror.position.y=-0.02;
    mirrorLogo=mirror.getObjectByName('logo');
    scene.add(mirror);
  }

  var floor=new THREE.Mesh(new THREE.PlaneGeometry(140,140),
    new THREE.MeshStandardMaterial({color:0x080A0F,roughness:0.5,metalness:0.4,
      transparent:true,opacity:0.87}));
  floor.rotation.x=-Math.PI/2; scene.add(floor);

  var DN=160,pos=new Float32Array(DN*3);
  for(var i=0;i<DN;i++){
    pos[i*3]=(Math.random()-0.5)*34; pos[i*3+1]=Math.random()*9;
    pos[i*3+2]=(Math.random()-0.5)*30-4;
  }
  var dustGeo=new THREE.BufferGeometry();
  dustGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({
    color:0xFFC58A,size:0.04,transparent:true,opacity:0.3,
    blending:THREE.AdditiveBlending,depthWrite:false})));

  /* =========================================================
     EL CURSOR ES UNA LUZ
     Una luz puntual real que vive en la sala. Enciende los
     listones al pasar, se refleja en el suelo y hace brillar
     el logo al acercarse.
     ========================================================= */
  var CUR_Z = 1.2;
  var curPos = new THREE.Vector3(0, 3.5, CUR_Z);

  var curLight = new THREE.PointLight(0xFFB570, 0, 26, 2);
  scene.add(curLight);

  var core = new THREE.Sprite(new THREE.SpriteMaterial({
    map:GT_HOT, color:0xFFD3A0, blending:THREE.AdditiveBlending,
    transparent:true, depthWrite:false, opacity:0.9, fog:false}));
  core.scale.set(0.5,0.5,1);
  scene.add(core);

  var coreRef = new THREE.Sprite(core.material.clone());
  coreRef.scale.set(0.5,0.5,1); scene.add(coreRef);

  var ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
  var curPlane=new THREE.Plane(new THREE.Vector3(0,0,1), -CUR_Z);
  var target=new THREE.Vector3(0,3.5,CUR_Z);
  var pointerIn=false;

  var tx=0,ty=0,cx=0,cy=0;
  if(!coarse){
    addEventListener('pointermove',function(e){
      var r=canvas.getBoundingClientRect();
      if(r.width<1 || r.height<1) return;
      var u=(e.clientX-r.left)/r.width, v=(e.clientY-r.top)/r.height;
      if(u<0||u>1||v<0||v>1){ pointerIn=false; return; }
      tx=u-0.5; ty=v-0.5;
      ndc.set(u*2-1, -(v*2)+1);
      ray.setFromCamera(ndc,camera);
      if(ray.ray.intersectPlane(curPlane,target)) pointerIn=true;
    },{passive:true});
    addEventListener('pointerleave',function(){ pointerIn=false; },{passive:true});
  }

  function medir(){
    var w=canvas.clientWidth||1, h=canvas.clientHeight||1;
    renderer.setSize(w,h,false);
    camera.aspect=w/h; camera.updateProjectionMatrix();
    medirCaja();
    medirMarca();
  }
  medir();
  addEventListener('resize', medir);

  var t0=performance.now(), last=t0, corriendo=false, rafId=0;

  function loop(now){
    if(!corriendo) return;
    rafId=requestAnimationFrame(loop);
    var t=(now-t0)/1000, dt=Math.min(0.05,(now-last)/1000); last=now;

    vuelo = leerVuelo();
    var e = suave(vuelo);

    /* El paralaje de cámara se apaga con el vuelo: si no, la marca
       ya aterrizada se bambolea con el ratón. */
    cx+=(tx-cx)*0.04; cy+=(ty-cy)*0.04;
    camera.position.x=cx*2.0*(1-e);
    camera.position.y=3.2-cy*0.8*(1-e);
    camera.lookAt(0,3.5,-4);

    var fy=Math.sin(t*0.55)*0.16+Math.sin(t*0.23)*0.07;
    reposo.set(0, LOGO_Y + (reduced?0:fy)*(1-e), LOGO_Z);

    if(e > 0){
      calcularDestino();
      var d0 = puntoDespegue();
      if(destinoOk && puntoEnPlano(d0.x, d0.y, origen)){
        origen.y += (reduced?0:fy)*(1-e);   // el vaivén se apaga al despegar
        logo.position.lerpVectors(origen, destino, e);
        logo.scale.setScalar(1 + (escalaMarca - 1) * e);
      }else{
        logo.position.copy(reposo);
      }
    }else{
      logo.position.copy(reposo);
      logo.scale.setScalar(1);
    }

    /* En el centro de la sala el logo flota y gira con el ratón.
       Al llegar a la esquina eso sobra, y además la perspectiva lo
       vería de canto: se gira hacia la cámara conforme viaja. */
    eFlote.set(
      cy*0.16 + Math.sin(t*0.22)*0.03,
      cx*0.42 + Math.sin(t*0.28)*0.07,
      Math.sin(t*0.19)*0.02
    );
    qFlote.setFromEuler(eFlote);
    if(e > 0){
      mirilla.position.copy(logo.position);
      mirilla.lookAt(camera.position);
      logo.quaternion.copy(qFlote).slerp(mirilla.quaternion, e);

      /* Una vuelta entera repartida por todo el vuelo. Termina en
         2π, que como rotación es la identidad: la pieza aterriza
         justo en la orientación que tendría sin girar, así que el
         relevo con el lienzo de la marca sigue cuadrando y no hay
         que tocar nada más.
         Va multiplicado DESPUÉS del slerp —rotación local— para que
         gire sobre su propio eje. Antes lo haría alrededor de la
         cámara, que es un barrido, no una vuelta.
         Se apoya en `e` y no en `vuelo`: la misma curva que lleva la
         posición, así que el giro frena a la vez que el viaje en vez
         de seguir rodando al llegar. */
      qGiro.setFromAxisAngle(GIRO_EJE, Math.PI * 2 * e);
      logo.quaternion.multiply(qGiro);
    }else{
      logo.quaternion.copy(qFlote);
    }

    if(mirrorLogo){
      mirrorLogo.position.copy(logo.position);
      mirrorLogo.quaternion.copy(logo.quaternion);
      mirrorLogo.scale.copy(logo.scale);
    }

    if(!coarse && !reduced){
      curPos.lerp(target, 1-Math.pow(0.001, dt));

      var d = curPos.distanceTo(logo.position);
      var near = THREE.MathUtils.clamp(1 - (d-1.6)/5.5, 0, 1);
      var flick = 0.94 + Math.sin(t*7.3)*0.03 + Math.sin(t*3.1)*0.03;
      curLight.intensity = (pointerIn?1:0) * (2.4 + near*5.0) * flick;
      curLight.position.copy(curPos);

      core.position.copy(curPos);
      core.material.opacity = pointerIn ? (0.40+near*0.30) : 0;
      var cs = 0.30 + near*0.26;
      core.scale.set(cs,cs,1);

      coreRef.position.set(curPos.x, -curPos.y-0.04, curPos.z);
      coreRef.material.opacity = core.material.opacity*0.32;
      coreRef.scale.set(cs*0.9, cs*0.9, 1);
    }

    var a=dustGeo.attributes.position.array;
    for(var i=0;i<DN;i++){ a[i*3+1]+=0.0028; if(a[i*3+1]>9.2) a[i*3+1]=0; }
    dustGeo.attributes.position.needsUpdate=true;

    renderer.render(scene,camera);
  }

  function reanudar(){
    if(corriendo) return;
    corriendo=true; last=performance.now();
    rafId=requestAnimationFrame(loop);
  }
  function pausar(){
    corriendo=false;
    if(rafId) cancelAnimationFrame(rafId);
  }

  reanudar();
  return {
    pausar:pausar, reanudar:reanudar,
    marcaActiva:marcaActiva, medirCaja:medirCaja,
    ok:true
  };
}

function noop(){}
