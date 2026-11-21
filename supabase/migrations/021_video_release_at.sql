-- Liberação agendada: antes desta data a aula aparece como "Em breve" para o
-- aluno e o servidor (bunny-stream) recusa a reprodução. Nulo = já liberada.
alter table public.videos add column if not exists release_at timestamptz;
