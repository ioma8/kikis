-- Replace bootstrap function to be idempotent: reuses existing workspace/board
create or replace function public.bootstrap_new_user(user_id uuid, display_name text)
returns jsonb
language plpgsql
security definer
as $$
declare
  workspace_id uuid;
  board_id uuid;
  result jsonb;
begin
  -- Upsert profile
  insert into public.profiles (id, display_name)
  values (user_id, display_name)
  on conflict (id) do update set display_name = excluded.display_name;

  -- Reuse existing workspace or create one
  select id into workspace_id
  from public.workspaces
  where owner_id = user_id
  limit 1;

  if workspace_id is null then
    insert into public.workspaces (owner_id, name)
    values (user_id, 'Personal')
    returning id into workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (workspace_id, user_id, 'owner');

    insert into public.boards (workspace_id, name)
    values (workspace_id, 'My workspace')
    returning id into board_id;

    insert into public.columns (board_id, name, position, color)
    values
      (board_id, 'Inbox', 1, '#8b95a7'),
      (board_id, 'In progress', 2, '#ed9f55'),
      (board_id, 'Review', 3, '#8b83dc'),
      (board_id, 'Done', 4, '#68af87');
  else
    -- Use existing board
    select id into board_id
    from public.boards
    where workspace_id = workspace_id
    order by created_at
    limit 1;
  end if;

  select jsonb_build_object(
    'workspace_id', workspace_id,
    'board_id', board_id
  ) into result;

  return result;
end;
$$;
