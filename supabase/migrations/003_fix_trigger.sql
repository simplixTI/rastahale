-- Corrige o trigger handle_new_user — casting robusto do enum user_role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := 'user'::user_role;
begin
  begin
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  exception when others then
    v_role := 'user'::user_role;
  end;

  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
