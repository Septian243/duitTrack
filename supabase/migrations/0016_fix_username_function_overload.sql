drop function if exists public.is_username_available(text);
drop function if exists public.is_username_available(text, uuid);

create function public.is_username_available(check_username text, exclude_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from profiles
    where lower(username) = lower(check_username)
    and (exclude_user_id is null or id != exclude_user_id)
  );
$$;

grant execute on function public.is_username_available(text, uuid) to anon, authenticated;