-- Harden the bootstrap RPC and keep cards attached to columns on the same board.

drop function if exists public.bootstrap_new_user(uuid, text);

create function public.bootstrap_new_user(p_user_id uuid, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_board_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You may only bootstrap your own account'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, display_name)
  values (p_user_id, coalesce(nullif(trim(p_display_name), ''), 'User'))
  on conflict (id) do update
    set display_name = excluded.display_name;

  select w.id
    into v_workspace_id
    from public.workspaces as w
   where w.owner_id = p_user_id
   order by w.created_at
   limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (owner_id, name)
    values (p_user_id, 'Personal')
    returning id into v_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, p_user_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  select b.id
    into v_board_id
    from public.boards as b
   where b.workspace_id = v_workspace_id
   order by b.created_at
   limit 1;

  if v_board_id is null then
    insert into public.boards (workspace_id, name)
    values (v_workspace_id, 'My workspace')
    returning id into v_board_id;

    insert into public.columns (board_id, name, position, color)
    values
      (v_board_id, 'Inbox', 1, '#8b95a7'),
      (v_board_id, 'In progress', 2, '#ed9f55'),
      (v_board_id, 'Review', 3, '#8b83dc'),
      (v_board_id, 'Done', 4, '#68af87');
  end if;

  return jsonb_build_object(
    'workspace_id', v_workspace_id,
    'board_id', v_board_id
  );
end;
$$;

revoke execute on function public.bootstrap_new_user(uuid, text) from public;
grant execute on function public.bootstrap_new_user(uuid, text) to authenticated;

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.workspace_members
     where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.workspaces
     where id = ws_id and owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_board(bid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.boards as b
      join public.workspace_members as wm on wm.workspace_id = b.workspace_id
     where b.id = bid and wm.user_id = auth.uid()
  )
  or exists (
    select 1
      from public.boards as b
      join public.workspaces as w on w.id = b.workspace_id
     where b.id = bid and w.owner_id = auth.uid()
  );
$$;

revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_owner(uuid) from public;
revoke execute on function public.can_access_board(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.can_access_board(uuid) to authenticated;

-- Members need to be able to resolve author names in comments and assignees.
drop policy if exists "Members can read workspace profiles" on public.profiles;
create policy "Members can read workspace profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
        from public.workspace_members as wm
       where wm.user_id = profiles.id
         and public.is_workspace_member(wm.workspace_id)
    )
  );

create or replace function public.ensure_card_column_board()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.columns as c
     where c.id = new.column_id and c.board_id = new.board_id
  ) then
    raise exception 'Card column must belong to the same board'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_card_column_board on public.cards;
create trigger ensure_card_column_board
  before insert or update of board_id, column_id on public.cards
  for each row execute function public.ensure_card_column_board();
