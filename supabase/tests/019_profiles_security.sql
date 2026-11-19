-- ============================================================
-- Verificação da migration 019 — cole no SQL Editor do Supabase e clique em Run.
--
-- COMO LER O RESULTADO
--   O editor vai mostrar um ERRO vermelho. Isso é DE PROPÓSITO: o script termina
--   com um erro para o Postgres desfazer tudo o que o teste fez. Dentro da
--   mensagem de erro está o relatório, uma linha por teste:
--       PASS = a proteção funcionou
--       FAIL = ainda dá para escalar privilégio (a 019 não foi aplicada?)
--
-- É SEGURO RODAR EM PRODUÇÃO
--   Tudo roda dentro de um único bloco que SEMPRE termina em erro, então nada
--   fica gravado, mesmo que o teste "consiga" virar admin (o que seria um FAIL).
--   O teste também não muda dados de outras pessoas (só regrava o mesmo valor).
--
-- Usa um aluno que já existe (role = 'user'). Se não houver, avisa e não testa.
-- ============================================================
do $$
declare
  v_student uuid;
  v_status  text;
  v_rows    integer;
  v_src     text;
  v_fails   integer := 0;
  v_report  text    := '';
begin
  select id into v_student from public.profiles where role::text = 'user' limit 1;

  if v_student is null then
    v_report := v_report || E'SKIP  não achei nenhum aluno (role = user) para testar\n';
  else
    -- Passa a agir como esse aluno (anon key + JWT dele), sem ser service role.
    perform set_config('request.jwt.claim.sub', v_student::text, true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_student::text, 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- 1) subir o próprio papel para admin tem que falhar
    begin
      update public.profiles set role = 'admin' where id = v_student;
      v_report := v_report || E'FAIL  aluno conseguiu virar admin\n';
      v_fails := v_fails + 1;
    exception
      when insufficient_privilege then
        v_report := v_report || E'PASS  aluno NÃO consegue mudar o próprio role\n';
      when others then
        v_report := v_report || E'ERRO  inesperado no teste do role: ' || sqlerrm || E'\n';
        v_fails := v_fails + 1;
    end;

    -- 2) mudar a própria assinatura sem pagar tem que falhar.
    --    Troca para um valor DIFERENTE do atual: gravar o mesmo valor não é mudança
    --    e o trigger corretamente deixa passar (a 1ª versão deste teste dava um falso
    --    FAIL quando o aluno sorteado já estava 'ativo').
    begin
      select status::text into v_status from public.profiles where id = v_student;
      if v_status = 'ativo' then
        update public.profiles set status = 'inativo' where id = v_student;
      else
        update public.profiles set status = 'ativo' where id = v_student;
      end if;
      v_report := v_report || E'FAIL  aluno conseguiu mudar o próprio status (aula grátis)\n';
      v_fails := v_fails + 1;
    exception
      when insufficient_privilege then
        v_report := v_report || E'PASS  aluno NÃO consegue mudar o próprio status\n';
      when others then
        v_report := v_report || E'ERRO  inesperado no teste do status: ' || sqlerrm || E'\n';
        v_fails := v_fails + 1;
    end;

    -- 3) mexer nos campos do Stripe tem que falhar
    begin
      update public.profiles set subscription_status = coalesce(subscription_status, '') || 'x' where id = v_student;
      v_report := v_report || E'FAIL  aluno conseguiu mudar subscription_status\n';
      v_fails := v_fails + 1;
    exception
      when insufficient_privilege then
        v_report := v_report || E'PASS  aluno NÃO consegue mudar subscription_status\n';
      when others then
        v_report := v_report || E'ERRO  inesperado no teste do Stripe: ' || sqlerrm || E'\n';
        v_fails := v_fails + 1;
    end;

    -- 4) trocar o email do perfil tem que falhar
    begin
      update public.profiles set email = email || '.x' where id = v_student;
      v_report := v_report || E'FAIL  aluno conseguiu trocar o email do perfil\n';
      v_fails := v_fails + 1;
    exception
      when insufficient_privilege then
        v_report := v_report || E'PASS  aluno NÃO consegue trocar o email do perfil\n';
      when others then
        v_report := v_report || E'ERRO  inesperado no teste do email: ' || sqlerrm || E'\n';
        v_fails := v_fails + 1;
    end;

    -- 4b) trocar o próprio plano exibido tem que falhar
    begin
      update public.profiles set plan_name = plan_name || 'x' where id = v_student;
      v_report := v_report || E'FAIL  aluno conseguiu mudar o próprio plan_name\n';
      v_fails := v_fails + 1;
    exception
      when insufficient_privilege then
        v_report := v_report || E'PASS  aluno NÃO consegue mudar o próprio plan_name\n';
      when others then
        v_report := v_report || E'ERRO  inesperado no teste do plano: ' || sqlerrm || E'\n';
        v_fails := v_fails + 1;
    end;

    -- 5) o que o app grava continua funcionando
    begin
      update public.profiles set name = name, avatar_url = avatar_url where id = v_student;
      v_report := v_report || E'PASS  aluno continua editando name/avatar_url\n';
    exception when others then
      v_report := v_report || E'FAIL  a 019 quebrou a edição de perfil: ' || sqlerrm || E'\n';
      v_fails := v_fails + 1;
    end;

    -- 6) a linha de outras pessoas continua intocável (RLS). Só regrava o mesmo valor.
    begin
      update public.profiles set name = name where id <> v_student;
      get diagnostics v_rows = row_count;
      if v_rows = 0 then
        v_report := v_report || E'PASS  aluno NÃO edita o perfil de outras pessoas\n';
      else
        v_report := v_report || E'FAIL  aluno alcançou ' || v_rows || E' perfil(is) de outras pessoas\n';
        v_fails := v_fails + 1;
      end if;
    exception when others then
      v_report := v_report || E'PASS  aluno NÃO edita o perfil de outras pessoas (' || sqlerrm || E')\n';
    end;

    reset role;
  end if;

  -- 7) handle_new_user não pode mais ler o papel do metadata
  select prosrc into v_src from pg_proc
   where proname = 'handle_new_user' and pronamespace = 'public'::regnamespace;
  if v_src ilike '%raw_user_meta_data->>''role''%' then
    v_report := v_report || E'FAIL  handle_new_user ainda lê o role do metadata (cadastro com role=admin funciona)\n';
    v_fails := v_fails + 1;
  else
    v_report := v_report || E'PASS  handle_new_user ignora o role do metadata\n';
  end if;

  -- 8) o trigger de proteção existe
  select count(*) into v_rows from pg_trigger
   where tgname = 'trg_protect_profile_columns' and not tgisinternal;
  if v_rows = 1 then
    v_report := v_report || E'PASS  trigger trg_protect_profile_columns está instalado\n';
  else
    v_report := v_report || E'FAIL  trigger trg_protect_profile_columns NÃO está instalado\n';
    v_fails := v_fails + 1;
  end if;

  -- Termina SEMPRE com erro: é o que faz o Postgres desfazer tudo acima.
  raise exception E'\n\n===== RESULTADO (este erro é de propósito: desfaz tudo) =====\n%\n%\n',
    v_report,
    case when v_fails = 0
         then 'TUDO CERTO: a proteção está ativa.'
         else v_fails || ' problema(s): a escalada de privilégio AINDA é possível.'
    end;
end $$;
