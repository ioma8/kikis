import { useState, useEffect, type FormEvent } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { addComment, fetchComments, deleteComment } from '@/lib/board-mutations'
import type { Comment } from '@/types/board'
import { useAuth } from '@/lib/auth-context'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface CommentsSectionProps {
  cardId: string
  collapsible?: boolean
}

export function CommentsSection({ cardId, collapsible = false }: CommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchComments(cardId)
      .then((data) => {
        if (!cancelled) {
          setComments(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load comments')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [cardId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    setSending(true)
    setError(null)
    try {
      const newComment = (await addComment(cardId, trimmed)) as Comment
      setComments((prev) => [...prev, { ...newComment, author_name: 'You' }])
      setContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteCommentId(id)
  }

  const confirmDelete = async () => {
    if (!deleteCommentId) return
    try {
      await deleteComment(deleteCommentId)
      setComments((prev) => prev.filter((c) => c.id !== deleteCommentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
      throw err
    }
  }

  const commentsContent = (
    <>
      {loading ? (
        <p className="text-[11px] text-[#9aa2ad]">Loading comments…</p>
      ) : error ? (
        <p role="alert" className="mb-3 text-[11px] text-[#b85c55]">
          {error}
        </p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-[11px] text-[#9aa2ad]">No comments yet.</p>
      ) : (
        <div className="mb-3 space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-[#f8f9fb] px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-[#6f7886]">
                  {comment.author_name ?? 'Unknown'}
                </span>
                {comment.author_id === user?.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    aria-label="Delete comment"
                    className="grid size-4 place-items-center rounded text-[#bcc2cc] hover:text-[#b85c55]"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 break-words text-[12px] leading-4 text-[#343b46]">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          className="h-9 min-w-0 flex-1 rounded border border-[#e1e4e9] bg-white px-2 text-[12px] text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] sm:h-7"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="h-9 rounded bg-[#5c61d9] px-3 text-[11px] font-medium text-white disabled:opacity-50 sm:h-7"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
      <ConfirmDialog
        open={deleteCommentId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCommentId(null)
        }}
        title="Delete comment?"
        description="This comment will be permanently deleted."
        confirmLabel="Delete comment"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  )

  if (collapsible) {
    return (
      <details className="group border-t border-[#eef0f2] pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#49515e] [&::-webkit-details-marker]:hidden">
          <span>Comments {comments.length > 0 && `(${comments.length})`}</span>
          <ChevronDown className="size-4 text-[#9aa2ad] transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-3">{commentsContent}</div>
      </details>
    )
  }

  return (
    <div className="mt-4 border-t border-[#eef0f2] pt-4">
      <h3 className="mb-3 text-xs font-semibold text-[#49515e]">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>
      {commentsContent}
    </div>
  )
}
