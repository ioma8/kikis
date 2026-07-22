import {
  Archive,
  CalendarDays,
  FolderKanban,
  Image as ImageIcon,
  ListChecks,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { KanbanItem, KanbanItemHandle } from '@/components/reui/kanban'
import type { Card } from '@/types/board'
import { getDescriptionExcerpt } from '@/lib/description'

const priorityClass: Record<string, string> = {
  high: 'border-[#f2c6c2] bg-[#fff5f4] text-[#b85c55]',
  medium: 'border-[#f0d4a6] bg-[#fffaf0] text-[#a6752e]',
  low: 'border-[#c8decf] bg-[#f2fbf5] text-[#4c8b65]',
}

const PRIORITY_LABEL: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function formatDueDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

interface TaskCardProps {
  card: Card
  isOverlay?: boolean
  onSelect?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

export function TaskCard({
  card,
  isOverlay = false,
  onSelect,
  onArchive,
  onDelete,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const descriptionExcerpt = getDescriptionExcerpt(card.description)
  const checklistItems = [
    ...card.description.matchAll(/<li\b[^>]*data-checked=["'](true|false)["']/gi),
  ]
  const checklistTotal = checklistItems.length
  const checklistCompleted = checklistItems.filter((match) => match[1] === 'true').length
  const hasImage = /<img\b/i.test(card.description)
  const content = (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
      aria-label={`Open task ${card.title}`}
      className="group/card relative cursor-pointer rounded-lg border border-[#e1e4e9] bg-white p-3 shadow-[0_1px_2px_rgba(25,35,50,0.03)] transition hover:border-[#cfd3db] hover:shadow-[0_5px_15px_rgba(25,35,50,0.06)] focus-visible:border-[#a6a9ed] focus-visible:ring-2 focus-visible:ring-[#eeeeff]"
    >
      {!isOverlay && (onArchive || onDelete) && (
        <div className="absolute right-1.5 top-1.5 z-10">
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen((open) => !open)
            }}
            aria-label="Task menu"
            aria-expanded={menuOpen}
            className="grid size-8 place-items-center rounded-md text-[#bcc2cc] opacity-100 transition focus-within:opacity-100 hover:bg-[#f0f1f3] hover:text-[#858e9d] sm:size-6 sm:opacity-0 sm:group-hover/card:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                }}
              />
              <div
                className="absolute right-0 top-7 z-50 w-36 rounded-lg border border-[#e1e4e9] bg-white py-1 shadow-lg"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {onArchive && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onArchive()
                      setMenuOpen(false)
                    }}
                    className="flex min-h-9 w-full items-center gap-2 px-3 py-1.5 text-xs text-[#515966] hover:bg-[#f5f6f8] sm:min-h-0"
                  >
                    <Archive size={13} /> Archive
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete()
                      setMenuOpen(false)
                    }}
                    className="flex min-h-9 w-full items-center gap-2 px-3 py-1.5 text-xs text-[#b85c55] hover:bg-[#fff5f4] sm:min-h-0"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <div className="mb-2.5 flex items-start justify-between gap-2 pr-7">
        <h3 className="min-w-0 flex-1 break-words text-[13px] font-medium leading-5 text-[#343b46]">
          {card.title}
        </h3>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${priorityClass[card.priority]}`}
        >
          {PRIORITY_LABEL[card.priority]}
        </span>
      </div>
      {descriptionExcerpt && (
        <p className="line-clamp-2 text-xs leading-4.5 text-[#626c7b]">{descriptionExcerpt}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#f0f1f3] pt-2.5 text-[11px] text-[#737d8b]">
        <span
          className="inline-flex min-w-0 max-w-[65%] items-center gap-1 truncate"
          title={card.project}
        >
          <FolderKanban size={12} className="shrink-0 text-[#9aa2ad]" />
          <span className="truncate">{card.project}</span>
        </span>
        {card.due_date && (
          <span className="inline-flex items-center gap-1" title={`Due ${card.due_date}`}>
            <CalendarDays size={12} className="shrink-0 text-[#9aa2ad]" />
            {formatDueDate(card.due_date)}
          </span>
        )}
        {checklistTotal > 0 && (
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${checklistCompleted} of ${checklistTotal} checklist items complete`}
            title={`${checklistCompleted} of ${checklistTotal} checklist items complete`}
          >
            <ListChecks size={12} className="shrink-0 text-[#9aa2ad]" />
            {checklistCompleted}/{checklistTotal}
          </span>
        )}
        {hasImage && (
          <span className="inline-flex items-center gap-1" title="Contains image">
            <ImageIcon size={12} className="shrink-0 text-[#9aa2ad]" />
            <span className="sr-only">Contains image</span>
          </span>
        )}
      </div>
    </article>
  )

  return (
    <KanbanItem value={card.id}>
      {isOverlay ? content : <KanbanItemHandle className="block">{content}</KanbanItemHandle>}
    </KanbanItem>
  )
}
