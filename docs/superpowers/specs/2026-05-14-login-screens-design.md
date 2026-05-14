# SCRUM-8: Pantallas de registro, login y logout

**Fecha:** 2026-05-14
**Ticket:** SCRUM-8
**Tickets relacionados:** SCRUM-35 (Clerk setup, completado), SCRUM-9 (protección de rutas backend), SCRUM-13 (UI Dashboard real)

## Contexto

Clerk ya está instalado y el `ClerkProvider` wrappea la app. Este ticket implementa la UI de autenticación: pantalla de login custom siguiendo el prototipo, routing con React Router, guard de rutas privadas y logout.

## Alcance

### Incluido
- Instalar `react-router-dom`
- Pantalla de login custom (layout 2 columnas del prototipo)
- OAuth con Google y Facebook
- Login con email/password
- `ProtectedRoute` que redirige a `/login` si no hay sesión
- Logout desde la app
- Ruta `/sso-callback` para retorno de OAuth
- Placeholder de Dashboard (SCRUM-13 lo llenará)

### Fuera de alcance
- UI del Dashboard real → SCRUM-13
- Apple OAuth → requiere Apple Developer ($99/año)
- Recuperación de contraseña → post-MVP
- Sincronización de usuario a DB local → post-MVP

## Estructura de archivos

```
frontend/src/
├── main.tsx                     ← agregar BrowserRouter
├── App.tsx                      ← reemplazar con Routes
├── index.css                    ← agregar design tokens del prototipo
├── pages/
│   ├── LoginPage.tsx            ← UI custom 2 columnas
│   ├── LoginPage.css            ← estilos del login
│   └── Dashboard.tsx            ← placeholder
└── components/
    └── ProtectedRoute.tsx       ← guard de rutas privadas
```

## Diseño

### Routing (`main.tsx` + `App.tsx`)

`main.tsx` wrappea con `BrowserRouter` dentro del `ClerkProvider` existente:

```tsx
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
```

`App.tsx` solo define rutas:

```tsx
import { Routes, Route } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  )
}
```

### ProtectedRoute (`components/ProtectedRoute.tsx`)

```tsx
import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <div className="loading">Cargando…</div>
  if (!isSignedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

### LoginPage (`pages/LoginPage.tsx`)

Layout 2 columnas fiel al prototipo:

**Columna izquierda — hero:**
- Logo "SC" (box monoespacio con `--fg`/`--bg`)
- Nombre "Social Content Studio" + badge "v0.1 · MVP"
- Headline: `Brief corto. *Post listo para publicar.*`
- Descripción en prosa
- Flow visual 4 pasos: Brief → Red social → Generar → Publicar (con números 01-04)
- Footer: `© 2026 · hecho con cuidado`

**Columna derecha — form card:**
- Título: "Iniciá sesión"
- Subtítulo: "Continuá con tu cuenta para acceder a tus proyectos."
- Botón OAuth Google (`oauth_google`)
- Botón OAuth Facebook (`oauth_facebook`)
- Divisor "o con email"
- Input email + input contraseña
- Botón "Continuar →"
- Watermark "Secured by · Clerk"

**Hooks Clerk:**

```tsx
const { signIn, isLoaded } = useSignIn()

const loginWithOAuth = (provider: 'oauth_google' | 'oauth_facebook') => {
  signIn.authenticateWithRedirect({
    strategy: provider,
    redirectUrl: '/sso-callback',
    redirectUrlComplete: '/',
  })
}
```

Email/password usa `signIn.create({ identifier: email, password })`.

Si `!isLoaded`, mostrar estado de carga (no renderizar el form).

### Dashboard placeholder (`pages/Dashboard.tsx`)

Componente mínimo con botón de logout:

```tsx
import { useClerk, useUser } from '@clerk/react'

export default function Dashboard() {
  const { signOut } = useClerk()
  const { user } = useUser()

  return (
    <div>
      <p>Hola, {user?.firstName ?? user?.emailAddresses[0].emailAddress}</p>
      <button onClick={() => signOut({ redirectUrl: '/login' })}>
        Cerrar sesión
      </button>
    </div>
  )
}
```

### Design tokens (`index.css`)

Copiar las variables CSS del prototipo al `:root` de `index.css`:
`--fg`, `--bg`, `--accent`, `--surface-1`, `--surface-2`, `--border`, `--fg-soft`, `--font-mono`.

## Verificación

1. `pnpm --filter frontend lint` → sin errores de tipos
2. `pnpm --filter frontend dev` → dev server arranca
3. Navegar a `http://localhost:5173` → redirige a `/login`
4. Login con Google → OAuth completa → redirige a `/`  → muestra Dashboard placeholder
5. Login con Facebook → ídem
6. Login con email/password → redirige a `/`
7. Botón logout → redirige a `/login`
8. Navegar a `http://localhost:5173` sin sesión → redirige a `/login`
9. Chrome DevTools → sin errores en consola
