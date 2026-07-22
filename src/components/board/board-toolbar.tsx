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
    <section className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-[#e3e6eb] bg-white p-3.5 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-[#49515e]">My workspace</span>
        <span className="h-4 w-px bg-[#e5e7eb]" />
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[#7b8492]">
          <SlidersHorizontal size={14} /> Filter
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[#5c61d9] hover:bg-[#f0f0ff]"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
          <Search className="absolute left-2.5 top-2 text-[#a2a9b4]" size={14} />
          <input
            aria-label="Search tasks"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tasks"
            className="h-8 w-full rounded-md border border-[#e7e9ed] bg-[#fbfcfd] pl-8 pr-2 text-xs text-[#515966] outline-none placeholder:text-[#a2a9b4] focus:border-[#a6a9ed] focus:ring-2 focus:ring-[#eeeeff]"
          />
        </label>
        <select
          aria-label="Filter by project"
          value={selectedProject ?? ''}
          onChange={(e) => onProjectChange(e.target.value || null)}
          className="h-8 rounded-md border border-[#e7e9ed] bg-[#fbfcfd] px-2 text-xs text-[#6f7886] outline-none focus:border-[#a6a9ed]"
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
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#5c61d9] px-3 py-1.5 text-xs font-medium text-white shadow-[0_3px_8px_rgba(92,97,217,0.2)] transition hover:bg-[#5055cf]"
        >
          <Plus size={14} /> New task
        </button>
      </div>
    </section>
  )
}
