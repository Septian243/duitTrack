-- Prevent users from attaching another user's category or tag to their data.
drop policy if exists "Users manage own transactions" on transactions;
create policy "Users manage own transactions"
on transactions for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    category_id is null
    or exists (
      select 1 from categories
      where categories.id = transactions.category_id
      and (categories.user_id = auth.uid() or categories.user_id is null)
    )
  )
);

drop policy if exists "Users manage own budgets" on budgets;
create policy "Users manage own budgets"
on budgets for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    category_id is null
    or exists (
      select 1 from categories
      where categories.id = budgets.category_id
      and (categories.user_id = auth.uid() or categories.user_id is null)
    )
  )
);

drop policy if exists "Users manage own transaction_tags" on transaction_tags;
create policy "Users manage own transaction_tags"
on transaction_tags for all
using (
  exists (
    select 1 from transactions
    where transactions.id = transaction_tags.transaction_id
    and transactions.user_id = auth.uid()
  )
  and exists (
    select 1 from tags
    where tags.id = transaction_tags.tag_id
    and tags.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from transactions
    where transactions.id = transaction_tags.transaction_id
    and transactions.user_id = auth.uid()
  )
  and exists (
    select 1 from tags
    where tags.id = transaction_tags.tag_id
    and tags.user_id = auth.uid()
  )
);
