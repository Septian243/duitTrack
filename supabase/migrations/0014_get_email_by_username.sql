create or replace function public.get_email_by_username(check_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from auth.users
  where id = (select id from profiles where lower(username) = lower(check_username))
  limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;