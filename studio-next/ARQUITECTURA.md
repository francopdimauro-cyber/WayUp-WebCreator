# WAY UP Studio · Sistema de diseño y arquitectura del workspace

## Diagnóstico de la interfaz original

La captura muestra una mezcla de tres sistemas visuales: barra superior blanca con azul corporativo, biblioteca azul marino muy saturada e inspector blanco. La división entre las columnas es dura, las acciones principales compiten con demasiados botones, la biblioteca de tipografías ocupa toda la columna derecha y oculta el contexto del elemento, y la vista de la web pierde protagonismo. También hay duplicación de cabeceras y múltiples bordes pesados.

## Dirección de arte

**Una herramienta creativa, no un dashboard.** El cromatismo de la aplicación desaparece en favor de las webs de los clientes. El verde de Entrena-T se muestra solo en el Canvas, mientras que el cobalto queda reservado a la identidad de WAY UP y la selección activa. Superficies oscuras continuas, paneles sin tarjetas anidadas innecesarias, texto de alta legibilidad, transiciones controladas y controles contextuales.

### Tokens

| Uso | Token | Valor |
| --- | --- | --- |
| Fondo principal | `--color-app` | `#090b0f` |
| Paneles | `--color-panel` | `#101318` |
| Superficie elevada | `--color-elevated` | `#171b22` |
| Superficie interactiva | `--color-raised` | `#20252e` |
| Líneas discretas | `--ui-divider` | `rgba(255,255,255,.07)` |
| Texto principal | `--color-ink` | `#ecf0f4` |
| Texto secundario | `--color-mist` | `#abb3bf` |
| Texto terciario | `--color-faint` | `#747e8e` |
| Acento de aplicación | `--color-brand` | `#7795ff` |
| Animación | `--ui-ease` | `180ms cubic-bezier(.2,.8,.2,1)` |

Escala tipográfica: 9-11px para metadatos, 11-12px para controles, 12-14px para títulos de panel, sin utilizar tamaños gigantes en la UI. Tipografía sans de sistema compatible con Geist/Inter, y monoespaciada para métricas y código.

## Arquitectura de columnas

| Zona | Tamaño | Objetivo |
| --- | --- | --- |
| Cabecera | 61 px | Identidad, proyecto, estado, Deshacer/Rehacer y Guardar |
| Navegador izquierdo | 264 px, contraíble a 64 px | Árbol de capas; buscador y lista de proyectos |
| Canvas central | Flexible (mín. 0) | Previsualización de web, modos, dispositivo y zoom |
| Inspector derecho | 320 px | Solo las propiedades del elemento seleccionado |
| Barra de estado | 29 px | Estado y metadatos discretos |

La barra de control de modo, dispositivos y zoom flota sobre el Canvas. La vista previa de los clientes mantiene su identidad cromática propia, aislada de los estilos de la herramienta.

## Interacciones implementadas en el prototipo

- Selección de elementos directamente desde el árbol o la web.
- Arrastre libre con Pointer Events; sin selección accidental de texto en modo Diseño.
- Posición X/Y sincronizada con el Inspector; deshacer y rehacer con historial independiente.
- Tipografía, peso, tamaño, fondo, sombra, radios, texto, relleno y enlaces editables.
- Estilos rápidos de botón que no alteran `href`.
- Búsqueda de capas, secciones plegables, paneles móviles y vista por dispositivo.
- Guardar versión local deliberadamente explícito, sin peticiones a Cloudflare.

## Reglas de implementación en producción

1. Mantener **funcionalmente aislado** el Worker vigente. No sustituir el archivo de UI del Worker con el prototipo Next.js sin una migración planificada.
2. Conectar el frontend a la misma sesión/autorización Cloudflare Access o al BFF de confianza. Las claves OpenRouter nunca llegan al navegador.
3. Trabajar con el HTML existente mediante iframe aislado; no renderizar HTML arbitrario directamente en el DOM React. La vista real puede tener un entorno distinto y recursos permitidos explícitamente.
4. Las mutaciones de Canvas deben tener ID estable, versión y un único registro del historial por gesto. Persistir en D1 con `expectedVersion`; imágenes por R2; no usar `localStorage` como almacenamiento definitivo.
5. Reutilizar la biblioteca de fuentes y botones mediante un adaptador de estilos. El selector de fuentes debe ser popover con búsqueda y previsualización, no una lista permanente que ahogue el Inspector.
6. Validar navegadores Firefox/Chromium, control del foco, drag and drop dentro del iframe, tamaños responsive, sanitización de URL, PDF/HTML exportado, accesibilidad y regresiones antes de llevarlo al dominio principal.

## Fases de migración recomendadas

**Fase A:** UI y tokens en rama de desarrollo; captura visual comparativa. **Fase B:** adaptador de documento, eventos de iframe y autenticación. **Fase C:** D1/R2, historial, medios, fuentes y exportadores. **Fase D:** pruebas E2E, ensayo de reversión, despliegue gradual protegido.

**Alcance presente:** implementación de frontend de referencia con interacciones reales y repositorio tipado. **No** es una integración ni despliegue del Worker existente.