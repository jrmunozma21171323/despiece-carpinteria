// Visor 3D del closet: se arma con la misma descripción de modelos.js.
// Arrastrar = girar, pellizcar = acercar, tocar un cajón o una puerta = abrir/cerrar.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ESPESOR as T, ZOCALO as Z, USOS, repartirCuerpos, revisarTubos, colorPorId } from './modelos.js';

const FONDO_ESCENA = 0xefe2cc;   // mismo beige de la app
const APERTURA = 0.36;           // cuánto sale un cajón abierto (m)
const GIRO_PUERTA = 1.75;        // ~100° al abrir una puerta batiente
const TEXTURA_M = 0.8;           // la textura representa 0,80 m de tablero

/** Textura de melamina tipo madera, dibujada en un canvas (sin descargar imágenes). Veta fina y casi recta. */
function texturaMadera({ base, oscura, clara, veta }) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  let s = 11;
  const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const lineas = veta ? 260 : 40;
  for (let i = 0; i < lineas; i++) {
    const y = azar() * 512, amp = 0.4 + azar() * 1.6, fase = azar() * 6, largo = 180 + azar() * 400;
    g.strokeStyle = azar() < 0.7 ? oscura : clara;
    g.globalAlpha = veta ? 0.04 + azar() * 0.10 : 0.02 + azar() * 0.03;
    g.lineWidth = 0.5 + azar() * 1.8;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x / largo + fase) * amp * 3);
    g.stroke();
  }
  if (veta) {
    for (let i = 0; i < 12; i++) {   // manchas suaves que rompen la uniformidad
      const y = azar() * 512;
      const grad = g.createLinearGradient(0, y - 30, 0, y + 30);
      grad.addColorStop(0, 'transparent'); grad.addColorStop(0.5, oscura); grad.addColorStop(1, 'transparent');
      g.globalAlpha = 0.05; g.fillStyle = grad; g.fillRect(0, y - 30, 1024, 60);
    }
  }
  g.globalAlpha = 1;
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = 8;
  return tx;
}

/** Caja con la veta a escala real y corriendo por el lado largo de cada cara (como una pieza cortada del tablero). */
function cajaConVeta(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const caras = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // +x, -x, +y, -y, +z, -z
  for (let cara = 0; cara < 6; cara++) {
    const [du, dv] = caras[cara];
    const girar = dv > du;
    for (let k = 0; k < 4; k++) {
      const i = cara * 4 + k;
      let u = uv.getX(i) * du / TEXTURA_M, v = uv.getY(i) * dv / TEXTURA_M;
      if (girar) [u, v] = [v, u];
      uv.setXY(i, u + cara * 0.37, v + cara * 0.21);   // desfase: cada cara con veta distinta
    }
  }
  return geo;
}

// ---------- Siluetas de ropa (planas, de perfil como se ve colgada en un closet) ----------
const COLORES_ROPA = {
  camisa: [0xffffff, 0x9cc3e6, 0xdfe7ef, 0x6f8fb3, 0xf2d6c9],
  pantalon: [0x3a4450, 0x2c3440, 0x6b5a48, 0x1f2a36, 0x8a8f96],
  vestido: [0xd6408e, 0x7e57c2, 0xe0474c, 0x1e88e5, 0xf5a623],
};
function siluetaPrenda(forma, largo) {
  const s = new THREE.Shape();
  const L = largo - 0.05;   // debajo del gancho
  if (forma === 'camisa') {
    s.moveTo(-0.02, -0.05); s.lineTo(-0.20, -0.09); s.lineTo(-0.22, -0.16); s.lineTo(-0.19, -L);
    s.lineTo(0.19, -L); s.lineTo(0.22, -0.16); s.lineTo(0.20, -0.09); s.lineTo(0.02, -0.05);
  } else if (forma === 'pantalon') {
    s.moveTo(-0.17, -0.05); s.lineTo(-0.16, -L); s.lineTo(-0.01, -L); s.lineTo(0, -L * 0.45);
    s.lineTo(0.01, -L); s.lineTo(0.16, -L); s.lineTo(0.17, -0.05);
  } else {
    s.moveTo(-0.02, -0.05); s.lineTo(-0.16, -0.09); s.lineTo(-0.14, -0.35);
    s.lineTo(-0.25, -L); s.lineTo(0.25, -L); s.lineTo(0.14, -0.35); s.lineTo(0.16, -0.09); s.lineTo(0.02, -0.05);
  }
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function montarVisor(contenedor, disenoInicial, { color = 'cedro', puerta = 'ninguna', ropa = true } = {}) {
  let diseno = disenoInicial;
  const { ancho: W, alto: H, fondo: D } = diseno.medidas;

  // --- Motor ---
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  contenedor.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(FONDO_ESCENA);

  const camara = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.target.set(0, H * 0.5, 0);
  controles.minPolarAngle = 0.35;
  controles.maxPolarAngle = Math.PI / 2 - 0.04;   // nunca por debajo del piso
  controles.minAzimuthAngle = -1.25;              // la parte de atrás no interesa
  controles.maxAzimuthAngle = 1.25;
  const lejos = Math.max(W, H) * 1.75;
  controles.minDistance = Math.max(W, H) * 0.6;
  controles.maxDistance = lejos * 1.4;
  camara.position.set(W * 0.55, H * 0.62, lejos);

  // --- Luces ---
  escena.add(new THREE.HemisphereLight(0xffffff, 0xb49a7a, 1.4));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(W * 0.8, H * 1.8, D * 6);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  const sc = sol.shadow.camera;
  sc.left = -W; sc.right = W; sc.top = H * 1.2; sc.bottom = -0.5; sc.near = 0.5; sc.far = 20;
  sol.shadow.bias = -0.0004;
  sol.shadow.radius = 4;
  escena.add(sol);
  const relleno = new THREE.DirectionalLight(0xfff3e0, 0.6);
  relleno.position.set(-W * 1.5, H, D * 3);
  escena.add(relleno);

  // --- Piso ---
  const piso = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(W, H) * 2.5, 48),
    new THREE.MeshStandardMaterial({ color: 0xe3c39a, roughness: 0.9 })
  );
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  escena.add(piso);

  // --- Materiales (el acabado cambia con el color escogido) ---
  const matMelamina = new THREE.MeshStandardMaterial({ roughness: 0.5 });
  const matInterior = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  const matFrente = new THREE.MeshStandardMaterial({ roughness: 0.42 });
  const matZocalo = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  const matCajon = new THREE.MeshStandardMaterial({ color: 0xf3efe8, roughness: 0.7 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, metalness: 0.9, roughness: 0.28 });
  const matAluminio = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.8, roughness: 0.35 });
  let textura = null;

  function aplicarColor(id) {
    const c = colorPorId(id);
    textura?.dispose();
    textura = texturaMadera(c);
    for (const [mat, tinte] of [[matMelamina, 0xffffff], [matFrente, 0xfff6ee], [matInterior, 0xe2d9cf], [matZocalo, 0x9a8b7e]]) {
      mat.map = textura;
      mat.color.set(tinte);
      mat.needsUpdate = true;
    }
  }
  aplicarColor(color);

  const x = v => v - W / 2;   // coordenada desde el borde izquierdo -> centrada

  function tabla(w, h, d, px, py, pz, mat, padre) {
    const m = new THREE.Mesh(cajaConVeta(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    padre.add(m);
    return m;
  }
  function vaciar(grupo) {
    grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    grupo.clear();
  }

  const yb = Z + T;               // piso interior
  const yt = H - T;               // techo interior
  const hi = yt - yb;

  // --- Mueble (estructura + interior) ---
  const mueble = new THREE.Group();
  escena.add(mueble);
  let cajones = [];               // { grupo, abierto, z }

  function construirMueble() {
    vaciar(mueble);
    cajones = [];
    tabla(T, H, D, x(T / 2), H / 2, 0, matMelamina, mueble);                        // lateral izquierdo
    tabla(T, H, D, x(W - T / 2), H / 2, 0, matMelamina, mueble);                    // lateral derecho
    tabla(W - 2 * T, T, D, 0, H - T / 2, 0, matMelamina, mueble);                   // techo
    tabla(W - 2 * T, T, D, 0, Z + T / 2, 0, matMelamina, mueble);                   // piso
    tabla(W - 2 * T, Z, T, 0, Z / 2, D / 2 - 0.04, matZocalo, mueble);              // zócalo (retrocedido)
    tabla(W - 2 * T, hi, 0.006, 0, yb + hi / 2, -D / 2 + 0.003, matInterior, mueble); // fondo

    const cuerpos = repartirCuerpos(diseno);
    cuerpos.slice(1).forEach(({ x0 }) => tabla(T, hi, D - 0.006, x(x0 - T / 2), yb + hi / 2, 0.003, matMelamina, mueble));

    cuerpos.forEach(({ x0, x1 }, i) => {
      const cw = x1 - x0, cx = x((x0 + x1) / 2);
      for (const e of diseno.cuerpos[i].elementos) {
        if (e.t === 'entrepano') tabla(cw, T, D - 0.03, cx, yb + e.y + T / 2, -0.012, matMelamina, mueble);

        if (e.t === 'divisor') tabla(T, e.y1 - e.y0, D - 0.03, cx, yb + (e.y0 + e.y1) / 2, -0.012, matMelamina, mueble);

        if (e.t === 'tubo') {
          const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, cw - 0.004, 20), matMetal);
          tubo.rotation.z = Math.PI / 2;
          tubo.position.set(cx, yb + e.y, 0);
          tubo.castShadow = true;
          mueble.add(tubo);
          for (const lado of [-1, 1]) {   // soportes
            const s = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 20), matMetal);
            s.rotation.z = Math.PI / 2;
            s.position.set(cx + lado * (cw / 2 - 0.004), yb + e.y, 0);
            mueble.add(s);
          }
        }

        if (e.t === 'cajones') {
          for (let j = 0; j < e.n; j++) {
            const g = new THREE.Group();
            const h = e.alto - 0.006, fw = cw - 0.004, prof = D - 0.07, hc = h - 0.05;
            g.position.set(cx, yb + e.y + j * e.alto + e.alto / 2, 0);
            tabla(fw, h, T, 0, 0, D / 2 - T / 2, matFrente, g);                                    // frente
            tabla(0.012, hc, prof, -(cw / 2 - 0.02), -0.012, D / 2 - T - prof / 2, matCajon, g);   // costados
            tabla(0.012, hc, prof, cw / 2 - 0.02, -0.012, D / 2 - T - prof / 2, matCajon, g);
            tabla(cw - 0.052, 0.012, prof, 0, -hc / 2 - 0.006, D / 2 - T - prof / 2, matCajon, g); // fondo del cajón
            tabla(cw - 0.052, hc, 0.012, 0, -0.012, D / 2 - T - prof + 0.006, matCajon, g);        // trasera
            const jal = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.16, fw * 0.4), 0.014, 0.022), matMetal);
            jal.position.set(0, h * 0.18, D / 2 + 0.011);
            jal.castShadow = true;
            g.add(jal);
            mueble.add(g);
            g.traverse(o => { o.userData.cajon = cajones.length; });
            cajones.push({ grupo: g, abierto: false, z: 0, base: 0 });
          }
        }

        if (e.t === 'zapatero') {
          const paso = (e.y1 - e.y0) / e.n, ang = 0.32;
          for (let j = 0; j < e.n; j++) {
            const y = yb + e.y0 + j * paso + paso * 0.45;
            const b = tabla(cw, 0.012, D * 0.7, cx, y, 0.02, matMelamina, mueble);
            b.rotation.x = ang;
            const riel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, cw - 0.01, 12), matMetal);
            riel.rotation.z = Math.PI / 2;
            riel.position.set(cx, y - Math.sin(ang) * D * 0.35 + 0.03, 0.02 + Math.cos(ang) * D * 0.35);
            mueble.add(riel);
          }
        }
      }
    });
  }

  // --- Ropa colgada: a su largo real; en rojo si no cabe ---
  const ropaGrupo = new THREE.Group();
  escena.add(ropaGrupo);
  const matsRopa = [];
  function construirRopa() {
    vaciar(ropaGrupo);
    matsRopa.forEach(m => m.dispose()); matsRopa.length = 0;
    const cuerpos = repartirCuerpos(diseno);
    const matGancho = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.6 });
    const matNoCabe = new THREE.MeshStandardMaterial({ color: 0xe0474c, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    matsRopa.push(matGancho, matNoCabe);
    for (const t of revisarTubos(diseno)) {
      const { x0, x1 } = cuerpos[t.ci];
      const uso = USOS[t.uso];
      const geo = siluetaPrenda(uso.forma, uso.largo);
      const paleta = COLORES_ROPA[uso.forma];
      const n = Math.max(2, Math.floor((x1 - x0 - 0.08) / 0.075));
      const paso = (x1 - x0 - 0.08) / (n - 1);
      for (let i = 0; i < n; i++) {
        const mat = t.cabe
          ? new THREE.MeshStandardMaterial({ color: paleta[(i * 3 + t.ci) % paleta.length], roughness: 0.85, side: THREE.DoubleSide })
          : matNoCabe;
        if (t.cabe) matsRopa.push(mat);
        const prenda = new THREE.Mesh(geo, mat);
        const px = x(x0 + 0.04 + i * paso);
        prenda.position.set(px, yb + t.y, 0);
        prenda.rotation.y = Math.PI / 2 + (((i * 37) % 7) - 3) * 0.03;   // de perfil, un poco desordenadas
        prenda.castShadow = true;
        ropaGrupo.add(prenda);
        const gancho = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.40), matGancho);
        gancho.position.set(px, yb + t.y - 0.05, 0);
        ropaGrupo.add(gancho);
      }
    }
    ropaGrupo.visible = verRopa;
  }
  let verRopa = ropa;

  // --- Puertas ---
  const puertasGrupo = new THREE.Group();
  escena.add(puertasGrupo);
  let tipoPuerta = puerta;
  let puertas = [];               // { pivote, tipo, lado, abierta, valor, ancho }
  function construirPuertas() {
    vaciar(puertasGrupo);
    puertas = [];
    // con puertas, los cajones van metidos 3,5 cm para que la jaladera no choque con la puerta
    cajones.forEach(c => { c.base = tipoPuerta === 'ninguna' ? 0 : -0.035; });
    if (tipoPuerta === 'batientes') {
      const cuerpos = repartirCuerpos(diseno);
      cuerpos.forEach(({ x0, x1 }, i) => {
        // borde de la puerta: tapa la mitad de la división (o todo el lateral en los extremos)
        const a = i === 0 ? 0 : x0 - T / 2, b = i === cuerpos.length - 1 ? W : x1 + T / 2;
        // altura del maletero de ese cuerpo: ahí se parte en puerta de arriba y de abajo
        const mal = Math.max(...diseno.cuerpos[i].elementos.filter(e => e.t === 'entrepano' && e.y > 1.6).map(e => e.y), 0);
        const tramos = mal ? [[Z, yb + mal + T / 2], [yb + mal + T / 2, H]] : [[Z, H]];
        const hojas = (b - a) > 0.6 ? 2 : 1;
        const wh = (b - a) / hojas;
        for (const [y0, y1] of tramos) {
          for (let k = 0; k < hojas; k++) {
            const lado = hojas === 2 ? (k === 0 ? 'izq' : 'der') : (i < cuerpos.length / 2 ? 'izq' : 'der');
            const pivote = new THREE.Group();
            const ancho = wh - 0.003, alto = y1 - y0 - 0.003;
            const bordeX = lado === 'izq' ? a + k * wh + 0.0015 : a + (k + 1) * wh - 0.0015;
            pivote.position.set(x(bordeX), y0 + 0.0015 + alto / 2, D / 2 + T / 2 + 0.002);
            const sgn = lado === 'izq' ? 1 : -1;
            tabla(ancho, alto, T, sgn * ancho / 2, 0, 0, matFrente, pivote);
            const jal = new THREE.Mesh(new THREE.BoxGeometry(0.014, Math.min(0.2, alto * 0.4), 0.022), matMetal);
            const esArriba = y0 > 1.5;
            jal.position.set(sgn * (ancho - 0.05), esArriba ? -alto / 2 + 0.12 : (alto > 1 ? 0.95 - alto / 2 : 0), T / 2 + 0.011);
            jal.castShadow = true;
            pivote.add(jal);
            puertasGrupo.add(pivote);
            pivote.traverse(o => { o.userData.puerta = puertas.length; });
            puertas.push({ pivote, tipo: 'batiente', lado, abierta: false, valor: 0 });
          }
        }
      });
    }
    if (tipoPuerta === 'corredizas') {
      const n = Math.max(2, diseno.cuerpos.length);
      const traslape = 0.03;
      const ancho = (W - 2 * T + (n - 1) * traslape) / n;
      const alto = H - Z - 0.03;
      for (let i = 0; i < n; i++) {
        const atras = i % 2 === 0;
        const pivote = new THREE.Group();
        const cx = T + ancho / 2 + i * (ancho - traslape);
        pivote.position.set(x(cx), Z + 0.012 + alto / 2, D / 2 + (atras ? 0.03 : 0.065));
        tabla(ancho, alto, T, 0, 0, 0, matFrente, pivote);
        // perfil de aluminio en los bordes (tirador)
        for (const lado of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, alto, 0.026), matAluminio);
          p.position.set(lado * (ancho / 2 - 0.01), 0, 0);
          pivote.add(p);
        }
        puertasGrupo.add(pivote);
        pivote.traverse(o => { o.userData.puerta = puertas.length; });
        // al abrir: las de atrás se esconden detrás de la vecina de la derecha, las de adelante hacia la izquierda
        const dir = atras ? (i === n - 1 ? -1 : 1) : -1;
        puertas.push({ pivote, tipo: 'corrediza', base: x(cx), recorrido: dir * (ancho - traslape), abierta: false, valor: 0, atras });
      }
      // rieles superior e inferior
      tabla(W, 0.03, 0.09, 0, H - 0.015, D / 2 + 0.047, matAluminio, puertasGrupo);
      tabla(W - 2 * T, 0.012, 0.09, 0, Z + 0.006, D / 2 + 0.047, matAluminio, puertasGrupo);
    }
  }

  construirMueble();
  construirRopa();
  construirPuertas();

  // --- Tamaño y dibujo ---
  function ajustar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camara.aspect = w / h;
    camara.fov = w / h < 0.8 ? 42 : 35;   // en pantallas angostas abrir el ángulo para que quepa el ancho
    camara.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(ajustar);
  ro.observe(contenedor);
  ajustar();

  let vivo = true;
  (function cuadro() {
    if (!vivo) return;
    for (const c of cajones) {
      c.z += ((c.abierto ? APERTURA : 0) - c.z) * 0.12;
      c.grupo.position.z = c.base + c.z;
    }
    for (const p of puertas) {
      p.valor += ((p.abierta ? 1 : 0) - p.valor) * 0.1;
      if (p.tipo === 'batiente') p.pivote.rotation.y = (p.lado === 'izq' ? -1 : 1) * GIRO_PUERTA * p.valor;
      else p.pivote.position.x = p.base + p.recorrido * p.valor;
    }
    controles.update();
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  })();

  // --- Tocar un cajón o una puerta lo abre/cierra (si fue un toque, no un giro) ---
  const ray = new THREE.Raycaster(), p = new THREE.Vector2();
  let inicio = null;
  renderer.domElement.addEventListener('pointerdown', e => { inicio = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!inicio || Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]) > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    p.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camara);
    const hit = ray.intersectObjects([puertasGrupo, mueble], true)
      .find(h => h.object.userData.cajon !== undefined || h.object.userData.puerta !== undefined);
    if (!hit) return;
    const { cajon, puerta: ip } = hit.object.userData;
    if (ip !== undefined) puertas[ip].abierta = !puertas[ip].abierta;
    else cajones[cajon].abierto = !cajones[cajon].abierto;
  });

  const puertasAbiertas = () => puertas.some(q => q.abierta);
  // Corredizas: "abrir todas" desliza las de atrás detrás de las de adelante (así es en la vida real:
  // nunca queda todo el frente abierto a la vez). Al tocar una hoja, esa se desliza sola.
  const abrirPuertas = abrir => puertas.forEach((q, i) => setTimeout(() => {
    q.abierta = abrir && (q.tipo === 'batiente' || q.atras);
  }, i * 60));

  return {
    get hayCajones() { return cajones.length > 0; },
    get hayPuertas() { return puertas.length > 0; },
    get puertasAbiertas() { return puertasAbiertas(); },
    /** Abre o cierra todos los cajones (abre las puertas si hace falta). Devuelve el nuevo estado. */
    alternarCajones() {
      const abrir = !cajones.some(c => c.abierto);
      if (abrir && puertas.length && !puertasAbiertas()) abrirPuertas(true);
      cajones.forEach((c, i) => setTimeout(() => { c.abierto = abrir; }, (abrir && puertas.length ? 400 : 0) + i * 90));
      return abrir;
    },
    /** Abre o cierra todas las puertas. Devuelve el nuevo estado. */
    alternarPuertas() {
      const abrir = !puertasAbiertas();
      if (!abrir) cajones.forEach(c => { c.abierto = false; });
      abrirPuertas(abrir);
      return abrir;
    },
    abrirPuertas,
    vistaFrontal() { camara.position.set(0, H * 0.55, lejos); controles.target.set(0, H * 0.5, 0); },
    /** Cambia la distribución interior (p. ej. tras "Ajustar" para la ropa). */
    actualizar(nuevo) { diseno = nuevo; construirMueble(); construirRopa(); construirPuertas(); },
    ponerColor: aplicarColor,
    ponerPuerta(tipo) { tipoPuerta = tipo; construirPuertas(); },
    mostrarRopa(v) { verRopa = v; ropaGrupo.visible = v; },
    destruir() {
      vivo = false;
      ro.disconnect();
      controles.dispose();
      escena.traverse(o => {
        o.geometry?.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      textura?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
