// Despiece Carpintería — mosaico de trabajos y, por ahora, el flujo del Closet.
// Cada trabajo tendrá sus modelos base + "Construye tu modelo", su menú de materiales
// y la conversación por voz que arma el despiece.
import {
  MODELOS, USOS, COLORES, PUERTAS, FONDO_MIN,
  modeloPorId, dibujoFrontal, revisarTubos, cambiarUso, ajustarTubo, necesita, copiar,
} from './closet/modelos.js';
import { PREGUNTAS, GRUPOS, contexto, aplica, porDefecto, resumen as resumenMateriales } from './materiales.js';
import { PERFILES, csvPiezas, csvCompleto, textoPedido, compartirODescargar } from './exportar.js';
import { validarMedidas } from './closet/acciones.js';

const VERSION = 12;   // igual al número de CACHE en sw.js: se muestra en la app para saber qué versión tiene cada celular

const s = (paths) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// El primero (Closet) ocupa todo el ancho del mosaico: son 7 y así no queda uno suelto.
const TRABAJOS = [
  {
    id: 'closet', color: '#0e6474', nombre: 'Closet', detalle: 'Cuerpos, entrepaños, tubos y cajones',
    icono: s('<rect x="7" y="5" width="34" height="37" rx="1.5"/><path d="M18.3 5v37M29.7 5v37M7 12h34M9 17h7.5M31.5 17h7.5M20 26h7.5M7 30h11.3M29.7 30H41M7 36h11.3M29.7 36H41M5 42h38"/>'),
  },
  {
    id: 'cocina', color: '#e8742a', nombre: 'Cocina integral', detalle: 'Módulos altos, bajos y mesón',
    icono: s('<rect x="5" y="6" width="38" height="11" rx="1.5"/><path d="M17.7 6v11M30.3 6v11"/><path d="M3 25h42"/><rect x="5" y="25" width="38" height="17" rx="1.5"/><path d="M18 25v17M31 25v17M14 30v3M22 30v3M34 30v3"/>'),
  },
  {
    id: 'bano', color: '#1e88e5', nombre: 'Mueble de baño', detalle: 'Mueble de lavamanos y espejo',
    icono: s('<path d="M24 6v5M20 8h8"/><path d="M8 18h32"/><path d="M13 18c0 5 5 7 11 7s11-2 11-7"/><rect x="9" y="25" width="30" height="17" rx="1.5"/><path d="M24 25v17M20 32v3M28 32v3"/>'),
  },
  {
    id: 'puerta', color: '#2e9e5b', nombre: 'Puerta', detalle: 'Hoja, marco y herrajes',
    icono: s('<path d="M10 43V5h28v38"/><rect x="15" y="9" width="18" height="30" rx="1"/><circle cx="29" cy="25" r="1.6" fill="currentColor"/><path d="M6 43h36"/>'),
  },
  {
    id: 'sala', color: '#7e57c2', nombre: 'Sala de entretenimiento', detalle: 'Centro de TV y repisas',
    icono: s('<rect x="12" y="5" width="24" height="15" rx="1.5"/><path d="M24 20v5"/><rect x="4" y="25" width="40" height="13" rx="1.5"/><path d="M17.3 25v13M30.7 25v13M8 38v4M40 38v4"/>'),
  },
  {
    id: 'comedor', color: '#e0474c', nombre: 'Comedor', detalle: 'Mesa y sillas',
    icono: s('<path d="M13 22h22M16 22v18M32 22v18"/><path d="M5 12v28M5 28h7v12"/><path d="M43 12v28M43 28h-7v12"/>'),
  },
  {
    id: 'cama', color: '#d6408e', nombre: 'Cama', detalle: 'Cabecero, base y tendido',
    icono: s('<path d="M6 12v28M42 26v14"/><path d="M6 26h36"/><path d="M6 34h36"/><rect x="10" y="19" width="10" height="7" rx="2"/><path d="M22 26v-5a2 2 0 0 1 2-2h14a4 4 0 0 1 4 4v3"/>'),
  },
];

const app = document.getElementById('app');

function inicio() {
  app.innerHTML = `
    <section class="saludo">
      <h2>¿Qué vas a construir?</h2>
      <p>Escoge el trabajo y lo despiezamos conversando.</p>
    </section>
    <div class="mosaico">
      ${TRABAJOS.map((t, i) => `
        <button class="opcion${i === 0 ? ' ancha' : ''}" data-id="${t.id}"
                style="--c:${t.color}; background-image:url(img/${t.id}.svg)">
          <span class="rotulo"><strong>${t.nombre}</strong></span>
        </button>`).join('')}
    </div>`;
}

// ---------- Estado guardado en el celular (sobrevive si se cierra la app) ----------
const guardar = (clave, valor) => { try { localStorage.setItem('despiece.' + clave, JSON.stringify(valor)); } catch {} };
const leer = clave => { try { return JSON.parse(localStorage.getItem('despiece.' + clave)); } catch { return null; } };

const PASOS = [
  ['Escoge un modelo', 'Modelos base listos para ajustar, o construye el tuyo.'],
  ['Escoge el material', 'Melamina, RH, MDF… con su espesor y color.'],
  ['Conversa con el asistente', 'Te pregunta medidas y detalles por voz. Puedes mandarle fotos.'],
  ['Recibe el despiece', 'Piezas, cantos, tableros, herrajes y consumibles, listo para el depósito.'],
];

function trabajo(t) {
  const esCloset = t.id === 'closet';
  const cfg = esCloset && leer('closet');
  const modelo = cfg && cfg.diseno && modeloPorId(cfg.modelo);
  const paso1 = !esCloset ? '' : modelo
    ? `<li class="hecho"><span class="n">✔</span>
         <div class="paso-cuerpo">
           <span class="miniatura">${dibujoFrontal(cfg.diseno)}</span>
           <div><b>${modelo.nombre}</b><span>${resumenDiseno(cfg)}</span>
             <span class="acciones"><button class="enlace" data-ir="#closet/3d/${modelo.id}">3D</button>
             <button class="enlace" data-ir="#closet/plano">Medidas</button>
             <button class="enlace" data-ir="#closet/modelos">Cambiar</button></span></div></div></li>`
    : `<li class="activo"><button class="paso-boton" data-ir="#closet/modelos"><span class="n">1</span>
         <div><b>${PASOS[0][0]}</b><span>${PASOS[0][1]}</span></div><span class="flecha">›</span></button></li>`;
  // Paso 2 (materiales): se abre cuando ya hay modelo, porque los herrajes dependen del diseño.
  const paso2 = !esCloset ? '' : cfg?.materiales && modelo
    ? `<li class="hecho"><span class="n">✔</span>
         <div><b>Materiales</b><span>${resumenMateriales(cfg.materiales)} · ${nombreColor(cfg.color)}</span>
           <span class="acciones"><button class="enlace" data-ir="#closet/materiales">Cambiar</button></span></div></li>`
    : modelo
      ? `<li class="activo"><button class="paso-boton" data-ir="#closet/materiales"><span class="n">2</span>
           <div><b>${PASOS[1][0]}</b><span>${PASOS[1][1]}</span></div><span class="flecha">›</span></button></li>`
      : `<li class="bloqueado"><span class="n">2</span><div><b>${PASOS[1][0]}</b><span>Primero escoge el modelo.</span></div></li>`;
  // Paso 3 (asistente de voz): con un modelo escogido ya se puede conversar
  const paso3 = modelo
    ? `<li class="activo voz"><button class="paso-boton" data-ir="#closet/asistente"><span class="n">🎙️</span>
         <div><b>${PASOS[2][0]}</b><span>${PASOS[2][1]}</span></div><span class="flecha">›</span></button></li>`
    : `<li class="bloqueado"><span class="n">3</span><div><b>${PASOS[2][0]}</b><span>Primero escoge el modelo.</span></div></li>`;
  // Paso 4 (despiece): con modelo y materiales ya se puede calcular
  const paso4 = modelo && cfg?.materiales
    ? `<li class="activo"><button class="paso-boton" data-ir="#closet/despiece"><span class="n">4</span>
         <div><b>${PASOS[3][0]}</b><span>${PASOS[3][1]}</span></div><span class="flecha">›</span></button></li>`
    : `<li class="bloqueado"><span class="n">4</span><div><b>${PASOS[3][0]}</b><span>Primero escoge el modelo y los materiales.</span></div></li>`;
  app.innerHTML = `
    <div style="--c:${t.color}">
    <button class="volver" data-ir="#">‹ Volver</button>
    <div class="portada" style="background-image:url(img/${t.id}.svg)" role="img" aria-label="${t.nombre}"></div>
    <div class="cabeza">
      <span class="chip">${t.icono}</span>
      <div><h2>${t.nombre}</h2><p>${t.detalle}</p></div>
    </div>
    <ol class="pasos">
      ${paso1}
      ${paso2}
      ${PASOS.map(([b, s], i) => (esCloset && i < 2) ? '' : (esCloset && i === 3) ? paso4 : (esCloset && i === 2) ? paso3 :
        `<li><span class="n">${i + 1}</span><div><b>${b}</b><span>${s}</span></div></li>`).join('')}
    </ol>
    ${esCloset ? '' : '<p class="pronto">🛠️ Esta sección está en construcción. Empezamos por el Closet.</p>'}
    <p class="version">Versión ${VERSION}</p>
    </div>`;
}

// ---------- Closet: escoger modelo ----------
let seleccion = null;

function modelosCloset() {
  seleccion = seleccion || leer('closet')?.modelo || null;
  app.innerHTML = `
    <div class="pantalla" style="--c:#0e6474">
      <button class="volver" data-ir="#closet">‹ Closet</button>
      <div class="titulo-pantalla"><h2>Escoge un modelo</h2><p>Toca el que más les guste. Las medidas se ajustan después.</p></div>
      <div class="modelos">
        ${MODELOS.map(m => `
          <button class="modelo" data-modelo="${m.id}" aria-pressed="${m.id === seleccion}">
            <span class="dibujo">${dibujoFrontal(m)}</span>
            <strong>${m.nombre}</strong><small>${m.resumen}</small>
            <span class="check" aria-hidden="true">✔</span>
          </button>`).join('')}
      </div>
      <button class="propio" disabled>✏️ Construye tu modelo <small>Próximamente</small></button>
      <div class="barra-accion" data-barra></div>
    </div>`;
  pintarBarra();
}

function pintarBarra() {
  const barra = app.querySelector('[data-barra]');
  const m = modeloPorId(seleccion);
  barra.innerHTML = m
    ? `<span>Escogiste<br><b>${m.nombre}</b></span><button class="primario" data-ir="#closet/3d/${m.id}">Ver en 3D ›</button>`
    : `<span class="apagado">Toca un modelo para escogerlo</span>`;
  app.querySelectorAll('.modelo').forEach(b => b.setAttribute('aria-pressed', b.dataset.modelo === seleccion));
}

// ---------- Closet: diseño en 3D (ropa, puertas, color) ----------
// "borrador" = lo que se está diseñando en la pantalla 3D; se guarda al tocar "Usar este diseño".
let visor = null;
let borrador = null;
let pestana = 'ropa';
let aviso = '';

const m2 = n => n.toFixed(2).replace('.', ',');
const cm = n => Math.round(n * 100) + ' cm';
const nombreColor = id => COLORES.find(c => c.id === id)?.nombre || '';
const nombrePuerta = id => PUERTAS.find(p => p.id === id)?.nombre || '';

function resumenDiseno(cfg) {
  const puerta = cfg.puerta && cfg.puerta !== 'ninguna' ? `Puertas ${nombrePuerta(cfg.puerta).toLowerCase()}` : 'Sin puertas';
  return `${puerta} · ${nombreColor(cfg.color)}${cfg.ajustado ? ' · ajustado a la ropa' : ''}`;
}

function borradorPara(id) {
  const m = modeloPorId(id);
  const cfg = leer('closet');
  if (cfg?.modelo === id && cfg.diseno) return copiar(cfg);
  // modelo nuevo: se conservan los materiales y el color ya escogidos
  const diseno = { medidas: copiar(m.medidas), cuerpos: copiar(m.cuerpos) };
  if (cfg?.diseno?.espesor) diseno.espesor = cfg.diseno.espesor;
  return { modelo: id, diseno, color: cfg?.color || 'cedro', puerta: 'ninguna', ajustado: false,
           ...(cfg?.materiales ? { materiales: cfg.materiales } : {}) };
}

async function closet3d(id) {
  const m = modeloPorId(id);
  if (!m) { location.hash = '#closet/modelos'; return; }
  if (borrador?.modelo !== id) { borrador = borradorPara(id); pestana = 'ropa'; aviso = ''; }
  const { ancho, alto, fondo } = borrador.diseno.medidas;
  app.innerHTML = `
    <div class="pantalla">
      <div class="fila-titulo"><button class="volver" data-ir="#closet/modelos">‹ Modelos</button><b>${m.nombre}</b></div>
      <div class="visor" data-visor>
        <p class="cargando">Armando el closet en 3D…</p>
        <span class="medidas-chip">${m2(ancho)} × ${m2(alto)} × ${m2(fondo)} m</span>
        <div class="flotantes">
          <button data-accion="frente">Frente</button>
          <button data-accion="puertas" hidden>Abrir puertas</button>
          <button data-accion="cajones" hidden>Cajones</button>
        </div>
        <p class="pista">Arrastra para girar · toca un cajón o una puerta</p>
      </div>
      <div class="pestanas" role="tablist">
        <button role="tab" data-pestana="ropa">👕 Ropa</button>
        <button role="tab" data-pestana="puertas">🚪 Puertas</button>
        <button role="tab" data-pestana="color">🎨 Color</button>
      </div>
      <div class="panel" data-panel></div>
      <button class="primario ancho" data-accion="confirmar">✔ Usar este diseño</button>
    </div>`;
  pintarPanel();
  const caja = app.querySelector('[data-visor]');
  try {
    const { montarVisor } = await import('./closet/visor3d.js');
    if (!caja.isConnected) return;   // ya se fue de la pantalla mientras cargaba
    visor = montarVisor(caja, borrador.diseno, { color: borrador.color, puerta: borrador.puerta });
    caja.querySelector('.cargando').remove();
    pintarFlotantes();
  } catch (err) {
    console.error(err);
    caja.querySelector('.cargando').textContent = 'No se pudo cargar el 3D. Revisa la conexión a internet e intenta de nuevo.';
  }
}

function pintarFlotantes() {
  if (!visor) return;
  const bp = app.querySelector('[data-accion="puertas"]'), bc = app.querySelector('[data-accion="cajones"]');
  bp.hidden = !visor.hayPuertas;
  bp.textContent = visor.puertasAbiertas ? 'Cerrar puertas' : 'Abrir puertas';
  bc.hidden = !visor.hayCajones;
}

function pintarPanel() {
  const panel = app.querySelector('[data-panel]');
  if (!panel) return;
  app.querySelectorAll('[data-pestana]').forEach(b => b.setAttribute('aria-selected', b.dataset.pestana === pestana));
  if (pestana === 'ropa') {
    const tubos = revisarTubos(borrador.diseno);
    const { fondo } = borrador.diseno.medidas;
    const fondoInt = fondo - 0.006;
    panel.innerHTML = `
      ${aviso ? `<p class="aviso">✔ ${aviso}</p>` : ''}
      ${tubos.length ? tubos.map(t => `
        <div class="fila-ropa ${t.cabe ? 'ok' : 'mal'}">
          <div class="donde"><b>Cuerpo ${t.ci + 1}${t.total > 1 ? (t.k === 0 ? ' · arriba' : ' · abajo') : ''}</b>
            <small>${t.cabe ? `${cm(t.espacio)} libres` : `faltan ${cm(t.falta)}`}</small></div>
          <select data-uso="${t.ci}-${t.k}" aria-label="Qué se cuelga en el cuerpo ${t.ci + 1}">
            ${Object.entries(USOS).map(([k, u]) => `<option value="${k}" ${k === t.uso ? 'selected' : ''}>${u.nombre} (${cm(necesita(k))})</option>`).join('')}
          </select>
          ${t.cabe ? '<span class="estado">✔ Cabe</span>' : `<button class="ajustar" data-ajustar="${t.ci}-${t.k}">Ajustar</button>`}
        </div>`).join('') : '<p class="nota">Este modelo no tiene tubos para colgar.</p>'}
      <p class="nota">${fondoInt >= FONDO_MIN ? '✔' : '⚠️'} Fondo interior ${cm(fondoInt)}: ${fondoInt >= FONDO_MIN ? 'los ganchos caben sin rozar' : 'muy poco para ganchos'} (mín. ${cm(FONDO_MIN)}).</p>`;
  } else if (pestana === 'puertas') {
    panel.innerHTML = `<div class="opciones">${PUERTAS.map(p => `
      <button class="opcion-puerta" data-puerta="${p.id}" aria-pressed="${p.id === borrador.puerta}">
        ${ICONO_PUERTA[p.id]}<b>${p.nombre}</b><small>${p.detalle}</small>
      </button>`).join('')}</div>`;
  } else {
    panel.innerHTML = `<div class="colores">${COLORES.map(c => `
      <button class="color" data-color="${c.id}" aria-pressed="${c.id === borrador.color}">
        <span class="muestra" style="--base:${c.base};--veta:${c.oscura}"></span><small>${c.nombre}</small>
      </button>`).join('')}</div>`;
  }
}

const ICONO_PUERTA = {
  ninguna: '<svg viewBox="0 0 48 40"><rect x="6" y="4" width="36" height="32" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M24 4v32M6 14h36" stroke="currentColor" stroke-width="2"/></svg>',
  batientes: '<svg viewBox="0 0 48 40"><rect x="6" y="4" width="36" height="32" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M24 4v32" stroke="currentColor" stroke-width="2"/><path d="M6 4l-4 6v24l4 2M42 4l4 6v24l-4 2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="1.6" fill="currentColor"/><circle cx="28" cy="20" r="1.6" fill="currentColor"/></svg>',
  corredizas: '<svg viewBox="0 0 48 40"><rect x="6" y="4" width="36" height="32" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="8" y="6" width="18" height="28" fill="currentColor" opacity=".25"/><rect x="22" y="6" width="18" height="28" fill="currentColor" opacity=".45"/><path d="M14 20h-6m0 0l3-3m-3 3l3 3M34 20h6m0 0l-3-3m3 3l-3 3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
};

// ---------- Closet: plano con medidas ----------
async function closetPlano() {
  const cfg = leer('closet');
  if (!cfg?.diseno) { location.hash = '#closet'; return; }
  const { planoConMedidas } = await import('./closet/plano.js');
  const m = modeloPorId(cfg.modelo);
  app.innerHTML = `
    <div class="pantalla">
      <div class="fila-titulo"><button class="volver" data-ir="#closet/3d/${cfg.modelo}">‹ 3D</button><b>Plano con medidas</b></div>
      <div class="plano">${planoConMedidas(cfg.diseno)}</div>
      <p class="leyenda"><b>${m.nombre}</b> · ${resumenDiseno(cfg)}<br>
        <span class="ok">Verde</span>: espacio libre para colgar, cabe la ropa · <span class="mal">Rojo</span>: no cabe</p>
      <button class="primario ancho" data-ir="#closet">✔ Listo</button>
    </div>`;
}

// ---------- Closet: materiales ----------
const PESTANAS_MAT = [['tableros', '🪵 Tableros'], ['acabados', '✂️ Cantos y fondo'], ['herrajes', '🔩 Herrajes']];
let mat = null;        // { valores, color } mientras se escoge; se guarda al final
let pestanaMat = 'tableros';

function closetMateriales() {
  const cfg = leer('closet');
  if (!cfg?.diseno) { location.hash = '#closet'; return; }
  mat = { valores: { ...porDefecto(), ...(cfg.materiales || {}) }, color: cfg.color || 'cedro' };
  pestanaMat = 'tableros';
  app.innerHTML = `
    <div class="pantalla">
      <div class="fila-titulo"><button class="volver" data-ir="#closet">‹ Closet</button><b>Materiales</b></div>
      <div class="pestanas" role="tablist">
        ${PESTANAS_MAT.map(([id, n]) => `<button role="tab" data-pestana-mat="${id}">${n}</button>`).join('')}
      </div>
      <div class="preguntas" data-preguntas></div>
      <button class="primario ancho" data-accion="siguiente-mat"></button>
    </div>`;
  pintarMateriales();
}

function pintarMateriales() {
  const cont = app.querySelector('[data-preguntas]');
  if (!cont) return;
  const cfg = leer('closet');
  const ctx = contexto(cfg.diseno, cfg.puerta);
  app.querySelectorAll('[data-pestana-mat]').forEach(b => b.setAttribute('aria-selected', b.dataset.pestanaMat === pestanaMat));
  const pregunta = clave => {
    const p = PREGUNTAS[clave], sel = p.opciones.find(o => o.id === mat.valores[clave]) || p.opciones[0];
    return `<section class="pregunta">
      <h3>${p.titulo}</h3>
      <div class="chips" role="radiogroup" aria-label="${p.titulo}">
        ${p.opciones.map(o => `<button class="chip-op" role="radio" data-mat="${clave}" data-val="${o.id}" aria-checked="${o.id === sel.id}">${o.nombre}${o.rec ? '<i aria-label="recomendado">★</i>' : ''}</button>`).join('')}
      </div>
      <p class="explica">${sel.detalle}${sel.rec ? ' <b>★ Recomendado.</b>' : ''}</p>
    </section>`;
  };
  const color = `<section class="pregunta">
      <h3>Color de la melamina</h3>
      <div class="colores mini">${COLORES.map(c => `
        <button class="color" data-color-mat="${c.id}" aria-pressed="${c.id === mat.color}">
          <span class="muestra" style="--base:${c.base};--veta:${c.oscura}"></span><small>${c.nombre}</small>
        </button>`).join('')}</div>
    </section>`;
  const claves = GRUPOS[pestanaMat].filter(k => aplica(k, ctx));
  cont.innerHTML = (pestanaMat === 'tableros' ? claves.map(pregunta).join('') + color : claves.map(pregunta).join(''))
    || '<p class="nota">Este diseño no lleva herrajes especiales.</p>';
  const i = PESTANAS_MAT.findIndex(([id]) => id === pestanaMat);
  app.querySelector('[data-accion="siguiente-mat"]').textContent =
    i < PESTANAS_MAT.length - 1 ? `Siguiente: ${PESTANAS_MAT[i + 1][1].replace(/^\S+\s/, '')} ›` : '✔ Guardar materiales';
  cont.scrollTop = 0;
}

function guardarMateriales() {
  const cfg = leer('closet');
  cfg.materiales = mat.valores;
  cfg.color = mat.color;
  cfg.diseno.espesor = Number(mat.valores.espesor) / 1000;   // el 3D, el plano y el despiece usan este espesor
  guardar('closet', cfg);
  borrador = null;   // que el 3D se vuelva a armar con el tablero y color nuevos
  location.hash = '#closet';
}

// ---------- Closet: despiece ----------
let despiece = null;
let pestanaDes = 'piezas';
const cmTxt = m => String(Math.round(m * 1000) / 10).replace('.', ',');
const num = x => String(x).replace('.', ',');

async function closetDespiece() {
  const cfg = leer('closet');
  if (!cfg?.diseno) { location.hash = '#closet'; return; }
  // si llegó desde el asistente sin pasar por materiales, se usan los recomendados (★)
  if (!cfg.materiales) { cfg.materiales = porDefecto(); cfg.diseno.espesor = Number(cfg.materiales.espesor) / 1000; guardar('closet', cfg); }
  const { calcularDespiece } = await import('./closet/despiece.js');
  despiece = calcularDespiece(cfg);
  const m = modeloPorId(cfg.modelo);
  const { ancho, alto, fondo } = cfg.diseno.medidas;
  const noCaben = revisarTubos(cfg.diseno).filter(t => !t.cabe);
  const laminas = despiece.tableros.reduce((s, t) => s + t.laminas, 0);
  const canto = despiece.cantos.reduce((s, c) => s + c.pedir, 0);
  app.innerHTML = `
    <div class="pantalla">
      <div class="fila-titulo"><button class="volver" data-ir="#closet">‹ Closet</button><b>Despiece</b></div>
      <div class="resumen-des">
        <p class="linea"><b>${m.nombre}</b> · ${despiece.nombreTablero}</p>
        <form class="medidas" data-medidas>
          <label>Ancho<input name="ancho" type="number" inputmode="decimal" step="0.1" value="${cmTxt(ancho).replace(',', '.')}"></label>
          <label>Alto<input name="alto" type="number" inputmode="decimal" step="0.1" value="${cmTxt(alto).replace(',', '.')}"></label>
          <label>Fondo<input name="fondo" type="number" inputmode="decimal" step="0.1" value="${cmTxt(fondo).replace(',', '.')}"></label>
          <button class="recalcular">Recalcular</button>
        </form>
        <p class="nota-medidas">Medidas del closet en cm. Escríbelas y toca Recalcular.</p>
        ${noCaben.length ? `<p class="alerta">⚠️ Con estas medidas no cabe la ropa del cuerpo ${noCaben.map(t => t.ci + 1).join(', ')}. <a href="#closet/3d/${cfg.modelo}">Revisar en el 3D</a></p>` : ''}
        ${despiece.avisos.map(a => `<p class="alerta">⚠️ ${a}</p>`).join('')}
        <div class="cifras">
          <div><b>${despiece.nPiezas}</b><small>piezas</small></div>
          <div><b>${laminas}</b><small>láminas</small></div>
          <div><b>${canto} m</b><small>de canto</small></div>
        </div>
      </div>
      <div class="pestanas" role="tablist">
        <button role="tab" data-pestana-des="piezas">📋 Piezas</button>
        <button role="tab" data-pestana-des="tableros">🪵 Tableros</button>
        <button role="tab" data-pestana-des="herrajes">🔩 Herrajes</button>
      </div>
      <div class="lista-des" data-lista></div>
      <button class="primario ancho" data-accion="abrir-envio">📤 Enviar al depósito</button>
    </div>
    <div class="hoja-fondo" data-hoja hidden>
      <div class="hoja" role="dialog" aria-label="Enviar al depósito">
        <h3>¿Qué programa usa el depósito?</h3>
        <p class="nota">Se genera el archivo de piezas para ese programa y se comparte (WhatsApp, correo) o se descarga.</p>
        ${PERFILES.map(p => `<button class="opcion-envio" data-exportar="${p.id}"><b>${p.nombre}</b><small>${p.detalle}</small></button>`).join('')}
        <button class="opcion-envio" data-exportar="completo"><b>Lista completa (Excel)</b><small>Piezas + tableros + cantos + herrajes + consumibles en un solo archivo.</small></button>
        <button class="opcion-envio" data-exportar="whatsapp"><b>Mensaje de lo que hay que comprar</b><small>Texto para WhatsApp: láminas, cantos, herrajes y consumibles.</small></button>
        <button class="enlace" data-accion="cerrar-envio">Cerrar</button>
      </div>
    </div>`;
  pintarDespiece();
}

function pintarDespiece() {
  const lista = app.querySelector('[data-lista]');
  if (!lista || !despiece) return;
  app.querySelectorAll('[data-pestana-des]').forEach(b => b.setAttribute('aria-selected', b.dataset.pestanaDes === pestanaDes));
  const cantoCorto = p => !p.tipoCanto ? 'sin canto'
    : `canto ${[p.cantoL && `${p.cantoL}L`, p.cantoA && `${p.cantoA}A`].filter(Boolean).join('+')} ${num(p.tipoCanto)} mm`;
  if (pestanaDes === 'piezas') {
    let modulo = '';
    lista.innerHTML = despiece.piezas.map(p => {
      const grupo = p.modulo.split(',')[0].replace(/ \d+$/, '') === 'Cuerpo' ? 'Interior' : p.modulo.split(',')[0];
      const cab = grupo !== modulo ? `<h4>${(modulo = grupo)}</h4>` : '';
      return `${cab}<div class="fila-pieza">
        <span class="cant">${p.cant}×</span>
        <div class="que"><b>${p.nombre}</b><small>${p.modulo}${p.material !== despiece.nombreTablero ? ` · ${p.material}` : ''}${p.nota ? ` · ${p.nota}` : ''}</small></div>
        <div class="dims"><b>${p.largo} × ${p.ancho}</b><small>${p.espesor} mm · ${cantoCorto(p)}${p.veta ? ' · veta' : ''}</small></div>
      </div>`;
    }).join('') + '<p class="nota">Medidas en mm: largo × ancho. El largo va en el sentido de la veta. L = lados largos, A = lados anchos con canto.</p>';
  } else if (pestanaDes === 'tableros') {
    lista.innerHTML = `<h4>Tableros</h4>${despiece.tableros.map(t => `
      <div class="fila-pieza"><span class="cant">${t.laminas}</span>
        <div class="que"><b>${t.material}</b><small>lámina(s) de 2,44 × 1,83 m · ${num(t.m2.toFixed(2))} m² en piezas</small></div></div>`).join('')}
      <p class="nota">Estimado con ${Math.round(0.85 * 100)} % de aprovechamiento. El depósito confirma el número exacto al optimizar el corte.</p>
      <h4>Cantos</h4>${despiece.cantos.map(c => `
      <div class="fila-pieza"><span class="cant">${c.pedir} m</span>
        <div class="que"><b>${c.nombre}</b><small>${num(c.metros.toFixed(1))} m exactos + 10 % de desperdicio</small></div></div>`).join('') || '<p class="nota">Sin canto.</p>'}`;
  } else {
    const filas = xs => xs.map(h => `<div class="fila-pieza"><span class="cant">${num(h.cant)}</span>
      <div class="que"><b>${h.nombre}</b><small>${h.unidad}${h.nota ? ` · ${h.nota}` : ''}</small></div></div>`).join('');
    lista.innerHTML = `<h4>Herrajes</h4>${filas(despiece.herrajes) || '<p class="nota">Sin herrajes.</p>'}
      <h4>Consumibles</h4>${filas(despiece.consumibles)}
      <p class="nota">Tornillos y puntillas son un cálculo aproximado con 10 % de más.</p>`;
  }
  lista.scrollTop = 0;
}

function recalcularMedidas(form) {
  const v = n => Number(String(form.elements[n].value).replace(',', '.')) / 100;
  const ancho = v('ancho'), alto = v('alto'), fondo = v('fondo');
  const cfg = leer('closet');
  const errores = validarMedidas(cfg.diseno, { ancho, alto, fondo });
  if (errores.length) { alert(errores.map(x => '• ' + x[0].toUpperCase() + x.slice(1)).join('\n')); return; }
  cfg.diseno.medidas = { ancho, alto, fondo };
  guardar('closet', cfg);
  borrador = null;
  closetDespiece();
}

async function exportar(tipo) {
  const cfg = leer('closet');
  const m = modeloPorId(cfg.modelo);
  const { ancho, alto, fondo } = cfg.diseno.medidas;
  const encabezado = `Closet ${m.nombre} · ${cmTxt(ancho)} × ${cmTxt(alto)} × ${cmTxt(fondo)} cm · ${despiece.nombreTablero}`;
  const fecha = new Date().toISOString().slice(0, 10);
  const base = `despiece-closet-${cfg.modelo}-${fecha}`;
  const texto = textoPedido(despiece, encabezado);
  if (tipo === 'whatsapp') {
    if (navigator.share) { try { await navigator.share({ text: texto }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    return;
  }
  const contenido = tipo === 'completo' ? csvCompleto(despiece, encabezado) : csvPiezas(despiece, tipo);
  const sufijo = tipo === 'completo' ? 'completo' : tipo;
  await compartirODescargar(`${base}-${sufijo}.csv`, contenido, 'text/csv', encabezado);
}

// ---------- Closet: asistente de voz ----------
// Por ahora con el cerebro de ENSAYO (reglas) y la voz del celular. Cuando estén las cuentas,
// se cambia el cerebro por Claude y la voz por Salomé (Azure); la pantalla no cambia.
let asistente = null;   // { orbe, voz, cerebro }
let conversacion = [];  // burbujas de esta sesión

async function closetAsistente() {
  const cfg = leer('closet');
  if (!cfg?.diseno) { location.hash = '#closet'; return; }
  app.innerHTML = `
    <div class="pantalla asistente">
      <div class="fila-titulo"><button class="volver" data-ir="#closet">‹ Closet</button><b>Salomé</b><span class="etiqueta-ensayo" title="Voz y cerebro provisionales">modo ensayo</span></div>
      <div class="escena-orbe" data-accion="mic">
        <canvas data-orbe aria-hidden="true"></canvas>
        <p class="estado-voz" data-estado>Toca el círculo para empezar</p>
      </div>
      <div class="conversacion" data-conv aria-live="polite"></div>
      <div class="cambios" data-cambios></div>
      <form class="escribir" data-escribir>
        <input name="t" type="text" autocomplete="off" placeholder="…o escríbele aquí" aria-label="Escribirle al asistente">
        <button aria-label="Enviar">➤</button>
      </form>
      <div class="controles-voz">
        <button class="mini-diseno" data-ir="#closet/3d/${cfg.modelo}" aria-label="Ver el diseño en 3D" data-mini>${dibujoFrontal(cfg.diseno)}</button>
        <button class="mic" data-accion="mic" aria-label="Hablar con Salomé"><span data-mic-icono>🎙️</span></button>
        <button class="ir-despiece" data-ir="#closet/despiece" aria-label="Ver el despiece">📋</button>
      </div>
    </div>`;

  const [{ crearOrbe }, { crearVoz }, { crearCerebroEnsayo }] = await Promise.all([
    import('./orbe.js'), import('./voz.js'), import('./closet/ensayo.js'),
  ]);
  if (!app.querySelector('[data-orbe]')) return;   // ya se fue de la pantalla
  const orbe = crearOrbe(app.querySelector('[data-orbe]'));
  const estado = app.querySelector('[data-estado]');
  const TEXTOS = { reposo: 'Toca el círculo para hablar', escuchando: 'Te escucho…', pensando: 'Déjame ver…', hablando: 'Salomé está hablando' };
  const voz = crearVoz({
    onEstado: e => { orbe.ponerEstado(e); estado.textContent = TEXTOS[e]; app.querySelector('.mic')?.classList.toggle('activo', e !== 'reposo'); },
    onNivel: v => orbe.empujar(v),
    onParcial: t => burbuja('tu', t, true),
    onTurno: t => turno(t),
    onError: m => { estado.textContent = m; },
  });
  const cerebro = crearCerebroEnsayo();
  asistente = { orbe, voz, cerebro, iniciado: false };
  if (!voz.puedeOir) estado.textContent = 'Este navegador no deja usar el micrófono: escríbele abajo.';
  conversacion.forEach(b => pintarBurbuja(b));
}

function pintarBurbuja({ quien, texto, parcial }) {
  const conv = app.querySelector('[data-conv]');
  if (!conv) return;
  let el = conv.querySelector('.parcial');
  if (!el || !parcial) {
    conv.querySelector('.parcial')?.remove();
    el = document.createElement('p');
    conv.appendChild(el);
  }
  el.className = `burbuja ${quien}${parcial ? ' parcial' : ''}`;
  el.textContent = texto;
  conv.scrollTop = conv.scrollHeight;
}
function burbuja(quien, texto, parcial = false) {
  if (!parcial) conversacion.push({ quien, texto });
  conversacion = conversacion.slice(-30);
  pintarBurbuja({ quien, texto, parcial });
}

async function empezarAsistente() {
  if (!asistente) return;
  const { voz, cerebro } = asistente;
  if (voz.activo) { voz.parar(); return; }
  voz.empezar();
  if (!asistente.iniciado) {
    asistente.iniciado = true;
    const r = await cerebro.iniciar();
    burbuja('ella', r.texto);
    await voz.hablar(r.texto);
  }
}

async function turno(texto) {
  if (!asistente) return;
  const { voz, cerebro } = asistente;
  burbuja('tu', texto);
  voz.pensar();
  const r = await cerebro.responder(texto);
  if (!asistente) return;
  const cambios = app.querySelector('[data-cambios]');
  for (const c of r.cambios || []) {
    const chip = Object.assign(document.createElement('span'), { className: 'cambio', textContent: `✔ ${c}` });
    cambios?.prepend(chip);
  }
  if (r.cambios?.length) {   // el dibujo pequeño se actualiza con el diseño nuevo
    const cfg = leer('closet');
    const mini = app.querySelector('[data-mini]');
    if (mini) { mini.innerHTML = dibujoFrontal(cfg.diseno); mini.dataset.ir = `#closet/3d/${cfg.modelo}`; }
    borrador = null;
  }
  burbuja('ella', r.texto);
  await voz.hablar(r.texto);
  if (r.ir) { voz.parar(); location.hash = r.ir; }
}

// ---------- Rutas: #closet, #closet/modelos, #closet/3d/<modelo>, #closet/plano, #closet/materiales, #closet/despiece, #closet/asistente ----------
function mostrar() {
  visor?.destruir(); visor = null;
  if (asistente) { asistente.voz.destruir(); asistente.orbe.destruir(); asistente = null; }
  const [id, sub, arg] = location.hash.slice(1).split('/');
  const t = TRABAJOS.find(x => x.id === id);
  if (id === 'closet' && sub === 'modelos') modelosCloset();
  else if (id === 'closet' && sub === '3d') closet3d(arg);
  else if (id === 'closet' && sub === 'plano') closetPlano();
  else if (id === 'closet' && sub === 'materiales') closetMateriales();
  else if (id === 'closet' && sub === 'despiece') closetDespiece();
  else if (id === 'closet' && sub === 'asistente') closetAsistente();
  else t ? trabajo(t) : inicio();
  app.scrollTop = 0;
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-id], [data-ir], [data-modelo], [data-accion], [data-pestana], [data-ajustar], [data-puerta], [data-color], [data-mat], [data-color-mat], [data-pestana-mat], [data-pestana-des], [data-exportar], [data-hoja]');
  if (!b) return;
  const d = b.dataset;
  if (d.accion === 'mic') { empezarAsistente(); return; }
  if (d.pestanaDes) { pestanaDes = d.pestanaDes; pintarDespiece(); return; }
  if (d.accion === 'abrir-envio') { app.querySelector('[data-hoja]').hidden = false; return; }
  if (d.accion === 'cerrar-envio' || (b.matches('[data-hoja]') && e.target === b)) { app.querySelector('[data-hoja]').hidden = true; return; }
  if (d.exportar) { exportar(d.exportar); return; }
  if (b.matches('[data-hoja]')) return;
  if (d.mat) { mat.valores[d.mat] = d.val; pintarMateriales(); return; }
  if (d.colorMat) { mat.color = d.colorMat; pintarMateriales(); return; }
  if (d.pestanaMat) { pestanaMat = d.pestanaMat; pintarMateriales(); return; }
  if (d.accion === 'siguiente-mat') {
    const i = PESTANAS_MAT.findIndex(([id]) => id === pestanaMat);
    if (i < PESTANAS_MAT.length - 1) { pestanaMat = PESTANAS_MAT[i + 1][0]; pintarMateriales(); }
    else guardarMateriales();
    return;
  }
  if (d.id) location.hash = d.id;
  else if (d.ir) location.hash = d.ir;
  else if (d.modelo) { seleccion = d.modelo; pintarBarra(); }
  else if (d.pestana) {
    pestana = d.pestana; aviso = ''; pintarPanel();
    if (pestana === 'ropa' && visor?.hayPuertas && !visor.puertasAbiertas) { visor.abrirPuertas(true); setTimeout(pintarFlotantes, 50); }
  }
  else if (d.ajustar) {
    const [ci, k] = d.ajustar.split('-').map(Number);
    const r = ajustarTubo(borrador.diseno, ci, k);
    if (!r) { aviso = ''; alert('Ni despejando todo el cuerpo cabe: hay que subir el tubo o colgar esa ropa en otro cuerpo.'); return; }
    borrador.diseno = r.diseno; borrador.ajustado = true;
    aviso = `Cuerpo ${ci + 1}: ${r.cambios.join(', ') || 'listo'}.`;
    visor?.actualizar(borrador.diseno);
    if (visor?.hayPuertas) visor.abrirPuertas(true);
    pintarPanel(); pintarFlotantes();
  }
  else if (d.puerta) {
    borrador.puerta = d.puerta; visor?.ponerPuerta(d.puerta); pintarPanel(); pintarFlotantes();
  }
  else if (d.color) { borrador.color = d.color; visor?.ponerColor(d.color); pintarPanel(); }
  else if (d.accion === 'cajones' && visor) { visor.alternarCajones(); setTimeout(pintarFlotantes, 450); }
  else if (d.accion === 'puertas' && visor) { visor.alternarPuertas(); setTimeout(pintarFlotantes, 50); }
  else if (d.accion === 'frente' && visor) visor.vistaFrontal();
  else if (d.accion === 'confirmar') {
    guardar('closet', borrador);
    seleccion = borrador.modelo;
    location.hash = '#closet/plano';
  }
});

app.addEventListener('submit', async e => {
  const escribir = e.target.closest('[data-escribir]');
  if (escribir) {
    e.preventDefault();
    const t = escribir.elements.t.value.trim();
    if (!t || !asistente) return;
    escribir.elements.t.value = '';
    if (!asistente.iniciado) {   // si empieza escribiendo, primero el saludo
      asistente.iniciado = true;
      burbuja('ella', (await asistente.cerebro.iniciar()).texto);
    }
    turno(t);
    return;
  }
  const form = e.target.closest('[data-medidas]');
  if (!form) return;
  e.preventDefault();
  recalcularMedidas(form);
});

app.addEventListener('change', e => {
  const s = e.target.closest('[data-uso]');
  if (!s) return;
  const [ci, k] = s.dataset.uso.split('-').map(Number);
  borrador.diseno = cambiarUso(borrador.diseno, ci, k, s.value);
  aviso = '';
  visor?.actualizar(borrador.diseno);
  if (visor?.hayPuertas) visor.abrirPuertas(true);
  pintarPanel(); pintarFlotantes();
});

window.addEventListener('hashchange', mostrar);
mostrar();

if ('serviceWorker' in navigator) {
  // Si ya había una versión instalada y llega una nueva, recargar una vez para usarla de inmediato.
  const habiaVersion = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion && !recargando) { recargando = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
}

