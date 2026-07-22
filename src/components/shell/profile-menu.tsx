import { useAuth } from '@/lib/auth-context'

export function ProfileMenu({ displayName, initials }: { displayName: string; initials: string }) {
  const { signOut } = useAuth()

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          void signOut().catch((err) => console.error('Failed to sign out:', err))
        }}
        className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white py-1.5 pl-1.5 pr-3 text-xs font-medium text-[#555e6c] hover:bg-[#f5f6f8]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-[#e6e6ff] text-[10px] font-semibold text-[#5c61d9]">
          {initials}
        </span>
        {displayName}
      </button>
    </div>
  )
}
