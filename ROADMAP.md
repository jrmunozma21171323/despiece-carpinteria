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
- Ícono: dibujo plano derivado del closet de 3 cuerpos + línea de medida (ámbar).
  La foto original va en la tarjeta del Closet.

## Etapas
- [x] **Etapa 1**: PWA instalable, ícono, mosaico de 7 trabajos, pantalla por trabajo (placeholder).
- [ ] **Etapa 1b**: publicar con HTTPS e instalar en un celular real (Android + iPhone).
- [ ] **Etapa 2**: menú de materiales + 5 modelos base del Closet (con dibujo de cada uno).
- [ ] **Etapa 3**: motor de despiece del Closet (reglas → piezas, cantos, tableros, herrajes).
- [ ] **Etapa 4**: asistente de voz (conversación + fotos) para el Closet.
- [ ] **Etapa 5**: exportación compatible con CutList; validar en ImporMaderas.
- [ ] **Etapa 6**: beta con carpinteros; luego resto de trabajos.

## Pendientes por conseguir / aclarar
- Un despiece real de depósito (foto o PDF) y, de ser posible, un archivo exportado de CutList.
- Qué versión de CutList usa ImporMaderas y si importa listas desde CSV/Excel.
- Hosting con HTTPS (necesario para instalar la PWA).
- Aprobar el uso de IA en servidor (Claude) para la conversación: tiene costo por uso y necesita internet.

## Bóveda de ideas
- Guardar las reglas de cada carpintero (zócalo, fondo encajado/clavado, holguras) como su "perfil".
- Mostrar un dibujo del mueble con las medidas dictadas para que el carpintero confirme antes del despiece.

## Técnico
- Estático: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `img/`.
- Iconos generados con PIL (script en el scratchpad de la sesión del 2026-09-26; regenerable).
- Vista previa local: config `despiece` (python http.server, puerto 5173).
