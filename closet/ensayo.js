// Cerebro de ENSAYO del asistente (sin internet ni cuentas): una entrevista guiada, como la del asesor
// del depósito, más órdenes sueltas reconocidas con reglas. Usa las mismas acciones que usará Claude.
// Cuando se conecte el cerebro real, este queda como respaldo sin señal.
import { ejecutarAccion, leerDiseno, resumenHablado } from './acciones.js';
import { modeloPorId, revisarTubos, USOS } from './modelos.js';

// ---------- Números hablados ----------
const UNIDADES = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29 };
const DECENAS = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const CENTENAS = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500 };

const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Convierte "doscientos ochenta y cinco" o "2,85" en números; devuelve la lista en orden. */
function numeros(texto) {
  const t = sinTildes(texto).replace(/(\d)[.,](\d)/g, '$1.$2');
  const toks = t.split(/[^a-z0-9.]+/).filter(Boolean);
  const out = [];
  let actual = null;
  const cerrar = () => { if (actual != null) { out.push(actual); actual = null; } };
  for (const w of toks) {
    if (/^\d+(\.\d+)?$/.test(w)) { cerrar(); out.push(Number(w)); continue; }
    if (w === 'y' && actual != null) continue;
    if (w === 'medio' && out.length) { out[out.length - 1] += 0.5; continue; }
    const v = CENTENAS[w] ?? DECENAS[w] ?? UNIDADES[w];
    if (v == null) { cerrar(); continue; }
    if (actual == null) actual = v;
    else if (CENTENAS[w] != null || (DECENAS[w] != null && actual % 100 !== 0) || (UNIDADES[w] != null && actual % 10 !== 0)) { cerrar(); actual = v; }
    else actual += v;
  }
  cerrar();
  return out;
}

/** Interpreta una medida hablada y la devuelve en centímetros. */
export function medidaEnCm(texto) {
  const t = sinTildes(texto);
  const n = numeros(t);
  if (!n.length) return null;
  const conMetros = /\bmetros?\b|\bm\b/.test(t);
  const conCm = /centimetro|\bcm\b/.test(t);
  if (conMetros && n.length >= 2 && n[0] < 10 && n[1] < 100) return n[0] * 100 + n[1];   // "dos metros ochenta"
  if (conMetros && n[0] < 10) return Math.round(n[0] * 100);                              // "2.80 metros"
  if (conCm) return n[0];
  if (n.length >= 2 && n[0] < 10 && n[1] < 100 && Number.isInteger(n[0])) return n[0] * 100 + n[1]; // "dos ochenta"
  return n[0] < 10 ? Math.round(n[0] * 100) : n[0];                                        // 2.8 → 280; 280 → 280
}

// ---------- Palabras clave ----------
const buscar = (t, re) => re.test(sinTildes(t));
const SI = /^(si|sip|claro|dale|listo|de una|correcto|asi es|exacto|ok|okey|perfecto|hagale|hagale pues|bueno|esta bien)\b/;
const NO = /^(no|nop|nada|ninguno|asi esta bien|asi dejalo|dejalo asi)\b/;

function puertaEn(t) {
  if (buscar(t, /corrediz|desliz|a los lados/)) return 'corredizas';
  if (buscar(t, /batient|de frente|bisagra|abatib/)) return 'batientes';
  if (buscar(t, /sin puerta|abierto|ninguna puerta|no lleva puerta/)) return 'ninguna';
  return null;
}
function colorEn(t) {
  if (buscar(t, /blanc/)) return 'blanco';
  if (buscar(t, /roble/)) return 'roble';
  if (buscar(t, /cedro/)) return 'cedro';
  if (buscar(t, /wengu|wenge|oscuro|chocolate/)) return 'wengue';
  return null;
}
function modeloEn(t) {
  if (buscar(t, /clasico/)) return 'clasico';
  if (buscar(t, /colgado largo|cajonera/)) return 'colgado';
  if (buscar(t, /doble tubo|zapatero/)) return 'doble';
  if (buscar(t, /esencial|economico|sencillo/)) return 'esencial';
  return null;
}
function usoEn(t) {
  if (buscar(t, /vestido.*larg|larg.*vestido|abrigo|gala/)) return 'vestidos_largos';
  if (buscar(t, /vestido/)) return 'vestidos_cortos';
  if (buscar(t, /pantalon.*(larg|complet|colgad|estirad)/)) return 'pantalones_largos';
  if (buscar(t, /pantalon/)) return 'pantalones';
  if (buscar(t, /chaqueta|saco|blazer|chamarra/)) return 'chaquetas';
  if (buscar(t, /camisa|blusa|camiseta/)) return 'camisas';
  return null;
}
function cuerpoEn(t, n) {
  const s = sinTildes(t);
  if (/izquierd/.test(s)) return 1;
  if (/derech/.test(s)) return n;
  if (/centro|medio|central/.test(s)) return Math.ceil(n / 2);
  const m = s.match(/cuerpo\s+(\d|uno|dos|tres|cuatro)/);
  if (m) return { uno: 1, dos: 2, tres: 3, cuatro: 4 }[m[1]] ?? Number(m[1]);
  return null;
}

// ---------- Entrevista ----------
const PASOS = ['ancho', 'alto', 'fondo', 'puertas', 'color', 'ropa', 'cierre'];
const PREGUNTA = {
  ancho: '¿Cuánto mide de ancho el espacio donde va el closet?',
  alto: '¿Y de alto, del piso al techo o hasta donde va a llegar?',
  fondo: '¿Cuánto de fondo? Lo normal son 60 centímetros.',
  puertas: '¿Lo quieres con puertas? Pueden ser batientes, que abren de frente, o corredizas, que se deslizan a los lados. O sin puertas.',
  color: '¿De qué color? Tengo blanco, roble claro, cedro y wengué.',
};

export function crearCerebroEnsayo() {
  let paso = 0;
  let pendienteAjuste = null;   // { cuerpo, posicion } si la ropa no cupo y ofrecimos ajustar

  const cfg = () => leerDiseno();
  const siguiente = () => {
    while (paso < PASOS.length) {
      const p = PASOS[paso];
      if (PREGUNTA[p]) return PREGUNTA[p];
      if (p === 'ropa') {
        const tubos = revisarTubos(cfg().diseno);
        if (!tubos.length) { paso++; continue; }
        const lista = tubos.map(t => `en el cuerpo ${t.ci + 1}${t.total > 1 ? (t.k === 0 ? ' arriba' : ' abajo') : ''} ${USOS[t.uso].nombre.toLowerCase()}`).join(', ');
        return `Ahora la ropa, para que nada quede arrugado. Así como está, va ${lista}. ¿Está bien así o cambiamos algo? Por ejemplo: "al lado derecho van vestidos largos".`;
      }
      if (p === 'cierre') return `Te resumo: ${resumenHablado(cfg())}. ¿Genero el despiece?`;
    }
    return '¿Algo más que quieras cambiar?';
  };

  async function aplicar(nombre, args, cambios) {
    const r = await ejecutarAccion(nombre, args);
    if (r.cambio) cambios.push(r.cambio);
    if (r.noCabe) pendienteAjuste = r.noCabe;
    return r;
  }

  async function consultar(t) {
    const r = (await ejecutarAccion('consultar_despiece')).datos;
    if (!r) return null;
    const n = x => String(x).replace('.', ',');
    if (buscar(t, /lamina|tablero/)) return `Son ${r.tableros.map(x => `${x.laminas} lámina${x.laminas > 1 ? 's' : ''} de ${x.material}`).join(' y ')}. Es un estimado; el depósito lo confirma al optimizar el corte.`;
    if (buscar(t, /bisagra/)) { const b = r.herrajes.find(h => /Bisagra/.test(h.nombre)); return b ? `Van ${b.cant} bisagras: de 2 a 5 por puerta según lo alta que sea.` : 'Este diseño no lleva bisagras porque no tiene puertas batientes.'; }
    if (buscar(t, /canto/)) return `De canto son ${r.cantos.map(c => `${c.pedir} metros de ${c.nombre.toLowerCase()}`).join(' y ')}, ya con un 10 % de más.`;
    if (buscar(t, /corredera/)) { const c = r.herrajes.find(h => /Corredera/.test(h.nombre)); return c ? `Son ${c.cant} pares de ${c.nombre.toLowerCase()}.` : 'Este diseño no tiene cajones, entonces no lleva correderas.'; }
    if (buscar(t, /tornillo/)) return `Tornillos: ${r.consumibles.filter(c => /Tornillo/.test(c.nombre)).map(c => `${c.cant} de ${c.nombre.toLowerCase()}`).join(' y ')}.`;
    if (buscar(t, /pieza/)) return `Son ${r.nPiezas} piezas de corte.`;
    return `Van ${r.nPiezas} piezas, ${r.tableros.reduce((s, x) => s + x.laminas, 0)} láminas y ${r.cantos.reduce((s, c) => s + c.pedir, 0)} metros de canto. ${r.herrajes.map(h => `${n(h.cant)} ${h.nombre.toLowerCase()}`).slice(0, 4).join(', ')}.`;
  }

  return {
    nombre: 'ensayo',
    async iniciar() {
      const c = cfg();
      if (!c?.diseno) return { texto: '¡Hola! Soy Salomé. Primero escoge un modelo de closet y ahí sí te ayudo con todo lo demás.' };
      const m = modeloPorId(c.modelo);
      paso = 0;
      return { texto: `¡Hola! Soy Salomé, tu asistente de despiece. Vamos a dejar listo tu closet ${m.nombre}. Empecemos por las medidas. ${PREGUNTA.ancho}` };
    },

    async responder(texto) {
      const t = texto.trim();
      const cambios = [];
      const dichos = [];

      // Preguntas sobre el despiece
      if (buscar(t, /cuant|cuanto|que lleva|que necesito/) && buscar(t, /lamina|tablero|bisagra|canto|corredera|tornillo|pieza|material/)) {
        return { texto: `${await consultar(t)} ${paso < PASOS.length ? siguiente() : ''}`.trim(), cambios };
      }
      if (buscar(t, /ayuda|que puedes hacer|que sabes hacer/)) {
        return { texto: 'Puedo cambiar las medidas, el modelo, las puertas, el color y los materiales; revisar que la ropa quepa y ajustar el closet; y decirte cuántas láminas, cantos y herrajes lleva. Solo dime qué quieres. ' + siguiente(), cambios };
      }
      // Ajuste ofrecido antes
      if (pendienteAjuste && buscar(t, /^(si|dale|claro|ajusta|hazlo|listo|de una|hagale)/)) {
        const r = await aplicar('ajustar_ropa', pendienteAjuste, cambios); pendienteAjuste = null;
        return { texto: `${r.texto} ${PASOS[paso] === 'ropa' ? '¿Algo más con la ropa?' : siguiente()}`, cambios };
      }
      if (buscar(t, /ajust|arregl|acomod/) && pendienteAjuste) {
        const r = await aplicar('ajustar_ropa', pendienteAjuste, cambios); pendienteAjuste = null;
        return { texto: `${r.texto} ${PASOS[paso] === 'ropa' ? '¿Algo más con la ropa?' : siguiente()}`, cambios };
      }

      // Órdenes sueltas que valen en cualquier momento
      const modelo = modeloEn(t);
      if (modelo && buscar(t, /modelo|cambia|mejor|pon|quiero/)) dichos.push((await aplicar('cambiar_modelo', { modelo }, cambios)).texto);
      const puerta = puertaEn(t);
      if (puerta) { dichos.push((await aplicar('cambiar_puertas', { tipo: puerta }, cambios)).texto); if (PASOS[paso] === 'puertas') paso++; }
      const color = colorEn(t);
      if (color) { dichos.push((await aplicar('cambiar_color', { color }, cambios)).texto); if (PASOS[paso] === 'color') paso++; }
      if (buscar(t, /18 ?(mm|milimetro)|dieciocho milimetro/)) dichos.push((await aplicar('cambiar_material', { clave: 'espesor', valor: '18' }, cambios)).texto);
      if (buscar(t, /15 ?(mm|milimetro)|quince milimetro/)) dichos.push((await aplicar('cambiar_material', { clave: 'espesor', valor: '15' }, cambios)).texto);
      if (buscar(t, /\brh\b|humedad/)) dichos.push((await aplicar('cambiar_material', { clave: 'tablero', valor: 'rh' }, cambios)).texto);
      if (buscar(t, /\bmdf\b/)) dichos.push((await aplicar('cambiar_material', { clave: 'tablero', valor: 'mdf' }, cambios)).texto);

      const uso = usoEn(t);
      const nCuerpos = cfg().diseno.cuerpos.length;
      const cuerpo = cuerpoEn(t, nCuerpos);
      if (uso && cuerpo) {
        const posicion = buscar(t, /abajo|inferior/) ? 'abajo' : 'arriba';
        dichos.push((await aplicar('asignar_ropa', { cuerpo, posicion, uso }, cambios)).texto);
      } else if (uso && PASOS[paso] === 'ropa') {
        dichos.push('¿En qué cuerpo? Dime "el de la izquierda", "el del centro", "el de la derecha" o el número.');
      }

      // Medidas: explícitas ("ancho 2,80") o como respuesta a la pregunta actual
      const s = sinTildes(t);
      const med = {};
      for (const dim of ['ancho', 'alto', 'fondo']) {
        const m = s.match(new RegExp(`${dim}[^0-9a-z]*(de\\s+)?([a-z0-9., ]{1,40}?)(?=\\s*(,|y el|y de|ancho|alto|fondo|$))`));
        if (m) { const v = medidaEnCm(m[2]); if (v) med[dim] = v; }
      }
      const pasoMedida = ['ancho', 'alto', 'fondo'].includes(PASOS[paso]) ? PASOS[paso] : null;
      if (!Object.keys(med).length && pasoMedida && !dichos.length) {
        const v = medidaEnCm(t);
        if (v) med[pasoMedida] = v;
      }
      if (Object.keys(med).length) {
        const r = await aplicar('cambiar_medidas', med, cambios);
        dichos.push(r.texto);
        if (!r.error) while (['ancho', 'alto', 'fondo'].includes(PASOS[paso]) && med[PASOS[paso]] != null) paso++;
      }

      // Respuestas de sí / no a la pregunta actual
      if (!dichos.length) {
        const actual = PASOS[paso];
        if (actual === 'ropa' && (NO.test(sinTildes(t)) || SI.test(sinTildes(t)))) { paso++; dichos.push('Perfecto.'); }
        else if (actual === 'cierre' && SI.test(sinTildes(t))) return { texto: '¡Listo! Te muestro el despiece. Ahí lo puedes enviar al depósito.', cambios, ir: '#closet/despiece' };
        else if (actual === 'cierre' && NO.test(sinTildes(t))) return { texto: 'Dale, dime qué más le cambiamos.', cambios };
        else if (actual === 'fondo' && buscar(t, /normal|el de siempre|60|sesenta/)) { const r = await aplicar('cambiar_medidas', { fondo: 60 }, cambios); dichos.push(r.texto); paso++; }
        else return { texto: `Perdona, eso no te lo entendí bien. ${siguiente()}`, cambios };
      }
      if (paso < PASOS.length && PASOS[paso] === 'ropa' && uso && cuerpo && !pendienteAjuste) {
        // ya dijo algo de ropa: seguimos preguntando si quiere cambiar algo más
        return { texto: `${dichos.join(' ')} ¿Algo más con la ropa?`, cambios };
      }
      return { texto: `${dichos.join(' ')} ${pendienteAjuste ? '' : siguiente()}`.trim(), cambios };
    },
  };
}
