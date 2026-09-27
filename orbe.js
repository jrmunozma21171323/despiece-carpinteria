// Círculo de colores que respira y late: la "cara" del asistente de voz.
//   reposo     → respira lento, latido tranquilo
//   escuchando → late con la voz del carpintero (nivel del micrófono)
//   pensando   → gira un poco más rápido
//   hablando   → late con la voz del asistente
const PALETAS = {
  reposo:     ['#14b4c8', '#f5a623', '#d6408e', '#7e57c2', '#2e9e5b'],
  escuchando: ['#14c8b4', '#2ecc71', '#1e88e5', '#14b4c8', '#a3e635'],
  pensando:   ['#7e57c2', '#1e88e5', '#14b4c8', '#d6408e', '#7e57c2'],
  hablando:   ['#f5a623', '#d6408e', '#ff7a45', '#7e57c2', '#f5c542'],
};
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mezclar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Latido "pum-pum": dos golpes cortos y una pausa. fase va de 0 a 1. */
const latido = fase => Math.exp(-(((fase - 0.05) / 0.055) ** 2)) + 0.6 * Math.exp(-(((fase - 0.27) / 0.06) ** 2));

export function crearOrbe(canvas) {
  const ctx = canvas.getContext('2d');
  let estado = 'reposo';
  let nivel = 0, meta = 0;
  let colores = PALETAS.reposo.map(hex);
  let vivo = true;
  let w = 0, h = 0, dpr = 1;

  function ajustar() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ro = new ResizeObserver(ajustar);
  ro.observe(canvas);
  ajustar();

  const inicio = performance.now();
  function cuadro(ahora) {
    if (!vivo) return;
    const s = (ahora - inicio) / 1000;
    nivel += (meta - nivel) * 0.25;
    meta *= 0.9;                                           // el empujón de la voz se apaga solo
    const destino = PALETAS[estado].map(hex);
    colores = colores.map((c, i) => mezclar(c, destino[i], 0.04));

    const periodo = estado === 'reposo' ? 1.5 : estado === 'pensando' ? 1.1 : 0.9;
    const respiro = Math.sin(s * Math.PI * 2 / 5) * 0.035;  // respiración lenta de 5 s
    const golpe = latido((s % periodo) / periodo) * (estado === 'reposo' ? 0.035 : 0.05);
    const base = Math.min(w, h) * 0.3;
    const r = base * (1 + respiro + golpe + Math.min(nivel, 1) * 0.28);
    const cx = w / 2, cy = h / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // halo exterior
    const [hr, hg, hb] = colores[0];
    const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.75);
    halo.addColorStop(0, `rgba(${hr | 0},${hg | 0},${hb | 0},${0.35 + nivel * 0.25})`);
    halo.addColorStop(1, `rgba(${hr | 0},${hg | 0},${hb | 0},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.75, 0, Math.PI * 2); ctx.fill();

    // cuerpo: manchas de color que giran dentro del círculo
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    const [br, bg, bb] = colores[3];
    ctx.fillStyle = `rgb(${(br * 0.55) | 0},${(bg * 0.55) | 0},${(bb * 0.55) | 0})`;   // fondo más oscuro: resaltan los colores
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    const vel = estado === 'pensando' ? 0.9 : estado === 'reposo' ? 0.25 : 0.5;
    // mezcla luminosa: los colores se suman y el círculo se ve vivo, no apagado
    ctx.globalCompositeOperation = 'screen';
    colores.forEach(([cr, cg, cb], i) => {
      const a = s * vel * (1 + i * 0.23) + i * 1.26;
      const px = cx + Math.cos(a) * r * 0.55, py = cy + Math.sin(a * 1.3) * r * 0.55;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 0.8);
      g.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},1)`);
      g.addColorStop(0.55, `rgba(${cr | 0},${cg | 0},${cb | 0},0.55)`);
      g.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    });
    ctx.globalCompositeOperation = 'source-over';
    // brillo de vidrio arriba a la izquierda
    const brillo = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx - r * 0.35, cy - r * 0.4, r * 0.8);
    brillo.addColorStop(0, 'rgba(255,255,255,0.45)');
    brillo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();

    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  return {
    ponerEstado(e) { if (PALETAS[e]) estado = e; },
    /** Empuja el nivel de voz (0..1): la voz hace latir el círculo. */
    empujar(v) { meta = Math.max(meta, Math.min(1, v)); },
    destruir() { vivo = false; ro.disconnect(); },
  };
}
