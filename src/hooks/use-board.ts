import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { updateCard, compactPositions } from '@/lib/board-mutations'
import type { BoardColumn, Board, KanbanValue, BoardSnapshot } from '@/types/board'
import type { BoardQueryResult } from '@/types/database'

type UseBoardState = {
  loading: boolean
  error: string | null
  board: Board | null
  columns: BoardColumn[]
  cards: KanbanValue
  kanbanValue: KanbanValue
}

type UseBoardActions = {
  /** Called by ReUI Kanban immediately on drag-move — optimistically updates local state */
  onValueChange: (next: KanbanValue) => void
  /** Called by ReUI Kanban when a drag commits — persists to Supabase */
  onValueCommit: (next: KanbanValue) => void
  /** Called when persistence fails — restores the snapshot */
  onPersistenceError: () => void
  /** Snapshot the current state (call before drag starts) */
  snapshot: () => void
  /** Retry loading the board */
  retry: () => void
}

const EMPTY_CARDS: KanbanValue = {}

function normalizeBoardQuery(data: BoardQueryResult): {
  board: Board
  columns: BoardColumn[]
  cards: KanbanValue
} {
  const cards: KanbanValue = {}
  for (const card of data.cards) {
    if (card.archived_at) continue
    if (!cards[card.column_id]) cards[card.column_id] = []
    cards[card.column_id].push(card)
  }
  // Sort cards by position within each column
  for (const colId of Object.keys(cards)) {
    cards[colId].sort((a, b) => a.position - b.position)
  }

  const columns = data.columns.filter((c) => !c.archived_at).sort((a, b) => a.position - b.position)

  const board: Board = data.board

  return { board, columns, cards }
}

export function useBoard(boardId?: string): [UseBoardState, UseBoardActions] {
  const [state, setState] = useState<UseBoardState>({
    loading: !!boardId,
    error: null,
    board: null,
    columns: [],
    cards: EMPTY_CARDS,
    kanbanValue: EMPTY_CARDS,
  })
  const snapshotRef = useRef<BoardSnapshot | null>(null)
  const loadRequestRef = useRef(0)

  const loadBoard = useCallback(async (id: string) => {
    const requestId = ++loadRequestRef.current
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', id)
        .single()
      if (boardError) throw boardError

      const { data: columns, error: colError } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', id)
        .is('archived_at', null)
        .order('position', { ascending: true })
      if (colError) throw colError

      const { data: cards, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .eq('board_id', id)
        .is('archived_at', null)
        .order('position', { ascending: true })
      if (cardError) throw cardError

      const {
        board: b,
        columns: cols,
        cards: cardMap,
      } = normalizeBoardQuery({
        board,
        columns: columns ?? [],
        cards: cards ?? [],
        labels: [],
        members: [],
      })

      const kanbanValue: KanbanValue = {}
      for (const col of cols) {
        kanbanValue[col.id] = cardMap[col.id] ?? []
      }

      if (requestId !== loadRequestRef.current) return
      setState({
        loading: false,
        error: null,
        board: b,
        columns: cols,
        cards: cardMap,
        kanbanValue,
      })
    } catch (err) {
      if (requestId !== loadRequestRef.current) return
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load board',
      }))
    }
  }, [])

  useEffect(() => {
    if (boardId) {
      loadBoard(boardId)
    }
  }, [boardId, loadBoard])

  const snapshot = useCallback(() => {
    snapshotRef.current = {
      columns: state.columns,
      cards: state.cards,
    }
  }, [state.columns, state.cards])

  const onValueChange = useCallback((next: KanbanValue) => {
    setState((prev) => ({ ...prev, kanbanValue: next }))
  }, [])

  const onValueCommit = useCallback(async (next: KanbanValue) => {
    const prev = snapshotRef.current
    if (!prev) return
    const hasChanged =
      Object.keys(prev.cards).some((columnId) => {
        const before = prev.cards[columnId] ?? []
        const after = next[columnId] ?? []
        return (
          before.length !== after.length ||
          before.some((card, index) => card.id !== after[index]?.id)
        )
      }) || Object.keys(next).some((columnId) => !(columnId in prev.cards))
    if (!hasChanged) return

    const updates: Promise<unknown>[] = []
    const positionsById = new Map<string, number>()
    for (const [columnId, cards] of Object.entries(next)) {
      const positions = compactPositions(cards.map(() => 0))
      for (let index = 0; index < cards.length; index++) {
        const card = cards[index]
        positionsById.set(card.id, positions[index])
        updates.push(updateCard(card.id, { position: positions[index], column_id: columnId }))
      }
    }

    try {
      await Promise.all(updates)
      const normalized: KanbanValue = Object.fromEntries(
        Object.entries(next).map(([columnId, cards]) => [
          columnId,
          cards.map((card) => ({
            ...card,
            column_id: columnId,
            position: positionsById.get(card.id) ?? card.position,
          })),
        ]),
      )
      setState((current) => ({
        ...current,
        cards: normalized,
        kanbanValue: normalized,
      }))
    } catch (err) {
      console.error('Failed to persist card move:', err)
      throw err
    }
  }, [])

  const onPersistenceError = useCallback(() => {
    // Restore the snapshot
    const snap = snapshotRef.current
    if (snap) {
      setState((prev) => ({
        ...prev,
        cards: snap.cards,
        kanbanValue: snap.cards,
      }))
    }
  }, [])

  const retry = useCallback(() => {
    if (boardId) loadBoard(boardId)
  }, [boardId, loadBoard])

  const actions: UseBoardActions = useMemo(
    () => ({
      onValueChange,
      onValueCommit,
      onPersistenceError,
      snapshot,
      retry,
    }),
    [onValueChange, onValueCommit, onPersistenceError, snapshot, retry],
  )

  return [state, actions]
}
