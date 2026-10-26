alter table public.tasks add column if not exists note text;
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  background_color text not null default '#fff8c5',
  drawing_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.user_settings enable row level security;
alter table public.notes enable row level security;

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.notes to authenticated;

drop policy if exists skiddio_tasks_select_own on public.tasks;
create policy skiddio_tasks_select_own
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists skiddio_tasks_insert_own on public.tasks;
create policy skiddio_tasks_insert_own
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists skiddio_tasks_update_own on public.tasks;
create policy skiddio_tasks_update_own
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists skiddio_tasks_delete_own on public.tasks;
create policy skiddio_tasks_delete_own
  on public.tasks for delete
  using (auth.uid() = user_id);

drop policy if exists skiddio_user_settings_select_own on public.user_settings;
create policy skiddio_user_settings_select_own
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists skiddio_user_settings_insert_own on public.user_settings;
create policy skiddio_user_settings_insert_own
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists skiddio_user_settings_update_own on public.user_settings;
create policy skiddio_user_settings_update_own
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists skiddio_notes_select_own on public.notes;
create policy skiddio_notes_select_own
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists skiddio_notes_insert_own on public.notes;
create policy skiddio_notes_insert_own
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists skiddio_notes_update_own on public.notes;
create policy skiddio_notes_update_own
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists skiddio_notes_delete_own on public.notes;
create policy skiddio_notes_delete_own
  on public.notes for delete
  using (auth.uid() = user_id);
