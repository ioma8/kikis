import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Providers } from './providers'
import BoardPage from '@/components/board/board-page'
import { LoginPage } from '@/components/shell/login-page'
import { AuthGate } from '@/components/shell/auth-gate'
import { ArchivePage } from '@/components/board/archive-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Providers />,
    children: [
      { index: true, element: <Navigate to="/board" replace /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'board',
        element: (
          <AuthGate>
            <BoardPage />
          </AuthGate>
        ),
      },
      {
        path: 'board/:boardId',
        element: (
          <AuthGate>
            <BoardPage />
          </AuthGate>
        ),
      },
      {
        path: 'archive',
        element: (
          <AuthGate>
            <ArchivePage />
          </AuthGate>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#242932]">Not found</h1>
        <p className="mt-2 text-sm text-[#858e9d]">This page doesn't exist.</p>
      </div>
    </div>
  )
}
