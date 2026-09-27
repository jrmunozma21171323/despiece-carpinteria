// Motor de despiece del closet: del diseño (modelos.js) + materiales (materiales.js) a la lista completa
// de piezas, cantos, tableros, herrajes y consumibles. Todo en milímetros.
//
// Reglas de construcción (a validar con los carpinteros de la beta):
//  - Laterales enteros hasta el piso; techo, piso y zócalos van ENTRE laterales.
//  - Fondo sobrepuesto (clavado/atornillado atrás): las piezas de estructura pierden su espesor de fondo.
//  - Entrepaños y divisores retirados 20 mm del frente.
//  - Cajones: frente embutido con 2 mm de luz por lado; caja = hueco − 26 mm (correderas laterales);
//    fondo del cajón en HDF 3 mm.
//  - Puertas batientes sobrepuestas, partidas a la altura del maletero; 3 mm de luz entre puertas.
//  - Largo = sentido de la veta. Una pieza con veta no se puede girar al optimizar el corte.
import { ZOCALO, espesorDe, repartirCuerpos } from './modelos.js';
import { colorPorId } from './modelos.js';
import { opcion } from '../materiales.js';

export const TABLERO_MM = { largo: 2440, ancho: 1830 };   // formato más común en Colombia (a confirmar por depósito)
export const APROVECHAMIENTO = 0.85;                       // % del tablero que realmente se usa tras optimizar
const LARGOS_CORREDERA = [250, 300, 350, 400, 450, 500, 550];
const mm = m => Math.round(m * 1000);

export function calcularDespiece(cfg) {
  const d = cfg.diseno;
  const mat = cfg.materiales;
  const W = mm(d.medidas.ancho), H = mm(d.medidas.alto), D = mm(d.medidas.fondo);
  const T = mm(espesorDe(d)), Z = mm(ZOCALO);
  const EF = { hdf3: 3, mel9: 9, sin: 0 }[mat.fondo];
  const Dp = D - EF;                       // fondo de la estructura (el espaldar va por detrás)
  const Dint = Dp - 20;                    // entrepaños y divisores retirados del frente
  const yb = Z + T;                        // piso interior (desde el suelo)
  const color = colorPorId(cfg.color);
  const nombreTablero = `${opcion('tablero', mat.tablero).nombre} ${T} mm ${color.nombre}`;
  const conVeta = color.veta;

  // Canto: 'frente' = puertas y frentes de cajón; 'interior' = todo lo demás
  const canto = tipo => mat.canto === 'mixto' ? (tipo === 'frente' ? '2' : '0.45') : mat.canto === '2' ? '2' : '0.45';

  const piezas = [];
  const avisos = [];
  /**
   * Agrega una pieza. (a, b) son sus dos medidas; cantoA/cantoB = cuántos bordes de largo "a" / "b" llevan canto.
   * Se normaliza a largo ≥ ancho salvo que la veta obligue otra cosa (vetaEn = 'a' | 'b').
   */
  function pieza(modulo, nombre, cant, a, b, { material = nombreTablero, espesor = T, cantoA = 0, cantoB = 0, tipoCanto = 'interior', vetaEn = null, nota = '' } = {}) {
    a = Math.round(a); b = Math.round(b);
    let largo = a, ancho = b, cL = cantoA, cA = cantoB;
    const giraPorVeta = vetaEn === 'b';
    if ((vetaEn === null && b > a) || giraPorVeta) { largo = b; ancho = a; cL = cantoB; cA = cantoA; }
    const esMelamina = material === nombreTablero;
    piezas.push({
      modulo, nombre, cant, largo, ancho, espesor, material,
      veta: esMelamina && conVeta,
      cantoL: cL, cantoA: cA, tipoCanto: cL + cA ? canto(tipoCanto) : '', nota,
    });
  }
  const cuerpos = repartirCuerpos(d).map(({ x0, x1 }) => ({ x0: mm(x0), x1: mm(x1) }));

  // Techo, piso y zócalos más largos que la lámina: se parten SOBRE una división (ahí apoya la unión).
  const centrosDivision = cuerpos.slice(1).map(c => c.x0 - T / 2);
  function tramosHorizontales(ini = T, fin = W - T, limite = TABLERO_MM.largo) {
    const tramos = [];
    while (fin - ini > limite) {
      const corte = Math.max(...centrosDivision.filter(c => c > ini + 1 && c - ini <= limite), -1);
      if (corte < 0) return null;               // no hay división que sirva: se reparte en partes iguales
      tramos.push(corte - ini); ini = corte;
    }
    tramos.push(fin - ini);
    return tramos;
  }
  function piezaLarga(modulo, nombre, cant, largo, ancho, opts) {
    if (largo <= TABLERO_MM.largo) { pieza(modulo, nombre, cant, largo, ancho, opts); return; }
    const tramos = tramosHorizontales();
    if (tramos) {
      const nota = `Va en ${tramos.length} partes, unidas sobre una división`;
      tramos.forEach(t => pieza(modulo, nombre, cant, t, ancho, { ...opts, nota: [opts.nota, nota].filter(Boolean).join('. ') }));
    } else {
      const k = Math.ceil(largo / TABLERO_MM.largo);
      pieza(modulo, nombre, cant * k, largo / k, ancho, { ...opts, nota: `Va en ${k} partes: poner un refuerzo en cada unión` });
      avisos.push(`El ${nombre.toLowerCase()} es más largo que la lámina y no hay una división donde unirlo: agregar un cuerpo más o un refuerzo.`);
    }
  }

  // ---------- Estructura ----------
  pieza('Estructura', 'Lateral', 2, H, Dp, { cantoA: 1, vetaEn: 'a' });
  piezaLarga('Estructura', 'Techo', 1, W - 2 * T, Dp, { cantoA: 1 });
  piezaLarga('Estructura', 'Piso', 1, W - 2 * T, Dp, { cantoA: 1 });
  piezaLarga('Estructura', 'Zócalo', 2, W - 2 * T, Z, { nota: 'Uno adelante (retirado 4 cm) y uno atrás' });
  const hInterior = H - Z - 2 * T;
  if (cuerpos.length > 1) pieza('Estructura', 'División', cuerpos.length - 1, hInterior, Dp, { cantoA: 1, vetaEn: 'a' });

  // ---------- Interior de cada cuerpo ----------
  let nCajones = 0, largoCorredera = 0;
  const frentesCajon = [];
  const tubos = [];
  const bandejas = [];
  let tornillosEstructura = 0, tapatornillos = 0;

  cuerpos.forEach(({ x0, x1 }, i) => {
    const mod = `Cuerpo ${i + 1}`;
    const cw = x1 - x0;
    const els = d.cuerpos[i].elementos;
    const divisores = els.filter(e => e.t === 'divisor');
    const extremo = (i === 0 ? 1 : 0) + (i === cuerpos.length - 1 ? 1 : 0);   // extremos que tocan un lateral (tornillo visible)

    for (const e of els) {
      if (e.t === 'entrepano') {
        // si un divisor atraviesa este entrepaño, el entrepaño va en dos mitades
        const partido = divisores.some(v => e.y > v.y0 + 0.001 && e.y < v.y1 - 0.001);
        if (partido) pieza(mod, 'Entrepaño (nicho)', 2, (cw - T) / 2, Dint, { cantoA: 1 });
        else pieza(mod, e.y > 1.6 ? 'Entrepaño maletero' : 'Entrepaño', 1, cw, Dint, { cantoA: 1 });
        tornillosEstructura += 4; tapatornillos += 2 * extremo;
      }
      if (e.t === 'divisor') {
        pieza(mod, 'Divisor de nichos', 1, mm(e.y1 - e.y0) - T, Dint, { cantoA: 1, vetaEn: 'a' });
        tornillosEstructura += 4;
      }
      if (e.t === 'tubo') tubos.push(cw - 2);
      if (e.t === 'zapatero') {
        const fondoBandeja = Math.round(Dp * 0.6);
        pieza(mod, 'Bandeja zapatero', e.n, cw, fondoBandeja, { cantoA: 1 });
        for (let k = 0; k < e.n; k++) bandejas.push(cw);
        tornillosEstructura += 4 * e.n;
      }
      if (e.t === 'cajones') {
        const altoCajon = mm(e.alto);
        const cajaAncho = cw - 26;
        const cajaAlto = altoCajon - 50;
        largoCorredera = Math.max(...LARGOS_CORREDERA.filter(l => l <= Dp - T - 20), LARGOS_CORREDERA[0]);
        nCajones += e.n;
        const n = e.n;
        pieza(mod, 'Frente de cajón', n, cw - 4, altoCajon - 4, { cantoA: 2, cantoB: 2, tipoCanto: 'frente', vetaEn: 'a' });
        pieza(mod, 'Costado de cajón', 2 * n, largoCorredera, cajaAlto, { cantoA: 1 });
        pieza(mod, 'Contrafrente y trasera de cajón', 2 * n, cajaAncho - 2 * T, cajaAlto, { cantoA: 1 });
        // mismo HDF del fondo del closet: sale de los sobrantes de esas láminas
        pieza(mod, 'Fondo de cajón', n, cajaAncho, largoCorredera, { material: `HDF 3 mm ${mat.fondo === 'hdf3' ? color.nombre : 'Blanco'}`, espesor: 3 });
        for (let k = 0; k < n; k++) frentesCajon.push(cw - 4);
        tornillosEstructura += 12 * n;
      }
    }
  });
  // uniones de la estructura: techo y piso (3 por lado), divisiones (3 arriba, 3 abajo), zócalos (2 por lado)
  tornillosEstructura += 12 + 6 * (cuerpos.length - 1) + 8;
  tapatornillos += 12;

  // ---------- Fondo ----------
  if (mat.fondo !== 'sin') {
    const nombreFondo = mat.fondo === 'hdf3' ? `HDF 3 mm ${color.nombre}` : `Melamina 9 mm ${color.nombre}`;
    const altoFondo = H - Z;
    // la lámina de fondo va de pie: su ancho (1830) manda; las uniones caen sobre una división
    const tramos = W <= TABLERO_MM.ancho ? [W] : tramosHorizontales(0, W, TABLERO_MM.ancho);
    const partes = tramos || Array(Math.ceil(W / TABLERO_MM.ancho)).fill(W / Math.ceil(W / TABLERO_MM.ancho));
    const nota = partes.length > 1 ? `Va en ${partes.length} partes, unidas sobre ${tramos ? 'una división' : 'un refuerzo'}` : '';
    for (const ancho of partes) pieza('Fondo', 'Fondo', 1, ancho, altoFondo, { material: nombreFondo, espesor: EF, vetaEn: 'b', nota });
  }

  // ---------- Puertas ----------
  const puertas = [];   // { alto, ancho }
  if (cfg.puerta === 'batientes') {
    cuerpos.forEach(({ x0, x1 }, i) => {
      const a = i === 0 ? 0 : x0 - T / 2, b = i === cuerpos.length - 1 ? W : x1 + T / 2;
      const maletero = Math.max(0, ...d.cuerpos[i].elementos.filter(e => e.t === 'entrepano' && e.y > 1.6).map(e => e.y));
      const corte = maletero ? yb + mm(maletero) + T / 2 : 0;
      const tramos = corte ? [[Z, corte], [corte, H]] : [[Z, H]];
      const hojas = (b - a) > 600 ? 2 : 1;
      for (const [y0, y1] of tramos) {
        for (let k = 0; k < hojas; k++) puertas.push({ ancho: (b - a) / hojas - 3, alto: y1 - y0 - 3, arriba: y0 > Z });
      }
    });
    const abajo = puertas.filter(p => !p.arriba), arriba = puertas.filter(p => p.arriba);
    for (const [grupo, nombre] of [[abajo, 'Puerta'], [arriba, 'Puerta maletero']]) {
      // agrupar puertas iguales
      const iguales = {};
      for (const p of grupo) { const kk = `${Math.round(p.alto)}x${Math.round(p.ancho)}`; iguales[kk] = (iguales[kk] || 0) + 1; }
      for (const [kk, n] of Object.entries(iguales)) {
        const [alto, ancho] = kk.split('x').map(Number);
        pieza('Puertas', nombre, n, alto, ancho, { cantoA: 2, cantoB: 2, tipoCanto: 'frente', vetaEn: 'a' });
      }
    }
    if (puertas.some(p => p.alto > TABLERO_MM.largo)) avisos.push('Hay puertas más altas que el tablero: revisar con el depósito.');
  }
  let corredizas = null;
  if (cfg.puerta === 'corredizas') {
    const n = Math.max(2, cuerpos.length);
    const ancho = (W - 2 * T + (n - 1) * 30) / n;
    const alto = H - Z - 30;
    pieza('Puertas', 'Puerta corrediza', n, alto, ancho, { cantoA: 2, cantoB: 2, tipoCanto: 'frente', vetaEn: 'a', nota: 'Alto final según el sistema de riel' });
    corredizas = { n, ancho, alto };
  }

  // ---------- Agrupar piezas iguales ----------
  const mapa = new Map();
  for (const p of piezas) {
    const k = [p.nombre, p.largo, p.ancho, p.espesor, p.material, p.cantoL, p.cantoA, p.tipoCanto].join('|');
    if (mapa.has(k)) { const q = mapa.get(k); q.cant += p.cant; if (!q.modulos.includes(p.modulo)) q.modulos.push(p.modulo); }
    else mapa.set(k, { ...p, modulos: [p.modulo] });
  }
  const lista = [...mapa.values()].map((p, i) => ({ ...p, id: i + 1, modulo: p.modulos.join(', ') }));

  // ---------- Tableros (estimado por área; el depósito optimiza el corte) ----------
  const porMaterial = {};
  for (const p of lista) {
    const m = porMaterial[p.material] || (porMaterial[p.material] = { material: p.material, espesor: p.espesor, area: 0, piezas: 0 });
    m.area += p.largo * p.ancho * p.cant;
    m.piezas += p.cant;
  }
  const areaLamina = TABLERO_MM.largo * TABLERO_MM.ancho;
  const tableros = Object.values(porMaterial).map(m => ({
    ...m, m2: m.area / 1e6, laminas: Math.max(1, Math.ceil(m.area / (areaLamina * APROVECHAMIENTO))),
  }));

  // ---------- Cantos (metros lineales + 10 % de desperdicio) ----------
  const cantos = {};
  for (const p of lista) {
    if (!p.tipoCanto) continue;
    const metros = (p.cantoL * p.largo + p.cantoA * p.ancho) * p.cant / 1000;
    cantos[p.tipoCanto] = (cantos[p.tipoCanto] || 0) + metros;
  }
  const listaCantos = Object.entries(cantos).map(([tipo, m]) => ({
    nombre: `Canto PVC ${tipo.replace('.', ',')} mm × 22 mm ${color.nombre}`, metros: m, pedir: Math.ceil(m * 1.1),
  }));

  // ---------- Herrajes ----------
  const herrajes = [];
  const h = (nombre, cant, unidad = 'und', nota = '') => { if (cant > 0) herrajes.push({ nombre, cant, unidad, nota }); };
  let tornillosHerraje = 0;

  if (nCajones) {
    const tipo = { sencilla: 'sencilla de rodachín', telescopica: 'telescópica', cierre_lento: 'telescópica cierre lento' }[mat.correderas];
    h(`Corredera ${tipo} ${largoCorredera} mm`, nCajones, 'par');
    tornillosHerraje += 12 * nCajones;
  }
  if (cfg.puerta === 'batientes') {
    const porPuerta = alto => alto <= 900 ? 2 : alto <= 1600 ? 3 : alto <= 2000 ? 4 : 5;
    const nBis = puertas.reduce((s, p) => s + porPuerta(p.alto), 0);
    h(`Bisagra ${mat.bisagras === 'cierre_lento' ? 'cierre lento' : 'común'} cazoleta 35 mm`, nBis);
    tornillosHerraje += 4 * nBis;
  }
  if (corredizas) {
    const tipo = mat.riel === 'pesado' ? 'pesado' : 'sencillo';
    h(`Riel superior corredizo ${tipo}`, 1, 'und', `${(W / 1000).toFixed(2).replace('.', ',')} m`);
    h(`Riel inferior corredizo ${tipo}`, 1, 'und', `${(W / 1000).toFixed(2).replace('.', ',')} m`);
    h(`Kit de rodamientos para puerta corrediza (${tipo})`, corredizas.n);
    tornillosHerraje += 8 * corredizas.n + 16;
  }
  // jaladeras: una por cajón y una por puerta batiente (las de maletero también)
  const nJal = nCajones + (cfg.puerta === 'batientes' ? puertas.length : 0);
  if (nJal) {
    if (mat.jaladeras === 'barra') h('Jaladera tipo barra', nJal);
    if (mat.jaladeras === 'boton') h('Jaladera tipo botón', nJal);
    if (mat.jaladeras === 'push') h('Sistema push (apertura por presión)', nJal);
    if (mat.jaladeras === 'perfil') {
      const metros = frentesCajon.reduce((s, x) => s + x, 0) / 1000 + (cfg.puerta === 'batientes' ? puertas.reduce((s, p) => s + p.alto, 0) / 1000 : 0);
      h('Perfil tirador de aluminio', Math.ceil(metros * 1.05 * 10) / 10, 'm');
    }
  }
  if (tubos.length) {
    const tipo = mat.tubos === 'redondo' ? 'redondo' : 'ovalado';
    const total = tubos.reduce((s, x) => s + x, 0) / 1000;
    h(`Tubo de closet ${tipo} cromado`, tubos.length, 'tramo', `${tubos.map(x => (x / 10).toFixed(1).replace('.', ',') + ' cm').join(' + ')} (total ${total.toFixed(2).replace('.', ',')} m)`);
    h(`Soporte para tubo ${tipo}`, 2 * tubos.length);
    tornillosHerraje += 4 * tubos.length;
  }
  if (bandejas.length) {
    h('Varilla tope para zapatero', bandejas.length, 'und', `${(bandejas[0] / 10).toFixed(1).replace('.', ',')} cm c/u`);
    tornillosHerraje += 4 * bandejas.length;
  }

  // ---------- Consumibles ----------
  const consumibles = [];
  const c = (nombre, cant, unidad = 'und', nota = '') => { if (cant > 0) consumibles.push({ nombre, cant, unidad, nota }); };
  const redondear = (n, a) => Math.ceil(n / a) * a;
  c(`Tornillo para aglomerado 4 × ${T >= 18 ? 50 : 40} mm (armado)`, redondear(tornillosEstructura * 1.1, 10));
  c('Tornillo 4 × 16 mm (herrajes)', redondear(tornillosHerraje * 1.1, 10));
  if (mat.fondo !== 'sin') {
    const perimetro = 2 * (W + (H - Z)) + (cuerpos.length - 1) * (H - Z);
    c(mat.fondo === 'hdf3' ? 'Puntilla sin cabeza 1" (fondo)' : 'Tornillo 4 × 25 mm (fondo)', redondear(perimetro / 150, 10));
  }
  c(`Tapatornillo adhesivo ${color.nombre}`, redondear(tapatornillos, 10));
  if (nCajones) c('Pegante para madera (colbón) 250 g', 1);

  const nPiezas = lista.reduce((s, p) => s + p.cant, 0);
  return {
    titulo: `Closet ${cfg.modelo}`, medidas: { W, H, D }, espesor: T, nombreTablero,
    piezas: lista, nPiezas, tableros, cantos: listaCantos, herrajes, consumibles, avisos,
  };
}
