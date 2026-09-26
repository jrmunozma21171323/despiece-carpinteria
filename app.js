// Despiece Carpintería — mosaico de trabajos y, por ahora, el flujo del Closet.
// Cada trabajo tendrá sus modelos base + "Construye tu modelo", su menú de materiales
// y la conversación por voz que arma el despiece.
import {
  MODELOS, USOS, COLORES, PUERTAS, FONDO_MIN,
  modeloPorId, dibujoFrontal, revisarTubos, cambiarUso, ajustarTubo, necesita, copiar,
} from './closet/modelos.js';

const VERSION = 8;   // igual al número de CACHE en sw.js: se muestra en la app para saber qué versión tiene cada celular

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
      ${PASOS.map(([b, s], i) => (esCloset && i === 0) ? '' :
        `<li><span class="n">${i + 1}</span><div><b>${b}</b><span>${s}</span></div></li>`).join('')}
    </ol>
    <p class="pronto">🛠️ ${esCloset ? 'Los siguientes pasos están en construcción.' : 'Esta sección está en construcción. Empezamos por el Closet.'}</p>
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
  return { modelo: id, diseno: { medidas: copiar(m.medidas), cuerpos: copiar(m.cuerpos) }, color: 'cedro', puerta: 'ninguna', ajustado: false };
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

// ---------- Rutas: #closet, #closet/modelos, #closet/3d/<modelo>, #closet/plano ----------
function mostrar() {
  visor?.destruir(); visor = null;
  const [id, sub, arg] = location.hash.slice(1).split('/');
  const t = TRABAJOS.find(x => x.id === id);
  if (id === 'closet' && sub === 'modelos') modelosCloset();
  else if (id === 'closet' && sub === '3d') closet3d(arg);
  else if (id === 'closet' && sub === 'plano') closetPlano();
  else t ? trabajo(t) : inicio();
  app.scrollTop = 0;
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-id], [data-ir], [data-modelo], [data-accion], [data-pestana], [data-ajustar], [data-puerta], [data-color]');
  if (!b) return;
  const d = b.dataset;
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

