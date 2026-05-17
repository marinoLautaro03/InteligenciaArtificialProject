# SCRUM-13: UI de listado y detalle de Projects

**Fecha:** 2026-05-17  
**Ticket:** SCRUM-13  
**Scope:** Dashboard de proyectos + App Shell con sidebar

---

## Contexto

El Dashboard de proyectos existe pero usa un layout de página completa sin sidebar. El prototipo (`prototype/app.jsx`, `prototype/styles.css`) define un app shell con sidebar permanente y topbar con breadcrumbs que debe envolver todas las pantallas protegidas. Además, las project cards no muestran post count y tienen botones inline de editar/eliminar que no están en el prototipo.

---

## Cambios por área

### 1. Backend — `postCount` en proyectos

**Archivo:** `backend/src/modules/projects/projects.repository.ts`

La query de listado (`findAll`) y de detalle (`findById`) agregan un subquery COUNT sobre la tabla `posts` filtrando por `project_id`. El resultado se mapea al campo `postCount: number`.

No hay cambios en el schema de base de datos.

**Archivo:** `frontend/src/lib/api.ts`

El tipo `Project` suma `postCount: number`.

---

### 2. App Shell — layout con React Router

**Nuevo archivo:** `frontend/src/components/AppShell.tsx`

Renderiza tres zonas usando CSS grid (columna sidebar + columna main):

- **`<Sidebar>`** — columna izquierda fija (248px, de `prototype/styles.css`)
  - Brand mark "SC" + nombre + subtítulo mono
  - Sección "General": link "Proyectos" (activo en `/`)
  - Sección del proyecto activo (solo visible cuando `projectId` está en la URL): label con nombre del proyecto, links "Generador" e "Historial"
  - Acceso rápido: hasta 4 proyectos como nav items (links directos al gallery)
  - Spacer flexible
  - User card: avatar con iniciales, nombre, email, botón logout

- **`<TopBar>`** — breadcrumbs derivados de la URL:
  - `/` → "Proyectos"
  - `/projects/:id/*` → "Proyectos / [nombre proyecto] / [pantalla]"

- **`<Outlet />`** — área de contenido donde React Router monta las páginas hijas

El `AppShell` hace su propio fetch de `GET /projects` para poblar el sidebar (acceso rápido + nombre del proyecto activo en breadcrumb y sidebar). Usa `useAuth` igual que el Dashboard. El proyecto activo se deriva del `useParams()` — sin estado global.

Para evitar el doble fetch cuando el usuario está en el Dashboard, `AppShell` expone los proyectos via `ProjectsContext` (un React Context simple). El Dashboard consume ese context en lugar de hacer su propio `GET /projects`. Las operaciones de create/update/delete del Dashboard actualizan el context para que el sidebar refleje los cambios en tiempo real.

**Actualización:** `frontend/src/App.tsx`

Reemplaza el wrapper de `ProtectedRoute` individual por un layout route:

```
Route "/" → ProtectedRoute → AppShell
  Route index → Dashboard
  Route "/projects/:projectId/gallery" → ProjectGallery
```

`ProtectedRoute` queda solo como guardia de autenticación; el layout lo da `AppShell`.

---

### 3. Dashboard — refactor

**Qué se elimina de `Dashboard.tsx`:**
- Sección hero completa (kicker, h1 grande, lead, métricas de "proyectos activos")
- Header standalone con brand mark y user actions (pasan al AppShell)
- Botones inline "Abrir galeria", "Editar", "Eliminar" de cada card

**Nuevo page header** (fiel al prototipo):
- `h1` "Tus proyectos" con clase `.page-title`
- Subtítulo con contador usando `.page-sub`
- Input de búsqueda + botón "Nuevo proyecto" alineados a la derecha

**Project cards** (estructura del prototipo):
- Cover con iniciales (glyph) generadas desde el nombre, con color de fondo del `primaryColor` del proyecto
- Si hay `logoUrl`, muestra el logo en lugar del glyph
- Nombre (h3), descripción recortada a 2 líneas
- Meta: `N posts · fecha actualización` (formato `12 may`)
- **Kebab menu (⋮)**: botón en la esquina superior derecha de la card, abre un dropdown con "Editar" y "Eliminar"
- Click en la card (fuera del kebab) navega a `/projects/:id/gallery`

**Card "Crear proyecto"** al final del grid, igual al diseño actual.

**Estados sin cambios:** loading, error, empty state — misma lógica, solo ajuste de clases CSS.

---

### 4. ProjectGallery — ajuste menor

**Qué se elimina:** el bloque `gallery-topbar` con el link "Volver a proyectos". La navegación de vuelta queda cubierta por el breadcrumb del AppShell.

El resto de la página no cambia (intro, grid, modal de generación).

---

### 5. CSS — arquitectura modular

**Nueva carpeta:** `frontend/src/styles/`

**`frontend/src/styles/shell.css`** — layout del app shell, portado de `prototype/styles.css`:
- `.app` (CSS grid 248px + 1fr)
- `.sidebar`, `.brand`, `.brand-mark`, `.brand-name`, `.brand-sub`
- `.nav-section`, `.nav-label`, `.nav-item` (con estados hover y active)
- `.user-avatar`, `.user-card`, `.user-meta`
- `.topbar`, `.crumbs`
- `.content`, `.content-inner`

Importado en `main.tsx`.

**`frontend/src/styles/components.css`** — primitivos UI reutilizables, portados de `prototype/styles.css`:
- Botones: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-lg`, `.btn-sm`, `.btn-icon`
- Inputs: `.input`, `.textarea`, `.field`, `.field-label`
- Cards: `.card`, `.card-pad`
- Modales: `.modal-backdrop`, `.modal`
- Page headers: `.page-header`, `.page-title`, `.page-sub`
- Chips: `.chip`, `.chips`

Importado en `main.tsx`.

**Migración de nombres de clases** en componentes existentes:
- `.primary-button` → `.btn .btn-primary`
- `.ghost-button` → `.btn .btn-ghost`
- `.danger-button` → `.btn .btn-danger`
- `.project-input` / `.project-textarea` → `.input` / `.textarea`
- Afecta: `Dashboard.tsx`, `ProjectGallery.tsx`, `ProjectForm.tsx`

**`frontend/src/pages/Dashboard.css`** — queda solo con estilos del dashboard: `.project-grid`, `.project-card`, `.project-card-cover`, `.project-card-body`, `.project-card-meta`, `.project-card-kebab`, `.project-create-card`, `.dashboard-empty-state`.

**`frontend/src/pages/ProjectGallery.css`** — nuevo archivo con estilos de galería extraídos de `Dashboard.css`: `.gallery-intro`, `.gallery-summary-card`, `.gallery-grid`, `.gallery-card`, `.gallery-card-body`.

**`frontend/src/App.css`** — vaciar (las clases globales pasan a `components.css` y `shell.css`).

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `backend/src/modules/projects/projects.repository.ts` | Agregar `postCount` al SELECT |
| `backend/src/modules/projects/projects.service.ts` | Propagar `postCount` si aplica |
| `frontend/src/lib/api.ts` | Agregar `postCount: number` a `Project` |
| `frontend/src/App.tsx` | Layout route con AppShell |
| `frontend/src/main.tsx` | Importar `shell.css` y `components.css` |
| `frontend/src/components/AppShell.tsx` | Nuevo — shell completo |
| `frontend/src/pages/Dashboard.tsx` | Refactor — sin hero, sin header propio, cards con kebab |
| `frontend/src/pages/Dashboard.css` | Solo estilos del dashboard |
| `frontend/src/pages/ProjectGallery.tsx` | Eliminar topbar standalone |
| `frontend/src/pages/ProjectGallery.css` | Nuevo — estilos de galería |
| `frontend/src/components/ProjectForm.tsx` | Migrar clases de botones/inputs |
| `frontend/src/styles/shell.css` | Nuevo — app shell layout |
| `frontend/src/styles/components.css` | Nuevo — primitivos UI compartidos |

---

## Lo que NO incluye este ticket

- Pantalla de Generador (SCRUM-16)
- Pantalla de Historial de posts (SCRUM-25)
- Links "Generador" e "Historial" en sidebar apuntan a rutas futuras (se renderizan pero navegan a páginas no implementadas aún)
