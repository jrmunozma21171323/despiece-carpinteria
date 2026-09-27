// Exportación del despiece a los programas de corte de los depósitos.
// Cada programa es un "perfil": qué columnas, con qué encabezados y qué separador.
// Para agregar el programa de otro depósito basta con sumar un perfil aquí.
//
//  - Excel (genérico): separador ";" y UTF-8 con BOM para que Excel en español lo abra bien.
//    Sirve para CutList Plus fx, OptiCut, MaxCut, etc.: su asistente de importación deja
//    asignar cada columna.
//  - CutList Optimizer: encabezados que ese programa reconoce solo (Length, Width, Qty, Material,
//    Label, Enabled, Grain direction).
//  - CutList Plus fx: columnas con los nombres de su lista de piezas; se asignan en su asistente.

const si = v => (v ? 'Sí' : 'No');
const lados = n => (n === 0 ? '' : String(n));
const cantoTexto = p => {
  if (!p.tipoCanto) return 'Sin canto';
  const partes = [];
  if (p.cantoL) partes.push(`${p.cantoL} largo${p.cantoL > 1 ? 's' : ''}`);
  if (p.cantoA) partes.push(`${p.cantoA} ancho${p.cantoA > 1 ? 's' : ''}`);
  return `Canto ${p.tipoCanto.replace('.', ',')} mm: ${partes.join(' + ')}`;
};

export const PERFILES = [
  {
    id: 'excel', nombre: 'Excel (genérico)', detalle: 'Abre en Excel. Sirve para CutList Plus, OptiCut, MaxCut y la mayoría: al importar se asigna cada columna.',
    separador: ';', bom: true,
    columnas: [
      ['#', p => p.id], ['Módulo', p => p.modulo], ['Pieza', p => p.nombre], ['Cantidad', p => p.cant],
      ['Largo (mm)', p => p.largo], ['Ancho (mm)', p => p.ancho], ['Espesor (mm)', p => p.espesor],
      ['Material', p => p.material], ['Veta', p => si(p.veta)],
      ['Canto en largos', p => lados(p.cantoL)], ['Canto en anchos', p => lados(p.cantoA)],
      ['Tipo de canto (mm)', p => (p.tipoCanto || '').replace('.', ',')], ['Nota', p => p.nota],
    ],
  },
  {
    id: 'cutlist-optimizer', nombre: 'CutList Optimizer', detalle: 'Encabezados que CutList Optimizer reconoce al importar CSV.',
    separador: ',', bom: false,
    columnas: [
      ['Length', p => p.largo], ['Width', p => p.ancho], ['Qty', p => p.cant],
      ['Material', p => p.material], ['Label', p => `${p.nombre} (${p.modulo})`],
      ['Enabled', () => 'true'], ['Grain direction', p => (p.veta ? 'V' : '')],
    ],
  },
  {
    id: 'cutlist-plus', nombre: 'CutList Plus fx', detalle: 'Para el asistente de importación de CutList Plus fx (medidas en mm).',
    separador: ',', bom: false,
    columnas: [
      ['Part #', p => p.id], ['Description', p => `${p.nombre} - ${p.modulo}`], ['Copies', p => p.cant],
      ['Thickness', p => p.espesor], ['Width', p => p.ancho], ['Length', p => p.largo],
      ['Material', p => p.material], ['Can Rotate', p => (p.veta ? 'No' : 'Yes')],
      ['Notes', p => [cantoTexto(p), p.nota].filter(Boolean).join('. ')],
    ],
  },
];

function celda(v, sep) {
  const s = String(v ?? '');
  return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Arma el CSV de las piezas según el perfil. */
export function csvPiezas(despiece, perfilId) {
  const pf = PERFILES.find(p => p.id === perfilId) || PERFILES[0];
  const filas = [pf.columnas.map(([h]) => h), ...despiece.piezas.map(p => pf.columnas.map(([, f]) => f(p)))];
  const texto = filas.map(f => f.map(v => celda(v, pf.separador)).join(pf.separador)).join('\r\n');
  return (pf.bom ? '﻿' : '') + texto + '\r\n';
}

/** Lista completa (piezas + tableros + cantos + herrajes + consumibles) para Excel. */
export function csvCompleto(despiece, encabezado) {
  const sep = ';';
  const L = [];
  const fila = (...v) => L.push(v.map(x => celda(x, sep)).join(sep));
  fila(encabezado);
  fila('');
  fila('PIEZAS');
  const pf = PERFILES[0];
  fila(...pf.columnas.map(([h]) => h));
  for (const p of despiece.piezas) fila(...pf.columnas.map(([, f]) => f(p)));
  fila('');
  fila('TABLEROS (estimado; el depósito optimiza)', 'Láminas', 'm² de piezas');
  for (const t of despiece.tableros) fila(t.material, t.laminas, t.m2.toFixed(2).replace('.', ','));
  fila('');
  fila('CANTOS', 'Metros a pedir', 'Metros exactos');
  for (const c of despiece.cantos) fila(c.nombre, c.pedir, c.metros.toFixed(1).replace('.', ','));
  fila('');
  fila('HERRAJES', 'Cantidad', 'Unidad', 'Nota');
  for (const h of despiece.herrajes) fila(h.nombre, String(h.cant).replace('.', ','), h.unidad, h.nota);
  fila('');
  fila('CONSUMIBLES', 'Cantidad', 'Unidad', 'Nota');
  for (const c of despiece.consumibles) fila(c.nombre, c.cant, c.unidad, c.nota);
  return '﻿' + L.join('\r\n') + '\r\n';
}

/** Texto corto para WhatsApp: lo que hay que comprar (las piezas van en el archivo). */
export function textoPedido(despiece, encabezado) {
  const n = x => String(x).replace('.', ',');
  return [
    `*${encabezado}*`,
    `${despiece.nPiezas} piezas de corte (van en el archivo adjunto).`,
    '',
    '*Tableros*', ...despiece.tableros.map(t => `• ${t.laminas} lámina(s) ${t.material}`),
    '', '*Cantos*', ...despiece.cantos.map(c => `• ${c.pedir} m ${c.nombre}`),
    '', '*Herrajes*', ...despiece.herrajes.map(h => `• ${n(h.cant)} ${h.unidad} ${h.nombre}${h.nota ? ` (${h.nota})` : ''}`),
    '', '*Consumibles*', ...despiece.consumibles.map(c => `• ${c.cant} ${c.unidad} ${c.nombre}`),
    '', '_Hecho con Despiece Carpintería_',
  ].join('\n');
}

/** Comparte (WhatsApp, correo…) si el celular lo permite; si no, descarga el archivo. */
export async function compartirODescargar(nombreArchivo, contenido, tipo, texto) {
  const archivo = new File([contenido], nombreArchivo, { type: tipo });
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: nombreArchivo, text: texto }); return 'compartido'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
  }
  const url = URL.createObjectURL(archivo);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombreArchivo });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'descargado';
}
