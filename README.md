# Kikis

A deliberately small Trello replacement: one calm workspace where a person or a small team can capture tasks, move them through a Kanban workflow, and find what matters without a dense project-management suite.

## Local setup

```bash
npm install
```

## Environment variables

Create a `.env` file in the project root:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never put a Supabase service-role key in the Vite client. RLS policies are the authorization boundary.

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Project Settings > API** and copy the URL and anon key to your `.env` file.
3. Run the migrations in `supabase/migrations/001_initial.sql` against your Supabase database (SQL Editor or `supabase migration up`).
4. Enable the **Magic Link** auth provider in **Authentication > Providers > Email**.
5. (Optional) Turn off "Confirm email" in Email provider settings for a frictionless sign-in.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Vercel deployment

1. Push to a GitHub repository.
2. Create a Vercel project linked to that repo.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Vercel environment variables.
4. Deploy. The `vercel.json` rewrite ensures direct navigation to `/board` works.

## Architecture

- React 19 + TypeScript
- Vite 8 for the client build
- Tailwind CSS 4 with shadcn-compatible CSS variables
- ReUI Kanban component for drag-and-drop
- Supabase (Auth + Postgres) for backend
- `@dnd-kit` through ReUI

## Project structure

```
src/
  app/            Router and providers
  components/
    board/        Kanban board, columns, cards, editor
    shell/        App header, auth, login
    reui/         Kanban source component
    ui/           Base UI primitives
  hooks/          React hooks (useBoard, useDebouncedValue, etc.)
  lib/            Supabase client, mutations, validation
  types/          Domain types and database types
supabase/
  migrations/     SQL migrations
```
