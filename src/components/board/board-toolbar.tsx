import { Search, SlidersHorizontal, Plus } from 'lucide-react'

interface BoardToolbarProps {
  query: string
  onQueryChange: (q: string) => void
  projects: string[]
  selectedProject: string | null
  onProjectChange: (project: string | null) => void
  hasFilters: boolean
  onClearFilters: () => void
  onNewTask: () => void
}

export function BoardToolbar({
  query,
  onQueryChange,
  projects,
  selectedProject,
  onProjectChange,
  hasFilters,
  onClearFilters,
  onNewTask,
}: BoardToolbarProps) {
  return (
    <section className="sticky top-2 z-30 mb-3 flex flex-col justify-between gap-2 rounded-lg border border-[#e3e6eb] bg-white/95 p-2 shadow-[0_4px_14px_rgba(25,35,50,0.04)] backdrop-blur sm:mb-4 sm:flex-row sm:items-center sm:rounded-xl sm:p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-[#7b8492]">
          <SlidersHorizontal size={14} /> Filter
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-[#5c61d9] hover:bg-[#f0f0ff]"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:w-auto sm:items-center">
        <label className="relative min-w-0">
          <Search className="absolute left-2.5 top-2 text-[#a2a9b4]" size={14} />
          <input
            aria-label="Search tasks"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tasks"
            className="h-9 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] pl-8 pr-2 text-xs text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff] sm:h-7 sm:w-48"
          />
        </label>
        <select
          aria-label="Filter by project"
          value={selectedProject ?? ''}
          onChange={(e) => onProjectChange(e.target.value || null)}
          className="h-9 w-full max-w-36 truncate rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-2 text-xs text-[#6f7886] outline-none focus:border-[#a6a9ed] sm:h-7 sm:w-auto sm:max-w-none"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onNewTask}
          className="col-span-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#5c61d9] px-2.5 py-1 text-xs font-medium text-white shadow-[0_3px_8px_rgba(92,97,217,0.2)] transition hover:bg-[#5055cf] sm:h-auto sm:w-auto"
        >
          <Plus size={14} /> New task
        </button>
      </div>
    </section>
  )
}
