// Menú de materiales: preguntas cortas con opciones cerradas (nunca en abierto).
// Compartido por todas las secciones; cada una muestra solo las preguntas que le aplican.
// "rec" marca la opción recomendada, que además es la que viene escogida por defecto.

export const PREGUNTAS = {
  // ---------- Tableros ----------
  tablero: {
    titulo: 'Tipo de tablero',
    opciones: [
      { id: 'melamina', nombre: 'Melamina', rec: true,
        detalle: 'Aglomerado con acabado melamínico. La más usada en closets: buena y económica.' },
      { id: 'rh', nombre: 'Melamina RH',
        detalle: 'Resistente a la humedad (núcleo verde). Para paredes con humedad o clima muy húmedo.' },
      { id: 'mdf', nombre: 'MDF',
        detalle: 'MDF melamínico: más denso y firme, bordes más finos. Ideal para puertas y frentes.' },
    ],
  },
  espesor: {
    titulo: 'Espesor del tablero',
    opciones: [
      { id: '15', nombre: '15 mm', rec: true, detalle: 'El más usado en closets.' },
      { id: '18', nombre: '18 mm', detalle: 'Más firme: para entrepaños largos o que cargan mucho peso.' },
    ],
  },
  canto: {
    titulo: 'Canto (tapacanto PVC)',
    opciones: [
      { id: 'mixto', nombre: 'Mixto', rec: true,
        detalle: '2 mm en puertas y frentes (aguanta golpes) y 0,45 mm en el interior. Lo que más se usa.' },
      { id: '045', nombre: '0,45 mm', detalle: 'Delgado en todo el mueble. El más económico.' },
      { id: '2', nombre: '2 mm', detalle: 'Grueso en todo el mueble. El más resistente a golpes.' },
    ],
  },
  fondo: {
    titulo: 'Fondo (espaldar)',
    opciones: [
      { id: 'hdf3', nombre: 'HDF 3 mm', rec: true, detalle: 'Lámina delgada del mismo color. El fondo más usado.' },
      { id: 'mel9', nombre: 'Melamina 9 mm', detalle: 'Más firme; ayuda a que el mueble no se descuadre.' },
      { id: 'sin', nombre: 'Sin fondo', detalle: 'El closet va directo contra la pared: debe estar lisa, pintada y seca.' },
    ],
  },

  // ---------- Herrajes (solo los que el diseño necesita) ----------
  correderas: {
    titulo: 'Correderas de los cajones',
    aplica: d => d.hayCajones,
    opciones: [
      { id: 'sencilla', nombre: 'Sencillas', detalle: 'De rodachín, económicas. El cajón no sale completo.' },
      { id: 'telescopica', nombre: 'Telescópicas', rec: true, detalle: 'De bolas: el cajón sale completo y corre suave.' },
      { id: 'cierre_lento', nombre: 'Cierre lento', detalle: 'Telescópicas que cierran solas, sin golpe.' },
    ],
  },
  bisagras: {
    titulo: 'Bisagras de las puertas',
    aplica: d => d.puerta === 'batientes',
    opciones: [
      { id: 'normal', nombre: 'Común', detalle: 'Bisagra de cazoleta de 35 mm.' },
      { id: 'cierre_lento', nombre: 'Cierre lento', rec: true, detalle: 'La puerta cierra suave, sin golpe.' },
    ],
  },
  riel: {
    titulo: 'Sistema de puertas corredizas',
    aplica: d => d.puerta === 'corredizas',
    opciones: [
      { id: 'sencillo', nombre: 'Riel sencillo', rec: true, detalle: 'Riel de aluminio para puertas livianas.' },
      { id: 'pesado', nombre: 'Riel pesado', detalle: 'Rodamientos reforzados y cierre suave: para puertas grandes o de 18 mm.' },
    ],
  },
  jaladeras: {
    titulo: 'Jaladeras',
    aplica: d => d.hayCajones || d.puerta === 'batientes',
    opciones: [
      { id: 'barra', nombre: 'Barra', rec: true, detalle: 'Manija metálica tipo barra.' },
      { id: 'boton', nombre: 'Botón', detalle: 'Pomo pequeño, sencillo.' },
      { id: 'perfil', nombre: 'Perfil', detalle: 'Perfil de aluminio en el borde: discreto y moderno.' },
      { id: 'push', nombre: 'Push', detalle: 'Sin jaladera: se abre al presionar.' },
    ],
  },
  tubos: {
    titulo: 'Tubos para colgar',
    aplica: d => d.hayTubos,
    opciones: [
      { id: 'ovalado', nombre: 'Ovalado', rec: true, detalle: 'Cromado; no se dobla con el peso de la ropa.' },
      { id: 'redondo', nombre: 'Redondo', detalle: 'Cromado, el clásico.' },
    ],
  },
};

export const GRUPOS = {
  tableros: ['tablero', 'espesor'],   // + el color de la melamina
  acabados: ['canto', 'fondo'],
  herrajes: ['correderas', 'bisagras', 'riel', 'jaladeras', 'tubos'],
};

/** Lo que las preguntas necesitan saber del diseño para decidir si aplican. */
export function contexto(diseno, puerta) {
  const els = diseno.cuerpos.flatMap(c => c.elementos);
  return { puerta, hayCajones: els.some(e => e.t === 'cajones'), hayTubos: els.some(e => e.t === 'tubo') };
}

export const aplica = (clave, ctx) => !PREGUNTAS[clave].aplica || PREGUNTAS[clave].aplica(ctx);

export function porDefecto() {
  return Object.fromEntries(Object.entries(PREGUNTAS).map(([k, p]) => [k, (p.opciones.find(o => o.rec) || p.opciones[0]).id]));
}

export const opcion = (clave, id) => PREGUNTAS[clave].opciones.find(o => o.id === id);

/** Resumen corto para la tarjeta del paso: "Melamina 15 mm · canto mixto · fondo HDF 3 mm". */
export function resumen(m) {
  return `${opcion('tablero', m.tablero).nombre} ${opcion('espesor', m.espesor).nombre} · canto ${opcion('canto', m.canto).nombre.toLowerCase()} · fondo ${opcion('fondo', m.fondo).nombre}`;
}
