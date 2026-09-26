// Modelos base de closet. Una sola descripción alimenta el dibujo de la tarjeta, el visor 3D
// y (más adelante) el despiece. Medidas en metros.
//
// Cada modelo trae medidas de referencia (ancho, alto, fondo) y sus cuerpos, de izquierda a derecha.
// Dentro de cada cuerpo, "y" se mide desde el piso interior del closet (encima de la base).
//   entrepano {y}              tabla horizontal
//   tubo      {y, uso}         tubo para colgar; "uso" = qué ropa va ahí (ver USOS)
//   cajones   {y, n, alto}     n cajones apilados desde y, cada uno de "alto"
//   divisor   {y0, y1}         tabla vertical en la mitad del cuerpo (arma nichos)
//   zapatero  {y0, y1, n}      n bandejas inclinadas para zapatos

export const ESPESOR = 0.018;   // tablero de 18 mm
export const ZOCALO = 0.08;     // altura de la base
const T = ESPESOR;

const MALETERO = 1.85;          // altura del entrepaño de maleteros en la mayoría de modelos

// ---------- Ropa colgada ----------
// "largo": del tubo hasta el borde inferior de la prenda, con gancho incluido.
// Son valores de referencia de diseño de closets; se validan con los carpinteros en la beta.
export const HOLGURA = 0.03;      // aire mínimo entre la prenda y lo que haya debajo
export const GANCHO = 0.06;       // lo que ocupa el gancho por encima del tubo
export const FONDO_MIN = 0.55;    // fondo interior mínimo para que el gancho no roce
export const USOS = {
  camisas:           { nombre: 'Camisas y blusas',           largo: 0.90, forma: 'camisa' },
  chaquetas:         { nombre: 'Chaquetas y sacos',          largo: 1.00, forma: 'camisa' },
  pantalones:        { nombre: 'Pantalones doblados',        largo: 0.70, forma: 'pantalon' },
  pantalones_largos: { nombre: 'Pantalones largos colgados', largo: 1.15, forma: 'pantalon' },
  vestidos_cortos:   { nombre: 'Vestidos cortos',            largo: 1.10, forma: 'vestido' },
  vestidos_largos:   { nombre: 'Vestidos largos y abrigos',  largo: 1.55, forma: 'vestido' },
};
export const necesita = uso => USOS[uso].largo + HOLGURA;

export const MODELOS = [
  {
    id: 'clasico',
    nombre: 'Clásico 3 cuerpos',
    resumen: 'Tubos a los lados, cajones y nichos al centro',
    medidas: { ancho: 2.40, alto: 2.40, fondo: 0.60 },
    cuerpos: [
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75, uso: 'camisas' },
        { t: 'entrepano', y: 0.62 }, { t: 'cajones', y: 0.02, n: 2, alto: 0.29 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.50 }, { t: 'entrepano', y: 1.15 },
        { t: 'divisor', y0: 1.15, y1: MALETERO }, { t: 'tubo', y: 1.05, uso: 'pantalones' },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75, uso: 'vestidos_cortos' },
        { t: 'entrepano', y: 0.58 }, { t: 'cajones', y: 0.02, n: 2, alto: 0.28 },
      ] },
    ],
  },
  {
    id: 'colgado',
    nombre: 'Colgado largo + cajonera',
    resumen: 'Ropa larga de un lado, 4 cajones del otro',
    medidas: { ancho: 1.80, alto: 2.40, fondo: 0.60 },
    cuerpos: [
      { ancho: 1.1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75, uso: 'vestidos_largos' },
      ] },
      { ancho: 0.9, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.45 }, { t: 'entrepano', y: 1.00 },
        { t: 'cajones', y: 0.02, n: 4, alto: 0.24 },
      ] },
    ],
  },
  {
    id: 'doble',
    nombre: 'Doble tubo + zapatero',
    resumen: 'Camisas en dos alturas y zapatero abajo',
    medidas: { ancho: 2.40, alto: 2.40, fondo: 0.60 },
    cuerpos: [
      // doble colgado: maletero más bajito para que ambos tubos tengan largo de camisa
      { ancho: 1, elementos: [
        { t: 'entrepano', y: 2.04 }, { t: 'tubo', y: 1.97, uso: 'camisas' },
        { t: 'tubo', y: 0.96, uso: 'camisas' },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.45 }, { t: 'entrepano', y: 1.05 },
        { t: 'entrepano', y: 0.62 }, { t: 'cajones', y: 0.02, n: 2, alto: 0.29 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75, uso: 'camisas' },
        { t: 'entrepano', y: 0.78 }, { t: 'zapatero', y0: 0.04, y1: 0.76, n: 3 },
      ] },
    ],
  },
  {
    id: 'esencial',
    nombre: 'Esencial 2 cuerpos',
    resumen: 'Tubo y entrepaños, el más económico',
    medidas: { ancho: 1.50, alto: 2.40, fondo: 0.60 },
    cuerpos: [
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75, uso: 'vestidos_largos' },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.45 }, { t: 'entrepano', y: 1.05 },
        { t: 'entrepano', y: 0.65 }, { t: 'entrepano', y: 0.25 },
      ] },
    ],
  },
];

export const modeloPorId = id => MODELOS.find(m => m.id === id);

// ---------- Acabados (color de la melamina) ----------
export const COLORES = [
  { id: 'blanco', nombre: 'Blanco',      base: '#f1efea', oscura: '#d8d3ca', clara: '#ffffff', veta: false },
  { id: 'roble',  nombre: 'Roble claro', base: '#c9a277', oscura: '#8a6440', clara: '#e4c9a4', veta: true },
  { id: 'cedro',  nombre: 'Cedro',       base: '#a8754a', oscura: '#5e3b1f', clara: '#c99a6c', veta: true },
  { id: 'wengue', nombre: 'Wengué',      base: '#4d372a', oscura: '#23170f', clara: '#6d5140', veta: true },
];
export const colorPorId = id => COLORES.find(c => c.id === id) || COLORES[2];

// ---------- Puertas ----------
export const PUERTAS = [
  { id: 'ninguna',    nombre: 'Sin puertas', detalle: 'Closet abierto' },
  { id: 'batientes',  nombre: 'Batientes',   detalle: 'Abren de frente' },
  { id: 'corredizas', nombre: 'Corredizas',  detalle: 'Se deslizan a los lados' },
];

/** Reparte el ancho interior entre los cuerpos. Devuelve [{x0, x1}] en metros desde el borde izquierdo. */
export function repartirCuerpos(diseno) {
  const { ancho } = diseno.medidas;
  const n = diseno.cuerpos.length;
  const util = ancho - 2 * T - (n - 1) * T;
  const total = diseno.cuerpos.reduce((s, c) => s + c.ancho, 0);
  let x = T;
  return diseno.cuerpos.map(c => {
    const w = util * c.ancho / total;
    const r = { x0: x, x1: x + w };
    x += w + T;
    return r;
  });
}

/** Alto interior útil (del piso interior al techo interior). */
export const altoInterior = m => m.medidas.alto - ZOCALO - 2 * T;

/** Hasta dónde sube un elemento (su borde superior), para medir el espacio libre bajo un tubo. */
function tope(e) {
  if (e.t === 'entrepano') return e.y + T;
  if (e.t === 'cajones') return e.y + e.n * e.alto;
  if (e.t === 'zapatero') return e.y1;
  if (e.t === 'tubo') return e.y + GANCHO;       // los ganchos del tubo de abajo
  if (e.t === 'divisor') return e.y1;
  return 0;
}

/** Revisa cada tubo: cuánto espacio libre tiene debajo y si cabe la ropa que se va a colgar ahí. */
export function revisarTubos(diseno) {
  const r = [];
  const anchos = repartirCuerpos(diseno).map(({ x0, x1 }) => x1 - x0 - 0.04);
  diseno.cuerpos.forEach((c, ci) => {
    const tubos = c.elementos.filter(e => e.t === 'tubo').sort((a, b) => b.y - a.y);
    tubos.forEach((tubo, k) => {
      const debajo = c.elementos.filter(e => e !== tubo && (e.t === 'tubo' ? e.y < tubo.y : tope(e) <= tubo.y + 0.001));
      const piso = Math.max(0, ...debajo.map(tope));
      const espacio = tubo.y - piso;
      const uso = tubo.uso || 'camisas';
      const falta = necesita(uso) - espacio;
      r.push({
        clave: `${ci}-${k}`, ci, k, total: tubos.length, y: tubo.y, uso, espacio,
        cabe: falta <= 0.0005, falta: Math.max(0, falta),
        prendas: Math.max(1, Math.floor(anchos[ci] / 0.045)),   // ~4,5 cm por prenda en gancho
      });
    });
  });
  return r;
}

/** Cambia la ropa asignada a un tubo. Devuelve un diseño nuevo. */
export function cambiarUso(diseno, ci, k, uso) {
  const d = copiar(diseno);
  const tubos = d.cuerpos[ci].elementos.filter(e => e.t === 'tubo').sort((a, b) => b.y - a.y);
  tubos[k].uso = uso;
  return d;
}

/**
 * Reorganiza lo que hay debajo de un tubo para que quepa su ropa:
 * menos cajones, zapatero más bajito, o quitar entrepaños/tubos que estorban.
 * Devuelve { diseno, cambios: [texto…] } o null si ni despejando todo cabe.
 */
export function ajustarTubo(diseno, ci, k) {
  const d = copiar(diseno);
  const cuerpo = d.cuerpos[ci];
  const tubo = cuerpo.elementos.filter(e => e.t === 'tubo').sort((a, b) => b.y - a.y)[k];
  const limite = tubo.y - necesita(tubo.uso || 'camisas');   // la prenda llega hasta aquí
  if (limite < 0) return null;
  const cambios = [];
  const quedan = [];
  for (const e of cuerpo.elementos) {
    const esDebajo = e !== tubo && (e.t === 'tubo' ? e.y < tubo.y : tope(e) <= tubo.y + 0.001);
    if (!esDebajo || tope(e) <= limite + 0.0005) { quedan.push(e); continue; }
    if (e.t === 'cajones') {
      const n = Math.floor((limite - T - 0.002 - e.y) / e.alto + 1e-6);   // deja sitio al entrepaño que lo tapa
      if (n >= 1) { cambios.push(`cajones: de ${e.n} a ${n}`); quedan.push({ ...e, n }); }
      else cambios.push(`se quitan los ${e.n} cajones`);
    } else if (e.t === 'zapatero') {
      const y1 = limite - T - 0.002;
      if (y1 - e.y0 >= 0.24) { cambios.push('zapatero más bajito'); quedan.push({ ...e, y1, n: Math.max(1, Math.round((y1 - e.y0) / 0.25)) }); }
      else cambios.push('se quita el zapatero');
    } else if (e.t === 'tubo') cambios.push('se quita el tubo de abajo');
    else if (e.t === 'entrepano') { /* se reubica abajo si hace falta */ }
    else cambios.push('se quita el divisor');
  }
  // Si debajo del tubo quedaron cajones o zapatero, taparlos con un entrepaño (el que se quitó "baja").
  const techoBajo = Math.max(0, ...quedan
    .filter(e => (e.t === 'cajones' || e.t === 'zapatero') && tope(e) < tubo.y)
    .map(tope));
  const yaTapado = quedan.some(e => e.t === 'entrepano' && e.y < tubo.y && Math.abs(e.y - techoBajo) < 0.03);
  const quitados = cuerpo.elementos.filter(e => e.t === 'entrepano' && !quedan.includes(e)).length;
  if (techoBajo > 0 && !yaTapado) {
    quedan.push({ t: 'entrepano', y: techoBajo + 0.002 });
    if (quitados) cambios.push('el entrepaño baja');
  } else if (quitados) cambios.push(quitados === 1 ? 'se quita un entrepaño' : `se quitan ${quitados} entrepaños`);
  cuerpo.elementos = quedan;
  return { diseno: d, cambios };
}

export const copiar = x => JSON.parse(JSON.stringify(x));

/** Dibujo frontal (SVG) del diseño, mismo estilo que las ilustraciones del mosaico. */
export function dibujoFrontal(diseno) {
  const k = 100; // metros -> unidades del dibujo (cm)
  const { ancho, alto } = diseno.medidas;
  const W = ancho * k, H = alto * k;
  const t = 4;   // grosor visual de las tablas: más que 1,8 cm para que se lea en pequeño
  const yb = H - ZOCALO * k - t;           // piso interior (en el SVG la y crece hacia abajo)
  const Y = y => yb - y * k;
  const top = t;
  const partes = [
    `<rect x="0" y="0" width="${W}" height="${H - ZOCALO * k}" rx="2" fill="#e9a55c"/>`,
    `<rect x="3" y="${H - ZOCALO * k}" width="${W - 6}" height="${ZOCALO * k}" fill="#c7823c"/>`,
  ];
  repartirCuerpos(diseno).forEach(({ x0, x1 }, i) => {
    const a = x0 * k + (t - T * k) / 2, b = x1 * k - (t - T * k) / 2, cw = b - a;
    partes.push(`<rect x="${a}" y="${top}" width="${cw}" height="${yb - top}" fill="#9c5a28"/>`);
    for (const e of diseno.cuerpos[i].elementos) {
      if (e.t === 'entrepano') partes.push(`<rect x="${a}" y="${Y(e.y) - t}" width="${cw}" height="${t}" fill="#e9a55c"/>`);
      if (e.t === 'tubo') partes.push(`<rect x="${a + 4}" y="${Y(e.y) - 1.5}" width="${cw - 8}" height="3" rx="1.5" fill="#fff"/>`);
      if (e.t === 'divisor') partes.push(`<rect x="${a + cw / 2 - t / 2}" y="${Y(e.y1)}" width="${t}" height="${(e.y1 - e.y0) * k}" fill="#e9a55c"/>`);
      if (e.t === 'cajones') {
        for (let j = 0; j < e.n; j++) {
          const y1 = Y(e.y + j * e.alto), h = e.alto * k - 2;
          partes.push(`<rect x="${a + 1.5}" y="${y1 - h}" width="${cw - 3}" height="${h}" rx="1.5" fill="#fff3de" stroke="#d58f45"/>`,
                      `<rect x="${a + cw / 2 - 8}" y="${y1 - h / 2 - 1.2}" width="16" height="2.4" rx="1.2" fill="#7a3f14"/>`);
        }
      }
      if (e.t === 'zapatero') {
        const paso = (e.y1 - e.y0) / e.n;
        for (let j = 0; j < e.n; j++) {
          const y = Y(e.y0 + j * paso + paso * 0.35);
          partes.push(`<path d="M${a + 2} ${y} L${b - 2} ${y - 8}" stroke="#e9a55c" stroke-width="${t * 0.8}"/>`,
                      `<ellipse cx="${a + cw * 0.32}" cy="${y - 7}" rx="${cw * 0.13}" ry="4" fill="#5b3616"/>`,
                      `<ellipse cx="${a + cw * 0.68}" cy="${y - 10}" rx="${cw * 0.13}" ry="4" fill="#26222e"/>`);
        }
      }
    }
  });
  return `<svg viewBox="-6 -6 ${W + 12} ${H + 12}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${partes.join('')}</svg>`;
}
