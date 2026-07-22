import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BoardFilters, Card } from '@/types/board'
import { descriptionToPlainText } from '@/lib/description'
import { useDebouncedValue } from './use-debounced-value'

function parseFilters(params: URLSearchParams): BoardFilters {
  const priorityParam = params.get('priority')
  const priority =
    priorityParam === 'low' || priorityParam === 'medium' || priorityParam === 'high'
      ? priorityParam
      : null
  return {
    query: params.get('q') ?? '',
    project: params.get('project'),
    priority,
    assigneeId: params.get('assignee') ?? null,
  }
}

export function useBoardFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilters = parseFilters(searchParams)

  const debouncedQuery = useDebouncedValue(rawFilters.query, 150)
  const filters = useMemo<BoardFilters>(
    () => ({
      ...rawFilters,
      query: debouncedQuery,
    }),
    [rawFilters, debouncedQuery],
  )

  const setFilter = useCallback(
    (key: keyof BoardFilters, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === null || value === '') {
            next.delete(key === 'query' ? 'q' : key === 'assigneeId' ? 'assignee' : key)
          } else {
            next.set(key === 'query' ? 'q' : key === 'assigneeId' ? 'assignee' : key, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const hasFilters =
    rawFilters.query !== '' ||
    rawFilters.project !== null ||
    rawFilters.priority !== null ||
    rawFilters.assigneeId !== null

  const filterCards = useCallback(
    (cards: Card[]): Card[] => {
      const q = debouncedQuery.trim().toLowerCase()
      return cards.filter((card) => {
        if (
          q &&
          !`${card.title} ${card.project} ${descriptionToPlainText(card.description)}`
            .toLowerCase()
            .includes(q)
        ) {
          return false
        }
        if (filters.project && card.project !== filters.project) return false
        if (filters.priority && card.priority !== filters.priority) return false
        if (filters.assigneeId && card.assignee_id !== filters.assigneeId) return false
        return true
      })
    },
    [debouncedQuery, filters],
  )

  return {
    filters,
    rawFilters,
    setFilter,
    clearFilters,
    hasFilters,
    filterCards,
  }
}
