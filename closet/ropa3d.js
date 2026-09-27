// Ropa y objetos del closet en 3D: prendas colgadas en ganchos de madera, ropa doblada en los
// entrepaños, cajas en el maletero y zapatos en el zapatero. Solo es para que cliente y carpintero
// "vean" el closet en uso; el largo de cada prenda es el real (USOS), así se nota si no cabe.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { USOS, espesorDe, repartirCuerpos, revisarTubos } from './modelos.js';

// ---------- Colores sobrios (como un closet real) ----------
const PALETAS = {
  camisas: ['#f4f3ef', '#b9cde3', '#d5d7da', '#2f3c55', '#e8d2cf', '#4a4d52', '#dfe6ee'],
  chaquetas: ['#4b4e54', '#7d8187', '#b08a5e', '#2c3548', '#5e2f3a', '#26272b'],
  pantalones: ['#3a3d42', '#283246', '#b49c78', '#222326', '#6f737a'],
  vestidos: ['#7a2e3b', '#27324a', '#1f1f23', '#e9dfcc', '#c79a9a', '#2f5d50', '#6b6b4a'],
  doblada: ['#e9e4da', '#9aa3ad', '#3f4a5c', '#b98f76', '#6b7d6a', '#d8c8b0', '#58565a', '#a33b3b'],
  cajas: ['#f1ede4', '#e7d7b8', '#d9d4cc'],
  zapatos: ['#2b2220', '#5a3b28', '#1d1d1f', '#efeae2'],
};
const ROJO = new THREE.Color('#d0413c');
const GIRO = 0.5;   // cuánto se abren las prendas en abanico (rad)

// ---------- Texturas de tela (dibujadas en código): liso, rayas, cuadros; con pliegues suaves ----------
const cache = { tex: {}, mat: {}, geo: {} };

function texturaTela(tipo) {
  if (cache.tex[tipo]) return cache.tex[tipo];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  if (tipo === 'rayas') {
    g.fillStyle = 'rgba(40,60,90,.28)';
    for (let x = 0; x < 256; x += 14) g.fillRect(x, 0, 3, 256);
  }
  if (tipo === 'cuadros') {
    g.fillStyle = 'rgba(0,0,0,.20)';
    for (let i = 0; i < 256; i += 64) { g.fillRect(i, 0, 26, 256); g.fillRect(0, i, 256, 26); }
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 40; i < 256; i += 64) { g.fillRect(i, 0, 3, 256); g.fillRect(0, i, 256, 3); }
  }
  // pliegues verticales suaves
  let s = 5;
  const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) {
    const x = azar() * 256, w = 18 + azar() * 40;
    const gr = g.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, `rgba(0,0,0,${0.06 + azar() * 0.08})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - w, 0, 2 * w, 256);
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.repeat.set(4, 4);   // 256 px = 25 cm de tela
  cache.tex[tipo] = tx;
  return tx;
}

function tela(color, tipo = 'liso', noCabe = false) {
  const clave = `${color}|${tipo}|${noCabe}`;
  if (!cache.mat[clave]) {
    const c = new THREE.Color(color);
    if (noCabe) c.lerp(ROJO, 0.7);
    cache.mat[clave] = new THREE.MeshStandardMaterial({ color: c, map: texturaTela(tipo), roughness: 0.92 });
  }
  return cache.mat[clave];
}
const plano = (color, rough = 0.8, metal = 0) => {
  const clave = `p|${color}|${rough}|${metal}`;
  return cache.mat[clave] || (cache.mat[clave] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
};

// ---------- Geometrías ----------
function extruir(shape, grosor) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: grosor, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, -grosor / 2);
  return g;
}
function geo(clave, crear) {
  if (!cache.geo[clave]) { cache.geo[clave] = crear(); cache.geo[clave].userData.compartida = true; }
  return cache.geo[clave];
}

/** Gancho de madera con garfio metálico (+ barra para pantalón). Origen = eje del tubo. */
function gancho(conBarra) {
  const g = new THREE.Group();
  const arco = geo('gancho', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.215, -0.088, 0), new THREE.Vector3(-0.12, -0.062, 0), new THREE.Vector3(0, -0.04, 0),
    new THREE.Vector3(0.12, -0.062, 0), new THREE.Vector3(0.215, -0.088, 0),
  ]), 24, 0.008, 6));
  g.add(new THREE.Mesh(arco, plano('#c89a64', 0.55)));
  const garfio = new THREE.Mesh(geo('garfio', () => new THREE.TorusGeometry(0.019, 0.0024, 6, 18, Math.PI * 1.3)), plano('#c9ccd0', 0.3, 0.9));
  garfio.rotation.z = -0.3 * Math.PI;
  g.add(garfio);
  const cuello = new THREE.Mesh(geo('cuello', () => new THREE.CylinderGeometry(0.0024, 0.0024, 0.03, 6)), garfio.material);
  cuello.position.set(0.012, -0.028, 0); cuello.rotation.z = 0.4;
  g.add(cuello);
  if (conBarra) {
    const barra = new THREE.Mesh(geo('barra', () => new THREE.CylinderGeometry(0.007, 0.007, 0.42, 8)), plano('#c89a64', 0.55));
    barra.rotation.z = Math.PI / 2; barra.position.y = -0.09;
    g.add(barra);
  }
  return g;
}

function formaCamisa(L, hombro) {
  const s = new THREE.Shape();
  s.moveTo(-0.045, -0.04);
  s.quadraticCurveTo(-0.13, -0.05, -hombro, -0.09);
  s.lineTo(-hombro + 0.012, -(L - 0.06));
  s.quadraticCurveTo(-0.09, -(L - 0.015), 0, -L);
  s.quadraticCurveTo(0.09, -(L - 0.015), hombro - 0.012, -(L - 0.06));
  s.lineTo(hombro, -0.09);
  s.quadraticCurveTo(0.13, -0.05, 0.045, -0.04);
  s.lineTo(0, -0.08);
  s.closePath();
  return s;
}
function formaVestido(L) {
  const s = new THREE.Shape();
  const vuelo = L > 1.3 ? 0.30 : 0.25;
  s.moveTo(-0.045, -0.045);
  s.lineTo(-0.115, -0.055);
  s.quadraticCurveTo(-0.155, -0.17, -0.128, -0.31);
  s.quadraticCurveTo(-0.118, -0.37, -0.14, -0.43);
  s.quadraticCurveTo(-0.22, -L * 0.72, -vuelo, -L);
  s.quadraticCurveTo(0, -(L + 0.035), vuelo, -L);
  s.quadraticCurveTo(0.22, -L * 0.72, 0.14, -0.43);
  s.quadraticCurveTo(0.118, -0.37, 0.128, -0.31);
  s.quadraticCurveTo(0.155, -0.17, 0.115, -0.055);
  s.lineTo(0.045, -0.045);
  s.quadraticCurveTo(0, -0.12, -0.045, -0.045);
  return s;
}
function formaPantalonLargo(L) {
  const s = new THREE.Shape();
  s.moveTo(-0.17, -0.1); s.lineTo(0.17, -0.1);
  s.lineTo(0.15, -L); s.lineTo(0.022, -L); s.lineTo(0, -0.42); s.lineTo(-0.022, -L); s.lineTo(-0.15, -L);
  s.closePath();
  return s;
}
function formaPantalonDoblado(L) {
  const s = new THREE.Shape();
  s.moveTo(-0.165, -0.095); s.lineTo(0.165, -0.095);
  s.quadraticCurveTo(0.16, -L * 0.6, 0.148, -L); s.lineTo(-0.148, -L);
  s.quadraticCurveTo(-0.16, -L * 0.6, -0.165, -0.095);
  return s;
}

/** Una prenda colgada con su gancho. Origen = eje del tubo; la prenda queda en el plano XY, frente hacia +Z. */
function prenda(uso, color, patron, noCabe) {
  const L = USOS[uso].largo;
  const g = new THREE.Group();
  const mat = tela(color, patron, noCabe);
  const sombra = m => { m.castShadow = true; return m; };

  if (uso === 'camisas' || uso === 'chaquetas') {
    const saco = uso === 'chaquetas';
    const hombro = saco ? 0.215 : 0.195;
    g.add(gancho(false));
    g.add(sombra(new THREE.Mesh(geo(`cam${saco}${L}`, () => extruir(formaCamisa(L, hombro), saco ? 0.06 : 0.035)), mat)));
    const largoManga = saco ? 0.6 : 0.56;
    for (const lado of [-1, 1]) {
      const manga = sombra(new THREE.Mesh(geo(`manga${saco}`, () => new THREE.CapsuleGeometry(saco ? 0.036 : 0.03, largoManga, 4, 10)), mat));
      manga.position.set(lado * (hombro + 0.004), -0.09 - largoManga / 2 - 0.02, 0);
      manga.rotation.z = lado * 0.05;
      manga.scale.z = 0.75;
      g.add(manga);
    }
    const frente = (saco ? 0.03 : 0.0175) + 0.006;
    if (saco) {   // camisa blanca asomando entre las solapas + botones
      const v = new THREE.Shape();
      v.moveTo(-0.05, -0.045); v.lineTo(0.05, -0.045); v.lineTo(0, -0.29); v.closePath();
      const pecho = new THREE.Mesh(geo('pecho', () => new THREE.ShapeGeometry(v)), plano('#f2f1ed', 0.9));
      pecho.position.z = frente + 0.001;
      g.add(pecho);
      for (const y of [-0.33, -0.43]) {
        const b = new THREE.Mesh(geo('boton', () => new THREE.SphereGeometry(0.008, 8, 6)), plano('#1b1b1d', 0.4));
        b.position.set(0, y, frente + 0.002);
        g.add(b);
      }
    } else {      // tapeta de botones
      const tapeta = new THREE.Mesh(geo(`tapeta${L}`, () => new THREE.BoxGeometry(0.018, L - 0.13, 0.003)), tela(color, 'liso', noCabe));
      tapeta.position.set(0, -0.08 - (L - 0.13) / 2, frente);
      g.add(tapeta);
    }
  } else if (uso === 'pantalones') {       // doblado sobre la barra del gancho
    g.add(gancho(true));
    const cuerpo = geo(`pd${L}`, () => extruir(formaPantalonDoblado(L), 0.022));
    for (const z of [-0.018, 0.018]) {
      const capa = sombra(new THREE.Mesh(cuerpo, mat));
      capa.position.z = z;
      g.add(capa);
    }
    const dobles = sombra(new THREE.Mesh(geo('dobles', () => new THREE.CylinderGeometry(0.03, 0.03, 0.33, 12)), mat));
    dobles.rotation.z = Math.PI / 2; dobles.position.y = -0.095;
    g.add(dobles);
  } else if (uso === 'pantalones_largos') { // colgado de la pretina
    g.add(gancho(true));
    g.add(sombra(new THREE.Mesh(geo(`pl${L}`, () => extruir(formaPantalonLargo(L), 0.04)), mat)));
    const pretina = new THREE.Mesh(geo('pretina', () => new THREE.BoxGeometry(0.35, 0.045, 0.058)), tela(new THREE.Color(color).multiplyScalar(0.75).getStyle(), 'liso', noCabe));
    pretina.position.y = -0.115;
    g.add(pretina);
  } else {                                  // vestidos y abrigos
    g.add(gancho(false));
    g.add(sombra(new THREE.Mesh(geo(`v${L}`, () => extruir(formaVestido(L), 0.045)), mat)));
    const cinturon = new THREE.Mesh(geo('cint', () => new THREE.BoxGeometry(0.27, 0.025, 0.06)), tela(new THREE.Color(color).multiplyScalar(0.7).getStyle(), 'liso', noCabe));
    cinturon.position.y = -0.4;
    g.add(cinturon);
  }
  return g;
}

/** Arma todo: prendas en los tubos, ropa doblada, cajas y zapatos. */
export function vestirCloset(grupo, diseno, { yb, x }) {
  const T = espesorDe(diseno);
  const cuerpos = repartirCuerpos(diseno);

  // --- Prendas colgadas ---
  for (const t of revisarTubos(diseno)) {
    const { x0, x1 } = cuerpos[t.ci];
    const paleta = PALETAS[t.uso === 'pantalones_largos' ? 'pantalones' : t.uso.startsWith('vestidos') ? 'vestidos' : t.uso];
    // margen: con el giro en abanico cada prenda ocupa ~media anchura x sen(giro) hacia cada lado
    const mediaAnchura = { camisas: 0.24, chaquetas: 0.26, pantalones: 0.2, pantalones_largos: 0.2, vestidos_cortos: 0.27, vestidos_largos: 0.31 }[t.uso];
    const m = mediaAnchura * Math.sin(GIRO) + 0.015;
    const util = x1 - x0 - 2 * m;
    const n = Math.max(2, Math.floor(util / 0.06) + 1);
    const paso = util / (n - 1);
    for (let i = 0; i < n; i++) {
      const color = paleta[(i * 5 + t.ci * 3 + t.k) % paleta.length];
      const patron = t.uso === 'camisas' ? (i % 4 === 1 ? 'rayas' : i % 5 === 3 ? 'cuadros' : 'liso') : 'liso';
      const p = prenda(t.uso, color, patron, !t.cabe);
      p.position.set(x(x0 + m + i * paso), yb + t.y, 0);
      // de perfil al tubo y abiertas en abanico, como se ven colgadas de verdad
      p.rotation.y = Math.PI / 2 - GIRO + (((i * 7) % 5) - 2) * 0.03;
      grupo.add(p);
    }
  }

  // --- Ropa doblada, cajas y zapatos ---
  const alturaDe = e => e.t === 'entrepano' ? [e.y, e.y + T] : e.t === 'cajones' ? [e.y, e.y + e.n * e.alto] : e.t === 'zapatero' ? [e.y0, e.y1] : null;
  cuerpos.forEach(({ x0, x1 }, ci) => {
    const els = diseno.cuerpos[ci].elementos;
    const cw = x1 - x0;
    const hi = diseno.medidas.alto - 0.08 - 2 * T;
    const solidos = [[-1, 0], [hi, hi + 1], ...els.map(alturaDe).filter(Boolean)].sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < solidos.length - 1; i++) {
      const g0 = solidos[i][1], g1 = solidos[i + 1][0], alto = g1 - g0;
      if (alto < 0.15) continue;
      if (els.some(e => e.t === 'tubo' && e.y > g0 && e.y < g1)) continue;   // espacio de colgar
      const divisor = els.some(e => e.t === 'divisor' && e.y0 <= g0 + 0.01 && e.y1 >= g1 - 0.01);
      const nichos = divisor ? [[x0, x0 + cw / 2 - T / 2], [x0 + cw / 2 + T / 2, x1]] : [[x0, x1]];
      nichos.forEach(([a, b], ni) => {
        const w = b - a;
        if (g0 > 1.55) {                   // maletero: cajas de guardar
          const caja = new THREE.Mesh(new RoundedBoxGeometry(Math.min(0.36, w - 0.06), Math.min(0.22, alto - 0.05), 0.36, 2, 0.012),
            plano(PALETAS.cajas[(ci + ni) % 3], 0.85));
          caja.position.set(x(a + w / 2 - 0.02 * (ci % 2 ? 1 : -1)), yb + g0 + Math.min(0.22, alto - 0.05) / 2, 0.02);
          caja.receiveShadow = true;
          grupo.add(caja);
          return;
        }
        const pilas = w > 0.62 ? 2 : 1;    // ropa doblada
        const capas = Math.min(6, Math.floor((alto - 0.07) / 0.042));
        for (let k = 0; k < pilas; k++) {
          const cx = a + (w / pilas) * (k + 0.5);
          for (let c = 0; c < capas; c++) {
            const pieza = new THREE.Mesh(new RoundedBoxGeometry(Math.min(0.30, w / pilas - 0.05), 0.04, 0.27, 2, 0.012),
              tela(PALETAS.doblada[(ci * 3 + k * 2 + c + ni) % PALETAS.doblada.length], c % 3 === 2 ? 'rayas' : 'liso'));
            pieza.position.set(x(cx + (((c * 13 + k) % 5) - 2) * 0.004), yb + g0 + 0.02 + c * 0.042, 0.03);
            pieza.rotation.y = (((c * 7) % 3) - 1) * 0.02;
            grupo.add(pieza);
          }
        }
      });
    }
    // zapatos en cada bandeja del zapatero
    for (const e of els.filter(e => e.t === 'zapatero')) {
      const paso = (e.y1 - e.y0) / e.n, ang = 0.32;
      for (let j = 0; j < e.n; j++) {
        const bandeja = new THREE.Group();
        bandeja.position.set(x(x0 + cw / 2), yb + e.y0 + j * paso + paso * 0.45, 0.02);
        bandeja.rotation.x = ang;
        const pares = Math.max(1, Math.floor(cw / 0.24));
        for (let q = 0; q < pares; q++) {
          const mat = plano(PALETAS.zapatos[(j + q + ci) % PALETAS.zapatos.length], 0.5);
          for (const lado of [-1, 1]) {
            const zapato = new THREE.Mesh(geo('zapato', () => {
              const g = new THREE.CapsuleGeometry(0.04, 0.17, 4, 10);
              g.rotateX(Math.PI / 2);
              g.scale(1, 0.75, 1);
              return g;
            }), mat);
            zapato.position.set(-cw / 2 + (cw / pares) * (q + 0.5) + lado * 0.05, 0.036, 0);
            bandeja.add(zapato);
          }
        }
        grupo.add(bandeja);
      }
    }
  });
}

/** Libera texturas y materiales compartidos (al cerrar el visor). */
export function liberarRopa() {
  for (const k of ['tex', 'mat', 'geo']) { Object.values(cache[k]).forEach(o => o.dispose()); cache[k] = {}; }
}
