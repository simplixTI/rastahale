-- ============================================================
-- 017 — Trigger handle_new_user blindado (cadastro de usuários quebrado)
--
-- Sintoma: qualquer criação de usuário (signup email/senha OU primeiro
-- login Google via signInWithIdToken) falhava com
-- "Database error creating new user" (500 do GoTrue).
--
-- A versão viva do trigger (full_migration.sql) fazia o cast
-- `(raw_user_meta_data->>'role')::user_role` SEM proteção e sem
-- `set search_path` — qualquer exceção dentro do trigger derruba a
-- transação inteira do auth.users e o cadastro falha.
--
-- Correção: role inválido/ausente cai para 'user', e qualquer erro
-- inesperado no insert do profile vira WARNING em vez de abortar o
-- cadastro (o perfil pode ser recriado depois via ensureProfile).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role := 'user'::user_role;
begin
  begin
    v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'user'::user_role);
  exception when others then
    v_role := 'user'::user_role;
  end;

  begin
    insert into public.profiles (id, email, name, role)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
      v_role
    )
    on conflict (id) do nothing;
  exception when others then
    -- Nunca deixar o insert do profile derrubar a criação do usuário.
    raise warning 'handle_new_user: falha ao criar profile de %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;
