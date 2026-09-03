create table ai_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  period_month date not null,
  content text not null,
  created_at timestamptz default now(),
  unique(user_id, period_month)
);

alter table ai_summaries enable row level security;

create policy "Users read own ai_summaries"
on ai_summaries for select
using (auth.uid() = user_id);

create policy "Service role writes ai_summaries"
on ai_summaries for insert
with check (auth.role() = 'service_role');

create policy "Service role updates ai_summaries"
on ai_summaries for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
