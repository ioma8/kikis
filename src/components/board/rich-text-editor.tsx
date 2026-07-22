import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import FileHandler from '@tiptap/extension-file-handler'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

type LightboxImage = {
  src: string
  alt: string
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

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read image'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

async function insertImageFiles(editor: Editor, files: File[], position?: number) {
  const images = await Promise.all(
    files.map(async (file) => ({
      type: 'image' as const,
      attrs: {
        src: await readImageAsDataUrl(file),
        alt: file.name || 'Inserted image',
        title: file.name || null,
      },
    })),
  )

  if (editor.isDestroyed) return

  const chain = editor.chain().focus()
  if (position === undefined) {
    chain.insertContent(images)
  } else {
    chain.insertContentAt(position, images)
  }
  chain.run()
}

export function RichTextEditor({ id, value, onChange, disabled = false }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)
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
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ['bottom-right'],
          minWidth: 120,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
        consumePasteEvent: true,
        onPaste: (currentEditor, files) => {
          void insertImageFiles(currentEditor, files)
        },
        onDrop: (currentEditor, files, position) => {
          void insertImageFiles(currentEditor, files, position)
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
          'tiptap min-h-52 px-3 py-3 text-sm leading-5 text-[#515966] outline-none [&_a]:text-[#5c61d9] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#dfe2e7] [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[#f0f1f3] [&_code]:px-1 [&_code]:text-[12px] [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-[#f5f6f8] [&_pre]:p-2 [&_ul]:list-disc',
      },
      handleClick: (_view, _position, event) => {
        if (!(event.target instanceof HTMLImageElement)) return false

        setLightboxImage({
          src: event.target.currentSrc || event.target.src,
          alt: event.target.alt || 'Image preview',
        })
        return true
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
          <ToolbarButton label="Insert image" onClick={() => imageInputRef.current?.click()}>
            <ImagePlus size={14} />
          </ToolbarButton>
        </div>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (editor && files.length > 0) void insertImageFiles(editor, files)
        }}
      />
      <EditorContent editor={editor} />
      <Dialog
        open={lightboxImage !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setLightboxImage(null)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] p-2 sm:p-3">
          <DialogHeader className="sr-only">
            <DialogTitle>Image preview</DialogTitle>
            <DialogDescription>Full-size image preview.</DialogDescription>
          </DialogHeader>
          <DialogClose
            type="button"
            aria-label="Close image preview"
            className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </DialogClose>
          {lightboxImage && (
            <div className="flex max-h-[calc(100dvh-3rem)] min-h-0 items-center justify-center overflow-auto">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                className="max-h-[calc(100dvh-3rem)] max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
