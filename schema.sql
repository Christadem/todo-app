-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table public.todos (
  id bigint primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "text" text not null,
  p smallint not null default 2,
  cat text not null default '',
  due date,
  "time" text not null default '',
  rem integer not null default -1,
  done boolean not null default false,
  fired boolean not null default false,
  spent bigint not null default 0,
  run bigint not null default 0,
  created_at timestamptz not null default now()
);
create index on public.todos (user_id);
alter table public.todos enable row level security;
create policy "users manage own todos" on public.todos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
