# Kikis

Kikis is a calm, responsive Kanban workspace for capturing tasks, moving them through a workflow, and keeping the important details close without the weight of a full project-management suite.

## Features

- Multiple boards with reorderable columns and cards
- Drag-and-drop card and column ordering
- Compact, touch-friendly responsive layout with horizontal mobile board navigation
- Search and project filtering
- Task context menus for archive and permanent delete actions
- Task editor with autosaved title, description, priority, project, and due date fields
- WYSIWYG descriptions powered by Tiptap
- Automatic URL detection and link creation
- Checklists with working interactive checkboxes
- Image insertion from the toolbar, clipboard, and drag-and-drop
- Resizable images with full-size lightbox previews
- Collapsible task comments with author-only deletion
- Archive with restore and permanent deletion
- Password and magic-link authentication through Supabase
- ReUI/Base UI dialogs and accessible keyboard/focus behavior
- Kikis icon and wordmark assets for the app shell and browser metadata

## Local setup

### Requirements

- Node.js 20 or newer
- A Supabase project

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

## Environment variables

Create a `.env` file in the project root:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Only use the Supabase URL and anonymous client key in the browser. Never expose a Supabase service-role key in this application; Row Level Security policies are the authorization boundary.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the project URL and anon key into `.env`.
3. Run every file in `supabase/migrations/` in filename order, or link the project and run `supabase db push`.
4. Enable the **Email** provider in **Authentication → Providers**.
5. Enable password sign-in and magic links as needed. You can disable email confirmation for a frictionless local setup.

The migrations configure the schema, bootstrap behavior, comments, card integrity rules, and RLS policies required by the current app.

## Commands

| Command                | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the Vite development server            |
| `npm run build`        | Typecheck and create a production build      |
| `npm run typecheck`    | Run TypeScript checks without emitting files |
| `npm run lint`         | Run ESLint across `src/`                     |
| `npm run format`       | Format source files with Prettier            |
| `npm run format:check` | Verify source formatting                     |
| `npm run preview`      | Preview the production build locally         |

## Deployment

Kikis can be deployed to Vercel or another static hosting provider:

1. Push the repository to GitHub.
2. Create a project connected to the repository.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the deployment environment.
4. Deploy the project.

The included `vercel.json` rewrite keeps direct navigation to `/board` and `/archive` working with the client-side router.

## Architecture

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4 with shadcn-compatible design tokens
- ReUI Kanban primitives backed by `@dnd-kit`
- Base UI dialog and scroll-area primitives
- Tiptap for rich-text editing, links, checklists, and images
- Supabase Auth and Postgres
- DOMPurify for description HTML sanitization

## Project structure

```text
src/
  app/            Router and providers
  components/
    board/        Board, columns, cards, editor, comments, archive
    shell/        Header, branding, authentication
    reui/         Kanban primitives
    ui/           Dialog, confirmation, and button primitives
  hooks/          Board and debounce hooks
  lib/            Supabase client, mutations, validation, descriptions
  types/          Board and database types
public/
  icon-kikis.png  Icon-only browser/app mark
  kikis-full.png  Full Kikis wordmark
supabase/
  migrations/     Database schema, RLS, comments, and integrity migrations
```

## Branding assets

The icon-only mark in `public/icon-kikis.png` is used for the favicon and touch icon. The full wordmark in `public/kikis-full.png` is used in the application shell and login screen.
