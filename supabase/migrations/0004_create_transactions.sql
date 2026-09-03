create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  category_id uuid references categories(id),
  amount numeric not null,
  currency text not null default 'IDR',
  type text check (type in ('income','expense')) not null,
  transaction_date date not null,
  note text,
  source text check (source in ('web','telegram')) not null,
  created_at timestamptz default now()
);

alter table transactions enable row level security;

create policy "Users manage own transactions"
on transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
