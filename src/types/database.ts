import type { Card, BoardColumn, Board, Priority, Comment } from './board'
export type { Card, BoardColumn, Board, Priority, Comment }

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export type Workspace = {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export type WorkspaceMember = {
  workspace_id: string
  user_id: string
  role: 'owner' | 'member'
}

export type Label = {
  id: string
  board_id: string
  name: string
  color: string
  created_at: string
}

export type CardLabel = {
  card_id: string
  label_id: string
}

export type BoardQueryResult = {
  board: Board
  columns: BoardColumn[]
  cards: Card[]
  labels: Label[]
  members: Profile[]
}

export type PriorityDb = Exclude<Priority, never>

export type CardInsert = Omit<Card, 'created_at' | 'updated_at'>
export type CardUpdate = Partial<Omit<Card, 'id' | 'created_at' | 'updated_at'>>
export type ColumnInsert = Omit<BoardColumn, 'created_at' | 'updated_at'>
export type ColumnUpdate = Partial<Omit<BoardColumn, 'id' | 'created_at' | 'updated_at'>>

export type CommentInsert = Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'author_name'>
export type CommentUpdate = Partial<Pick<Comment, 'content'>>
