# WAY UP Studio Next · documentación técnica y traspaso a Claude

**Estado:** editor en desarrollo activo. Este proyecto ya trabaja sobre HTML real importado/generado; no es el prototipo independiente descrito en documentación antigua.

## Identificación y reglas de trabajo

- **Repositorio:** `francopdimauro-cyber/WayUp-WebCreator`.
- **Directorio de la aplicación:** `studio-next/`.
- **Rama activa:** `feature/editor-image-panel-menu-items-20261117`.
- **Rama base:** `feature/studio-final-motor-estructura-medios-20261115`.
- **PR:** [#11](https://github.com/francopdimauro-cyber/WayUp-WebCreator/pull/11), abierta en borrador.
- **Producción:** no fusionar ni desplegar esta rama. No modificar `main` ni el Worker de producción.
- **Web de pruebas:** el proyecto original de El Refugio de Chilla vive en el repositorio independiente `francopdimauro-cyber/Refugio-de-Chilla`. Es de solo lectura para este trabajo. No hacer commits ni cambios allí.

Antes de continuar, Claude debe ejecutar:

```bash
git fetch origin
git checkout feature/editor-image-panel-menu-items-20261117
git pull --ff-only origin feature/editor-image-panel-menu-items-20261117
cd studio-next
npm install
```

No cambiar de rama ni rebasar sobre otra sin revisar primero el estado de la PR y consultar. No sobrescribir trabajo de otros colaboradores.

## Stack y ejecución

- Next.js 16 · App Router · React 19 · TypeScript estricto.
- Tailwind CSS 4.
- Iconos Lucide React.
- HTML y CSS de cada web editados como contenido real del proyecto; recursos binarios guardados en el bundle del proyecto y exportados en ZIP.

```bash
cd studio-next
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Node.js requerido: 20.9 o superior. El servidor local abre en `http://localhost:3000`. Estos comandos no despliegan nada.

## Registro de cambios y traspaso — 17/11/2026

Este bloque resume el comportamiento que Claude debe preservar y probar al continuar. La interfaz contextual vive en el Inspector derecho del Canvas; no modifica directamente la web publicada.

### Acciones contextuales de selección
- **Botones:** al seleccionar un botón HTML, `role="button"`, un input de tipo botón o un enlace CTA reconocido, aparece **CAMBIAR BOTÓN**. La acción abre la galería de estilos sin alterar el texto, el destino `href` ni el comportamiento.
- **Imágenes:** al seleccionar una imagen individual o una imagen dentro de `picture`/`figure`, el Inspector abre la pestaña de imagen. La acción muestra **CAMBIAR IMAGEN** si ya existe una fotografía o **AÑADIR IMAGEN** si el objetivo compatible todavía no tiene ninguna.
- **Platos y secciones:** la pestaña Imagen también se ofrece para filas de carta y secciones reconocidas, de modo que cada elemento pueda tener su propia fotografía.
- **Símbolos:** al seleccionar un SVG individual reconocido, se abre la pestaña Símbolo para buscar y sustituir el glifo, conservando la caja, el color y el tamaño visual.
- **Texto y enlaces:** se editan desde Propiedades. Los enlaces exponen su destino y opción de nueva pestaña; no existe todavía una acción contextual independiente llamada «CAMBIAR ENLACE».

### Reglas para ampliar las acciones
- Mantener la detección de botón padre cuando se selecciona un span, icono o texto interior.
- No clasificar como botón cualquier enlace de navegación: reconocer semántica HTML, `role="button"`, clases CTA o estilos de botón existentes.
- No convertir un enlace en un botón ni alterar su destino al cambiar su apariencia.
- No sustituir una imagen por un duplicado: actualizar el recurso asociado y las fuentes responsive de `picture`.
- No fijar tamaños SVG genéricos: medir y ajustar el área visible del glifo.
- Mantener las operaciones en el HTML/proyecto de trabajo, con historial y exportación; no desplegar ni modificar producción.

### Verificación más reciente
- [GitHub Actions · ejecución 44113518541](https://github.com/francopdimauro-cyber/WayUp-WebCreator/actions/runs/44113518541): tests del editor, build Next.js y TypeScript completados correctamente.
- Commit validado: `8949037903b29e8a3d17534fe225725a1b0c9882`.
- PR #11: abierta, en borrador, no fusionada.
- Revisión visual manual en navegador de las acciones contextuales: pendiente. La CI valida pruebas automatizadas, compilación y tipos; no debe presentarse como una prueba visual manual.

## Funciones implementadas

### 1. Canvas y edición segura

- Espacio de trabajo con Navigator, Canvas e Inspector.
- Importación de HTML/ZIP y edición del documento real.
- Vistas de escritorio, tableta y móvil, zoom, selección de nodos y panel de capas/secciones.
- Selección múltiple y operaciones de capas, menú contextual y operaciones de sección.
- El iframe de edición usa sandbox sin `allow-scripts`: el JavaScript de la web importada no se ejecuta en modo edición. «En vivo» es una vista separada para probar la web con su comportamiento.
- Cambios sobre HTML/CSS reales, historial Deshacer/Rehacer, guardado y exportación.

### 2. Acciones contextuales de botones

- Al seleccionar un `button`, un elemento con `role="button"` o un enlace CTA con clases de botón (`btn`, `button`, `cta`), el Inspector resuelve el botón.
- También detecta el botón padre cuando se selecciona su texto o un elemento interior.
- Aparece la acción **CAMBIAR BOTÓN**. Al pulsarla se abre la galería existente de 21 estilos, con familias y tamaños.
- Se aplican estilos al botón real mediante `setStyles` y entran en el historial.
- El texto, el `href`, el destino y el comportamiento del botón se conservan. Esta acción cambia el aspecto, no sustituye el destino ni convierte automáticamente un enlace en un formulario.
- La resolución está en `lib/element-editing.ts` (`resolveButtonTarget`); la galería, en `components/studio/button-styles.tsx`.

### 3. Acciones contextuales de imágenes

- Al seleccionar una imagen `img` (también dentro de `picture`/`figure`), una fila de carta o una sección, el Inspector abre la pestaña de imagen.
- Se muestra **CAMBIAR IMAGEN** cuando ya hay una imagen o **AÑADIR IMAGEN** cuando aún no existe.
- Formatos admitidos: PNG, JPEG, GIF y WebP; límite de 5 MB.
- Al sustituir una imagen existente se conservan el texto alternativo, dimensiones, clases y estilos. Se actualizan `src`, `srcset` y fuentes `picture` para evitar que el navegador siga mostrando la fotografía anterior.
- Las nuevas imágenes se guardan como recursos locales `wayup-media/`, se incluyen en el ZIP y participan en Deshacer/Rehacer.
- Las imágenes gestionadas por Studio se pueden eliminar. Una imagen externa existente puede sustituirse; no se borra del origen remoto.
- La lógica está en `lib/web-project-files.ts` (`resolveImageTarget`, `attachLocalImage`, `removeLocalImage`).

### 4. Sustitución de símbolos

- Al seleccionar un SVG individual aparece la pestaña «Símbolo» con búsqueda y categorías.
- Reutiliza la biblioteca Lucide existente (más de 2.000 símbolos).
- Sustituye la geometría, no el contenedor: conserva caja exterior, dimensiones CSS, clases, color y grosor de trazo.
- Mide el área visible del glifo original y centra/escala el nuevo símbolo para igualar el tamaño visual, en lugar de imponer 32 × 32.
- La lógica está en `lib/element-editing.ts`; la galería en `components/studio/symbol-library.tsx`.

### 5. Editor CSS

- Acceso «CSS» separado del editor HTML.
- «CSS personalizado» añade una capa de estilos al documento sin sobrescribir las hojas originales.
- Los archivos `.css` importados también se pueden abrir desde «Código» y editar con el mismo editor.
- Numeración de líneas, resaltado, autocompletado con Ctrl+Espacio y sangría automática.
- CSS personalizado: valida estructura y bloquea `@import`, recursos externos y construcciones activas.
- Hojas CSS originales: validación estructural, pero conserva sus referencias y URLs existentes.
- La validación está en `lib/css-validation.ts`; el editor en `components/studio/css-code-editor.tsx`.

### 6. Imágenes, CSS y exportación

- Las operaciones sobre contenido se guardan en el bundle del proyecto y participan en el historial.
- Los recursos añadidos se incorporan al ZIP del sitio.
- No se publican por sí solos ni modifican la web de producción.

## Estado de verificación

La ejecución de GitHub Actions [44112805790](https://github.com/francopdimauro-cyber/WayUp-WebCreator/actions/runs/44112805790) terminó correctamente en el commit `f8f6e3736401c7087f8e63358804ae75207d846c`:
- `npm test`: correcto, incluidas las pruebas sobre el HTML real de El Refugio.
- `npm run build`: correcto.
- `npm run typecheck`: correcto.

El workflow temporalmente se amplió para ejecutar la validación de esta rama y después se restauraron sus filtros originales en el commit `e1ae5c3eb7541cc0795a1785f12c8a5d8ea29f70`. No se ha desplegado ningún Worker.

## Pruebas con El Refugio de Chilla

Para evitar tocar la web original, se añadió una copia estática de su HTML:

- Fixture: `test-fixtures/el-refugio/index.html`.
- Origen: `francopdimauro-cyber/Refugio-de-Chilla`, rama `main`.
- Commit del archivo original: `1ae10520a347daab28175c5b768e02c1c3b3d797`.
- La copia se usa únicamente para pruebas de regresión; no se ejecutan sus scripts ni se modifica el repositorio original.

La suite comprueba sobre ese HTML real:
- Detección del botón de envío de reservas aunque se seleccione su texto interior.
- Detección de enlaces CTA `.btn--primary` sin confundir enlaces normales de navegación.
- Cambio de estilo sin alterar el `href`.
- Selección y sustitución de la imagen real `img/plato-1.jpg`, conservando alt y dimensiones.
- Sustitución de imágenes `picture` actualizando sus fuentes responsive.

Estas son pruebas DOM/regresión. No deben describirse como una prueba visual manual en navegador ni como una publicación en Cloudflare.

## Archivos principales

- `components/studio/web-workspace.tsx`: coordinación del Canvas, selección, Inspector, operaciones y acciones contextuales.
- `components/studio/property-panel.tsx`: edición de propiedades generales.
- `components/studio/button-styles.tsx`: galería de estilos de botón.
- `components/studio/symbol-library.tsx`: galería de símbolos.
- `components/studio/css-code-editor.tsx`: editor de CSS.
- `lib/element-editing.ts`: edición segura de nodos, estilos, atributos, botones y SVG.
- `lib/web-project-files.ts`: importación/exportación, recursos y fotografías.
- `lib/css-validation.ts`: validación CSS.
- `scripts/element-editing-test.mjs`: pruebas de edición y regresión sobre HTML real.
- `test-fixtures/el-refugio/index.html`: snapshot del HTML de pruebas.

## Límites conocidos y siguientes verificaciones

- Las acciones de cambio de imagen cubren `img`, `picture`, `figure`, filas de carta y secciones. La sustitución mediante subida de archivo para imágenes de fondo CSS no está implementada todavía.
- El reconocimiento automático de enlaces como botones depende de clases de botón reconocibles (`btn`, `button`, `cta`) o de estilos en línea; un enlace genérico sin esas señales seguirá siendo un enlace normal.
- La validación CSS estructural no sustituye un parser CSS completo ni una auditoría de seguridad.
- La suite DOM no reemplaza una prueba interactiva en navegador con la vista previa importada. Antes de integrar, probar manualmente en un entorno preview aislado la selección y cambio de botones, imágenes y símbolos con El Refugio.
- No añadir credenciales ni secretos al README, al fixture o al repositorio.

## Reglas para continuar

1. Trabajar exclusivamente en la rama activa y en `studio-next/`, salvo que el cambio exija otra ubicación y se documente.
2. No tocar `main`, producción, el Worker publicado ni el repo original de El Refugio.
3. No ejecutar JavaScript importado en el iframe de edición.
4. No sustituir ni simplificar funciones que ya están funcionando sin reproducir primero sus pruebas.
5. Añadir al README cada cambio real, su archivo, comportamiento, prueba y limitación.
6. Antes de pedir revisión: `npm test`, `npm run typecheck` y `npm run build`; corregir fallos, no ocultarlos.
7. Mantener la PR #11 en borrador hasta completar la revisión visual y recibir autorización expresa para fusionar.
