create table profiles (
  id uuid references auth.users primary key,
  name text,
  telegram_chat_id bigint unique,
  main_currency text not null default 'IDR',
  daily_reminder_enabled boolean default false,
  daily_reminder_hour int default 20,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users manage own profile"
on profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);
