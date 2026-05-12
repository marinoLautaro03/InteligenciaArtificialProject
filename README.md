# InteligenciaArtificialProject

Monorepo base para una app web con frontend en React + Vite y backend en Hono + Drizzle + PostgreSQL.

## Prerrequisitos

- Node.js 22 o superior
- pnpm 10 o superior
- Docker Desktop o Docker Engine con Docker Compose

## Estructura

- `frontend/`: aplicacion React + Vite
- `backend/`: API en Hono, acceso a datos con Drizzle y PostgreSQL

## Instalacion

1. Instalar dependencias del monorepo:

```bash
pnpm install
```

2. Crear los archivos locales de variables de entorno sin versionar secretos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En PowerShell podes usar:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

### Variables de entorno

#### Backend

El backend usa `backend/.env` y espera estas variables:

- `PORT`: puerto HTTP de la API. Valor por defecto: `3001`.
- `DATABASE_URL`: cadena de conexion a PostgreSQL. Valor de ejemplo:
  `postgres://postgres:postgres@localhost:5432/ia_project`

#### Frontend

Hoy el frontend no necesita variables publicas obligatorias para arrancar.
El archivo `frontend/.env.example` deja documentado que, si mas adelante se consume la API desde otro origen, la variable publica esperable seria `VITE_API_URL`.

## MCP (Claude Code)

El proyecto incluye `.mcp.json.example` como plantilla para configurar los servidores MCP de Claude Code. Copialo y completá tus credenciales:

```bash
cp .mcp.json.example .mcp.json
```

En PowerShell:

```powershell
Copy-Item .mcp.json.example .mcp.json
```

El archivo `.mcp.json` está en `.gitignore` — nunca se commitea. Requiere Docker Desktop corriendo para levantar los contenedores.

### Atlassian / Jira

Editá `.mcp.json` y reemplazá:

| Variable | Descripcion |
|---|---|
| `JIRA_URL` | URL de tu instancia, ej. `https://tu-dominio.atlassian.net` |
| `JIRA_USERNAME` | Tu email de Atlassian |
| `JIRA_API_TOKEN` | Token generado en https://id.atlassian.com/manage-api-tokens |

### GitHub

Editá `.mcp.json` y reemplazá:

| Variable | Descripcion |
|---|---|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Personal Access Token generado en https://github.com/settings/tokens con scope `repo` |

Reinicia Claude Code para que los cambios tomen efecto.

## PostgreSQL local

El proyecto incluye `backend/docker-compose.yml` para levantar una base local.

```bash
docker compose -f backend/docker-compose.yml up -d
```

Credenciales del contenedor:

- host: `localhost`
- puerto: `5432`
- base: `ia_project`
- usuario: `postgres`
- password: `postgres`

Para detener el contenedor:

```bash
docker compose -f backend/docker-compose.yml down
```

## Desarrollo

Levantar frontend y backend en paralelo desde la raiz:

```bash
pnpm dev
```

Servicios disponibles:

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`
- healthcheck backend: `http://localhost:3001/health`

Tambien podes correr cada app por separado:

```bash
pnpm --filter backend dev
pnpm --filter frontend dev
```

## Base de datos

Comandos utiles del backend para Drizzle:

```bash
pnpm --filter backend db:generate
pnpm --filter backend db:push
```

## Build, lint y typecheck

Desde la raiz:

```bash
pnpm build
pnpm lint
```

Notas:

- `pnpm build` compila frontend y backend.
- `pnpm lint` ejecuta `eslint` en frontend y `tsc --noEmit` en backend.
- El backend no expone un script separado llamado `typecheck`; el chequeo de tipos actual corre dentro de `lint`.

## Scripts por paquete

### Frontend

```bash
pnpm --filter frontend dev
pnpm --filter frontend build
pnpm --filter frontend lint
pnpm --filter frontend preview
```

### Backend

```bash
pnpm --filter backend dev
pnpm --filter backend build
pnpm --filter backend lint
pnpm --filter backend test:e2e
pnpm --filter backend db:generate
pnpm --filter backend db:push
```
