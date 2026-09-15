create table telegram_pending_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  chat_id bigint not null,
  transaction_id uuid references transactions(id) on delete cascade not null,
  state text check (state in ('awaiting_category', 'awaiting_new_category_name')) not null default 'awaiting_category',
  note text not null,
  amount numeric not null,
  type text check (type in ('income', 'expense')) not null,
  resolved boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index telegram_pending_picks_user_id_resolved_idx on telegram_pending_picks(user_id, resolved);

alter table telegram_pending_picks enable row level security;

create policy "Service role only"
on telegram_pending_picks for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');