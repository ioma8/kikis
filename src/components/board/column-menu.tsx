import { useState, type FormEvent } from 'react'
import { MoreHorizontal, Trash2, Archive, Palette, Edit3, X } from 'lucide-react'

interface ColumnMenuProps {
  columnName: string
  onRename: (name: string) => void
  onChangeColor: (color: string) => void
  onArchive: () => void
  onDelete: () => void
}

const PRESET_COLORS = [
  '#8b95a7',
  '#ed9f55',
  '#8b83dc',
  '#68af87',
  '#e06060',
  '#60a0e0',
  '#60c080',
  '#d0a060',
]

export function ColumnMenu({
  columnName,
  onRename,
  onChangeColor,
  onArchive,
  onDelete,
}: ColumnMenuProps) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(columnName)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleRename = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (trimmed) {
      onRename(trimmed)
    }
    setRenaming(false)
    setOpen(false)
  }

  const handleColorPick = (color: string) => {
    onChangeColor(color)
    setShowColorPicker(false)
    setOpen(false)
  }

  const handleArchive = () => {
    onArchive()
    setOpen(false)
  }

  const handleDelete = () => {
    onDelete()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`${columnName} menu`}
        className="grid size-6 place-items-center rounded-md text-[#9aa2ad] hover:bg-white hover:text-[#5c61d9]"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-[#e1e4e9] bg-white py-1 shadow-lg">
            {renaming ? (
              <form onSubmit={handleRename} className="px-2 py-1">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-7 w-full rounded border border-[#e1e4e9] px-2 text-xs text-[#515966] outline-none focus:border-[#a6a9ed]"
                />
                <div className="mt-1 flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setRenaming(false)}
                    className="text-[10px] text-[#858e9d] hover:text-[#515966]"
                  >
                    <X size={12} />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(true)
                    setNameInput(columnName)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#515966] hover:bg-[#f5f6f8]"
                >
                  <Edit3 size={13} /> Rename
                </button>
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#515966] hover:bg-[#f5f6f8]"
                >
                  <Palette size={13} /> Color
                </button>
                {showColorPicker && (
                  <div className="flex flex-wrap gap-1 px-3 pb-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorPick(color)}
                        className="size-5 rounded-full border border-[#e1e4e9]"
                        style={{ backgroundColor: color }}
                        aria-label={`Set color ${color}`}
                      />
                    ))}
                  </div>
                )}
                <div className="mx-2 my-1 border-t border-[#eef0f2]" />
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#515966] hover:bg-[#f5f6f8]"
                >
                  <Archive size={13} /> Archive
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#b85c55] hover:bg-[#fff5f4]"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
