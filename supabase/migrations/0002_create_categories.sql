create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text not null,
  type text check (type in ('income','expense')),
  is_system boolean default false,
  created_at timestamptz default now()
);

alter table categories enable row level security;

create policy "Users read own and system categories"
on categories for select
using (user_id is null or auth.uid() = user_id);

create policy "Users manage own categories"
on categories for insert
with check (auth.uid() = user_id);

create policy "Users update own categories"
on categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users delete own categories"
on categories for delete
using (auth.uid() = user_id);
