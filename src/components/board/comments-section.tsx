import { useState, useEffect, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { addComment, fetchComments, deleteComment } from '@/lib/board-mutations'
import type { Comment } from '@/types/board'

interface CommentsSectionProps {
  cardId: string
}

export function CommentsSection({ cardId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchComments(cardId).then((data) => {
      if (!cancelled) {
        setComments(data)
        setLoading(false)
      }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    setSending(true)
    try {
      const newComment = await addComment(cardId, trimmed) as Comment
      setComments((prev) => [...prev, { ...newComment, author_name: 'You' }])
      setContent('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
    setSending(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await deleteComment(id)
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  return (
    <div className="border-t border-[#eef0f2] pt-4 mt-4">
      <h3 className="mb-3 text-xs font-semibold text-[#49515e]">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {loading ? (
        <p className="text-[11px] text-[#9aa2ad]">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mb-3 text-[11px] text-[#9aa2ad]">No comments yet.</p>
      ) : (
        <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-[#f8f9fb] px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-[#6f7886]">
                  {comment.author_name ?? 'Unknown'}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  aria-label="Delete comment"
                  className="grid size-4 place-items-center rounded text-[#bcc2cc] hover:text-[#b85c55]"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <p className="mt-0.5 text-[12px] leading-4 text-[#343b46]">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          className="h-7 flex-1 rounded border border-[#e1e4e9] bg-white px-2 text-[12px] text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed]"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="rounded bg-[#5c61d9] px-2.5 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
