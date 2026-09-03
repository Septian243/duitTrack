create table telegram_links (
  code text primary key,
  user_id uuid references profiles(id) not null,
  expires_at timestamptz not null,
  used boolean default false
);

alter table telegram_links enable row level security;

create policy "Service role only"
on telegram_links for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
