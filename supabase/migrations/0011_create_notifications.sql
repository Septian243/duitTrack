create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  type text check (type in ('transaction', 'budget', 'category', 'tag', 'telegram_link', 'budget_alert')) not null,
  title text not null,
  message text not null,
  source text check (source in ('web', 'telegram', 'system')) not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index notifications_user_id_created_at_idx on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy "Users manage own notifications"
on notifications for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);