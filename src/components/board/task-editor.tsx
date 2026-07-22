import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { validateCardTitle, validateDescription, validateDueDate } from '@/lib/board-validation'
import { createCard, updateCard } from '@/lib/board-mutations'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogScrollArea,
  DialogTitle,
} from '@/components/ui/dialog'
import { descriptionToEditorHtml } from '@/lib/description'
import { CommentsSection } from './comments-section'
import type { Card, Priority } from '@/types/board'
import type { PriorityDb } from '@/types/database'

const RichTextEditor = lazy(() =>
  import('./rich-text-editor').then(({ RichTextEditor: Editor }) => ({ default: Editor })),
)

interface TaskEditorProps {
  open: boolean
  onClose: () => void
  boardId: string | undefined
  columnId: string | undefined
  card: Card | null // null = creating new
  position: number
  onSaved: (card: Card) => void
}

type Draft = {
  title: string
  description: string
  priority: Priority
  project: string
  dueDate: string
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const EMPTY_DRAFT: Draft = {
  title: '',
  description: '',
  priority: 'medium',
  project: 'General',
  dueDate: '',
}

function getValidationErrors(draft: Draft) {
  const errors: Record<string, string> = {}
  const titleError = validateCardTitle(draft.title)
  const descriptionError = validateDescription(draft.description)
  const dueDateError = validateDueDate(draft.dueDate || null)
  if (titleError) errors[titleError.field] = titleError.message
  if (descriptionError) errors[descriptionError.field] = descriptionError.message
  if (dueDateError) errors[dueDateError.field] = dueDateError.message
  return errors
}

export function TaskEditor({
  open,
  onClose,
  boardId,
  columnId,
  card,
  position,
  onSaved,
}: TaskEditorProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [project, setProject] = useState('General')
  const [dueDate, setDueDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)

  const draftRef = useRef<Draft>(EMPTY_DRAFT)
  const cardIdRef = useRef<string | null>(null)
  const sessionRef = useRef(0)
  const dirtyVersionRef = useRef(0)
  const savedVersionRef = useRef(0)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savePromiseRef = useRef<Promise<void> | null>(null)
  const queuedSaveRef = useRef(false)

  const isEditing = card !== null

  draftRef.current = { title, description, priority, project, dueDate }

  useEffect(() => {
    if (!open) return

    const nextDraft: Draft = card
      ? {
          title: card.title,
          description: descriptionToEditorHtml(card.description),
          priority: card.priority,
          project: card.project,
          dueDate: card.due_date ?? '',
        }
      : EMPTY_DRAFT

    sessionRef.current += 1
    cardIdRef.current = card?.id ?? null
    dirtyVersionRef.current = 0
    savedVersionRef.current = 0
    queuedSaveRef.current = false
    setTitle(nextDraft.title)
    setDescription(nextDraft.description)
    setPriority(nextDraft.priority)
    setProject(nextDraft.project)
    setDueDate(nextDraft.dueDate)
    setFieldErrors({})
    setSaveError(null)
    setSaveState('saved')
  }, [open, card])

  const markDirty = useCallback(() => {
    dirtyVersionRef.current += 1
    setSaveError(null)
    setSaveState((current) => (current === 'saving' ? current : 'dirty'))
  }, [])

  const saveDraft = useCallback(async () => {
    if (savePromiseRef.current) {
      queuedSaveRef.current = true
      return savePromiseRef.current
    }

    const draft = draftRef.current
    const validationErrors = getValidationErrors(draft)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setSaveState('error')
      return
    }

    const existingCardId = cardIdRef.current
    if (!existingCardId && (!boardId || !columnId)) return

    const version = dirtyVersionRef.current
    const session = sessionRef.current
    setFieldErrors({})
    setSaveError(null)
    setSaveState('saving')

    const operation = (async () => {
      try {
        const updates = {
          title: draft.title.trim(),
          description: draft.description,
          priority: draft.priority as PriorityDb,
          project: draft.project.trim() || 'General',
          due_date: draft.dueDate || null,
        }

        const savedCard = existingCardId
          ? await updateCard(existingCardId, updates)
          : await createCard({
              id: crypto.randomUUID(),
              board_id: boardId as string,
              column_id: columnId as string,
              ...updates,
              assignee_id: null,
              position,
              archived_at: null,
              created_by: user?.id ?? null,
            })

        if (!existingCardId && session === sessionRef.current) {
          cardIdRef.current = savedCard.id
        }
        onSaved(savedCard as Card)

        if (session === sessionRef.current) {
          if (dirtyVersionRef.current === version) {
            savedVersionRef.current = version
            setSaveState('saved')
          } else {
            setSaveState('dirty')
          }
        }
      } catch (err) {
        if (session === sessionRef.current) {
          setSaveError(err instanceof Error ? err.message : 'Failed to save changes')
          setSaveState('error')
        }
      } finally {
        savePromiseRef.current = null
        const shouldSaveAgain =
          queuedSaveRef.current ||
          (session === sessionRef.current && dirtyVersionRef.current !== version)
        queuedSaveRef.current = false
        if (shouldSaveAgain) void saveDraft()
      }
    })()

    savePromiseRef.current = operation
    return operation
  }, [boardId, columnId, onSaved, position, user?.id])

  useEffect(() => {
    if (!open || dirtyVersionRef.current <= savedVersionRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => void saveDraft(), 500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [description, dueDate, open, priority, project, saveDraft, title])

  const handleClose = useCallback(() => {
    if (dirtyVersionRef.current > savedVersionRef.current) void saveDraft()
    onClose()
  }, [onClose, saveDraft])

  const statusLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'dirty'
        ? 'Unsaved changes'
        : saveState === 'error'
          ? 'Needs attention'
          : 'Saved'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] p-0">
        <DialogScrollArea>
          <div className="flex flex-col gap-5 p-6">
            <DialogHeader className="flex-row items-start justify-between gap-4">
              <div>
                <DialogTitle>{isEditing ? 'Edit task' : 'New task'}</DialogTitle>
                <DialogDescription className="sr-only">
                  {isEditing ? 'Edit the selected task.' : 'Create a new task.'}
                </DialogDescription>
                <p
                  className={`mt-1 text-[11px] ${saveState === 'error' ? 'text-[#b85c55]' : 'text-[#9aa2ad]'}`}
                  role={saveState === 'error' ? 'alert' : undefined}
                >
                  {saveError ?? statusLabel}
                </p>
              </div>
              <DialogClose
                type="button"
                aria-label="Close"
                className="grid size-7 shrink-0 place-items-center rounded-md text-[#9aa2ad] hover:bg-[#f5f6f8] hover:text-[#5c61d9]"
              >
                <X size={15} />
              </DialogClose>
            </DialogHeader>

            <div>
              <label htmlFor="task-title" className="mb-1 block text-xs font-medium text-[#49515e]">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="task-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  markDirty()
                }}
                className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
                placeholder="What needs to be done?"
              />
              {fieldErrors.title && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <label htmlFor="task-desc" className="mb-1 block text-xs font-medium text-[#49515e]">
                Description
              </label>
              <Suspense
                fallback={
                  <div className="min-h-28 rounded-md border border-[#e7e9ed] bg-[#fbfcfd] p-3 text-xs text-[#9aa2ad]">
                    Loading editor…
                  </div>
                }
              >
                <RichTextEditor
                  id="task-desc"
                  value={description}
                  onChange={(value) => {
                    setDescription(value)
                    markDirty()
                  }}
                />
              </Suspense>
              {fieldErrors.description && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="task-priority"
                  className="mb-1 block text-xs font-medium text-[#49515e]"
                >
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(event) => {
                    setPriority(event.target.value as Priority)
                    markDirty()
                  }}
                  className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-2 text-sm text-[#515966] outline-none focus:border-[#a6a9ed]"
                >
                  {PRIORITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="task-project"
                  className="mb-1 block text-xs font-medium text-[#49515e]"
                >
                  Project
                </label>
                <input
                  id="task-project"
                  value={project}
                  onChange={(event) => {
                    setProject(event.target.value)
                    markDirty()
                  }}
                  className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="task-due" className="mb-1 block text-xs font-medium text-[#49515e]">
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => {
                  setDueDate(event.target.value)
                  markDirty()
                }}
                className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-3 text-sm text-[#515966] outline-none focus:border-[#a6a9ed]"
              />
              {fieldErrors.dueDate && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.dueDate}</p>
              )}
            </div>

            {isEditing && card && <CommentsSection cardId={card.id} />}
          </div>
        </DialogScrollArea>
      </DialogContent>
    </Dialog>
  )
}
