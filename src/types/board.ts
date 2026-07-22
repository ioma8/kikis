export type Priority = 'low' | 'medium' | 'high'

export type Card = {
  id: string
  board_id: string
  column_id: string
  title: string
  description: string
  project: string
  priority: Priority
  assignee_id: string | null
  due_date: string | null
  position: number
  archived_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type BoardColumn = {
  id: string
  board_id: string
  name: string
  position: number
  color: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type Board = {
  id: string
  workspace_id: string
  name: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type BoardFilters = {
  query: string
  project: string | null
  priority: Priority | null
  assigneeId: string | null
}

export type BoardSnapshot = {
  columns: BoardColumn[]
  cards: Record<string, Card[]>
}

/** ReUI Kanban shape: columnId → items */
export type KanbanValue = Record<string, Card[]>

export type Comment = {
  id: string
  card_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  author_name?: string  // populated from join
}
