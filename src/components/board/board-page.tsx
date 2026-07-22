import { Plus, ChevronDown } from 'lucide-react'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Kanban, KanbanBoard, KanbanOverlay, type KanbanCommitMeta } from '@/components/reui/kanban'
import { AppHeader } from '@/components/shell/app-header'
import { BoardToolbar } from './board-toolbar'
import { TaskColumn } from './task-column'
import { TaskCard } from './task-card'
import { TaskEditor } from './task-editor'
import { BoardEmptyState } from './board-empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { descriptionToPlainText } from '@/lib/description'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { supabase } from '@/lib/supabase'
import {
  updateCard,
  updateColumn,
  archiveColumn,
  archiveCard,
  deleteCard,
  deleteColumn as deleteColumnMutation,
  calculatePosition,
  compactPositions,
  MIN_POSITION_GAP,
} from '@/lib/board-mutations'
import { createBoard } from '@/lib/board-mutations'
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
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Snapshot ref for drag persistence
  const snapshotRef = useRef<KanbanValue | null>(null)
  const loadRequestRef = useRef(0)

  // Editor & creation state
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorColumnId, setEditorColumnId] = useState<string>('')
  const [showBoardMenu, setShowBoardMenu] = useState(false)
  const [showNewBoardInput, setShowNewBoardInput] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)
  const [pendingColumnDelete, setPendingColumnDelete] = useState<string | null>(null)
  const [pendingCardDelete, setPendingCardDelete] = useState<Card | null>(null)

  // Search / filter state from URL
  const rawQuery = searchParams.get('q') ?? ''
  const selectedProject = searchParams.get('project')
  const query = useDebouncedValue(rawQuery, 150)

  // ── Fetch workspace + all boards ──

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoadingBoards(true)
      try {
        const { data: boards, error: boardsError } = await supabase
          .from('boards')
          .select('*')
          .is('archived_at', null)
          .order('created_at', { ascending: true })
        if (boardsError) throw boardsError
        if (cancelled) return
        const resolvedBoards = (boards ?? []) as Board[]
        setAllBoards(resolvedBoards)

        // New boards must be created in the workspace of the active board.
        const activeBoard =
          (boardId ? resolvedBoards.find((candidate) => candidate.id === boardId) : undefined) ??
          resolvedBoards[0]
        setWorkspaceId(activeBoard?.workspace_id ?? null)

        // If no boardId in URL, redirect to first board
        if (!boardId && activeBoard) {
          navigate(`/board/${activeBoard.id}`, { replace: true })
          return
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(err instanceof Error ? err.message : 'Failed to load boards')
        }
      } finally {
        if (!cancelled) setLoadingBoards(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [boardId, navigate])

  // ── Fetch board data when boardId changes ──

  const loadBoard = useCallback(async (bid: string) => {
    const requestId = ++loadRequestRef.current
    setLoading(true)
    setError(null)
    try {
      const { data: boardData, error: boardErr } = await supabase
        .from('boards')
        .select('*')
        .eq('id', bid)
        .is('archived_at', null)
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

      if (requestId !== loadRequestRef.current) return
      setWorkspaceId(boardData.workspace_id)
      setColumns(resolvedColumns)
      setBoard(kanbanValue)
      snapshotRef.current = null
      setLoading(false)
    } catch (err) {
      if (requestId !== loadRequestRef.current) return
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
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: true })
      if (boardsError) throw boardsError
      setAllBoards((boards ?? []) as Board[])
      setShowBoardMenu(false)
      setShowNewBoardInput(false)
      setNewBoardName('')
      navigate(`/board/${bid}`, { replace: true })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create board')
    }
    setCreatingBoard(false)
  }, [newBoardName, workspaceId, navigate])

  // Collect all unique projects
  const projects = useMemo(
    () =>
      [
        ...new Set(
          Object.values(board)
            .flat()
            .map((card) => card.project),
        ),
      ].sort(),
    [board],
  )

  // Filtered cards for display
  const visibleBoard = useMemo<KanbanValue>(() => {
    const q = query.trim().toLowerCase()
    return Object.fromEntries(
      Object.entries(board).map(([colId, cards]) => [
        colId,
        cards.filter((card) => {
          if (
            q &&
            !`${card.title} ${card.project} ${descriptionToPlainText(card.description)}`
              .toLowerCase()
              .includes(q)
          )
            return false
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

  const handleValueCommit = useCallback(async (next: KanbanValue, meta: KanbanCommitMeta<Card>) => {
    const prevSnapshot = snapshotRef.current
    if (!prevSnapshot) return
    snapshotRef.current = null
    setSaving(true)

    try {
      if (meta.kind === 'column') {
        const order = Object.keys(next)
        const positions = compactPositions(order.map(() => 0))
        try {
          await Promise.all(
            order.map((columnId, index) => updateColumn(columnId, { position: positions[index] })),
          )
          setColumns((previous) =>
            order
              .map((columnId, index) => {
                const column = previous.find((candidate) => candidate.id === columnId)
                return column ? { ...column, position: positions[index] } : null
              })
              .filter((column): column is BoardColumn => column !== null),
          )
          setBoard(next)
        } catch (err) {
          setBoard(prevSnapshot)
          setActionError(err instanceof Error ? err.message : 'Failed to save column order')
        }
        return
      }

      const cardId = String(meta.event.active.id)
      const columnId = meta.overContainer
      const columnCards = next[columnId] ?? []
      const cardIndex = columnCards.findIndex((card) => card.id === cardId)
      if (cardIndex === -1) {
        setBoard(prevSnapshot)
        return
      }

      const before = columnCards[cardIndex - 1]?.position ?? null
      const after = columnCards[cardIndex + 1]?.position ?? null
      const position = calculatePosition(before, after)
      const shouldCompact = after !== null && after - position < MIN_POSITION_GAP
      const positions = shouldCompact ? compactPositions(columnCards.map(() => 0)) : []

      const updates = shouldCompact
        ? columnCards.map((card, index) =>
            updateCard(card.id, { position: positions[index], column_id: columnId }),
          )
        : [updateCard(cardId, { position, column_id: columnId })]

      try {
        await Promise.all(updates)
      } catch (err) {
        setBoard(prevSnapshot)
        setActionError(err instanceof Error ? err.message : 'Failed to save card order')
        return
      }

      const positionById = new Map<string, number>()
      if (shouldCompact) {
        columnCards.forEach((card, index) => positionById.set(card.id, positions[index]))
      } else {
        positionById.set(cardId, position)
      }
      const normalized: KanbanValue = Object.fromEntries(
        Object.entries(next).map(([id, cards]) => [
          id,
          cards.map((card) => {
            const nextPosition = positionById.get(card.id)
            return nextPosition === undefined
              ? card
              : { ...card, position: nextPosition, column_id: id }
          }),
        ]),
      )
      setBoard(normalized)
    } finally {
      setSaving(false)
    }
  }, [])

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
      const cardAlreadyOnBoard = Object.values(prev).some((cards) =>
        cards.some((card) => card.id === savedCard.id),
      )

      if (cardAlreadyOnBoard) {
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
  }, [])

  // ── Column operations ──

  const handleRenameColumn = useCallback(async (id: string, name: string) => {
    try {
      await updateColumn(id, { name })
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to rename column')
    }
  }, [])

  const handleChangeColumnColor = useCallback(async (id: string, color: string) => {
    try {
      await updateColumn(id, { color })
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update column color')
    }
  }, [])

  const handleArchiveColumn = useCallback(
    async (id: string) => {
      if ((board[id] ?? []).length > 0) {
        setActionError('Move or archive the cards in this column before archiving it.')
        return
      }
      try {
        await archiveColumn(id)
        setBoard((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
        setColumns((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to archive column')
      }
    },
    [board],
  )

  const confirmDeleteCard = useCallback(async () => {
    if (!pendingCardDelete) return
    try {
      await deleteCard(pendingCardDelete.id)
      setBoard((prev) => {
        const next: KanbanValue = {}
        for (const colId of Object.keys(prev)) {
          next[colId] = prev[colId].filter((card) => card.id !== pendingCardDelete.id)
        }
        return next
      })
      if (editingCard?.id === pendingCardDelete.id) {
        setEditorOpen(false)
        setEditingCard(null)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete task')
      throw err
    }
  }, [editingCard, pendingCardDelete])

  const deleteColumn = useCallback(
    async (id: string) => {
      const colCards = board[id] ?? []
      const otherCol = columns.find((c) => c.id !== id && !c.archived_at)
      const otherCards = otherCol ? (board[otherCol.id] ?? []) : []
      const otherLastPosition = otherCards.reduce((max, card) => Math.max(max, card.position), 0)

      if (colCards.length > 0 && !otherCol) {
        throw new Error('Cannot delete the only non-empty column. Move or archive its cards first.')
      }

      if (colCards.length > 0 && otherCol) {
        const updates = colCards.map((card, i) =>
          updateCard(card.id, {
            column_id: otherCol.id,
            position: otherLastPosition + (i + 1) * 1_000_000,
          }),
        )
        await Promise.all(updates)
      }

      await deleteColumnMutation(id)
      setBoard((prev) => {
        const next = { ...prev }
        delete next[id]
        if (otherCol && colCards.length > 0) {
          const moved = colCards.map((card, i) => ({
            ...card,
            column_id: otherCol.id,
            position: otherLastPosition + (i + 1) * 1_000_000,
          }))
          next[otherCol.id] = [...(next[otherCol.id] ?? []), ...moved]
          next[otherCol.id].sort((a, b) => a.position - b.position)
        }
        return next
      })
      setColumns((prev) => prev.filter((c) => c.id !== id))
    },
    [board, columns],
  )

  const handleDeleteColumn = useCallback(
    (id: string) => {
      const colCards = board[id] ?? []
      const otherCol = columns.find((c) => c.id !== id && !c.archived_at)
      if (colCards.length > 0 && otherCol) {
        setPendingColumnDelete(id)
        return
      }
      if (colCards.length > 0 && !otherCol) {
        setActionError('Cannot delete the only non-empty column. Move or archive its cards first.')
        return
      }
      void deleteColumn(id).catch((err) => {
        setActionError(err instanceof Error ? err.message : 'Failed to delete column')
      })
    },
    [board, columns, deleteColumn],
  )

  const confirmDeleteColumn = useCallback(async () => {
    if (!pendingColumnDelete) return
    try {
      await deleteColumn(pendingColumnDelete)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete column')
      throw err
    }
  }, [deleteColumn, pendingColumnDelete])

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
      setActionError(err instanceof Error ? err.message : 'Failed to create column')
    }
  }, [boardId, columns])

  const totalCards = useMemo(
    () => Object.values(board).reduce((sum, cards) => sum + cards.length, 0),
    [board],
  )

  const newCardPosition = useMemo(() => {
    const cards = board[editorColumnId] ?? []
    const lastPosition = cards.reduce((max, card) => Math.max(max, card.position), 0)
    return lastPosition + 1_000_000
  }, [board, editorColumnId])

  const pendingColumn = pendingColumnDelete
    ? columns.find((column) => column.id === pendingColumnDelete)
    : undefined
  const pendingColumnCardCount = pendingColumnDelete ? (board[pendingColumnDelete] ?? []).length : 0

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
          <button
            type="button"
            onClick={() => boardId && loadBoard(boardId)}
            className="rounded-lg bg-[#5c61d9] px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#202329]">
      <AppHeader />

      <main className="mx-auto max-w-[1540px] px-6 py-4 lg:px-10 lg:py-5">
        <section className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            {/* Board selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBoardMenu(!showBoardMenu)}
                className="inline-flex items-center gap-1.5 text-[22px] font-semibold tracking-[-0.04em] text-[#242932] hover:text-[#5c61d9]"
              >
                {boardName || 'Board'}
                <ChevronDown size={17} className="text-[#9aa2ad]" />
              </button>

              {showBoardMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => {
                      setShowBoardMenu(false)
                      setShowNewBoardInput(false)
                    }}
                  />
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-[#e1e4e9] bg-white py-1 shadow-lg">
                    <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9aa2ad]">
                      Boards
                    </div>
                    {allBoards.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          navigate(`/board/${b.id}`)
                          setShowBoardMenu(false)
                        }}
                        className={`flex w-full items-center px-3 py-1.5 text-left text-sm ${b.id === boardId ? 'bg-[#f0f0ff] font-medium text-[#5c61d9]' : 'text-[#515966] hover:bg-[#f5f6f8]'}`}
                      >
                        <span className="mr-2 grid size-5 place-items-center rounded bg-[#e8e9ff] text-[9px] font-bold text-[#5c61d9]">
                          b
                        </span>
                        {b.name}
                      </button>
                    ))}
                    {showNewBoardInput ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleCreateBoard()
                        }}
                        className="border-t border-[#eef0f2] px-3 py-2"
                      >
                        <input
                          autoFocus
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                          placeholder="Board name"
                          className="h-8 w-full rounded border border-[#e1e4e9] px-2 text-xs text-[#515966] outline-none focus:border-[#a6a9ed]"
                        />
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewBoardInput(false)
                              setNewBoardName('')
                            }}
                            className="rounded px-2 py-1 text-[11px] text-[#858e9d] hover:bg-[#f5f6f8]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={creatingBoard || !newBoardName.trim()}
                            className="rounded bg-[#5c61d9] px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                          >
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
            <p className="truncate text-xs text-[#858e9d]">
              {totalCards > 0
                ? `${totalCards} tasks · ${columns.length} columns`
                : 'Your tasks at a glance'}
            </p>
          </div>
        </section>

        <BoardToolbar
          query={rawQuery}
          onQueryChange={(q) => {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                if (q) next.set('q', q)
                else next.delete('q')
                return next
              },
              { replace: true },
            )
          }}
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={(project) => {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                if (project) next.set('project', project)
                else next.delete('project')
                return next
              },
              { replace: true },
            )
          }}
          hasFilters={hasFilters}
          onClearFilters={() => setSearchParams({}, { replace: true })}
          onNewTask={handleNewTask}
        />

        {actionError && (
          <div
            role="alert"
            className="mb-3 flex items-center justify-between rounded-lg border border-[#f0d4a6] bg-[#fffaf0] px-3 py-2 text-xs text-[#8f6728]"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="ml-3 font-medium hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {totalCards === 0 && !hasFilters ? <BoardEmptyState onAddTask={handleNewTask} /> : null}

        <section id="board" className="overflow-x-auto pb-4">
          <Kanban
            value={board}
            onValueChange={setBoard}
            onValueCommit={handleValueCommit}
            onDragStart={handleDragStart}
            getItemValue={(item) => item.id}
            restoreOnCancel
            disabled={hasFilters || saving}
          >
            <KanbanBoard className="flex min-w-[1120px] gap-3">
              {columns.map((column) => (
                <TaskColumn
                  key={column.id}
                  column={column}
                  cards={visibleBoard[column.id] ?? []}
                  onAddTask={() => handleAddTask(column.id)}
                  onSelectCard={handleSelectCard}
                  onArchiveCard={(card) => {
                    archiveCard(card.id)
                      .then(() => {
                        setBoard((prev) => {
                          const next: KanbanValue = {}
                          for (const colId of Object.keys(prev)) {
                            next[colId] = prev[colId].filter((c) => c.id !== card.id)
                          }
                          return next
                        })
                      })
                      .catch((err) => {
                        setActionError(
                          err instanceof Error ? err.message : 'Failed to archive card',
                        )
                      })
                  }}
                  onDeleteCard={setPendingCardDelete}
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
                    className="mt-8 flex items-center gap-2 rounded-lg border-2 border-dashed border-[#d0d4db] px-4 py-2.5 text-sm text-[#949ca8] transition hover:border-[#5c61d9] hover:text-[#5c61d9]"
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
                  return col ? (
                    <TaskColumn column={col} cards={board[col.id] ?? []} isOverlay />
                  ) : null
                }
                const allCards = Object.values(board).flat()
                const card = allCards.find((c) => c.id === String(value))
                return card ? <TaskCard card={card} isOverlay /> : null
              }}
            </KanbanOverlay>
          </Kanban>
        </section>

        <footer className="mt-5 flex items-center justify-between border-t border-[#e2e5ea] pt-3 text-[11px] text-[#a1a8b3]">
          <span>Personal workspace</span>
          <span>{saving ? 'Saving…' : actionError ? 'Changes need attention' : 'Synced'}</span>
        </footer>
      </main>

      <TaskEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        boardId={boardId ?? ''}
        columnId={editorColumnId}
        card={editingCard}
        position={newCardPosition}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={pendingColumnDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingColumnDelete(null)
        }}
        title={`Delete "${pendingColumn?.name ?? 'column'}"?`}
        description={`Move ${pendingColumnCardCount} card(s) to another column and delete this column?`}
        confirmLabel="Move and delete"
        destructive
        onConfirm={confirmDeleteColumn}
      />
      <ConfirmDialog
        open={pendingCardDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCardDelete(null)
        }}
        title={`Delete "${pendingCardDelete?.title ?? 'task'}"?`}
        description="Permanently delete this task? This cannot be undone."
        confirmLabel="Delete task"
        destructive
        onConfirm={confirmDeleteCard}
      />
    </div>
  )
}
