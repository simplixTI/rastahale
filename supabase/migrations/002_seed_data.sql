-- ============================================================
-- RastaHale Academy — Seed: dados iniciais
-- ============================================================

-- ── Instrutores ───────────────────────────────────────────────
insert into public.instructors (id, name, avatar_url, bio) values
  ('inst-1', 'Rafael Leão',  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop', 'Faixa preta 3º grau de Jiu Jitsu. 15 anos de experiência.'),
  ('inst-3', 'Diego Santos', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', 'Campeão nacional de Luta Livre. Instrutor há 10 anos.')
on conflict (id) do nothing;

-- ── Planos ────────────────────────────────────────────────────
insert into public.plans (id, name, price, interval, features, active, categories, max_level) values
  ('plan-1', 'Básico', 39.90, 'mensal',
   array['Acesso a aulas de Fundamentos', '1 categoria', 'Suporte por email'],
   true, array['Fundamentos'], 'Iniciante'),
  ('plan-2', 'Premium', 79.90, 'mensal',
   array['Acesso total', 'Todas as categorias', 'Aulas avançadas', 'Suporte prioritário', 'Downloads offline'],
   true, array['Fundamentos','Avançado','Defesas','Condicionamento','Raspagens','Finalizações','Passagem de Guarda'], 'Avançado'),
  ('plan-3', 'Anual Premium', 699.90, 'anual',
   array['Tudo do Premium', '2 meses grátis', 'Acesso antecipado', 'Mentoria mensal'],
   true, array['Fundamentos','Avançado','Defesas','Condicionamento','Raspagens','Finalizações','Passagem de Guarda'], 'Avançado')
on conflict (id) do nothing;

-- ── Vídeos ────────────────────────────────────────────────────
insert into public.videos (id, title, description, thumbnail, duration, category, subcategory, level, instructor_id, visible, unlock_by_progress, required_progress) values
  ('v1',  'Guarda Fechada — Fundamentos',      'Aprenda os princípios básicos da guarda fechada, incluindo postura, controle de distância e as primeiras finalizações.',  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=225&fit=crop',  '12:30', 'jiu-jitsu',  'Fundamentos',         'Iniciante',    'inst-1', true,  false, 0),
  ('v2',  'Passagem de Guarda Básica',          'Técnicas essenciais para passar a guarda do oponente com segurança e eficiência.',                                         'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=400&h=225&fit=crop',  '15:45', 'jiu-jitsu',  'Passagem de Guarda',  'Iniciante',    'inst-1', true,  false, 0),
  ('v3',  'Raspagens da Guarda',                'Domine as principais raspagens partindo da guarda fechada.',                                                                'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop',  '18:20', 'jiu-jitsu',  'Raspagens',           'Intermediário', 'inst-1', true,  false, 0),
  ('v4',  'Montada e Controle',                 'Como manter a posição montada e aplicar pressão eficiente.',                                                               'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400&h=225&fit=crop',  '14:10', 'jiu-jitsu',  'Fundamentos',         'Iniciante',    'inst-1', true,  false, 0),
  ('v5',  'Berimbolo — Entrada e Controle',     'Técnica avançada de inversão para chegar às costas do oponente.',                                                          'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=225&fit=crop',  '22:15', 'jiu-jitsu',  'Avançado',            'Avançado',     'inst-1', true,  true,  50),
  ('v6',  'Leg Lock System',                    'Sistema completo de ataques às pernas com transições fluidas.',                                                             'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop',  '25:00', 'jiu-jitsu',  'Finalizações',        'Avançado',     'inst-1', true,  false, 0),
  ('v7',  'Triângulo — Variações Avançadas',    'Todas as variações do triângulo partindo de diferentes posições.',                                                          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=225&fit=crop',  '19:40', 'jiu-jitsu',  'Finalizações',        'Avançado',     'inst-1', false, false, 0),
  ('v8',  'Defesa de Queda',                    'Como defender quedas e manter a posição em pé.',                                                                           'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=225&fit=crop',  '17:00', 'luta-livre', 'Defesas',             'Iniciante',    'inst-3', true,  false, 0),
  ('v9',  'Controle no Solo',                   'Posições de controle e transições no chão.',                                                                               'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=225&fit=crop',  '20:15', 'luta-livre', 'Fundamentos',         'Intermediário', 'inst-3', true,  false, 0),
  ('v10', 'Finalizações da Luta Livre',          'As finalizações mais eficientes da luta livre esportiva.',                                                                 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=225&fit=crop',  '23:30', 'luta-livre', 'Finalizações',        'Avançado',     'inst-3', true,  false, 0),
  ('v11', 'Condicionamento para Luta',           'Treino físico específico para artes marciais e luta livre.',                                                               'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=225&fit=crop',  '30:00', 'luta-livre', 'Condicionamento',     'Intermediário', 'inst-3', true,  false, 0),
  ('v12', 'Defesa de Arm Lock',                 'Técnicas de defesa contra arm lock e kimura.',                                                                             'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=225&fit=crop',  '16:00', 'jiu-jitsu',  'Defesas',             'Intermediário', 'inst-1', true,  false, 0),
  ('v13', 'HIIT para Lutadores',                'Treino intervalado de alta intensidade focado em artes marciais.',                                                          'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop',  '28:00', 'jiu-jitsu',  'Condicionamento',     'Intermediário', 'inst-1', true,  false, 0),
  ('v14', 'Defesa de Estrangulamento',           'Como escapar dos principais estrangulamentos.',                                                                            'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=225&fit=crop',  '15:30', 'jiu-jitsu',  'Defesas',             'Avançado',     'inst-1', true,  true,  60)
on conflict (id) do nothing;

-- ── Usuários de teste (via Supabase Auth Admin API) ───────────
-- ATENÇÃO: execute este bloco via script Node.js (ver scripts/seed-users.mjs)
-- pois requer a service_role_key para criar usuários no auth.users

-- ── Pagamentos de exemplo (inseridos após criar os usuários) ──
-- Ver scripts/seed-users.mjs para a inserção completa com UUIDs reais
