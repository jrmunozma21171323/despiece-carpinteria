// Despiece Carpintería — etapa 1: mosaico de trabajos.
// Cada trabajo tendrá luego ~5 modelos base + "Otro modelo", su menú de materiales
// y la conversación por voz que arma el despiece.

const s = (paths) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const TRABAJOS = [
  {
    id: 'closet', nombre: 'Closet', detalle: 'Cuerpos, entrepaños, tubos y cajones', foto: 'img/closet.jpg',
    icono: s('<rect x="7" y="5" width="34" height="37" rx="1.5"/><path d="M18.3 5v37M29.7 5v37M7 12h34M9 17h7.5M31.5 17h7.5M20 26h7.5M7 30h11.3M29.7 30H41M7 36h11.3M29.7 36H41M5 42h38"/>'),
  },
  {
    id: 'cocina', nombre: 'Cocina integral', detalle: 'Módulos altos, bajos y mesón',
    icono: s('<rect x="5" y="6" width="38" height="11" rx="1.5"/><path d="M17.7 6v11M30.3 6v11"/><path d="M3 25h42"/><rect x="5" y="25" width="38" height="17" rx="1.5"/><path d="M18 25v17M31 25v17M14 30v3M22 30v3M34 30v3"/>'),
  },
  {
    id: 'bano', nombre: 'Mueble de baño', detalle: 'Mueble de lavamanos y espejo',
    icono: s('<path d="M24 6v5M20 8h8"/><path d="M8 18h32"/><path d="M13 18c0 5 5 7 11 7s11-2 11-7"/><rect x="9" y="25" width="30" height="17" rx="1.5"/><path d="M24 25v17M20 32v3M28 32v3"/>'),
  },
  {
    id: 'puerta', nombre: 'Puerta', detalle: 'Hoja, marco y herrajes',
    icono: s('<path d="M10 43V5h28v38"/><rect x="15" y="9" width="18" height="30" rx="1"/><circle cx="29" cy="25" r="1.6" fill="currentColor"/><path d="M6 43h36"/>'),
  },
  {
    id: 'sala', nombre: 'Sala de entretenimiento', detalle: 'Centro de TV y repisas',
    icono: s('<rect x="12" y="5" width="24" height="15" rx="1.5"/><path d="M24 20v5"/><rect x="4" y="25" width="40" height="13" rx="1.5"/><path d="M17.3 25v13M30.7 25v13M8 38v4M40 38v4"/>'),
  },
  {
    id: 'comedor', nombre: 'Comedor', detalle: 'Mesa y sillas',
    icono: s('<path d="M13 22h22M16 22v18M32 22v18"/><path d="M5 12v28M5 28h7v12"/><path d="M43 12v28M43 28h-7v12"/>'),
  },
  {
    id: 'cama', nombre: 'Cama', detalle: 'Cabecero, base y tendido',
    icono: s('<path d="M6 12v28M42 26v14"/><path d="M6 26h36"/><path d="M6 34h36"/><rect x="10" y="19" width="10" height="7" rx="2"/><path d="M22 26v-5a2 2 0 0 1 2-2h14a4 4 0 0 1 4 4v3"/>'),
  },
];

const app = document.getElementById('app');

function inicio() {
  const [closet, ...resto] = TRABAJOS;
  app.innerHTML = `
    <section class="saludo">
      <h2>¿Qué vas a construir?</h2>
      <p>Escoge el trabajo y armamos el despiece conversando.</p>
    </section>
    <div class="mosaico">
      <button class="opcion destacada" data-id="${closet.id}">
        <img src="${closet.foto}" alt="Closet de tres cuerpos" width="104" height="104">
        <span><strong>${closet.nombre}</strong><br><small>${closet.detalle}</small></span>
      </button>
      ${resto.map(t => `
        <button class="opcion" data-id="${t.id}">
          ${t.icono}
          <span><strong>${t.nombre}</strong><br><small>${t.detalle}</small></span>
        </button>`).join('')}
    </div>`;
}

function trabajo(t) {
  app.innerHTML = `
    <button class="volver" data-volver>‹ Volver</button>
    <div class="cabeza">
      ${t.icono}
      <div><h2>${t.nombre}</h2><p>${t.detalle}</p></div>
    </div>
    <ol class="pasos">
      <li><span class="n">1</span><div><b>Escoge un modelo</b><span>Modelos base listos para ajustar, u “Otro modelo” si ninguno te sirve.</span></div></li>
      <li><span class="n">2</span><div><b>Escoge el material</b><span>Melamina, RH, MDF… con su espesor y color.</span></div></li>
      <li><span class="n">3</span><div><b>Conversa con el asistente</b><span>Te pregunta medidas y detalles por voz. Puedes mandarle fotos.</span></div></li>
      <li><span class="n">4</span><div><b>Recibe el despiece</b><span>Piezas, cantos, tableros, herrajes y consumibles, listo para el depósito.</span></div></li>
    </ol>
    <p class="pronto">🛠️ Esta parte está en construcción. Pronto podrás hablar con el asistente desde aquí.</p>`;
}

function mostrar() {
  const id = location.hash.slice(1);
  const t = TRABAJOS.find(x => x.id === id);
  t ? trabajo(t) : inicio();
  window.scrollTo(0, 0);
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-id], [data-volver]');
  if (!b) return;
  if (b.dataset.id) location.hash = b.dataset.id;
  else history.length > 1 ? history.back() : (location.hash = '');
});

window.addEventListener('hashchange', mostrar);
mostrar();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
