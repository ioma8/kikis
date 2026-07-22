import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { ProfileMenu } from './profile-menu'
import { BrandWordmark } from './brand-mark'

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
      <div className="mx-auto flex h-14 max-w-[1540px] items-center justify-between px-4 sm:h-[68px] sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link aria-label="Kikis home" className="flex shrink-0 items-center" to="/board">
            <BrandWordmark className="h-7 w-20 sm:h-8 sm:w-24" />
          </Link>
          <nav className="flex min-w-0 items-center gap-3 text-[12px] text-[#7f8795] sm:gap-6 sm:text-[13px]">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-md px-1.5 py-1 transition-colors hover:bg-[#f5f6f8] hover:text-[#3e4652] ${location.pathname.startsWith(link.path) ? 'bg-[#f5f6f8] font-medium text-[#3e4652]' : ''}`}
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
