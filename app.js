// Despiece Carpintería — mosaico de trabajos y, por ahora, el flujo del Closet.
// Cada trabajo tendrá sus modelos base + "Construye tu modelo", su menú de materiales
// y la conversación por voz que arma el despiece.
import { MODELOS, modeloPorId, dibujoFrontal } from './closet/modelos.js';

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
  const modelo = esCloset && modeloPorId(leer('closet')?.modelo);
  const paso1 = !esCloset ? '' : modelo
    ? `<li class="hecho"><span class="n">✔</span>
         <div class="paso-cuerpo">
           <span class="miniatura">${dibujoFrontal(modelo)}</span>
           <div><b>${modelo.nombre}</b><span>Modelo escogido</span>
             <span class="acciones"><button class="enlace" data-ir="#closet/3d/${modelo.id}">Ver en 3D</button>
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

// ---------- Closet: visor 3D ----------
let visor = null;

async function closet3d(id) {
  const m = modeloPorId(id);
  if (!m) { location.hash = '#closet/modelos'; return; }
  const { ancho, alto, fondo } = m.medidas;
  const f = n => n.toFixed(2).replace('.', ',');
  const conCajones = m.cuerpos.some(c => c.elementos.some(e => e.t === 'cajones'));
  app.innerHTML = `
    <div class="pantalla">
      <div class="fila-titulo"><button class="volver" data-ir="#closet/modelos">‹ Modelos</button><b>${m.nombre}</b></div>
      <div class="visor" data-visor>
        <p class="cargando">Armando el closet en 3D…</p>
        <p class="pista">Arrastra para girar · pellizca para acercar${conCajones ? ' · toca un cajón' : ''}</p>
      </div>
      <div class="controles3d">
        ${conCajones ? '<button class="secundario" data-accion="cajones">Abrir cajones</button>' : ''}
        <button class="secundario" data-accion="frente">Vista de frente</button>
      </div>
      <p class="medidas-ref">Medidas de referencia: ${f(ancho)} ancho × ${f(alto)} alto × ${f(fondo)} fondo (m). Luego las ajustamos a las tuyas.</p>
      <button class="primario ancho" data-accion="confirmar" data-modelo3d="${m.id}">✔ Usar este modelo</button>
    </div>`;
  const caja = app.querySelector('[data-visor]');
  try {
    const { montarVisor } = await import('./closet/visor3d.js');
    if (!caja.isConnected) return;   // ya se fue de la pantalla mientras cargaba
    visor = montarVisor(caja, m);
    caja.querySelector('.cargando').remove();
  } catch (err) {
    console.error(err);
    caja.querySelector('.cargando').textContent = 'No se pudo cargar el 3D. Revisa la conexión a internet e intenta de nuevo.';
  }
}

// ---------- Rutas: #closet, #closet/modelos, #closet/3d/<modelo> ----------
function mostrar() {
  visor?.destruir(); visor = null;
  const [id, sub, arg] = location.hash.slice(1).split('/');
  const t = TRABAJOS.find(x => x.id === id);
  if (id === 'closet' && sub === 'modelos') modelosCloset();
  else if (id === 'closet' && sub === '3d') closet3d(arg);
  else t ? trabajo(t) : inicio();
  app.scrollTop = 0;
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-id], [data-ir], [data-modelo], [data-accion]');
  if (!b) return;
  if (b.dataset.id) location.hash = b.dataset.id;
  else if (b.dataset.ir) location.hash = b.dataset.ir;
  else if (b.dataset.modelo) { seleccion = b.dataset.modelo; pintarBarra(); }
  else if (b.dataset.accion === 'cajones' && visor) b.textContent = visor.alternarCajones() ? 'Cerrar cajones' : 'Abrir cajones';
  else if (b.dataset.accion === 'frente' && visor) visor.vistaFrontal();
  else if (b.dataset.accion === 'confirmar') {
    guardar('closet', { ...(leer('closet') || {}), modelo: b.dataset.modelo3d });
    seleccion = b.dataset.modelo3d;
    location.hash = '#closet';
  }
});

window.addEventListener('hashchange', mostrar);
mostrar();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

