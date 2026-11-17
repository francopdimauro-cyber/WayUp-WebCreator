# WAYUP WebCreator · Studio + Multi-IA

Repositorio del constructor privado de webs para clientes. Contiene el Worker de WebCreator y la aplicación de edición visual WAY UP Studio Next.

## Estado actual de desarrollo — 17/11/2026

La línea activa de trabajo del editor es:

- **Repositorio:** `francopdimauro-cyber/WayUp-WebCreator`.
- **Aplicación:** `studio-next/` (Next.js 16, React 19 y TypeScript).
- **Rama de trabajo:** `feature/editor-image-panel-menu-items-20261117`.
- **Rama base:** `feature/studio-final-motor-estructura-medios-20261115`.
- **Pull Request:** [#11 · Editor CSS y sustitución inteligente de símbolos](https://github.com/francopdimauro-cyber/WayUp-WebCreator/pull/11). Sigue en borrador y no está fusionada.
- **Producción:** esta rama no se ha desplegado. No modificar `main`, el Worker de producción ni el repositorio independiente `Refugio-de-Chilla`.

La documentación operativa para continuar el editor está en **[`studio-next/README.md`](studio-next/README.md)**. Ese documento es el punto de traspaso para Claude: recoge arquitectura, funciones implementadas, pruebas, límites conocidos y reglas para continuar el trabajo.

## Qué incluye el Worker de WebCreator

- Constructor guiado de seis pasos y generación de HTML completo mediante streaming de **OpenRouter**.
- Tres modelos configurados: `nvidia/nemotron-3-ultra-550b-a55b:free` (constructor), `nvidia/nemotron-3.5-super-vl:free` (referencias visuales) y `cohere/north-mini-code:free` (revisión/refinamiento). Disponibilidad dependiente de OpenRouter.
- Guía de dirección artística original integrada en el prompt del constructor. Preserva marca, jerarquía, responsive y editabilidad; ver `docs/DESIGN_DIRECTOR.md`.
- Descarga de HTML y ZIP; recuperación de borradores y copias de generación en D1.
- Auditoría HTML estática sin consumo de IA desde el Worker clásico: estructura, metadatos, enlaces, IDs, imágenes y recursos inseguros básicos. **No sustituye las pruebas de navegador, accesibilidad y seguridad.**

## Arquitectura y permisos del Worker clásico

- Worker privado: `wayup-webcreator`; autenticación obligatoria mediante Cloudflare Zero Trust Access.
- Secreto en Cloudflare: `OPENROUTER_API_KEY`. Binding D1: `USAGE_DB`.
- Las claves API nunca se envían al navegador ni se almacenan en GitHub.
- Contadores internos: **50 llamadas/día UTC** y **10 llamadas por briefing/proyecto**; se aplican además los límites y restricciones de OpenRouter.
- Tablas `generation_cache`, `generation_drafts`, `multi_ai_usage_events`, `webcreator_projects`, `webcreator_project_versions`.
- Migración Studio clásica: `migrations/0002_studio.sql`. Solo ejecutar al preparar un entorno; no repetir a ciegas en producción.
- Endpoints Studio clásicos: `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`, `GET /api/projects/:id/versions`, `GET /api/projects/:id/versions/:n`, `GET /api/projects/:id/quality`.

## Construcción y pruebas del Worker clásico

Requiere Node.js 20 o superior:

```bash
npm run check
```

Ejecuta `scripts/build.mjs`, genera `dist/worker.js`, comprueba sintaxis y pasa la suite de pruebas de regresión. `.github/workflows/webcreator-ci.yml` valida el Worker clásico.

**Este comando no despliega nada.** Para desplegar hay que comprobar primero migraciones y bindings, proteger los secretos y planear recuperación.

## Aislamiento del proyecto

No modificar WAYUP, WAY.APP, recursos de `futuregipsy` ni la web original de El Refugio de Chilla al trabajar en el editor. Mantener los cambios en ramas aisladas, exigir pruebas antes de fusionar y no publicar sin autorización explícita.
