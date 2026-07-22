import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { updateCard, calculatePosition, MIN_POSITION_GAP, compactPositions } from '@/lib/board-mutations'
import type { Card, BoardColumn, Board, KanbanValue, BoardSnapshot } from '@/types/board'
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

  const columns = data.columns
    .filter((c) => !c.archived_at)
    .sort((a, b) => a.position - b.position)

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

  const loadBoard = useCallback(async (id: string) => {
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

      const { board: b, columns: cols, cards: cardMap } = normalizeBoardQuery({
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

      setState({ loading: false, error: null, board: b, columns: cols, cards: cardMap, kanbanValue })
    } catch (err) {
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

  const onValueCommit = useCallback(
    async (next: KanbanValue) => {
      const prev = snapshotRef.current
      if (!prev) return
      const movedCardIds: string[] = []
      for (const colId of Object.keys(next)) {
        const cards = next[colId]
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i]
          const prevCard = Object.values(prev.cards).flat().find((c) => c.id === card.id)
          if (!prevCard) {
            movedCardIds.push(card.id)
          } else if (prevCard.column_id !== card.column_id || prevCard.position !== card.position) {
            movedCardIds.push(card.id)
          }
        }
      }

      const columnCards = new Map<string, Card[]>()
      for (const colId of Object.keys(next)) {
        columnCards.set(colId, next[colId])
      }

      const updates: Promise<unknown>[] = []
      for (const cardId of movedCardIds) {
        let movedCard: Card | undefined
        let newColId = ''
        let newIndex = -1
        for (const [colId, cards] of columnCards.entries()) {
          const idx = cards.findIndex((c) => c.id === cardId)
          if (idx >= 0) {
            movedCard = cards[idx]
            newColId = colId
            newIndex = idx
            break
          }
        }
        if (!movedCard) continue

        const columnCardsArray = columnCards.get(newColId) ?? []
        const before = columnCardsArray[newIndex - 1]?.position ?? null
        const after = columnCardsArray[newIndex + 1]?.position ?? null

        const position = calculatePosition(before, after)
        const gap = after !== null ? after - position : MIN_POSITION_GAP

        if (gap < MIN_POSITION_GAP) {
          const positions = compactPositions(columnCardsArray.map(() => 0))
          for (let i = 0; i < columnCardsArray.length; i++) {
            const c = columnCardsArray[i]
            updates.push(updateCard(c.id, { position: positions[i], column_id: c.column_id }))
          }
        } else {
          updates.push(updateCard(movedCard.id, { position, column_id: newColId }))
        }
      }

      if (updates.length > 0) {
        try {
          await Promise.all(updates)
          setState((prev) => ({
            ...prev,
            cards: next,
            kanbanValue: next,
          }))
        } catch (err) {
          console.error('Failed to persist card move:', err)
          throw err
        }
      }
    },
    [],
  )

  const onPersistenceError = useCallback(() => {
    // Restore the snapshot
    const snap = snapshotRef.current
    if (snap) {
      setState((prev) => ({
        ...prev,
        kanbanValue: prev.cards,
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
