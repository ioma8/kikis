-- Comments table for task cards

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_card_id on public.comments(card_id);
create index if not exists idx_comments_created_at on public.comments(card_id, created_at);

-- Updated_at trigger
create trigger set_updated_at before update on public.comments
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.comments enable row level security;

create policy "Members can read comments"
  on public.comments for select
  using (can_access_board((select board_id from public.cards where id = card_id)));

create policy "Members can insert comments"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and can_access_board((select board_id from public.cards where id = card_id))
  );

create policy "Authors can update comments"
  on public.comments for update
  using (author_id = auth.uid());

create policy "Authors can delete comments"
  on public.comments for delete
  using (author_id = auth.uid());
