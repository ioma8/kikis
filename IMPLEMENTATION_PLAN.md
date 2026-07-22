# Kikis implementation plan

Kikis is a deliberately small Trello replacement: one calm workspace where a person or a small team can capture tasks, move them through a Kanban workflow, and find what matters without a dense project-management suite.

This repository currently contains a Vercel-ready Vite + React + TypeScript shell with seeded board data, search, project filtering, task creation, and ReUI drag-and-drop wiring. Persistence, authentication, routing, and task editing are the next implementation steps.

## 1. Product decisions

### MVP promise

An authenticated user can create a board, add and edit cards, move cards between columns, reorder cards and columns, filter/search the board, and return later to the same state from any device.

### MVP scope

- One personal workspace per account.
- One default board called “My workspace”, with Inbox, In progress, Review, and Done columns.
- Create, edit, delete, archive, and restore cards.
- Card title, description, priority, project, assignee, due date, and labels.
- Add, rename, reorder, and archive columns.
- Pointer, touch, and keyboard drag-and-drop.
- Board search, project filter, priority filter, and “assigned to me” filter.
- Optimistic updates with a visible save/error state.
- Email magic-link authentication.
- Responsive layout: four-column desktop board and horizontally scrollable board on small screens.

### Explicitly out of MVP

Comments, file attachments, checklists, recurring tasks, calendar view, automation rules, real-time collaboration, email notifications, public sharing, and billing. These should not enter the first implementation unless a later product decision changes the scope.

## 2. Stack and deployment

- React 19 + TypeScript.
- Vite 8 for the client build.
- Tailwind CSS 4 with shadcn-compatible CSS variables.
- ReUI Kanban source component in `src/components/reui/kanban.tsx`.
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` through ReUI.
- Base UI primitives for shadcn components.
- Supabase for Auth and Postgres. This keeps the Vite app deployable as a static client on Vercel without introducing a separate server.
- Vercel project root: repository root. Build command: `npm run build`. Output directory: `dist`. Install command: `npm ci`.

ReUI’s Kanban is source-owned and controlled by a `Record<string, T[]>`: pass the board value to `Kanban`, update it through `onValueChange`, and derive item IDs with `getItemValue`. Use `onValueCommit` as the persistence boundary after a completed move. Reference: [ReUI Kanban documentation](https://reui.io/docs/components/base/kanban).

Required environment variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never put a Supabase service-role key in the Vite client. RLS policies are the authorization boundary.

## 3. Routes and application states

Add React Router with these routes:

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Redirect to `/board/:boardId` when authenticated; otherwise show landing page | Public/authenticated |
| `/login` | Magic-link request and callback completion | Public |
| `/board/:boardId` | Main Kanban workspace | Authenticated |
| `/archive` | Archived cards for the active workspace | Authenticated |
| `*` | Not-found state | Any |

The app must explicitly handle loading, unauthenticated, authenticated, empty-board, saving, save-failed, and not-found states. Do not render an empty white screen while auth or the initial board query is pending.

Once deep links are introduced, add a Vercel SPA rewrite so `/board/:boardId` resolves to `index.html` in production. Keep static assets outside that rewrite.

## 4. Data model

Create `supabase/migrations/001_initial.sql` with UUID primary keys, `created_at`, and `updated_at` timestamps.

```text
profiles
  id uuid primary key references auth.users(id) on delete cascade
  display_name text not null
  avatar_url text null

workspaces
  id uuid primary key
  owner_id uuid references profiles(id) on delete cascade
  name text not null

workspace_members
  workspace_id uuid references workspaces(id) on delete cascade
  user_id uuid references profiles(id) on delete cascade
  role text check (role in ('owner', 'member'))
  primary key (workspace_id, user_id)

boards
  id uuid primary key
  workspace_id uuid references workspaces(id) on delete cascade
  name text not null
  archived_at timestamptz null

columns
  id uuid primary key
  board_id uuid references boards(id) on delete cascade
  name text not null
  position numeric not null
  color text not null
  archived_at timestamptz null

cards
  id uuid primary key
  board_id uuid references boards(id) on delete cascade
  column_id uuid references columns(id) on delete restrict
  title text not null check (char_length(trim(title)) between 1 and 180)
  description text not null default ''
  project text not null default 'General'
  priority text not null check (priority in ('low', 'medium', 'high'))
  assignee_id uuid references profiles(id) on delete set null
  due_date date null
  position numeric not null
  archived_at timestamptz null
  created_by uuid references profiles(id) on delete set null

labels
  id uuid primary key
  board_id uuid references boards(id) on delete cascade
  name text not null
  color text not null

card_labels
  card_id uuid references cards(id) on delete cascade
  label_id uuid references labels(id) on delete cascade
  primary key (card_id, label_id)
```

Use fractional positions for the first version: insert between neighboring values during a reorder and periodically compact a column’s positions when the gap becomes too small. This avoids rewriting every card on each drop. Keep `position` scoped by `column_id`; column positions are scoped by `board_id`.

## 5. File structure to implement

```text
src/
  app/
    router.tsx
    providers.tsx
  components/
    board/
      board-page.tsx
      board-toolbar.tsx
      task-card.tsx
      task-column.tsx
      task-editor.tsx
      board-empty-state.tsx
    shell/
      app-header.tsx
      profile-menu.tsx
    ui/
  hooks/
    use-board.ts
    use-board-filters.ts
    use-debounced-value.ts
  lib/
    supabase.ts
    board-mutations.ts
    board-validation.ts
    query-keys.ts
  types/
    board.ts
    database.ts
```

Move the current demo markup from `src/App.tsx` into `src/components/board/board-page.tsx`. Keep the ReUI file copied into the repository; style and extend it locally rather than wrapping it in a hidden package dependency.

## 6. Implementation phases

### Phase 0 — baseline and cleanup

1. Remove unused Vite demo assets and confirm `src/main.tsx` is the only entry point.
2. Add ESLint, a formatter, and a `typecheck` script.
3. Add `README.md` with local setup, environment variables, Supabase setup, and Vercel deployment instructions.
4. Add a `vercel.json` rewrite when routing is added.
5. Keep `npm run build` green after every phase.

### Phase 1 — domain types and Supabase foundation

1. Add `src/types/board.ts` with `Board`, `BoardColumn`, `Card`, `Priority`, `BoardFilters`, and `BoardSnapshot` types.
2. Create the Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Add the SQL migration, indexes on `boards.workspace_id`, `columns.board_id`, `cards.board_id`, `cards.column_id`, and `cards.archived_at`.
4. Add RLS policies allowing workspace members to select and mutate only rows belonging to their workspace.
5. Add an auth context that listens to `onAuthStateChange` and redirects to `/login` when the session is missing.
6. Add a first-login bootstrap function that creates the profile, workspace, default board, four columns, and an empty state in one transaction/function.

### Phase 2 — board read path

1. Implement `useBoard(boardId)` to fetch the board, active columns ordered by `position`, active cards ordered by `(column_id, position)`, labels, and members.
2. Normalize the query result into the ReUI shape:

   ```ts
   Record<columnId, Card[]>
   ```

   Keep column metadata in a separate ordered `BoardColumn[]`; do not encode titles or colors in the object keys.
3. Render a skeleton board while loading, an error panel with retry on failure, and an empty-board call to action when no cards exist.
4. Preserve the current restrained visual language: cool gray canvas, white cards, one indigo action color, thin borders, and low-contrast secondary text.

### Phase 3 — Kanban interactions

1. Keep `Kanban` controlled by the normalized board state.
2. Render each column with `KanbanColumn`, use `KanbanColumnHandle` for column reordering, and render cards through `KanbanItem` plus `KanbanItemHandle`.
3. Use `KanbanOverlay` to render the dragged card and dragged column with the same content as the source.
4. Use the `onValueChange` callback for immediate local state updates and `onValueCommit` to persist only the final move.
5. On card commit, calculate the new column and neighboring positions, then update the card’s `column_id` and `position` in one mutation.
6. On same-column reorder, update only the moved card’s position where possible; compact positions if the gap is below `0.000001`.
7. On column reorder, update the affected column positions in a single mutation.
8. If persistence fails, restore the snapshot captured before the drag and show a non-blocking error toast with “Retry”.
9. Configure keyboard announcements and test moving a focused card with Space, arrow keys, and Enter.

### Phase 4 — card and column editing

1. Add a task editor dialog/drawer opened by clicking a card or pressing Enter on a focused card.
2. Validate title length, optional description length, due-date format, and priority before submitting.
3. Save card changes with an optimistic update, disable submit while saving, and retain entered values after a failure.
4. Add “New task” and per-column “Add task” actions. New cards start at the end of the selected column.
5. Add an overflow menu for archive and delete. Archive is the default destructive-looking action; hard delete requires a second confirmation.
6. Add a column menu for rename, color, archive, and delete. Refuse to delete a non-empty column until its cards are moved or archived.

### Phase 5 — filters, archive, and quality

1. Extract search/filter state from the board page and debounce text search by 150 ms.
2. Filter cards in the rendered list without mutating the underlying full ReUI state.
3. Show result counts and a “Clear filters” action; preserve filters in URL query params so refresh and copied links retain the view.
4. Implement `/archive` with restore and permanent-delete actions.
5. Add responsive tests for horizontal board scrolling and a card editor usable at 320 px width.
6. Add unit tests for position calculations and board normalization; add browser tests for create, edit, filter, drag, cancel, and failed-save rollback.

### Phase 6 — release hardening

1. Add error boundaries around the app shell and board page.
2. Add `aria-label`s to icon-only controls, visible focus states, keyboard alternatives for every drag action, and reduced-motion handling.
3. Verify no secret environment variable is exposed in the client bundle.
4. Run `npm run typecheck`, `npm run build`, and the browser test suite in CI.
5. Deploy a Vercel preview, run the production smoke checklist, then promote to production.

## 7. Acceptance criteria

- A new account can log in and reaches a board with the four default columns.
- Refreshing the board preserves cards, column order, card order, metadata, and filters.
- A card can be moved within a column, between columns, and with keyboard controls.
- A column can be reordered and the order survives refresh.
- A failed move visibly fails and returns the UI to the last confirmed state.
- Search and project/priority/assignee filters never overwrite hidden cards.
- A user cannot read or mutate another workspace through the browser or direct Supabase requests.
- The board is usable with keyboard focus and at 320 px viewport width.
- Vercel production build completes with `npm run build`; direct navigation to `/board/:boardId` does not 404.
- No P1/P2 console errors, broken buttons, or unhandled promise rejections remain in the smoke test.

## 8. Suggested delivery order

Deliver the first usable slice as: local board → Supabase auth/bootstrap → persisted board → card editor → filters/archive → accessibility and release hardening. Do not start comments, attachments, collaboration, or secondary views before the persisted Kanban flow meets the acceptance criteria above.
