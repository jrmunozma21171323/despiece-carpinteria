// Motor de voz del asistente.
//  - Oír: reconocimiento de voz del celular (Web Speech API) en español de Colombia, continuo.
//  - Muletillas: en las pausas cortas mientras el carpintero habla ("ajá", "ok", "entendido"…),
//    sin cortarle la palabra.
//  - Fin de turno: cuando se queda callado ~1,5 s, se entrega lo que dijo.
//  - Hablar: por ahora con la voz del celular (modo ensayo). Luego se cambia `hablar` por la voz
//    de Salomé (Azure es-CO-SalomeNeural) sin tocar lo demás.
const MULETILLAS = ['Ajá.', 'Ok.', 'Entendido.', 'Perfecto.', 'Listo.', 'Claro.'];
const PAUSA_CORTA = 650;     // ms sin palabras nuevas → muletilla (si viene al caso)
const FIN_TURNO = 1500;      // ms de silencio → terminó de hablar
const ENTRE_MULETILLAS = 4000;

/** Texto escrito → texto para leer en voz alta (unidades completas, sin símbolos). */
export function paraVoz(t) {
  return t
    .replace(/(\d),(\d)/g, '$1 coma $2')
    .replace(/\bcm\b/g, 'centímetros').replace(/\bmm\b/g, 'milímetros').replace(/\bm²/g, 'metros cuadrados')
    .replace(/[✔✖⚠️★•*_]/g, '').replace(/\s+/g, ' ').trim();
}

function mejorVoz() {
  const voces = speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('es'));
  const femenina = /(paulina|monica|mónica|helena|sabina|laura|salome|salomé|soledad|elvira|dalia|google español|female|mujer)/i;
  const orden = ['es-co', 'es-419', 'es-us', 'es-mx', 'es-es'];
  const puntaje = v => {
    const i = orden.indexOf(v.lang.toLowerCase().replace('_', '-'));
    return (i < 0 ? 10 : i) - (femenina.test(v.name) ? 5 : 0) - (v.localService ? 0 : 1);
  };
  return voces.sort((a, b) => puntaje(a) - puntaje(b))[0] || null;
}

export function crearVoz({ onParcial, onTurno, onNivel, onEstado, onError } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const puedeOir = !!SR;
  const puedeHablar = 'speechSynthesis' in window;
  let rec = null;
  let activo = false;          // el usuario quiere conversar
  let oyendo = false;          // el reconocedor está corriendo
  let hablandoRespuesta = false;
  let finales = '';            // lo que va diciendo en este turno (partes ya confirmadas)
  let parcial = '';
  let tPausa = 0, tTurno = 0;
  let palabrasDesdeMuletilla = 0, ultimaMuletilla = 0, iMuletilla = 0;
  let voz = null;
  if (puedeHablar) {
    voz = mejorVoz();
    speechSynthesis.onvoiceschanged = () => { voz = mejorVoz(); };
  }

  const textoTurno = () => `${finales} ${parcial}`.replace(/\s+/g, ' ').trim();
  // quitar las muletillas que el micrófono haya alcanzado a oír de nuestra propia voz
  const limpiar = t => t.replace(/\b(aj[aá]|ok|okey|entendido|perfecto|listo|claro)[.,]?\s*/gi, (m, _w, off) => (off === 0 && Date.now() - ultimaMuletilla < 2500 ? '' : m));

  function crearReconocedor() {
    const r = new SR();
    r.lang = 'es-CO';
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => { oyendo = true; onEstado?.('escuchando'); };
    r.onresult = e => {
      let nuevoFinal = '', nuevoParcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) nuevoFinal += txt; else nuevoParcial += txt;
      }
      if (nuevoFinal) finales = `${finales} ${limpiar(nuevoFinal)}`;
      const antes = parcial.split(/\s+/).filter(Boolean).length;
      parcial = limpiar(nuevoParcial);
      palabrasDesdeMuletilla += Math.max(1, parcial.split(/\s+/).filter(Boolean).length - antes);
      onNivel?.(0.55 + Math.random() * 0.45);
      onParcial?.(textoTurno());
      clearTimeout(tPausa); clearTimeout(tTurno);
      tPausa = setTimeout(pausaCorta, PAUSA_CORTA);
      tTurno = setTimeout(finDeTurno, FIN_TURNO);
    };
    r.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      onError?.(e.error === 'not-allowed' ? 'Necesito permiso para usar el micrófono.' : `Problema con el micrófono (${e.error}).`);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') activo = false;
    };
    // Chrome corta la escucha continua cada cierto tiempo: si seguimos conversando, se reinicia sola.
    r.onend = () => { oyendo = false; if (activo && !hablandoRespuesta) setTimeout(arrancar, 150); };
    return r;
  }

  function arrancar() {
    if (!activo || oyendo || hablandoRespuesta) return;
    try { rec = rec || crearReconocedor(); rec.start(); } catch { /* ya estaba corriendo */ }
  }
  function detener() { clearTimeout(tPausa); clearTimeout(tTurno); try { rec?.stop(); } catch {} }

  function pausaCorta() {
    // muletilla solo si ya dijo varias palabras, no justo al terminar, y sin repetir seguido
    if (hablandoRespuesta || palabrasDesdeMuletilla < 6 || Date.now() - ultimaMuletilla < ENTRE_MULETILLAS) return;
    palabrasDesdeMuletilla = 0;
    ultimaMuletilla = Date.now();
    decir(MULETILLAS[iMuletilla++ % MULETILLAS.length], { muletilla: true });
  }
  function finDeTurno() {
    const t = textoTurno();
    finales = ''; parcial = ''; palabrasDesdeMuletilla = 0;
    if (t) onTurno?.(t);
  }

  function decir(texto, { muletilla = false } = {}) {
    return new Promise(resolve => {
      if (!puedeHablar) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(paraVoz(texto));
      if (voz) { u.voice = voz; u.lang = voz.lang; } else u.lang = 'es-CO';
      u.rate = muletilla ? 1.1 : 1.02;
      u.pitch = 1.05;
      u.volume = muletilla ? 0.8 : 1;
      let pulso = 0;
      if (!muletilla) {
        u.onstart = () => { pulso = setInterval(() => onNivel?.(0.35 + Math.random() * 0.5), 140); };
        u.onboundary = () => onNivel?.(0.9);
      }
      u.onend = u.onerror = () => { clearInterval(pulso); resolve(); };
      if (!muletilla) speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
  }

  return {
    puedeOir, puedeHablar,
    get activo() { return activo; },
    get vozNombre() { return voz ? `${voz.name} (${voz.lang})` : 'voz del sistema'; },
    /** Empieza a conversar (debe llamarse desde un toque del usuario). */
    empezar() { activo = true; arrancar(); },
    /** Deja de escuchar y de hablar. */
    parar() { activo = false; hablandoRespuesta = false; detener(); if (puedeHablar) speechSynthesis.cancel(); onEstado?.('reposo'); },
    /** El asistente responde: deja de escuchar mientras habla para no oírse a sí mismo. */
    async hablar(texto) {
      hablandoRespuesta = true;
      detener();
      onEstado?.('hablando');
      await decir(texto);
      hablandoRespuesta = false;
      if (activo) { onEstado?.('escuchando'); arrancar(); } else onEstado?.('reposo');
    },
    pensar() { hablandoRespuesta = true; detener(); onEstado?.('pensando'); },
    destruir() { this.parar(); rec = null; },
  };
}
