import { useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListChecks, ListOrdered, Strikethrough, Underline } from 'lucide-react'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { descriptionToEditorHtml, sanitizeDescriptionHtml } from '@/lib/description'

interface RichTextEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

interface ToolbarButtonProps {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarButton({ label, active = false, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`grid size-7 place-items-center rounded text-[#6f7886] transition hover:bg-[#f0f1f3] hover:text-[#5c61d9] ${active ? 'bg-[#eeeeff] text-[#5c61d9]' : ''}`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ id, value, onChange, disabled = false }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ link: false }),
      TaskList,
      TaskItem.configure({
        nested: true,
        a11y: {
          checkboxLabel: (node, checked) =>
            `${checked ? 'Completed' : 'Incomplete'} task: ${node.textContent || 'empty'}`,
        },
      }),
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      }),
    ],
    content: descriptionToEditorHtml(value),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeDescriptionHtml(currentEditor.getHTML()))
    },
    editorProps: {
      attributes: {
        class:
          'tiptap min-h-28 px-3 py-2 text-sm leading-5 text-[#515966] outline-none [&_a]:text-[#5c61d9] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#dfe2e7] [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[#f0f1f3] [&_code]:px-1 [&_code]:text-[12px] [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-[#f5f6f8] [&_pre]:p-2 [&_ul]:list-disc',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return
    const nextContent = descriptionToEditorHtml(value)
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div id={id} className="overflow-hidden rounded-md border border-[#e7e9ed] bg-[#fbfcfd]">
      {editor && (
        <div
          role="toolbar"
          aria-label="Text formatting"
          className="flex items-center gap-0.5 border-b border-[#e7e9ed] bg-white px-2 py-1"
        >
          <ToolbarButton
            label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Bulleted list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={14} />
          </ToolbarButton>
          <ToolbarButton
            label="Checklist"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecks size={14} />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
