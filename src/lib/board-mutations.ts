import { supabase } from './supabase'
import type { Card, CardInsert, CardUpdate, ColumnInsert, ColumnUpdate, Comment } from '@/types/database'

// ── Card mutations ──

export async function createCard(card: CardInsert): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .insert(card)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCard(id: string, updates: CardUpdate): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function archiveCard(id: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function restoreCard(id: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ archived_at: null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Column mutations ──

export async function createColumn(column: ColumnInsert): Promise<void> {
  const { error } = await supabase
    .from('columns')
    .insert(column)
  if (error) throw error
}

export async function updateColumn(id: string, updates: ColumnUpdate): Promise<void> {
  const { error } = await supabase
    .from('columns')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function archiveColumn(id: string): Promise<void> {
  const { error } = await supabase
    .from('columns')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteColumn(id: string): Promise<void> {
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Position helpers ──

/**
 * Calculate the position between two neighboring positions.
 * Falls back to neighbor-based or list-end placement.
 */
export function calculatePosition(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1_000_000
  if (before === null) return Math.floor((after ?? 0) / 2)
  if (after === null) return Math.floor(before + 1_000_000)
  return Math.floor((before + after) / 2)
}

/**
 * Compact positions for a set of items with a regular spacing.
 */
export function compactPositions(positions: number[]): number[] {
  return positions.map((_, i) => (i + 1) * 1_000_000)
}

/** The minimum gap before compaction is triggered */
export const MIN_POSITION_GAP = 0.000_001

// ── Board mutations ──

const DEFAULT_COLUMNS = [
  { name: 'Inbox', color: '#8b95a7' },
  { name: 'In progress', color: '#ed9f55' },
  { name: 'Review', color: '#8b83dc' },
  { name: 'Done', color: '#68af87' },
]

export async function createBoard(workspaceId: string, name: string, withDefaults = true): Promise<string> {
  const { data: board, error: boardErr } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name })
    .select('id')
    .single()
  if (boardErr) throw boardErr

  if (withDefaults) {
    const columns = DEFAULT_COLUMNS.map((col, i) => ({
      board_id: board.id,
      name: col.name,
      position: (i + 1) * 1_000_000,
      color: col.color,
    }))
    const { error: colErr } = await supabase.from('columns').insert(columns)
    if (colErr) throw colErr
  }

  return board.id
}

export async function fetchWorkspaceId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1)
  if (error) throw error
  return data?.[0]?.id ?? null
}

// ── Comment mutations ──

export async function addComment(cardId: string, content: string): Promise<Comment> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single()
  if (!profile) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('comments')
    .insert({ card_id: cardId, author_id: profile.id, content: content.trim() })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function fetchComments(cardId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles!comments_author_id_fkey(display_name)')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((c: Record<string, unknown>) => ({
    ...c as Omit<Comment, 'author_name'>,
    author_name: (c.profiles as Record<string, unknown>)?.['display_name'] as string ?? 'Unknown',
  }))
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
