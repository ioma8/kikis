import { X } from 'lucide-react'
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

interface TaskCardProps {
  card: Card
  isOverlay?: boolean
  onSelect?: () => void
  onArchive?: () => void
}

export function TaskCard({ card, isOverlay = false, onSelect, onArchive }: TaskCardProps) {
  const descriptionExcerpt = getDescriptionExcerpt(card.description)
  const content = (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect?.()
      }}
      className="group/card relative cursor-pointer rounded-lg border border-[#e1e4e9] bg-white p-3.5 shadow-[0_1px_2px_rgba(25,35,50,0.03)] transition hover:border-[#cfd3db] hover:shadow-[0_5px_15px_rgba(25,35,50,0.06)]"
    >
      {!isOverlay && onArchive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
          aria-label="Archive task"
          className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded text-[#bcc2cc] opacity-0 transition hover:bg-[#f0f1f3] hover:text-[#858e9d] group-hover/card:opacity-100"
        >
          <X size={12} />
        </button>
      )}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-medium leading-5 text-[#343b46]">{card.title}</h3>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${priorityClass[card.priority]}`}
        >
          {PRIORITY_LABEL[card.priority]}
        </span>
      </div>
      <div className="mb-3 flex items-center gap-1.5 text-[11px] text-[#9199a5]">
        {card.project}
      </div>
      {descriptionExcerpt && (
        <p className="mb-3 line-clamp-2 text-[11px] leading-4 text-[#6f7886]">
          {descriptionExcerpt}
        </p>
      )}
      <div className="flex items-center justify-between border-t border-[#f0f1f3] pt-2.5 text-[11px] text-[#9aa2ad]">
        {card.due_date && <span>{card.due_date}</span>}
      </div>
    </article>
  )

  return (
    <KanbanItem value={card.id}>
      {isOverlay ? content : <KanbanItemHandle className="block">{content}</KanbanItemHandle>}
    </KanbanItem>
  )
}
