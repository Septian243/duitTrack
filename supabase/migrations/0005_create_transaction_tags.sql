create table transaction_tags (
  transaction_id uuid references transactions(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

alter table transaction_tags enable row level security;

create policy "Users manage own transaction_tags"
on transaction_tags for all
using (
  exists (
    select 1 from transactions
    where transactions.id = transaction_tags.transaction_id
    and transactions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from transactions
    where transactions.id = transaction_tags.transaction_id
    and transactions.user_id = auth.uid()
  )
);
