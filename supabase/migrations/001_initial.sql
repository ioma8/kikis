-- Kikis initial schema: profiles, workspaces, boards, columns, cards, labels

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspace members
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  primary key (workspace_id, user_id),
  created_at timestamptz not null default now()
);

-- Boards
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns
create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position numeric not null,
  color text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cards
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text not null default '',
  project text not null default 'General',
  priority text not null check (priority in ('low', 'medium', 'high')),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  position numeric not null,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Labels
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- Card-label junction
create table if not exists public.card_labels (
  card_id uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);

-- Indexes
create index if not exists idx_boards_workspace_id on public.boards(workspace_id);
create index if not exists idx_columns_board_id on public.columns(board_id);
create index if not exists idx_cards_board_id on public.cards(board_id);
create index if not exists idx_cards_column_id on public.cards(column_id);
create index if not exists idx_cards_archived_at on public.cards(archived_at) where archived_at is not null;
create index if not exists idx_cards_position on public.cards(board_id, column_id, position);
create index if not exists idx_columns_position on public.columns(board_id, position);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.workspaces
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.boards
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.columns
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.cards
  for each row execute function public.handle_updated_at();

-- Row-level security
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.cards enable row level security;
alter table public.labels enable row level security;
alter table public.card_labels enable row level security;

-- Profiles: users can read/update their own
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Workspace access via membership
create policy "Members can read workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

create policy "Owners can update workspaces"
  on public.workspaces for update
  using (owner_id = auth.uid());

create policy "Owners can delete workspaces"
  on public.workspaces for delete
  using (owner_id = auth.uid());

create policy "System can insert workspaces"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

-- Workspace members: members can see members, owner manages
create policy "Members can read workspace members"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "Owners can manage members"
  on public.workspace_members for insert
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "Owners can delete members"
  on public.workspace_members for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- Boards: workspace member access
create policy "Members can read boards"
  on public.boards for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = boards.workspace_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces w
      where w.id = boards.workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "Members can insert boards"
  on public.boards for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = boards.workspace_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces w
      where w.id = boards.workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "Members can update boards"
  on public.boards for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = boards.workspace_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces w
      where w.id = boards.workspace_id and w.owner_id = auth.uid()
    )
  );

create policy "Members can delete boards"
  on public.boards for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = boards.workspace_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspaces w
      where w.id = boards.workspace_id and w.owner_id = auth.uid()
    )
  );

-- Columns: board access check helper
create policy "Members can read columns"
  on public.columns for select
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = columns.board_id and wm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.boards b
        join public.workspaces w on w.id = b.workspace_id
      where b.id = columns.board_id and w.owner_id = auth.uid()
    )
  );

create policy "Members can insert columns"
  on public.columns for insert
  with check (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can update columns"
  on public.columns for update
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = columns.board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can delete columns"
  on public.columns for delete
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = columns.board_id and wm.user_id = auth.uid()
    )
  );

-- Cards: same access pattern
create policy "Members can read cards"
  on public.cards for select
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = cards.board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can insert cards"
  on public.cards for insert
  with check (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can update cards"
  on public.cards for update
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = cards.board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can delete cards"
  on public.cards for delete
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = cards.board_id and wm.user_id = auth.uid()
    )
  );

-- Labels
create policy "Members can read labels"
  on public.labels for select
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = labels.board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can manage labels"
  on public.labels for insert
  with check (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can update labels"
  on public.labels for update
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = labels.board_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can delete labels"
  on public.labels for delete
  using (
    exists (
      select 1 from public.boards b
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where b.id = labels.board_id and wm.user_id = auth.uid()
    )
  );

-- Card-labels: through card access
create policy "Members can read card_labels"
  on public.card_labels for select
  using (
    exists (
      select 1 from public.cards c
        join public.boards b on b.id = c.board_id
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where c.id = card_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can manage card_labels"
  on public.card_labels for insert
  with check (
    exists (
      select 1 from public.cards c
        join public.boards b on b.id = c.board_id
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where c.id = card_id and wm.user_id = auth.uid()
    )
  );

create policy "Members can delete card_labels"
  on public.card_labels for delete
  using (
    exists (
      select 1 from public.cards c
        join public.boards b on b.id = c.board_id
        join public.workspace_members wm on wm.workspace_id = b.workspace_id
      where c.id = card_id and wm.user_id = auth.uid()
    )
  );

-- Bootstrap function: create profile + workspace + board + default columns in one call
create or replace function public.bootstrap_new_user(user_id uuid, display_name text)
returns jsonb
language plpgsql
security definer
as $$
declare
  workspace_id uuid;
  board_id uuid;
  col_inbox_id uuid;
  col_progress_id uuid;
  col_review_id uuid;
  col_done_id uuid;
  result jsonb;
begin
  -- Upsert profile
  insert into public.profiles (id, display_name)
  values (user_id, display_name)
  on conflict (id) do update set display_name = excluded.display_name;

  -- Create workspace
  insert into public.workspaces (owner_id, name)
  values (user_id, 'Personal')
  returning id into workspace_id;

  -- Add owner as member
  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, user_id, 'owner');

  -- Create default board
  insert into public.boards (workspace_id, name)
  values (workspace_id, 'My workspace')
  returning id into board_id;

  -- Create default columns
  insert into public.columns (board_id, name, position, color)
  values
    (board_id, 'Inbox', 1, '#8b95a7'),
    (board_id, 'In progress', 2, '#ed9f55'),
    (board_id, 'Review', 3, '#8b83dc'),
    (board_id, 'Done', 4, '#68af87')
  returning id into col_inbox_id;

  -- Build result
  select jsonb_build_object(
    'workspace_id', workspace_id,
    'board_id', board_id
  ) into result;

  return result;
end;
$$;
