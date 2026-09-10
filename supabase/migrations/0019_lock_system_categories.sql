-- System categories are shared read-only defaults. User-created categories
-- must remain private and editable only by their owner.
drop policy if exists "Users manage own categories" on categories;
create policy "Users manage own categories"
on categories for insert
with check (auth.uid() = user_id and is_system = false);

drop policy if exists "Users update own categories" on categories;
create policy "Users update own categories"
on categories for update
using (auth.uid() = user_id and is_system = false)
with check (auth.uid() = user_id and is_system = false);
