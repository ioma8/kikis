import { useState, useEffect, useCallback } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { restoreCard, deleteCard } from '@/lib/board-mutations'
import { AppHeader } from '@/components/shell/app-header'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Card } from '@/types/board'

export function ArchivePage() {
  const [archivedCards, setArchivedCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null)

  const loadArchived = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load from all boards the user has access to
      const { data: userBoards, error: boardsError } = await supabase
        .from('boards')
        .select('id, name')
      if (boardsError) throw boardsError
      if (!userBoards?.length) {
        setArchivedCards([])
        return
      }
      const boardIds = userBoards.map((b) => b.id)
      const { data, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .in('board_id', boardIds)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
      if (cardsError) throw cardsError
      setArchivedCards((data ?? []) as Card[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archive')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadArchived()
  }, [loadArchived])

  const handleRestore = async (id: string) => {
    try {
      await restoreCard(id)
      setArchivedCards((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore card')
    }
  }

  const handleDelete = (id: string) => {
    setDeleteCardId(id)
  }

  const confirmDelete = async () => {
    if (!deleteCardId) return
    try {
      await deleteCard(deleteCardId)
      setArchivedCards((prev) => prev.filter((c) => c.id !== deleteCardId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#202329]">
      <AppHeader />
      <main className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#242932] sm:text-[30px]">
            Archive
          </h1>
          <p className="mt-2 text-sm text-[#858e9d]">
            {archivedCards.length} archived card{archivedCards.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#f2c6c2] bg-[#fff5f4] px-3 py-2 text-xs text-[#b85c55]"
          >
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button
              type="button"
              onClick={() => void loadArchived()}
              className="ml-auto shrink-0 font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-5 animate-spin rounded-full border-2 border-[#e1e4e9] border-t-[#5c61d9]" />
          </div>
        ) : archivedCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-xl border border-[#e1e4e9] bg-white">
              <Trash2 size={20} className="text-[#9aa2ad]" />
            </div>
            <h2 className="mb-1 text-base font-semibold text-[#242932]">Nothing archived</h2>
            <p className="text-sm text-[#858e9d]">Archived cards will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {archivedCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#e1e4e9] bg-white p-3.5 shadow-[0_1px_2px_rgba(25,35,50,0.03)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#343b46]">{card.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#9199a5]">
                    {card.project} &middot; {card.priority}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRestore(card.id)}
                    aria-label="Restore card"
                    className="grid size-8 place-items-center rounded-md text-[#858e9d] hover:bg-[#f5f6f8] hover:text-[#5c61d9]"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(card.id)}
                    aria-label="Permanently delete card"
                    className="grid size-8 place-items-center rounded-md text-[#858e9d] hover:bg-[#fff5f4] hover:text-[#b85c55]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <ConfirmDialog
        open={deleteCardId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCardId(null)
        }}
        title="Delete archived card?"
        description="Permanently delete this card? This cannot be undone."
        confirmLabel="Delete card"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  )
}
