import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { ProfileMenu } from './profile-menu'

export function AppHeader() {
  const { user } = useAuth()
  const location = useLocation()
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'You'
  const initials =
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const navLinks = [
    { path: '/board', label: 'My workspace' },
    { path: '/archive', label: 'Archive' },
  ]

  return (
    <header className="border-b border-[#e2e5ea] bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1540px] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-8">
          <Link
            className="flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.03em]"
            to="/board"
          >
            <span className="grid size-7 place-items-center rounded-[9px] bg-[#5c61d9] text-[13px] font-bold text-white">
              k
            </span>
            kikis
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-[#7f8795] md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={
                  location.pathname.startsWith(link.path) ? 'font-medium text-[#3e4652]' : ''
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <ProfileMenu displayName={displayName} initials={initials} />
      </div>
    </header>
  )
}
