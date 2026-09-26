# ROADMAP — Despiece Carpintería

PWA que reemplaza la reunión asesor–carpintero del depósito de maderas: el carpintero
conversa **por voz** con su celular y sale con el despiece completo (materiales y consumibles),
en un formato que el depósito acepte para despachar.

## Decisiones tomadas (2026-09-26)
- **iPhone y Android**, ambos obligatorios. Se debe poder **subir fotos** para aclarar.
- **Material por menú amigable** (el carpintero escoge; no se asume uno).
- **Listado = solo materiales y consumibles, sin precios**, pero **completo**: tableros, piezas,
  cantos, herrajes, tornillería, pegante… nada por fuera. Simula la entrevista con el asesor.
- **~5 modelos base por tipo de trabajo** + opción **"Otro modelo"** para trabajarlo puntualmente.
- **Salida tipo Excel**, pero lo que manda es que **el depósito la acepte**.
  ImporMaderas usa **CutList** → la meta es exportar en un formato que CutList importe.
- **Beta con 2 carpinteros reales** en campo; se ajusta con su uso.
- Producto pensado para **comercializar**.
- Ícono v3 (2026-09-26, "que se vea viva"): mismo closet en naranja miel con cajones/tubos blancos,
  flecha amarilla, fondo degradado turquesa → azul con halo. Nombre bajo el ícono: "Despiece"
  (corto a propósito: "Despiece Carpintería" se corta en el lanzador); nombre completo en la app.
- Paleta (2026-09-26, el usuario pidió "más viva, menos café"): azul petróleo `#0e6474` + ámbar `#f5a623`,
  fondo gris claro, y un color por trabajo (cocina naranja, baño azul, puerta verde, sala violeta,
  comedor rojo, cama rosa).
- Fondo beige madera **fijo** (sin modo oscuro): un carpintero con el celular en modo oscuro lo veía negro.
- Cada tarjeta lleva una ilustración tipo caricatura del mueble (`tools/generar_ilustraciones.py` → `img/*.svg`),
  con rótulo blanco translúcido para que la letra se lea. Closet ya no va resaltado en otro color;
  solo ocupa el ancho completo arriba porque son 7 tarjetas.
- **El inicio cabe en una sola pantalla, sin desplazarse** (pedido del usuario: "que no dé la sensación de
  información oculta"). El mosaico reparte el alto disponible; en la tarjeta va solo el nombre y el detalle
  se ve al entrar. Las ilustraciones traen pared/piso de sobra a los lados para que nunca se corte el mueble.

## Etapas
- [x] **Etapa 1**: PWA instalable, ícono, mosaico de 7 trabajos, pantalla por trabajo (placeholder).
- [x] **Etapa 1b**: publicada en GitHub Pages → https://jrmunozma21171323.github.io/despiece-carpinteria/
  ✔ Instalada y aprobada en Android (Samsung A17, 2026-09-26). Pendiente: probar en iPhone.
- **Método (usuario, 2026-09-26): sección por sección.** Dejar el Closet al 100 % y reutilizarlo en las demás.
- [~] **Etapa 2 — Closet**
  - [x] Paso 1 "Escoge un modelo": 4 modelos (Clásico 3 cuerpos, Colgado largo + cajonera,
        Doble tubo + zapatero, Esencial 2 cuerpos) en una sola pantalla, el escogido marcado con ✔
        y barra "Escogiste: …". Tarjeta "Construye tu modelo" (próximamente).
  - [x] **Vista 3D** del modelo escogido (pedido del usuario: "que cliente y carpintero estén seguros de lo
        que van a instalar"): girar, acercar, cajones que entran y salen, vista de frente, "Usar este modelo".
  - [ ] Construye tu modelo.
  - [ ] Paso 2: menú de materiales.
  - Decisiones: el modelo = **distribución interior**; las puertas se preguntan aparte. Las medidas de cada
    modelo son de referencia; con las reales, el asistente ajusta y puede sugerir más o menos cuerpos.
- [ ] **Etapa 3**: motor de despiece del Closet (reglas → piezas, cantos, tableros, herrajes).
- [ ] **Etapa 4**: asistente de voz (conversación + fotos) para el Closet.
- [ ] **Etapa 5**: exportación compatible con CutList; validar en ImporMaderas.
- [ ] **Etapa 6**: beta con carpinteros; luego resto de trabajos.

## Pendientes por conseguir / aclarar
- Un despiece real de depósito (foto o PDF) y, de ser posible, un archivo exportado de CutList.
- Qué versión de CutList usa ImporMaderas y si importa listas desde CSV/Excel.
- Aprobar el uso de IA en servidor (Claude) para la conversación: tiene costo por uso y necesita internet.

## Bóveda de ideas
- Guardar las reglas de cada carpintero (zócalo, fondo encajado/clavado, holguras) como su "perfil".
- Mostrar un dibujo del mueble con las medidas dictadas para que el carpintero confirme antes del despiece.

## Técnico
- Publicación: repo público `jrmunozma21171323/despiece-carpinteria`, GitHub Pages desde `main` (raíz). Cada `git push` republica en ~1 min.
- **En cada publicación subir la versión**: `CACHE` en `sw.js` y `VERSION` en `app.js` (mismo número; se ve al pie de la pantalla de cada trabajo).
  El service worker pide los archivos con `no-cache` (GitHub Pages guarda copias 10 min y mezclaba versiones) y la app se recarga sola al llegar una versión nueva.
- Estático: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `img/` (ilustraciones SVG).
- Íconos: `python tools/generar_iconos.py` (PIL) los regenera en `icons/`.
- **`closet/modelos.js` es la fuente única de cada modelo** (medidas en metros, cuerpos y elementos).
  De ahí salen el dibujo de la tarjeta (`dibujoFrontal`), el 3D (`closet/visor3d.js`) y, más adelante, el despiece.
- 3D con Three.js 0.170 desde jsDelivr (import map en `index.html`); se carga solo al abrir el visor.
  La textura de melamina se dibuja en código (sin imágenes) y la veta va a escala por el lado largo de cada pieza.
- Rutas: `#closet`, `#closet/modelos`, `#closet/3d/<modelo>`. El modelo escogido se guarda en `localStorage` (`despiece.closet`).
- Vista previa local: config `despiece` (python http.server, puerto 5173).
