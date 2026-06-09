# CLAUDE.md — RastaHale Academy

## 1. Contexto do Projeto

**RastaHale Academy** é uma plataforma mobile-first de streaming educacional para artes marciais — Jiu-Jitsu Brasileiro e Luta Livre. Funciona como um Netflix de aulas, com catálogo de vídeos categorizados por modalidade e nível técnico (Iniciante, Intermediário, Avançado).

**Dois perfis de acesso:**
- **Aluno** (`role: "user"`) — navega pelo catálogo, acompanha progresso, gerencia favoritos
- **Admin** (`role: "admin"`) — gerencia vídeos, usuários, pagamentos e planos de assinatura

**Credenciais de teste:**
```
Aluno:  aluno@rastahale.com   / rasta123
Admin:  admin@rastahale.com   / admin123
```

O projeto foi criado via Lovable (plataforma de geração de UI). O backend Supabase está configurado mas ainda inativo — toda a lógica roda com dados mock no cliente.

---

## 2. Stack e Setup

### Tecnologias principais
| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite 5.4 (dev server na porta **8080**) |
| Estilização | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Roteamento | React Router DOM 6.30 |
| Estado assíncrono | TanStack React Query 5.83 |
| Formulários | React Hook Form 7.61 + Zod |
| Ícones | Lucide React |
| Notificações | Sonner |
| Gráficos | Recharts 2.15 |
| Backend (futuro) | Supabase |

### Comandos
```bash
npm run dev       # Inicia dev server (localhost:8080)
npm run build     # Build de produção
npm run preview   # Preview do build
npm run lint      # ESLint
npm run test      # Vitest (unitários)
npm run test:watch
```

### Variáveis de ambiente
Copiar `.env.example` para `.env`. As chaves Supabase já estão configuradas no `.env` do projeto mas não estão sendo usadas ativamente — o app roda sem elas enquanto usar mock data.

---

## 3. Arquitetura Atual

### Estrutura de diretórios
```
src/
├── assets/          # Logo e imagens estáticas
├── components/
│   ├── ui/          # 40+ componentes shadcn/ui — NÃO modificar diretamente
│   ├── AdminLayout.tsx      # Wrapper de layout para rotas admin
│   ├── MobileLayout.tsx     # Wrapper de layout para rotas de aluno
│   ├── BottomTabBar.tsx     # Navegação inferior mobile (5 tabs)
│   └── VideoCard.tsx        # Card reutilizável de vídeo
├── contexts/
│   └── AuthContext.tsx      # Estado de autenticação global
├── data/
│   └── mockData.ts          # FONTE ÚNICA DE VERDADE hoje
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   └── utils.ts             # Utilitário cn() para Tailwind
├── pages/
│   ├── admin/               # AdminDashboard, AdminVideos, AdminUsers, AdminPayments, AdminPlans
│   ├── Index.tsx            # Home (hero + carrosséis estilo Netflix)
│   ├── Search.tsx           # Busca e filtros
│   ├── Favorites.tsx        # Favoritos
│   ├── ProgressPage.tsx     # Progresso do aluno
│   ├── Profile.tsx          # Perfil e configurações
│   ├── VideoDetail.tsx      # Player + vídeos relacionados
│   └── Login.tsx            # Autenticação
└── test/                    # Vitest + jsdom
```

### Fluxo de autenticação
1. `Login.tsx` chama `login()` do `AuthContext`
2. Credenciais validadas contra `mockData.ts` (campo `TEST_USER` / `TEST_ADMIN`)
3. Estado persiste em **`sessionStorage`** (fecha aba = logout automático)
4. `ProtectedRoute` em `App.tsx` redireciona para `/login` se não autenticado
5. Rotas `/admin/*` verificam `user.role === "admin"` — redirect se aluno tentar acessar

### Layouts
- **Aluno:** `MobileLayout` (viewport 430px, fundo dark) + `BottomTabBar` (Home/Buscar/Favoritos/Progresso/Perfil)
- **Admin:** `AdminLayout` (header + sidebar desktop + content)

---

## 4. Convenções e Padrões

### Estilização
- Sempre usar `cn()` de `@/lib/utils` para combinar classes Tailwind condicionais
- Cores via **variáveis CSS HSL** definidas em `index.css` — nunca hardcoded (ex: `bg-primary` não `bg-orange-500`)
- Tema dark por padrão; variáveis principais: `--background`, `--foreground`, `--primary`, `--card`, `--accent`
- Componentes de UI: importar exclusivamente de `@/components/ui/` (shadcn) — não instalar duplicatas

### Componentes
- Novos componentes reutilizáveis vão em `src/components/`
- Páginas completas vão em `src/pages/`
- Componentes shadcn: não editar arquivos em `src/components/ui/` diretamente; use `npx shadcn@latest add <component>` para adicionar novos

### Dados e estado
- Toda manipulação de dados mock passa por `src/data/mockData.ts`
- Para queries assíncronas (futuro): usar `useQuery` / `useMutation` do TanStack Query
- Estado local de UI: `useState` / `useReducer` — sem Zustand/Redux por enquanto

### TypeScript
- `strict: false` e `noImplicitAny: false` — configuração permissiva para prototipagem rápida
- Não ativar strict mode sem revisar todo o codebase antes
- Interfaces de dados principais estão em `mockData.ts`: `Video`, `User`, `Payment`, `Plan`, `Instructor`

### Formulários
- React Hook Form + Zod para validação
- Schema Zod define o contrato; `useForm` consome via `zodResolver`

---

## 5. Gotchas e Decisões Importantes

**`sessionStorage` para auth — intencional**
Garante que fechar o browser faz logout. Não migrar para `localStorage` sem decisão explícita do produto.

**Viewport fixo em 430px**
O app foi desenhado para mobile (iPhone). Não expandir para breakpoints desktop sem uma decisão arquitetural — o layout quebraria sem refatoração dos layouts e navegação.

**Mock data é a fonte de verdade**
Não há chamadas de API reais. Qualquer "persistência" durante a sessão é mutação em memória do array importado de `mockData.ts`. Mudanças não sobrevivem a refresh.

**Áudio no login**
O efeito sonoro "ta-dum" em `Login.tsx` usa a **Web Audio API** sintetizada em código — não há arquivo de áudio externo. Funciona apenas em contextos com user interaction (click).

**ESLint: `no-unused-vars` desativado**
Configuração proposital para o ritmo de prototipagem. Não reativar sem limpar variáveis não usadas no projeto primeiro.

**Lovable integration**
`vite.config.ts` inclui `componentTagger()` do `lovable-tagger` em modo dev. Não remover — é usado pela plataforma Lovable para rastrear componentes.

**Supabase keys no `.env`**
As chaves estão no `.env` mas o cliente Supabase não está sendo instanciado em lugar nenhum ainda. O arquivo `.env` não deve ser commitado — está no `.gitignore`.

---

## 6. Roadmap: Integração Supabase

Quando o backend for ativado, seguir esta sequência:

### Estrutura de tabelas sugerida
```sql
videos        (id, title, description, thumbnail, duration, category, subcategory, level, instructor_id, visible, unlock_by_progress, required_progress)
instructors   (id, name, avatar_url, bio)
plans         (id, name, price, interval, features, active, categories, max_level)
profiles      (id, email, name, avatar_url, plan_id, status, joined_at)  -- estende auth.users
payments      (id, user_id, amount, method, status, date, plan_id)
user_progress (user_id, video_id, progress, watched, is_favorite, last_watched_at)
```

### Padrão de migração
1. Criar cliente Supabase em `src/lib/supabase.ts`
2. Substituir cada entidade de `mockData.ts` por um hook `use<Entity>.ts` com `useQuery` + Supabase client
3. Migrar `AuthContext` para usar `supabase.auth` (mantendo a mesma interface pública do context)
4. Adicionar RLS policies: alunos só leem seus próprios `user_progress` e `payments`; admins têm acesso total

### Auth com Supabase
```typescript
// Padrão a seguir em AuthContext após migração:
const { data: { user } } = await supabase.auth.getUser()
// role vem de user_metadata ou de uma tabela profiles
```

### Ordem recomendada de migração
1. Auth (AuthContext → Supabase Auth)
2. Videos + Instructors (somente leitura, menor risco)
3. User Progress (leitura + escrita por aluno)
4. Plans (leitura pública)
5. Payments + Users (admin only, com RLS)
