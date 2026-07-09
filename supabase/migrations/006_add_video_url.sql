-- ============================================================
--  006_add_video_url.sql
--  Corrige um schema drift: a coluna `video_url` existe em
--  001_initial_schema.sql, mas foi OMITIDA de full_migration.sql — que é o
--  script realmente aplicado em produção. Sem essa coluna, todo insert/update
--  de vídeo (admin e /studio) que envia `video_url` falha com:
--      PGRST204 "Could not find the 'video_url' column of 'videos'..."
--  Resultado: o modal de upload fecha "com sucesso" mas o vídeo NÃO é salvo
--  e nunca chega à área do aluno.
--
--  Idempotente — seguro rodar múltiplas vezes.
-- ============================================================

alter table public.videos add column if not exists video_url text;

-- Recarrega o schema cache do PostgREST para reconhecer a coluna na hora
-- (sem isso, o erro PGRST204 pode persistir até o cache expirar).
notify pgrst, 'reload schema';
