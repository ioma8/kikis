import { Plus, GripVertical } from 'lucide-react'
import { KanbanColumn, KanbanColumnContent, KanbanColumnHandle } from '@/components/reui/kanban'
import { TaskCard } from './task-card'
import { ColumnMenu } from './column-menu'
import type { BoardColumn, Card } from '@/types/board'

interface TaskColumnProps {
  column: BoardColumn
  cards: Card[]
  isOverlay?: boolean
  onAddTask?: () => void
  onSelectCard?: (card: Card) => void
  onArchiveCard?: (card: Card) => void
  onDeleteCard?: (card: Card) => void
  onRenameColumn?: (id: string, name: string) => void
  onChangeColumnColor?: (id: string, color: string) => void
  onArchiveColumn?: (id: string) => void
  onDeleteColumn?: (id: string) => void
}

export function TaskColumn({
  column,
  cards,
  isOverlay = false,
  onAddTask,
  onSelectCard,
  onArchiveCard,
  onDeleteCard,
  onRenameColumn,
  onChangeColumnColor,
  onArchiveColumn,
  onDeleteColumn,
}: TaskColumnProps) {
  return (
    <KanbanColumn
      value={column.id}
      className="flex min-w-[270px] flex-col rounded-xl border border-[#e1e4e9] bg-[#eef0f3]/70 p-2.5"
    >
      <div className="mb-2.5 flex min-w-0 items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
          <h2 className="min-w-0 truncate text-[13px] font-semibold text-[#4a5260]">
            {column.name}
          </h2>
          <span className="rounded bg-[#e1e5ea] px-1.5 py-0.5 text-[10px] font-semibold text-[#89919d]">
            {cards.length}
          </span>
        </div>
        {!isOverlay && (
          <div className="flex items-center gap-1">
            <KanbanColumnHandle
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label={`Move ${column.name} column`}
                  className="grid size-8 place-items-center rounded-md text-[#9aa2ad] hover:bg-white hover:text-[#5c61d9] sm:size-6"
                >
                  <GripVertical size={14} />
                </button>
              )}
            />
            <ColumnMenu
              columnName={column.name}
              onRename={(name) => onRenameColumn?.(column.id, name)}
              onChangeColor={(color) => onChangeColumnColor?.(column.id, color)}
              onArchive={() => onArchiveColumn?.(column.id)}
              onDelete={() => onDeleteColumn?.(column.id)}
            />
          </div>
        )}
      </div>
      <KanbanColumnContent value={column.id} className="min-h-[160px] flex-1">
        {cards.map((card) => (
          <TaskCard
            key={card.id}
            card={card}
            isOverlay={isOverlay}
            onSelect={() => onSelectCard?.(card)}
            onArchive={() => onArchiveCard?.(card)}
            onDelete={() => onDeleteCard?.(card)}
          />
        ))}
        {!isOverlay && (
          <button
            type="button"
            onClick={onAddTask}
            className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#737d8b] transition hover:bg-white hover:text-[#5c61d9] focus:bg-white focus:text-[#5c61d9] sm:min-h-0 sm:py-1.5"
          >
            <Plus size={14} /> Add a task
          </button>
        )}
      </KanbanColumnContent>
    </KanbanColumn>
  )
}
