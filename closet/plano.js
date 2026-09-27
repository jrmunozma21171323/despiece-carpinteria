// Plano frontal con medidas (cotas) del closet, generado del mismo diseño que el 3D.
// Unidades del dibujo: centímetros.
import { ZOCALO, espesorDe, repartirCuerpos, revisarTubos, altoInterior } from './modelos.js';

const K = 100;
const cm = m => {
  const v = Math.round(m * K * 10) / 10;
  return (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace('.', ',');
};

const LINEA = '#1f2a30';
const OK = '#1d7a43';
const MAL = '#c62828';

function etiqueta(cx, cy, texto, color = LINEA, tam = 8.5) {
  const w = texto.length * tam * 0.58 + 5;
  return `<rect x="${cx - w / 2}" y="${cy - tam * 0.72}" width="${w}" height="${tam * 1.4}" rx="2.5" fill="#fff" stroke="${color}" stroke-width=".5"/>` +
         `<text x="${cx}" y="${cy + tam * 0.36}" font-size="${tam}" text-anchor="middle" fill="${color}" font-weight="700">${texto}</text>`;
}
function cotaV(x, ya, yb, texto, color = LINEA) {
  const [a, b] = ya < yb ? [ya, yb] : [yb, ya];
  return `<g stroke="${color}" stroke-width=".6"><path d="M${x} ${a}V${b}M${x - 2.5} ${a}h5M${x - 2.5} ${b}h5"/>` +
         `<path d="M${x} ${a}l-1.6 3.5h3.2zM${x} ${b}l-1.6 -3.5h3.2z" fill="${color}"/></g>` + etiqueta(x, (a + b) / 2, texto, color);
}
function cotaH(y, xa, xb, texto, color = LINEA) {
  return `<g stroke="${color}" stroke-width=".6"><path d="M${xa} ${y}H${xb}M${xa} ${y - 2.5}v5M${xb} ${y - 2.5}v5"/>` +
         `<path d="M${xa} ${y}l3.5 -1.6v3.2zM${xb} ${y}l-3.5 -1.6v3.2z" fill="${color}"/></g>` + etiqueta((xa + xb) / 2, y, texto, color);
}

export function planoConMedidas(diseno) {
  const { ancho, alto, fondo } = diseno.medidas;
  const ESPESOR = espesorDe(diseno);
  const W = ancho * K, H = alto * K, t = ESPESOR * K, z = ZOCALO * K;
  const Y = yInterior => H - z - t - yInterior * K;   // y interior (m) -> y del SVG
  const hi = altoInterior(diseno);
  const tubos = revisarTubos(diseno);
  const p = [];

  // Mueble
  p.push(`<rect x="0" y="0" width="${W}" height="${H - z}" fill="#e2b77f" stroke="#a87a45" stroke-width=".8"/>`,
         `<rect x="2" y="${H - z}" width="${W - 4}" height="${z}" fill="#c99a62" stroke="#a87a45" stroke-width=".6"/>`);

  const cuerpos = repartirCuerpos(diseno);
  cuerpos.forEach(({ x0, x1 }, ci) => {
    const a = x0 * K, b = x1 * K, cw = b - a;
    const els = diseno.cuerpos[ci].elementos;
    p.push(`<rect x="${a}" y="${Y(hi)}" width="${cw}" height="${hi * K}" fill="#f5e3c6"/>`);

    // Sólidos horizontales (para medir los espacios entre ellos)
    const solidos = [{ y0: -1, y1: 0 }, { y0: hi, y1: hi + 1 }];
    for (const e of els) {
      if (e.t === 'entrepano') {
        solidos.push({ y0: e.y, y1: e.y + ESPESOR });
        p.push(`<rect x="${a}" y="${Y(e.y + ESPESOR)}" width="${cw}" height="${t}" fill="#d6a567" stroke="#a87a45" stroke-width=".4"/>`);
      }
      if (e.t === 'cajones') {
        const top = e.y + e.n * e.alto;
        solidos.push({ y0: e.y, y1: top });
        for (let j = 0; j < e.n; j++) {
          const yy = Y(e.y + (j + 1) * e.alto);
          p.push(`<rect x="${a + 1}" y="${yy + 0.5}" width="${cw - 2}" height="${e.alto * K - 1}" rx="1" fill="#ecc994" stroke="#a87a45" stroke-width=".5"/>`,
                 `<rect x="${a + cw / 2 - 7}" y="${yy + e.alto * K / 2 - 1}" width="14" height="2" rx="1" fill="#6b4a2a"/>`);
        }
        p.push(etiqueta(a + cw / 2, Y(e.y + e.alto / 2) + 7, `${e.n} × ${cm(e.alto)}`, LINEA, 7.5));
      }
      if (e.t === 'zapatero') {
        solidos.push({ y0: e.y0, y1: e.y1 });
        const paso = (e.y1 - e.y0) / e.n;
        for (let j = 0; j < e.n; j++) {
          const yy = Y(e.y0 + j * paso + paso * 0.4);
          p.push(`<path d="M${a + 2} ${yy} L${b - 2} ${yy - 7}" stroke="#a87a45" stroke-width="${t * 0.8}"/>`);
        }
        p.push(etiqueta(a + cw / 2, Y(e.y1) + 9, 'Zapatero', LINEA, 7.5));
      }
      if (e.t === 'divisor') {
        p.push(`<rect x="${a + cw / 2 - t / 2}" y="${Y(e.y1)}" width="${t}" height="${(e.y1 - e.y0) * K}" fill="#d6a567" stroke="#a87a45" stroke-width=".4"/>`);
      }
      if (e.t === 'tubo') {
        p.push(`<rect x="${a + 3}" y="${Y(e.y) - 1.2}" width="${cw - 6}" height="2.4" rx="1.2" fill="#8d959c"/>`);
      }
    }

    // Espacios entre sólidos: su altura; si hay tubo, el espacio libre para colgar (verde/rojo)
    solidos.sort((u, v) => u.y0 - v.y0);
    for (let i = 0; i < solidos.length - 1; i++) {
      const g0 = solidos[i].y1, g1 = solidos[i + 1].y0;
      if (g1 - g0 < 0.06) continue;
      const tubosAqui = tubos.filter(tb => tb.ci === ci && tb.y > g0 && tb.y < g1);
      const divisor = els.find(e => e.t === 'divisor' && e.y0 <= g0 + 0.01 && e.y1 >= g1 - 0.01);
      const xc = divisor ? a + cw * 0.25 : a + cw * 0.22;
      if (tubosAqui.length) {
        for (const tb of tubosAqui) {
          const color = tb.cabe ? OK : MAL;
          p.push(cotaV(a + cw * 0.5, Y(tb.y), Y(tb.y - tb.espacio), cm(tb.espacio), color));
        }
      } else {
        p.push(cotaV(xc, Y(g1), Y(g0), cm(g1 - g0)));
      }
      if (divisor) {   // ancho de cada nicho, en la mitad derecha (la izquierda lleva la altura)
        const mitad = (cw - t) / 2 / K;
        p.push(cotaH((Y(g0) + Y(g1)) / 2, a + cw / 2 + t / 2 + 1, b - 1, cm(mitad)));
      }
    }

    // Ancho libre del cuerpo (arriba)
    p.push(cotaH(-12, a, b, cm(x1 - x0)));
  });

  // Totales
  p.push(cotaH(H + 13, 0, W, cm(ancho)));
  p.push(cotaV(W + 14, 0, H, cm(alto)));
  p.push(`<text x="${W / 2}" y="${H + 30}" font-size="8" text-anchor="middle" fill="${LINEA}">Fondo total: ${cm(fondo)} cm · tablero de ${cm(ESPESOR)} cm · medidas en cm</text>`);

  return `<svg viewBox="-8 -24 ${W + 36} ${H + 60}" preserveAspectRatio="xMidYMid meet" font-family="system-ui, -apple-system, Roboto, sans-serif" role="img" aria-label="Plano del closet con medidas">${p.join('')}</svg>`;
}
