import { ChevronDown, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function ProfileMenu({ displayName, initials }: { displayName: string; initials: string }) {
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  return (
    <div className="relative flex min-w-0 items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={`Account: ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex min-w-0 items-center gap-2 rounded-full border border-[#e5e7eb] bg-white py-1.5 pl-1.5 pr-2 text-xs font-medium text-[#555e6c] hover:bg-[#f5f6f8] sm:pr-3"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e6e6ff] text-[10px] font-semibold text-[#5c61d9]">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
        <ChevronDown size={13} className="shrink-0 text-[#9aa2ad]" />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            aria-label="Account menu"
            className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[#e1e4e9] bg-white p-1.5 shadow-lg"
          >
            <div className="px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9aa2ad]">
                Account
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-[#343b46]">{displayName}</p>
            </div>
            <div className="border-t border-[#eef0f2] pt-1" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setSignOutOpen(true)
              }}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-xs text-[#515966] hover:bg-[#f5f6f8]"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out of Kikis?"
        description="You will need to sign in again to access your workspace."
        confirmLabel="Sign out"
        onConfirm={signOut}
      />
    </div>
  )
}
