export function BoardEmptyState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-xl border border-[#e1e4e9] bg-white">
        <span className="text-2xl">📋</span>
      </div>
      <h2 className="mb-1 text-base font-semibold text-[#242932]">No tasks yet</h2>
      <p className="mb-5 text-sm text-[#858e9d]">Create your first task to get started.</p>
      {onAddTask && (
        <button
          type="button"
          onClick={onAddTask}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#5c61d9] px-4 py-2 text-sm font-medium text-white shadow-[0_3px_8px_rgba(92,97,217,0.2)] transition hover:bg-[#5055cf]"
        >
          + New task
        </button>
      )}
    </div>
  )
}
