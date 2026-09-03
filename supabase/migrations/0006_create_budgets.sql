create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  category_id uuid references categories(id),
  amount numeric not null,
  period_month date not null,
  created_at timestamptz default now()
);

alter table budgets enable row level security;

create policy "Users manage own budgets"
on budgets for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
