import { Plus, ChevronDown } from 'lucide-react'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Kanban, KanbanBoard, KanbanOverlay } from '@/components/reui/kanban'
import { AppHeader } from '@/components/shell/app-header'
import { BoardToolbar } from './board-toolbar'
import { TaskColumn } from './task-column'
import { TaskCard } from './task-card'
import { TaskEditor } from './task-editor'
import { BoardEmptyState } from './board-empty-state'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { supabase } from '@/lib/supabase'
import { updateCard, updateColumn, archiveColumn, archiveCard, deleteColumn as deleteColumnMutation,
  calculatePosition, compactPositions, MIN_POSITION_GAP } from '@/lib/board-mutations'
import { createBoard, fetchWorkspaceId } from '@/lib/board-mutations'
import type { Card, KanbanValue, BoardColumn, Board } from '@/types/board'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Global state
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [allBoards, setAllBoards] = useState<Board[]>([])
  const [loadingBoards, setLoadingBoards] = useState(true)

  // Board loading state
  const [loading, setLoading] = useState(true)
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [boardName, setBoardName] = useState('')
  const [board, setBoard] = useState<KanbanValue>({})
  const [error, setError] = useState<string | null>(null)

  // Snapshot ref for drag persistence
  const snapshotRef = useRef<KanbanValue | null>(null)

  // Editor & creation state
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorColumnId, setEditorColumnId] = useState<string>('')
  const [showBoardMenu, setShowBoardMenu] = useState(false)
  const [showNewBoardInput, setShowNewBoardInput] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)

  // Search / filter state from URL
  const rawQuery = searchParams.get('q') ?? ''
  const selectedProject = searchParams.get('project')
  const query = useDebouncedValue(rawQuery, 150)

  // ── Fetch workspace + all boards on mount ──

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const wsId = await fetchWorkspaceId()
        if (cancelled || !wsId) { setLoadingBoards(false); return }
        setWorkspaceId(wsId)

        const { data: boards } = await supabase
          .from('boards')
          .select('*')
          .is('archived_at', null)
          .order('created_at', { ascending: true })
        if (cancelled) return
        setAllBoards((boards ?? []) as Board[])

        // If no boardId in URL, redirect to first board
        if (!boardId && boards?.length) {
          navigate(`/board/${boards[0].id}`, { replace: true })
          return
        }
      } catch { /* handled by board loading */ }
      if (!cancelled) setLoadingBoards(false)
    }
    init()
    return () => { cancelled = true }
  }, []) // only once on mount

  // ── Fetch board data when boardId changes ──

  const loadBoard = useCallback(async (bid: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data: boardData, error: boardErr } = await supabase
        .from('boards')
        .select('*')
        .eq('id', bid)
        .single()
      if (boardErr) throw boardErr
      setBoardName(boardData.name)

      const { data: cols, error: colErr } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', bid)
        .is('archived_at', null)
        .order('position', { ascending: true })
      if (colErr) throw colErr

      const { data: cards, error: cardErr } = await supabase
        .from('cards')
        .select('*')
        .eq('board_id', bid)
        .is('archived_at', null)
        .order('position', { ascending: true })
      if (cardErr) throw cardErr

      const resolvedColumns: BoardColumn[] = (cols ?? []) as BoardColumn[]
      const resolvedCards: Card[] = (cards ?? []) as Card[]

      const kanbanValue: KanbanValue = {}
      for (const col of resolvedColumns) {
        kanbanValue[col.id] = []
      }
      for (const card of resolvedCards) {
        if (kanbanValue[card.column_id]) {
          kanbanValue[card.column_id].push(card)
        }
      }
      for (const colId of Object.keys(kanbanValue)) {
        kanbanValue[colId].sort((a, b) => a.position - b.position)
      }

      setColumns(resolvedColumns)
      setBoard(kanbanValue)
      snapshotRef.current = null
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (boardId) {
      loadBoard(boardId)
    }
  }, [boardId, loadBoard])

  // ── Board creation ──

  const handleCreateBoard = useCallback(async () => {
    const name = newBoardName.trim()
    if (!name || !workspaceId) return
    setCreatingBoard(true)
    try {
      const bid = await createBoard(workspaceId, name, true)
      // Reload boards list
      const { data: boards } = await supabase
        .from('boards')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: true })
      setAllBoards((boards ?? []) as Board[])
      setShowBoardMenu(false)
      setShowNewBoardInput(false)
      setNewBoardName('')
      navigate(`/board/${bid}`, { replace: true })
    } catch (err) {
      console.error('Failed to create board:', err)
    }
    setCreatingBoard(false)
  }, [newBoardName, workspaceId, navigate])

  // Collect all unique projects
  const projects = useMemo(
    () => [...new Set(Object.values(board).flat().map((card) => card.project))].sort(),
    [board],
  )

  // Filtered cards for display
  const visibleBoard = useMemo<KanbanValue>(() => {
    const q = query.trim().toLowerCase()
    return Object.fromEntries(
      Object.entries(board).map(([colId, cards]) => [
        colId,
        cards.filter((card) => {
          if (q && !`${card.title} ${card.project}`.toLowerCase().includes(q)) return false
          if (selectedProject && card.project !== selectedProject) return false
          return true
        }),
      ]),
    )
  }, [board, query, selectedProject])

  const hasFilters = rawQuery !== '' || selectedProject !== null

  // ── Drag-and-drop persistence ──

  const handleDragStart = useCallback(() => {
    const snap: KanbanValue = {}
    for (const colId of Object.keys(board)) {
      snap[colId] = [...board[colId]]
    }
    snapshotRef.current = snap
  }, [board])

  const handleValueCommit = useCallback(
    async (next: KanbanValue) => {
      const prevSnapshot = snapshotRef.current
      if (!prevSnapshot) return
      snapshotRef.current = null

      // Build position maps {cardId: {colId, index}} from prev and next
      const prevPositions: Record<string, { colId: string; index: number }> = {}
      for (const colId of Object.keys(prevSnapshot)) {
        for (let i = 0; i < prevSnapshot[colId].length; i++) {
          prevPositions[prevSnapshot[colId][i].id] = { colId, index: i }
        }
      }
      const nextPositions: Record<string, { colId: string; index: number }> = {}
      for (const colId of Object.keys(next)) {
        for (let i = 0; i < next[colId].length; i++) {
          nextPositions[next[colId][i].id] = { colId, index: i }
        }
      }

      // Find cards whose column or index changed
      const movedCardIds: string[] = []
      for (const cardId of Object.keys(nextPositions)) {
        const prevPos = prevPositions[cardId]
        const nextPos = nextPositions[cardId]
        if (!prevPos || prevPos.colId !== nextPos.colId || prevPos.index !== nextPos.index) {
          movedCardIds.push(cardId)
        }
      }

      if (movedCardIds.length === 0) return

      const updates: Promise<unknown>[] = []
      for (const cardId of movedCardIds) {
        const pos = nextPositions[cardId]
        if (!pos) continue
        const colCards = next[pos.colId]
        const before = colCards[pos.index - 1]?.position ?? null
        const after = colCards[pos.index + 1]?.position ?? null
        const position = calculatePosition(before, after)
        const gap = after !== null ? after - position : MIN_POSITION_GAP

        if (gap < MIN_POSITION_GAP) {
          const positions = compactPositions(colCards.map(() => 0))
          for (let i = 0; i < colCards.length; i++) {
            updates.push(
              updateCard(colCards[i].id, { position: positions[i], column_id: pos.colId }),
            )
          }
        } else {
          updates.push(updateCard(cardId, { position, column_id: pos.colId }))
        }
      }

      if (updates.length > 0) {
        try { await Promise.all(updates) }
        catch { setBoard(prevSnapshot) }
      }
    },
    [],
  )

  // ── Card operations ──

  const handleAddTask = useCallback((columnId: string) => {
    setEditorColumnId(columnId)
    setEditingCard(null)
    setEditorOpen(true)
  }, [])

  const handleNewTask = useCallback(() => {
    if (columns.length > 0) {
      setEditorColumnId(columns[0].id)
      setEditingCard(null)
      setEditorOpen(true)
    }
  }, [columns])

  const handleSelectCard = useCallback((card: Card) => {
    setEditingCard(card)
    setEditorOpen(true)
  }, [])

  const handleSaved = useCallback((savedCard: Card) => {
    setBoard((prev) => {
      if (editingCard) {
        const next: KanbanValue = {}
        for (const colId of Object.keys(prev)) {
          next[colId] = prev[colId].map((c) => (c.id === savedCard.id ? savedCard : c))
        }
        return next
      }
      const colId = savedCard.column_id
      const next = { ...prev }
      next[colId] = [...(next[colId] ?? []), savedCard]
      return next
    })
  }, [editingCard])

  // ── Column operations ──

  const handleRenameColumn = useCallback(async (id: string, name: string) => {
    await updateColumn(id, { name })
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  const handleChangeColumnColor = useCallback(async (id: string, color: string) => {
    await updateColumn(id, { color })
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)))
  }, [])

  const handleArchiveColumn = useCallback(async (id: string) => {
    await archiveColumn(id)
    setBoard((prev) => { const n = { ...prev }; delete n[id]; return n })
    setColumns((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const handleDeleteColumn = useCallback(async (id: string) => {
    const colCards = board[id] ?? []
    const otherCol = columns.find((c) => c.id !== id && !c.archived_at)
    if (colCards.length > 0) {
      if (otherCol) {
        if (!window.confirm(`Move ${colCards.length} card(s) to "${otherCol.name}" and delete column?`)) return
        const updates = colCards.map((card, i) =>
          updateCard(card.id, { column_id: otherCol.id, position: (i + 1) * 1_000_000 }),
        )
        await Promise.all(updates)
      } else {
        if (!window.confirm(`Delete column with ${colCards.length} card(s)? Cards will be lost.`)) return
      }
    }
    await deleteColumnMutation(id)
    setBoard((prev) => {
      const next = { ...prev }
      delete next[id]
      if (otherCol && colCards.length > 0) {
        const moved = colCards.map((card, i) => ({ ...card, column_id: otherCol.id, position: (i + 1) * 1_000_000 }))
        next[otherCol.id] = [...(next[otherCol.id] ?? []), ...moved]
        next[otherCol.id].sort((a, b) => a.position - b.position)
      }
      return next
    })
    setColumns((prev) => prev.filter((c) => c.id !== id))
  }, [board, columns])

  const handleAddColumn = useCallback(async () => {
    if (!boardId) return
    const maxPos = columns.reduce((max, c) => Math.max(max, c.position), 0)
    const name = `Column ${columns.length + 1}`
    const color = '#8b95a7'
    try {
      const { data, error } = await supabase
        .from('columns')
        .insert({ board_id: boardId, name, position: maxPos + 1_000_000, color })
        .select('*')
        .single()
      if (error) throw error
      const created = data as BoardColumn
      setColumns((prev) => [...prev, created])
      setBoard((prev) => ({ ...prev, [created.id]: [] }))
    } catch (err) {
      console.error('Failed to create column:', err)
    }
  }, [boardId, columns])

  const totalCards = useMemo(
    () => Object.values(board).reduce((sum, cards) => sum + cards.length, 0),
    [board],
  )

  // ── Render ──

  if (loadingBoards || (boardId && loading)) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <div className="size-5 animate-spin rounded-full border-2 border-[#e1e4e9] border-t-[#5c61d9]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6f8]">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-4 text-sm text-[#b85c55]">{error}</p>
          <button type="button" onClick={() => boardId && loadBoard(boardId)}
            className="rounded-lg bg-[#5c61d9] px-4 py-2 text-sm font-medium text-white">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#202329]">
      <AppHeader />

      <main className="mx-auto max-w-[1540px] px-6 py-8 lg:px-10 lg:py-10">
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            {/* Board selector */}
            <div className="relative mb-1">
              <button
                type="button"
                onClick={() => setShowBoardMenu(!showBoardMenu)}
                className="inline-flex items-center gap-2 text-[30px] font-semibold tracking-[-0.04em] text-[#242932] hover:text-[#5c61d9]"
              >
                {boardName || 'Board'}
                <ChevronDown size={20} className="text-[#9aa2ad]" />
              </button>

              {showBoardMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setShowBoardMenu(false); setShowNewBoardInput(false) }} />
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-[#e1e4e9] bg-white py-1 shadow-lg">
                    <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9aa2ad]">Boards</div>
                    {allBoards.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { navigate(`/board/${b.id}`); setShowBoardMenu(false) }}
                        className={`flex w-full items-center px-3 py-1.5 text-left text-sm ${b.id === boardId ? 'bg-[#f0f0ff] font-medium text-[#5c61d9]' : 'text-[#515966] hover:bg-[#f5f6f8]'}`}
                      >
                        <span className="mr-2 grid size-5 place-items-center rounded bg-[#e8e9ff] text-[9px] font-bold text-[#5c61d9]">b</span>
                        {b.name}
                      </button>
                    ))}
                    {showNewBoardInput ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleCreateBoard() }} className="border-t border-[#eef0f2] px-3 py-2">
                        <input
                          autoFocus
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                          placeholder="Board name"
                          className="h-8 w-full rounded border border-[#e1e4e9] px-2 text-xs text-[#515966] outline-none focus:border-[#a6a9ed]"
                        />
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <button type="button" onClick={() => { setShowNewBoardInput(false); setNewBoardName('') }}
                            className="rounded px-2 py-1 text-[11px] text-[#858e9d] hover:bg-[#f5f6f8]">Cancel</button>
                          <button type="submit" disabled={creatingBoard || !newBoardName.trim()}
                            className="rounded bg-[#5c61d9] px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50">
                            {creatingBoard ? 'Creating…' : 'Create'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowNewBoardInput(true)}
                        className="flex w-full items-center gap-2 border-t border-[#eef0f2] px-3 py-2 text-xs text-[#5c61d9] hover:bg-[#f5f6f8]"
                      >
                        <Plus size={13} /> New board
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-[#858e9d]">
              {totalCards > 0
                ? `${totalCards} tasks across ${columns.length} columns.`
                : 'A clear view of what needs your attention.'}
            </p>
          </div>
        </section>

        <BoardToolbar
          query={rawQuery}
          onQueryChange={(q) => {
            setSearchParams((prev) => { const n = new URLSearchParams(prev); q ? n.set('q', q) : n.delete('q'); return n }, { replace: true })
          }}
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={(project) => {
            setSearchParams((prev) => { const n = new URLSearchParams(prev); project ? n.set('project', project) : n.delete('project'); return n }, { replace: true })
          }}
          hasFilters={hasFilters}
          onClearFilters={() => setSearchParams({}, { replace: true })}
          onNewTask={handleNewTask}
        />

        {totalCards === 0 && !hasFilters ? (
          <BoardEmptyState onAddTask={handleNewTask} />
        ) : null}

        <section id="board" className="overflow-x-auto pb-4">
          <Kanban
            value={board}
            onValueChange={setBoard}
            onValueCommit={handleValueCommit}
            onDragStart={handleDragStart}
            getItemValue={(item) => item.id}
            restoreOnCancel
          >
            <KanbanBoard className="flex gap-4 min-w-[1120px]">
              {columns.map((column) => (
                <TaskColumn
                  key={column.id}
                  column={column}
                  cards={visibleBoard[column.id] ?? []}
                  onAddTask={() => handleAddTask(column.id)}
                  onSelectCard={handleSelectCard}
                  onArchiveCard={(card) => {
                    archiveCard(card.id).then(() => {
                      setBoard((prev) => {
                        const next: KanbanValue = {}
                        for (const colId of Object.keys(prev)) {
                          next[colId] = prev[colId].filter((c) => c.id !== card.id)
                        }
                        return next
                      })
                    }).catch(console.error)
                  }}
                  onRenameColumn={handleRenameColumn}
                  onChangeColumnColor={handleChangeColumnColor}
                  onArchiveColumn={handleArchiveColumn}
                  onDeleteColumn={handleDeleteColumn}
                />
              ))}
              {boardId && (
                <div className="flex min-w-[270px] flex-col">
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="mt-12 flex items-center gap-2 rounded-lg border-2 border-dashed border-[#d0d4db] px-4 py-3 text-sm text-[#949ca8] transition hover:border-[#5c61d9] hover:text-[#5c61d9]"
                  >
                    <Plus size={15} /> Add column
                  </button>
                </div>
              )}
            </KanbanBoard>
            <KanbanOverlay>
              {({ value, variant }) => {
                if (variant === 'column') {
                  const col = columns.find((c) => c.id === String(value))
                  return col ? <TaskColumn column={col} cards={board[col.id] ?? []} isOverlay /> : null
                }
                const allCards = Object.values(board).flat()
                const card = allCards.find((c) => c.id === String(value))
                return card ? <TaskCard card={card} isOverlay /> : null
              }}
            </KanbanOverlay>
          </Kanban>
        </section>

        <footer className="mt-9 flex items-center justify-between border-t border-[#e2e5ea] pt-4 text-[11px] text-[#a1a8b3]">
          <span>Personal workspace</span>
          <span>Synced</span>
        </footer>
      </main>

      <TaskEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        boardId={boardId ?? ''}
        columnId={editorColumnId}
        card={editingCard}
        onSaved={handleSaved}
      />
    </div>
  )
}
