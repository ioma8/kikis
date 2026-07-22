import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function ProfileMenu({ displayName, initials }: { displayName: string; initials: string }) {
  const { signOut } = useAuth()
  const [signOutOpen, setSignOutOpen] = useState(false)

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => setSignOutOpen(true)}
        aria-label={`Account: ${displayName}`}
        className="flex min-w-0 items-center gap-2 rounded-full border border-[#e5e7eb] bg-white py-1.5 pl-1.5 pr-2 text-xs font-medium text-[#555e6c] hover:bg-[#f5f6f8] sm:pr-3"
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#e6e6ff] text-[10px] font-semibold text-[#5c61d9]">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
      </button>
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
