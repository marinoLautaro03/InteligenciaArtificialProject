import { useClerk, useUser } from '@clerk/react'

export default function Dashboard() {
  const { signOut } = useClerk()
  const { user } = useUser()

  const displayName = user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'Usuario'

  return (
    <div style={{ padding: 32, fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ color: 'var(--fg)', fontSize: 'var(--t-2xl)', marginBottom: 16 }}>
        Hola, {displayName}
      </h1>
      <button
        onClick={() => signOut({ redirectUrl: '/login' })}
        style={{
          padding: '10px 20px',
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--t-base)',
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
