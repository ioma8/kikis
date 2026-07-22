import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth-context'

export function Providers() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
