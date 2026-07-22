import { useState, useEffect, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { validateCardTitle, validateDescription, validateDueDate } from '@/lib/board-validation'
import { createCard, updateCard } from '@/lib/board-mutations'
import { CommentsSection } from './comments-section'
import type { Card, Priority } from '@/types/board'
import type { PriorityDb } from '@/types/database'

interface TaskEditorProps {
  open: boolean
  onClose: () => void
  boardId: string | undefined
  columnId: string | undefined
  card: Card | null // null = creating new
  onSaved: (card: Card) => void
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function TaskEditor({ open, onClose, boardId, columnId, card, onSaved }: TaskEditorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [project, setProject] = useState('General')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isEditing = !!card

  useEffect(() => {
    if (open && card) {
      setTitle(card.title)
      setDescription(card.description)
      setPriority(card.priority)
      setProject(card.project)
      setDueDate(card.due_date ?? '')
      setError(null)
      setFieldErrors({})
    } else if (open) {
      setTitle('')
      setDescription('')
      setPriority('medium')
      setProject('General')
      setDueDate('')
      setError(null)
      setFieldErrors({})
    }
  }, [open, card])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    // Validate
    const errs: Record<string, string> = {}
    const titleErr = validateCardTitle(title)
    if (titleErr) errs[titleErr.field] = titleErr.message
    const descErr = validateDescription(description)
    if (descErr) errs[descErr.field] = descErr.message
    const dueErr = validateDueDate(dueDate || null)
    if (dueErr) errs[dueErr.field] = dueErr.message

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setSaving(true)
    try {
      if (isEditing && card) {
        const updated = await updateCard(card.id, {
          title: title.trim(),
          description,
          priority: priority as PriorityDb,
          project,
          due_date: dueDate || null,
        })
        onSaved(updated as Card)
      } else if (boardId && columnId) {
        const newCard = await createCard({
          id: crypto.randomUUID(),
          board_id: boardId,
          column_id: columnId,
          title: title.trim(),
          description,
          project,
          priority: priority as PriorityDb,
          assignee_id: null,
          due_date: dueDate || null,
          position: 1_000_000,
          archived_at: null,
          created_by: null,
        })
        onSaved(newCard as Card)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit task' : 'New task'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-[#e1e4e9] bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#242932]">
            {isEditing ? 'Edit task' : 'New task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-md text-[#9aa2ad] hover:bg-[#f5f6f8] hover:text-[#5c61d9]"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-[#49515e] mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
              placeholder="What needs to be done?"
            />
            {fieldErrors.title && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.title}</p>}
          </div>

          <div>
            <label htmlFor="task-desc" className="block text-xs font-medium text-[#49515e] mb-1">
              Description
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 py-2 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
              placeholder="Optional details…"
            />
            {fieldErrors.description && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="block text-xs font-medium text-[#49515e] mb-1">
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-2 text-sm text-[#515966] outline-none focus:border-[#a6a9ed]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-project" className="block text-xs font-medium text-[#49515e] mb-1">
                Project
              </label>
              <input
                id="task-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-due" className="block text-xs font-medium text-[#49515e] mb-1">
              Due date
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
            />
            {fieldErrors.dueDate && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.dueDate}</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#e1e4e9] px-3.5 py-1.5 text-xs font-medium text-[#555e6c] hover:bg-[#f5f6f8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5c61d9] px-3.5 py-1.5 text-xs font-medium text-white shadow-[0_3px_8px_rgba(92,97,217,0.2)] transition hover:bg-[#5055cf] disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
        {isEditing && card && <CommentsSection cardId={card.id} />}
      </div>
    </div>
  )
}
