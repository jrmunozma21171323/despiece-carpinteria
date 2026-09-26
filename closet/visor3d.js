// Visor 3D del closet: se arma con la misma descripción de modelos.js.
// Arrastrar = girar, pellizcar = acercar, tocar un cajón = abrirlo/cerrarlo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ESPESOR as T, ZOCALO as Z, repartirCuerpos } from './modelos.js';

const FONDO_ESCENA = 0xefe2cc;   // mismo beige de la app
const APERTURA = 0.36;           // cuánto sale un cajón abierto (m)

const TEXTURA_M = 0.8;   // la textura representa 0,80 m de tablero

/** Textura de melamina tipo madera, dibujada en un canvas (no necesita descargar imágenes).
 *  Veta fina y casi recta a lo largo del eje horizontal de la imagen. */
function texturaMadera(base, oscura, clara) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
  let s = 11;
  const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const y = azar() * 512, amp = 0.4 + azar() * 1.6, fase = azar() * 6, largo = 180 + azar() * 400;
    g.strokeStyle = azar() < 0.7 ? oscura : clara;
    g.globalAlpha = 0.04 + azar() * 0.10;
    g.lineWidth = 0.5 + azar() * 1.8;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x / largo + fase) * amp * 3);
    g.stroke();
  }
  // manchas suaves que rompen la uniformidad
  for (let i = 0; i < 12; i++) {
    const y = azar() * 512;
    const grad = g.createLinearGradient(0, y - 30, 0, y + 30);
    grad.addColorStop(0, 'transparent'); grad.addColorStop(0.5, oscura); grad.addColorStop(1, 'transparent');
    g.globalAlpha = 0.05; g.fillStyle = grad; g.fillRect(0, y - 30, 1024, 60);
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

export function montarVisor(contenedor, modelo) {
  const { ancho: W, alto: H, fondo: D } = modelo.medidas;

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
  controles.minDistance = Math.max(W, H) * 0.7;
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

  // --- Materiales ---
  // Melamina tono cedro/roble; los cajones por dentro en blanco, como se usa en obra.
  const madera = texturaMadera('#a8754a', '#5e3b1f', '#c99a6c');
  const matMelamina = new THREE.MeshStandardMaterial({ map: madera, roughness: 0.5 });
  const matInterior = new THREE.MeshStandardMaterial({ map: madera, color: 0xd9cfc4, roughness: 0.6 });
  const matFrente = new THREE.MeshStandardMaterial({ map: madera, color: 0xfff4ea, roughness: 0.42 });
  const matCajon = new THREE.MeshStandardMaterial({ color: 0xf3efe8, roughness: 0.7 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, metalness: 0.9, roughness: 0.28 });
  const matZocalo = new THREE.MeshStandardMaterial({ map: madera, color: 0x8c7a6a, roughness: 0.6 });

  const mueble = new THREE.Group();
  escena.add(mueble);
  const x = v => v - W / 2;   // coordenada desde el borde izquierdo -> centrada

  function tabla(w, h, d, px, py, pz, mat = matMelamina, padre = mueble) {
    const m = new THREE.Mesh(cajaConVeta(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = m.receiveShadow = true;
    padre.add(m);
    return m;
  }

  // --- Estructura ---
  const yb = Z + T;               // piso interior
  const yt = H - T;               // techo interior
  const hi = yt - yb;
  tabla(T, H, D, x(T / 2), H / 2, 0);                      // lateral izquierdo
  tabla(T, H, D, x(W - T / 2), H / 2, 0);                  // lateral derecho
  tabla(W - 2 * T, T, D, 0, H - T / 2, 0);                 // techo
  tabla(W - 2 * T, T, D, 0, Z + T / 2, 0);                 // piso
  tabla(W - 2 * T, Z, T, 0, Z / 2, D / 2 - 0.04, matZocalo); // zócalo (retrocedido)
  tabla(W - 2 * T, hi, 0.006, 0, yb + hi / 2, -D / 2 + 0.003, matInterior); // fondo

  const cuerpos = repartirCuerpos(modelo);
  cuerpos.slice(1).forEach(({ x0 }) => tabla(T, hi, D - 0.006, x(x0 - T / 2), yb + hi / 2, 0.003)); // divisiones

  // --- Interior de cada cuerpo ---
  const cajones = [];   // { grupo, abierto }
  cuerpos.forEach(({ x0, x1 }, i) => {
    const cw = x1 - x0, cx = x((x0 + x1) / 2);
    for (const e of modelo.cuerpos[i].elementos) {
      if (e.t === 'entrepano') tabla(cw, T, D - 0.03, cx, yb + e.y + T / 2, -0.012);

      if (e.t === 'divisor') tabla(T, e.y1 - e.y0, D - 0.03, cx, yb + (e.y0 + e.y1) / 2, -0.012);

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
          const yc = yb + e.y + j * e.alto + e.alto / 2;
          g.position.set(cx, yc, 0);
          tabla(fw, h, T, 0, 0, D / 2 - T / 2, matFrente, g);                             // frente
          tabla(0.012, hc, prof, -(cw / 2 - 0.02), -0.012, D / 2 - T - prof / 2, matCajon, g); // costados
          tabla(0.012, hc, prof, cw / 2 - 0.02, -0.012, D / 2 - T - prof / 2, matCajon, g);
          tabla(cw - 0.052, 0.012, prof, 0, -hc / 2 - 0.006, D / 2 - T - prof / 2, matCajon, g); // fondo del cajón
          tabla(cw - 0.052, hc, 0.012, 0, -0.012, D / 2 - T - prof + 0.006, matCajon, g);  // trasera
          const jal = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.16, fw * 0.4), 0.014, 0.022), matMetal); // jaladera
          jal.position.set(0, h * 0.18, D / 2 + 0.011);
          jal.castShadow = true;
          g.add(jal);
          mueble.add(g);
          g.traverse(o => { o.userData.cajon = cajones.length; });
          cajones.push({ grupo: g, abierto: false, z: 0 });
        }
      }

      if (e.t === 'zapatero') {
        const paso = (e.y1 - e.y0) / e.n, ang = 0.32;
        for (let j = 0; j < e.n; j++) {
          const y = yb + e.y0 + j * paso + paso * 0.45;
          const b = tabla(cw, 0.012, D * 0.7, cx, y, 0.02, matMelamina);
          b.rotation.x = ang;
          const riel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, cw - 0.01, 12), matMetal);
          riel.rotation.z = Math.PI / 2;
          riel.position.set(cx, y - Math.sin(ang) * D * 0.35 + 0.03, 0.02 + Math.cos(ang) * D * 0.35);
          mueble.add(riel);
        }
      }
    }
  });

  // --- Tamaño y dibujo ---
  function ajustar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camara.aspect = w / h;
    // en pantallas angostas alejarse para que quepa el ancho completo
    camara.fov = w / h < 0.8 ? 42 : 35;
    camara.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(ajustar);
  ro.observe(contenedor);
  ajustar();

  let vivo = true;
  (function cuadro() {
    if (!vivo) return;
    for (const c of cajones) {   // cajones: se deslizan suave hacia su posición
      const meta = c.abierto ? APERTURA : 0;
      c.z += (meta - c.z) * 0.12;
      c.grupo.position.z = c.z;
    }
    controles.update();
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  })();

  // --- Tocar un cajón lo abre/cierra (si fue un toque, no un giro) ---
  const ray = new THREE.Raycaster(), p = new THREE.Vector2();
  let inicio = null;
  renderer.domElement.addEventListener('pointerdown', e => { inicio = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!inicio || Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]) > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    p.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camara);
    const hit = ray.intersectObject(mueble, true).find(h => h.object.userData.cajon !== undefined);
    if (hit) cajones[hit.object.userData.cajon].abierto = !cajones[hit.object.userData.cajon].abierto;
  });

  return {
    hayCajones: cajones.length > 0,
    /** Abre o cierra todos. Devuelve el nuevo estado. */
    alternarCajones() {
      const abrir = !cajones.some(c => c.abierto);
      cajones.forEach((c, i) => setTimeout(() => { c.abierto = abrir; }, i * 90));
      return abrir;
    },
    vistaFrontal() { camara.position.set(0, H * 0.55, lejos); },
    destruir() {
      vivo = false;
      ro.disconnect();
      controles.dispose();
      escena.traverse(o => {
        o.geometry?.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      madera.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
