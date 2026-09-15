create table user_keyword_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  keyword text not null,
  category_id uuid references categories(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, keyword)
);

create index user_keyword_mappings_user_id_idx on user_keyword_mappings(user_id);

alter table user_keyword_mappings enable row level security;

create policy "Service role only"
on user_keyword_mappings for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');