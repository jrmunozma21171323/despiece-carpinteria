// Modelos base de closet. Una sola descripción alimenta el dibujo de la tarjeta, el visor 3D
// y (más adelante) el despiece. Medidas en metros.
//
// Cada modelo trae medidas de referencia (ancho, alto, fondo) y sus cuerpos, de izquierda a derecha.
// Dentro de cada cuerpo, "y" se mide desde el piso interior del closet (encima de la base).
//   entrepano {y}              tabla horizontal
//   tubo      {y}              tubo para colgar
//   cajones   {y, n, alto}     n cajones apilados desde y, cada uno de "alto"
//   divisor   {y0, y1}         tabla vertical en la mitad del cuerpo (arma nichos)
//   zapatero  {y0, y1, n}      n bandejas inclinadas para zapatos

export const ESPESOR = 0.018;   // tablero de 18 mm
export const ZOCALO = 0.08;     // altura de la base

const MALETERO = 1.85;          // altura del entrepaño de maleteros en todos los modelos

export const MODELOS = [
  {
    id: 'clasico',
    nombre: 'Clásico 3 cuerpos',
    resumen: 'Tubos a los lados, cajones y nichos al centro',
    medidas: { ancho: 2.40, alto: 2.40, fondo: 0.60 },
    cuerpos: [
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75 },
        { t: 'entrepano', y: 0.64 }, { t: 'cajones', y: 0.02, n: 2, alto: 0.30 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.50 }, { t: 'entrepano', y: 1.15 },
        { t: 'divisor', y0: 1.15, y1: MALETERO }, { t: 'tubo', y: 1.05 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75 },
        { t: 'entrepano', y: 0.64 }, { t: 'cajones', y: 0.02, n: 2, alto: 0.30 },
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
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75 },
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
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75 },
        { t: 'entrepano', y: 0.98 }, { t: 'tubo', y: 0.88 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.45 }, { t: 'entrepano', y: 1.05 },
        { t: 'entrepano', y: 0.64 }, { t: 'cajones', y: 0.02, n: 2, alto: 0.30 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75 },
        { t: 'entrepano', y: 0.84 }, { t: 'zapatero', y0: 0.04, y1: 0.80, n: 3 },
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
        { t: 'entrepano', y: MALETERO }, { t: 'tubo', y: 1.75 },
      ] },
      { ancho: 1, elementos: [
        { t: 'entrepano', y: MALETERO }, { t: 'entrepano', y: 1.45 }, { t: 'entrepano', y: 1.05 },
        { t: 'entrepano', y: 0.65 }, { t: 'entrepano', y: 0.25 },
      ] },
    ],
  },
];

export const modeloPorId = id => MODELOS.find(m => m.id === id);

/** Reparte el ancho interior entre los cuerpos. Devuelve [{x0, x1}] en metros desde el borde izquierdo. */
export function repartirCuerpos(modelo) {
  const { ancho } = modelo.medidas;
  const n = modelo.cuerpos.length;
  const util = ancho - 2 * ESPESOR - (n - 1) * ESPESOR;
  const total = modelo.cuerpos.reduce((s, c) => s + c.ancho, 0);
  let x = ESPESOR;
  return modelo.cuerpos.map(c => {
    const w = util * c.ancho / total;
    const r = { x0: x, x1: x + w };
    x += w + ESPESOR;
    return r;
  });
}

/** Alto interior útil (del piso interior al techo interior). */
export const altoInterior = m => m.medidas.alto - ZOCALO - 2 * ESPESOR;

/** Dibujo frontal (SVG) del modelo, mismo estilo que las ilustraciones del mosaico. */
export function dibujoFrontal(modelo) {
  const k = 100; // metros -> unidades del dibujo (cm)
  const { ancho, alto } = modelo.medidas;
  const W = ancho * k, H = alto * k;
  const t = 4;   // grosor visual de las tablas: más que 1,8 cm para que se lea en pequeño
  const yb = H - ZOCALO * k - t;           // piso interior (en el SVG la y crece hacia abajo)
  const Y = y => yb - y * k;
  const top = t;
  const partes = [
    `<rect x="0" y="0" width="${W}" height="${H - ZOCALO * k}" rx="2" fill="#e9a55c"/>`,
    `<rect x="3" y="${H - ZOCALO * k}" width="${W - 6}" height="${ZOCALO * k}" fill="#c7823c"/>`,
  ];
  repartirCuerpos(modelo).forEach(({ x0, x1 }, i) => {
    const a = x0 * k + (t - ESPESOR * k) / 2, b = x1 * k - (t - ESPESOR * k) / 2, cw = b - a;
    partes.push(`<rect x="${a}" y="${top}" width="${cw}" height="${yb - top}" fill="#9c5a28"/>`);
    for (const e of modelo.cuerpos[i].elementos) {
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
