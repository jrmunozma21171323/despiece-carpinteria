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
  - [x] **¿Cabe la ropa?** (pedido del usuario: pantalones y camisas planchadas sin arrugarse, vestido
        que no quede doblado). Cada tubo tiene un "uso" (camisas, chaquetas, pantalones doblados/largos,
        vestidos cortos/largos) con su largo; se mide el espacio libre bajo el tubo y se marca ✔ o "faltan X cm".
        **Ajustar** reorganiza el cuerpo (menos cajones, zapatero más bajo, quitar tubo/entrepaño que estorba).
        En el 3D la ropa cuelga a su largo real y **rojiza** si no cabe. Prendas v2 (usuario: "las prendas se ven muy feas",
        foto de referencia): ganchos de madera, camisas con mangas/tapeta (rayas y cuadros), sacos con solapa, pantalón
        doblado sobre barra, vestidos entallados, colores sobrios, en abanico; + ropa doblada, cajas en maletero y
        zapatos en zapatero (`closet/ropa3d.js`). También se revisa el fondo (mín. 55 cm).
        Largos usados (a validar con carpinteros): camisas 90, chaquetas 100, pantalón doblado 70,
        pantalón largo 115, vestido corto 110, vestido largo/abrigo 155 cm; + 3 cm de holgura.
  - [x] **Puertas**: sin puertas / batientes (abren de frente, con puertas aparte para el maletero) /
        corredizas (se deslizan a los lados, con rieles y perfiles). Se ven, abren y cierran en el 3D.
        Con puertas, los cajones van metidos 3,5 cm.
  - [x] **Color**: Blanco, Roble claro, Cedro, Wengué (círculos), aplicado al 3D al instante.
  - [x] **Plano con medidas** al final (pedido del usuario, con imagen de referencia): ancho de cada cuerpo,
        altura de cada espacio, espacio libre bajo cada tubo (verde/rojo), cajones, totales y fondo.
  - [ ] Construye tu modelo.
  - [x] **Paso 2: materiales** (`materiales.js`, compartido para todas las secciones). 3 pestañas que caben
        en una pantalla y se recorren con "Siguiente": **Tableros** (Melamina / Melamina RH / MDF; 15 o 18 mm;
        color), **Cantos y fondo** (canto mixto / 0,45 / 2 mm; fondo HDF 3 mm / melamina 9 mm / sin fondo),
        **Herrajes** (solo los que el diseño usa: correderas si hay cajones, bisagras si hay batientes,
        riel si hay corredizas, jaladeras, tubos). Cada opción explica para qué sirve; ★ = recomendada y
        viene por defecto. El espesor escogido pasa al diseño (`diseno.espesor`): 3D, plano y despiece lo usan.
        Se habilita cuando ya hay modelo. Opciones a validar con los carpinteros y el depósito.
  - Decisiones: el modelo = **distribución interior**; las puertas se preguntan aparte. Las medidas de cada
    modelo son de referencia; con las reales, el asistente ajusta y puede sugerir más o menos cuerpos.
- [x] **Etapa 3 — Despiece del Closet** (`closet/despiece.js`, paso 4 de la app, `#closet/despiece`).
  - Piezas en mm (largo = sentido de la veta), agrupadas; cantos por lado (L/A) y tipo; tableros estimados por
    área (lámina 2440 × 1830, 85 % de aprovechamiento); cantos en metros + 10 %; herrajes (correderas con largo
    según el fondo, bisagras 2–5 según alto de puerta, rieles/rodamientos, jaladeras o perfil, tubos por tramo
    con soportes, varillas de zapatero); consumibles (tornillos de armado y de herrajes, puntillas del fondo,
    tapatornillos, colbón) con 10 % de más.
  - Reglas usadas (**a validar con carpinteros**): laterales enteros; techo/piso/zócalos entre laterales;
    fondo sobrepuesto (resta su espesor al fondo de la estructura); entrepaños retirados 20 mm; cajón con frente
    embutido (luz 2 mm), caja = hueco − 26 mm, fondo HDF 3 mm del mismo del closet; puertas batientes
    sobrepuestas partidas en el maletero, luz 3 mm; entrepaño que cruza un divisor sale en 2 mitades.
  - Piezas más largas que la lámina (techo, piso, zócalos, fondo) se parten **sobre una división**.
  - Medidas editables en el despiece (cm) mientras llega el asistente de voz; valida rangos y el alto mínimo
    del modelo, y avisa si con las medidas nuevas la ropa ya no cabe.
- [ ] **Etapa 4**: asistente de voz (conversación + fotos) para el Closet.
- [~] **Etapa 5 — Exportación** (`exportar.js`, "Enviar al depósito"): perfiles **Excel genérico** (`;` + BOM,
  sirve para CutList Plus/OptiCut/MaxCut con su asistente de importación), **CutList Optimizer**
  (Length, Width, Qty, Material, Label, Enabled, Grain direction), **CutList Plus fx** (Part #, Description,
  Copies, Thickness, Width, Length, Material, Can Rotate, Notes); **lista completa** en Excel; **mensaje de
  WhatsApp** con lo que hay que comprar. Comparte el archivo (WhatsApp/correo) o lo descarga.
  Falta: validar en ImporMaderas; confirmar sentido de "Grain direction" en CutList Optimizer; agregar el
  perfil del programa de cada depósito nuevo (es sumar un perfil en `exportar.js`).
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
- Rutas: `#closet`, `#closet/modelos`, `#closet/3d/<modelo>`, `#closet/plano`. El diseño (modelo, cuerpos ajustados, puerta, color)
  se guarda en `localStorage` (`despiece.closet`). `closet/plano.js` dibuja el plano con cotas.
- Vista previa local: config `despiece` (python http.server, puerto 5173).
