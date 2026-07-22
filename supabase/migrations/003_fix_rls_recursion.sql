-- Fix RLS infinite recursion on workspace_members.
-- A security-definer function breaks the self-referential cycle.

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspaces
    where id = ws_id and owner_id = auth.uid()
  );
$$;

-- Helper: check board access via workspace membership
create or replace function public.can_access_board(bid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.boards b
      join public.workspace_members wm on wm.workspace_id = b.workspace_id
    where b.id = bid and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.boards b
      join public.workspaces w on w.id = b.workspace_id
    where b.id = bid and w.owner_id = auth.uid()
  );
$$;

-- Recreate workspace_members policies

drop policy if exists "Members can read workspace members" on public.workspace_members;
create policy "Members can read workspace members"
  on public.workspace_members for select
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

drop policy if exists "Owners can manage members" on public.workspace_members;
create policy "Owners can manage members"
  on public.workspace_members for insert
  with check (is_workspace_owner(workspace_id));

drop policy if exists "Owners can delete members" on public.workspace_members;
create policy "Owners can delete members"
  on public.workspace_members for delete
  using (is_workspace_owner(workspace_id));

-- Recreate boards policies

drop policy if exists "Members can read boards" on public.boards;
create policy "Members can read boards"
  on public.boards for select
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

drop policy if exists "Members can insert boards" on public.boards;
create policy "Members can insert boards"
  on public.boards for insert
  with check (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

drop policy if exists "Members can update boards" on public.boards;
create policy "Members can update boards"
  on public.boards for update
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

drop policy if exists "Members can delete boards" on public.boards;
create policy "Members can delete boards"
  on public.boards for delete
  using (is_workspace_member(workspace_id) or is_workspace_owner(workspace_id));

-- Recreate columns policies

drop policy if exists "Members can read columns" on public.columns;
create policy "Members can read columns"
  on public.columns for select
  using (can_access_board(board_id));

drop policy if exists "Members can insert columns" on public.columns;
create policy "Members can insert columns"
  on public.columns for insert
  with check (can_access_board(board_id));

drop policy if exists "Members can update columns" on public.columns;
create policy "Members can update columns"
  on public.columns for update
  using (can_access_board(board_id));

drop policy if exists "Members can delete columns" on public.columns;
create policy "Members can delete columns"
  on public.columns for delete
  using (can_access_board(board_id));

-- Recreate cards policies

drop policy if exists "Members can read cards" on public.cards;
create policy "Members can read cards"
  on public.cards for select
  using (can_access_board(board_id));

drop policy if exists "Members can insert cards" on public.cards;
create policy "Members can insert cards"
  on public.cards for insert
  with check (can_access_board(board_id));

drop policy if exists "Members can update cards" on public.cards;
create policy "Members can update cards"
  on public.cards for update
  using (can_access_board(board_id));

drop policy if exists "Members can delete cards" on public.cards;
create policy "Members can delete cards"
  on public.cards for delete
  using (can_access_board(board_id));

-- Recreate labels policies

drop policy if exists "Members can read labels" on public.labels;
create policy "Members can read labels"
  on public.labels for select
  using (can_access_board(board_id));

drop policy if exists "Members can manage labels" on public.labels;
create policy "Members can manage labels"
  on public.labels for insert
  with check (can_access_board(board_id));

drop policy if exists "Members can update labels" on public.labels;
create policy "Members can update labels"
  on public.labels for update
  using (can_access_board(board_id));

drop policy if exists "Members can delete labels" on public.labels;
create policy "Members can delete labels"
  on public.labels for delete
  using (can_access_board(board_id));

-- Recreate card_labels policies

drop policy if exists "Members can read card_labels" on public.card_labels;
create policy "Members can read card_labels"
  on public.card_labels for select
  using (
    exists (
      select 1 from public.cards c
      where c.id = card_id and can_access_board(c.board_id)
    )
  );

drop policy if exists "Members can manage card_labels" on public.card_labels;
create policy "Members can manage card_labels"
  on public.card_labels for insert
  with check (
    exists (
      select 1 from public.cards c
      where c.id = card_id and can_access_board(c.board_id)
    )
  );

drop policy if exists "Members can delete card_labels" on public.card_labels;
create policy "Members can delete card_labels"
  on public.card_labels for delete
  using (
    exists (
      select 1 from public.cards c
      where c.id = card_id and can_access_board(c.board_id)
    )
  );
