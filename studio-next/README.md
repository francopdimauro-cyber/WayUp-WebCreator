# WAY UP Studio — rediseño de interfaz profesional

**Prototipo funcional independiente**, diseñado a partir de la captura del Studio existente y de los requisitos de interfaz profesional. **No sustituye ni despliega** el Worker `wayup-webcreator` actual.

## Stack

- Next.js 16 · App Router · React 19 · TypeScript estricto.
- Tailwind CSS 4 con variables de tema en `app/globals.css`.
- Iconos Lucide React; sin bibliotecas UI comerciales ni recursos privativos.

## Ejecutar

```bash
npm install
npm run dev
```

Para comprobar el código y la lógica de historial:

```bash
npm test
npm run typecheck
```

Abrir http://localhost:3000. Requiere Node.js >=20.9.

## Incluye realmente

- Espacio de trabajo en tres columnas con Navigator, Canvas e Inspector.
- Navigator con búsqueda de elementos, secciones plegables y vista de proyecto.
- Canvas con modo Diseño / Vista real / Código de ejemplo, dispositivos escritorio / tableta / móvil, zoom, selección de texto y botones, y arrastre libre en el prototipo React.
- Inspector contextual con posición, colores, fuentes, tamaño, peso, radios, relleno y sombras.
- Galería de 21 estilos de botón, con búsqueda y filtros por categorías aplicables sin perder el enlace.
- Edición de contenido y URL con validaciones de seguridad básicas.
- Historial Deshacer/Rehacer de hasta 40 cambios; atajos Ctrl/Cmd+Z, Ctrl/Cmd+Mayús+Z y Ctrl/Cmd+S.
- Persistencia explícita en localStorage como **demostración**, no guardado en Cloudflare.
- Interfaces accesibles, controles de foco, transiciones discretas, barras de scroll y respeto por `prefers-reduced-motion`.

## Arquitectura

- `app/`: entrada de Next.js, metadatos, tokens y estilos globales.
- `components/studio/top-bar.tsx`: cabecera compacta y acciones principales.
- `components/studio/navigator.tsx`: panel de proyectos/capas y árbol.
- `components/studio/canvas.tsx`: entorno de trabajo y reproducción del ejemplo Entrena-T.
- `components/studio/inspector.tsx`: panel contextual y biblioteca de botones.
- `components/studio/studio-app.tsx`: coordinación de estados, comandos y acciones.
- `lib/studio-types.ts`: contratos TypeScript de documentos, elementos y acciones.
- `lib/studio-store.ts`: reductor puro del historial.
- `lib/studio-service.ts`: puerto hacia almacenamiento; adaptador local para el prototipo.

## Antes de integrarlo con WAYUP Studio real

El Worker actual utiliza HTML/CSS/JavaScript incrustado y D1/R2; no React. Por tanto, **este proyecto es una propuesta implementada de frontend, no un reemplazo directo del editor actual**. Recomendamos montar la nueva interfaz detrás de una ruta de desarrollo (`/studio-next`) y conectar los controles a un adaptador para los endpoints existentes (`/api/projects`, `/api/projects/:id`, versiones, medios), conservando Cloudflare Access.

Para editar páginas HTML arbitrarias, sustituir el renderer de Entrena-T de este prototipo por un iframe aislado y un protocolo autenticado `postMessage` para seleccionar/mover/editar nodos. No ejecutar scripts de las webs generadas en modo edición. La demo no pretende importar HTML ni generar sitios completos. Al conectar el backend, exigir concurrencia optimista (`expectedVersion`), persistir cada guardado en D1 y mantener la versión anterior disponible para rollback.

## Estado de verificación

La estructura TypeScript y JSX se ha revisado con el compilador TypeScript. `npm test` pasó 12 archivos y verificó historial, acciones, conservación de enlaces y 21 estilos. La compilación real con Next.js y las pruebas visuales en navegador requieren instalar dependencias: este entorno no pudo acceder al registro npm. No se ha desplegado ni modificado producción.