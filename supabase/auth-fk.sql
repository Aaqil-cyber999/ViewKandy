-- Optional: add database-level foreign keys from per-user saves to auth.users.
-- Drizzle cannot declare a reference into the Supabase-managed auth schema, so
-- this snippet is applied after `npm run db:migrate`. It is idempotent.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'favorites_user_id_fkey'
  ) then
    alter table public.favorites
      add constraint favorites_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'itineraries_user_id_fkey'
  ) then
    alter table public.itineraries
      add constraint itineraries_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end;
$$;
