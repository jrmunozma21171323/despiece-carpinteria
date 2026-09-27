// Acciones que el asistente puede hacer sobre el diseño del closet.
// Cada una trae su descripción y parámetros en el formato de "herramientas" de Claude, para que el
// cerebro de ensayo (reglas) y el cerebro real (Claude) usen exactamente las mismas.
// Todas leen y guardan el diseño en el celular y devuelven { texto, cambio? }:
//   texto  = lo que el asistente le dice al carpintero
//   cambio = rótulo corto para mostrar en pantalla (p. ej. "Ancho 280 cm")
import {
  MODELOS, USOS, COLORES, PUERTAS, modeloPorId, colorPorId, revisarTubos, cambiarUso, ajustarTubo, copiar, espesorDe,
} from './modelos.js';
import { PREGUNTAS, porDefecto } from '../materiales.js';

const CLAVE = 'despiece.closet';
export const leerDiseno = () => { try { return JSON.parse(localStorage.getItem(CLAVE)); } catch { return null; } };
const guardarDiseno = cfg => { try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch {} };

const cm = m => Math.round(m * 1000) / 10;
const cmTxt = m => `${String(cm(m)).replace('.', ',')} cm`;

/** Reglas de medidas (las usa también la pantalla de despiece). Recibe metros; devuelve lista de errores. */
export function validarMedidas(diseno, { ancho, alto, fondo }) {
  const n = diseno.cuerpos.length;
  const topeMax = Math.max(...diseno.cuerpos.flatMap(c => c.elementos.map(e => (e.y ?? e.y1) + 0.05)));
  const errores = [];
  if (!(ancho >= 0.4 * n && ancho <= 4.8)) errores.push(`el ancho debe estar entre ${Math.round(40 * n)} y 480 centímetros para ${n} cuerpo${n > 1 ? 's' : ''}`);
  if (!(alto >= 1.6 && alto <= 2.8)) errores.push('el alto debe estar entre 160 y 280 centímetros');
  else if (alto - 0.08 - 2 * espesorDe(diseno) < topeMax) errores.push(`este modelo necesita al menos ${Math.ceil((topeMax + 0.12) * 100)} centímetros de alto por el maletero`);
  if (!(fondo >= 0.4 && fondo <= 0.7)) errores.push('el fondo debe estar entre 40 y 70 centímetros');
  return errores;
}

const nombreUso = u => USOS[u].nombre.toLowerCase();
function describirTubo(t) {
  return `el cuerpo ${t.ci + 1}${t.total > 1 ? (t.k === 0 ? ' arriba' : ' abajo') : ''}`;
}

export const ACCIONES = {
  cambiar_medidas: {
    descripcion: 'Cambia las medidas del closet (en centímetros). Se puede enviar solo la que cambia.',
    parametros: { type: 'object', properties: {
      ancho: { type: 'number', description: 'Ancho total en cm' },
      alto: { type: 'number', description: 'Alto total en cm' },
      fondo: { type: 'number', description: 'Fondo total en cm' },
    } },
    ejecutar(cfg, { ancho, alto, fondo }) {
      const actual = cfg.diseno.medidas;
      const nuevas = {
        ancho: ancho != null ? ancho / 100 : actual.ancho,
        alto: alto != null ? alto / 100 : actual.alto,
        fondo: fondo != null ? fondo / 100 : actual.fondo,
      };
      const errores = validarMedidas(cfg.diseno, nuevas);
      if (errores.length) return { texto: `Uy, así no me da: ${errores.join(' y ')}. ¿Me confirmas la medida?`, error: true };
      cfg.diseno.medidas = nuevas;
      const dichas = [ancho != null && `ancho ${cmTxt(nuevas.ancho)}`, alto != null && `alto ${cmTxt(nuevas.alto)}`, fondo != null && `fondo ${cmTxt(nuevas.fondo)}`].filter(Boolean);
      const noCaben = revisarTubos(cfg.diseno).filter(t => !t.cabe);
      return {
        texto: `Listo, ${dichas.join(', ')}.` + (noCaben.length ? ` Ojo: con esa medida no cabe la ropa en ${noCaben.map(describirTubo).join(' ni en ')}.` : ''),
        cambio: dichas.map(s => s[0].toUpperCase() + s.slice(1)).join(' · '),
      };
    },
  },

  cambiar_modelo: {
    descripcion: 'Cambia el modelo (distribución interior) conservando las medidas, los materiales y el color.',
    parametros: { type: 'object', properties: { modelo: { type: 'string', enum: MODELOS.map(m => m.id) } }, required: ['modelo'] },
    ejecutar(cfg, { modelo }) {
      const m = modeloPorId(modelo);
      if (!m) return { texto: 'Ese modelo no lo tengo. Tengo el clásico de 3 cuerpos, el de colgado largo con cajonera, el de doble tubo con zapatero y el esencial.', error: true };
      const cuerpos = copiar(m.cuerpos);
      const prueba = { ...cfg.diseno, cuerpos };
      const errores = validarMedidas(prueba, cfg.diseno.medidas);
      if (errores.length) return { texto: `Con las medidas que tienes no me da ese modelo: ${errores.join(' y ')}.`, error: true };
      cfg.modelo = modelo;
      cfg.diseno.cuerpos = cuerpos;
      cfg.ajustado = false;
      return { texto: `Perfecto, cambié al modelo ${m.nombre}: ${m.resumen.toLowerCase()}.`, cambio: `Modelo ${m.nombre}` };
    },
  },

  cambiar_puertas: {
    descripcion: 'Cambia el tipo de puertas del closet.',
    parametros: { type: 'object', properties: { tipo: { type: 'string', enum: PUERTAS.map(p => p.id) } }, required: ['tipo'] },
    ejecutar(cfg, { tipo }) {
      const p = PUERTAS.find(x => x.id === tipo);
      if (!p) return { texto: 'Tengo tres opciones: sin puertas, batientes que abren de frente, o corredizas que se deslizan a los lados.', error: true };
      cfg.puerta = tipo;
      return { texto: tipo === 'ninguna' ? 'Listo, lo dejamos sin puertas, abierto.' : `Listo, puertas ${p.nombre.toLowerCase()}: ${p.detalle.toLowerCase()}.`, cambio: `Puertas: ${p.nombre}` };
    },
  },

  cambiar_color: {
    descripcion: 'Cambia el color de la melamina.',
    parametros: { type: 'object', properties: { color: { type: 'string', enum: COLORES.map(c => c.id) } }, required: ['color'] },
    ejecutar(cfg, { color }) {
      const c = COLORES.find(x => x.id === color);
      if (!c) return { texto: `Los colores que tengo son ${COLORES.map(x => x.nombre.toLowerCase()).join(', ')}.`, error: true };
      cfg.color = color;
      return { texto: `Me encanta, color ${c.nombre.toLowerCase()}.`, cambio: `Color ${c.nombre}` };
    },
  },

  cambiar_material: {
    descripcion: 'Cambia una opción de materiales o herrajes (tablero, espesor, canto, fondo, correderas, bisagras, riel, jaladeras, tubos).',
    parametros: { type: 'object', properties: {
      clave: { type: 'string', enum: Object.keys(PREGUNTAS) },
      valor: { type: 'string', description: 'id de la opción; ver PREGUNTAS en materiales.js' },
    }, required: ['clave', 'valor'] },
    ejecutar(cfg, { clave, valor }) {
      const p = PREGUNTAS[clave], o = p?.opciones.find(x => x.id === valor);
      if (!o) return { texto: 'Esa opción no la tengo en el menú de materiales.', error: true };
      cfg.materiales = { ...porDefecto(), ...(cfg.materiales || {}), [clave]: valor };
      if (clave === 'espesor') cfg.diseno.espesor = Number(valor) / 1000;
      return { texto: `Hecho: ${p.titulo.toLowerCase()}, ${o.nombre}. ${o.detalle}`, cambio: `${p.titulo}: ${o.nombre}` };
    },
  },

  asignar_ropa: {
    descripcion: 'Indica qué ropa se cuelga en un tubo y revisa si cabe.',
    parametros: { type: 'object', properties: {
      cuerpo: { type: 'integer', description: 'Número de cuerpo, de izquierda a derecha, desde 1' },
      posicion: { type: 'string', enum: ['arriba', 'abajo'], description: 'Solo si el cuerpo tiene dos tubos' },
      uso: { type: 'string', enum: Object.keys(USOS) },
    }, required: ['cuerpo', 'uso'] },
    ejecutar(cfg, { cuerpo, posicion, uso }) {
      const tubos = revisarTubos(cfg.diseno).filter(t => t.ci === cuerpo - 1);
      if (!tubos.length) {
        const conTubo = [...new Set(revisarTubos(cfg.diseno).map(t => t.ci + 1))];
        return { texto: `El cuerpo ${cuerpo} no tiene tubo para colgar. ${conTubo.length ? `Los que tienen tubo son: ${conTubo.join(', ')}.` : 'Este modelo no tiene tubos.'}`, error: true };
      }
      const t = tubos.find(x => (posicion === 'abajo' ? x.k === 1 : x.k === 0)) || tubos[0];
      cfg.diseno = cambiarUso(cfg.diseno, t.ci, t.k, uso);
      const r = revisarTubos(cfg.diseno).find(x => x.clave === t.clave);
      return {
        texto: r.cabe
          ? `Perfecto, en ${describirTubo(r)} van ${nombreUso(uso)}, y caben sin problema: quedan ${cmTxt(r.espacio)} libres.`
          : `En ${describirTubo(r)} los ${nombreUso(uso)} no caben: faltan ${cmTxt(r.falta)}. Si quieres, lo ajusto para que quepan.`,
        cambio: `Cuerpo ${t.ci + 1}: ${USOS[uso].nombre}${r.cabe ? ' ✔' : ' ✖'}`,
        noCabe: r.cabe ? null : { cuerpo: t.ci + 1, posicion: t.k === 0 ? 'arriba' : 'abajo' },
      };
    },
  },

  ajustar_ropa: {
    descripcion: 'Reorganiza un cuerpo (menos cajones, zapatero más bajo, quitar entrepaños) para que quepa la ropa de su tubo.',
    parametros: { type: 'object', properties: {
      cuerpo: { type: 'integer' }, posicion: { type: 'string', enum: ['arriba', 'abajo'] },
    }, required: ['cuerpo'] },
    ejecutar(cfg, { cuerpo, posicion }) {
      const t = revisarTubos(cfg.diseno).find(x => x.ci === cuerpo - 1 && (posicion === 'abajo' ? x.k === 1 : x.k === 0));
      if (!t) return { texto: `El cuerpo ${cuerpo} no tiene ese tubo.`, error: true };
      if (t.cabe) return { texto: `En el cuerpo ${cuerpo} la ropa ya cabe, no hay nada que ajustar.` };
      const r = ajustarTubo(cfg.diseno, t.ci, t.k);
      if (!r) return { texto: 'Ni despejando todo el cuerpo cabe esa ropa. Habría que colgarla en otro cuerpo.', error: true };
      cfg.diseno = r.diseno;
      cfg.ajustado = true;
      return { texto: `Listo, ajusté el cuerpo ${cuerpo}: ${r.cambios.join(', ') || 'quedó despejado'}. Ahora sí cabe.`, cambio: `Cuerpo ${cuerpo} ajustado` };
    },
  },

  consultar_despiece: {
    descripcion: 'Calcula el despiece actual y devuelve cifras: piezas, láminas por material, metros de canto, herrajes y consumibles.',
    parametros: { type: 'object', properties: {} },
    async ejecutar(cfg) {
      const { calcularDespiece } = await import('./despiece.js');
      const r = calcularDespiece({ ...cfg, materiales: { ...porDefecto(), ...(cfg.materiales || {}) } });
      return { texto: '', datos: r };
    },
  },
};

/** Ejecuta una acción, guarda el diseño y devuelve su resultado. */
export async function ejecutarAccion(nombre, args = {}) {
  const cfg = leerDiseno();
  if (!cfg?.diseno) return { texto: 'Primero hay que escoger un modelo de closet.', error: true };
  const a = ACCIONES[nombre];
  if (!a) return { texto: 'Eso todavía no lo sé hacer.', error: true };
  const r = await a.ejecutar(cfg, args);
  if (!r.error && nombre !== 'consultar_despiece') guardarDiseno(cfg);
  return r;
}

/** Descripción del diseño actual en palabras (para el saludo y el resumen final). */
export function resumenHablado(cfg) {
  const m = modeloPorId(cfg.modelo);
  const { ancho, alto, fondo } = cfg.diseno.medidas;
  const puerta = cfg.puerta === 'batientes' ? 'con puertas batientes' : cfg.puerta === 'corredizas' ? 'con puertas corredizas' : 'sin puertas';
  const ropa = revisarTubos(cfg.diseno).map(t => `${describirTubo(t)}: ${nombreUso(t.uso)}${t.cabe ? '' : ' (no cabe)'}`);
  return `closet ${m.nombre}, de ${cmTxt(ancho)} de ancho, ${cmTxt(alto)} de alto y ${cmTxt(fondo)} de fondo, ${puerta}, color ${colorPorId(cfg.color).nombre.toLowerCase()}`
    + (ropa.length ? `. Ropa: ${ropa.join('; ')}` : '');
}

/** Definición de herramientas para Claude (se usará cuando se conecte el cerebro real). */
export const herramientasClaude = () => Object.entries(ACCIONES).map(([name, a]) => ({
  name, description: a.descripcion, input_schema: a.parametros,
}));
