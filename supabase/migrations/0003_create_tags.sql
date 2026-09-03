create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  name text not null,
  unique(user_id, name)
);

alter table tags enable row level security;

create policy "Users manage own tags"
on tags for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
