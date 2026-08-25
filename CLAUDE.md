# CLAUDE.md — RastaHale Academy

## 1. Contexto do Projeto

**RastaHale Academy** é uma plataforma mobile-first de streaming educacional para artes marciais — Jiu-Jitsu Brasileiro e Luta Livre. Funciona como um Netflix de aulas, com catálogo de vídeos categorizados por modalidade e nível técnico (Iniciante, Intermediário, Avançado).

**Três perfis de acesso:**
- **Aluno** (`role: "user"`) — navega pelo catálogo, acompanha progresso, gerencia favoritos
- **Instrutor** (`role: "instructor"`) — Studio: sessões de treino, feedback dos alunos, perfil
- **Admin** (`role: "admin"`) — gerencia vídeos, usuários, pagamentos e planos de assinatura

**Credenciais de teste (apenas com `VITE_ENABLE_MOCK=true`):**
```
Aluno:  aluno@rastahale.com   / rasta123
Admin:  admin@rastahale.com   / admin123
```

O backend Supabase está **ativo** — os hooks leem/escrevem no Supabase de verdade, com fallback para mock apenas quando `VITE_SUPABASE_URL` não está definida. O modo mock de auth é **opt-in explícito** (`VITE_ENABLE_MOCK=true`), nunca automático.

---

## 2. Stack e Setup

### Tecnologias principais
| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite (dev server na porta **8080**) |
| Estilização | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Roteamento | React Router DOM 6.30 |
| Estado assíncrono | TanStack React Query 5.83 |
| Formulários | React Hook Form 7.61 + Zod |
| Backend | Supabase (auth, Postgres, RLS) |
| Login social + push | Firebase (Auth Google + Cloud Messaging) |
| Mobile | Capacitor 8 (Android) |
| i18n | react-i18next (pt/en/es — paridade total) |
| Ícones | Lucide React |
| Notificações toast | Sonner |

### Comandos
```bash
npm run dev       # Inicia dev server (localhost:8080)
npm run build     # Build de produção
npm run preview   # Preview do build
npm run lint      # ESLint
npm run test      # Vitest (unitários, jsdom)
npx playwright test  # E2E (requer npx playwright install antes)
npx cap sync android # Sincroniza web build + plugins com o projeto Android
```

### Variáveis de ambiente
Copiar `.env.example` para `.env`. Chaves:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — backend principal
- `VITE_ENABLE_MOCK` — `true` ativa auth mock (dev/demo apenas)
- `VITE_FIREBASE_*` (6 chaves) + `VITE_FIREBASE_VAPID_KEY` — login Google web e push web

O app funciona sem as chaves Firebase (botão Google some, push desativado). Setup completo: **`FIREBASE-SETUP.md`**.

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
│   └── BottomTabBar.tsx     # Navegação inferior mobile (5 tabs)
├── contexts/
│   ├── AuthContext.tsx      # Estado de autenticação global (+ init de push após login)
│   └── ProfileContext.tsx
├── data/
│   └── mockData.ts          # Fallback offline / demo — NÃO é mais a fonte primária
├── hooks/             # useVideos, useProgress, useAdminData, useInstructorComments,
│                      # useStudioSessions, usePWAInstall, use-toast, etc.
├── i18n/              # react-i18next + locales pt/en/es (paridade obrigatória)
├── lib/
│   ├── supabase.ts          # Cliente Supabase tipado
│   ├── database.types.ts    # Tipos das tabelas (manter em sync com migrations)
│   ├── push.ts              # Push notifications (web FCM + nativo Capacitor)
│   ├── auth/
│   │   ├── index.ts         # Seleção de provider (mock opt-in vs híbrido) + login Google
│   │   ├── supabaseProvider.ts  # Email/senha + papel (user/instructor/admin)
│   │   ├── firebase.ts          # Init preguiçoso do Firebase (nunca lança no import)
│   │   ├── firebaseProvider.ts  # Google web (popup) + branch nativo
│   │   ├── firebaseNativeProvider.ts # Google nativo via @capacitor-firebase/authentication
│   │   └── mock.ts          # Provider mock (só com VITE_ENABLE_MOCK=true)
│   └── utils.ts             # cn()
├── pages/
│   ├── admin/               # AdminDashboard, AdminVideos, AdminUsers, AdminPayments, AdminPlans
│   ├── studio/              # Área do instrutor (StudioDashboard, StudioSessoes, etc.)
│   └── ...                  # Index, Search, Favorites, ProgressPage, Profile, Login, etc.
└── test/                    # Vitest + jsdom (setup.ts carrega via vite.config)
```

### Fluxo de autenticação
1. `Login.tsx` chama `login()` do `AuthContext`, que delega ao `authProvider` (`src/lib/auth/index.ts`)
2. Email/senha → Supabase Auth; papel resolvido via `profiles.role` e `instructors.user_id`
3. Google → Firebase (popup na web, `@capacitor-firebase/authentication` no Android) → `supabase.auth.signInWithIdToken()` — sessão final é sempre Supabase
4. Mock só com `VITE_ENABLE_MOCK=true`, persistido em `sessionStorage`
5. `ProtectedRoute` em `App.tsx` redireciona para `/login`; rotas `/admin/*` e `/studio/*` verificam papel

### Push notifications
- Módulo único: `src/lib/push.ts` — `initPushNotifications(userId)` (silencioso, após login), `enablePushNotifications(userId)` / `disablePushNotifications()` (toggles de Settings)
- Web: `firebase/messaging` + VAPID; o SW único `public/sw.js` (anti-cache + listener `push`) é o registration passado ao `getToken()` — **não criar um segundo service worker**
- Android: `@capacitor/push-notifications` + FCM (`google-services.json` necessário)
- Tokens persistidos na tabela `push_tokens` (migration 016); envio é server-side (FCM HTTP v1)

---

## 4. Convenções e Padrões

### Estilização
- Sempre usar `cn()` de `@/lib/utils` para combinar classes Tailwind condicionais
- Cores via **variáveis CSS HSL** definidas em `index.css` — nunca hardcoded
- Tema dark por padrão
- Componentes de UI: importar exclusivamente de `@/components/ui/` — use `npx shadcn@latest add <component>` para novos

### Componentes
- Novos componentes reutilizáveis vão em `src/components/`; páginas em `src/pages/`
- Não editar arquivos em `src/components/ui/` diretamente

### Dados e estado
- Queries/mutations: `useQuery` / `useMutation` (TanStack Query) contra o Supabase
- Fallback para `mockData.ts` **apenas** quando Supabase não configurado — mutations NUNCA caem silenciosamente para mock quando o Supabase está configurado e falha: propagam erro e tostam
- Novas chaves de texto: adicionar em `src/i18n/locales/{pt,en,es}.json` (paridade obrigatória)

### TypeScript
- `strict: false` — configuração permissiva para prototipagem rápida; não ativar strict sem revisar o codebase
- `src/lib/database.types.ts` é mantido à mão — atualizar ao criar migration

---

## 5. Gotchas e Decisões Importantes

**Mock é opt-in e nunca automático**
`VITE_ENABLE_MOCK=true` é a única forma de ativar o auth mock — evita expor credenciais hardcoded em produção.

**Firebase init é preguiçoso**
`getFirebaseApp()/getFirebaseAuth()` só inicializam sob demanda e lançam `AuthError` amigável sem as env vars — nunca inicializar Firebase no topo de módulo (derrubava o app inteiro).

**Google login no Android é nativo, não popup**
`signInWithPopup` não funciona no WebView do Capacitor. O branch nativo usa `@capacitor-firebase/authentication` e depende de `android/app/google-services.json` + SHA-1/SHA-256 registrados no Firebase Console (senão: `DEVELOPER_ERROR`). Ver `FIREBASE-SETUP.md`.

**Um único service worker**
`public/sw.js` acumula anti-cache + push FCM. Dois workers no escopo `/` disputam o controle da página — não criar `firebase-messaging-sw.js` separado.

**Instrutores autenticam via Supabase Auth**
Desde a migration 015, `instructors.user_id` vincula ao `auth.users`; a coluna `login_password` foi removida (existia em plaintext, exposta via anon key). SELECT de `instructors` é restrito a `authenticated`.

**Viewport fixo em 430px (aluno)**
O layout mobile não foi desenhado para desktop; não expandir breakpoints sem refatoração dos layouts.

**ESLint: `no-unused-vars` desativado**
Proposital para o ritmo de prototipagem. Warnings `react-refresh/only-export-components` são conhecidos.

**Lovable integration**
`vite.config.ts` inclui `componentTagger()` do `lovable-tagger` em modo dev. Não remover.

**Senha do banco vazada**
O `.env` alerta que a senha do Postgres vazou em `supabase/.temp/pooler-url` — rotacionar no Supabase Dashboard.

---

## 6. Backend Supabase

### Migrations
Em `supabase/migrations/` (001–016). Aplicar em ordem no SQL Editor ou via `supabase db push`. Destaques:
- 013 `instructor_comments` — feedback aluno→instrutor (antes: sessionStorage local)
- 014 `studio_sessions` — sessões do Studio visíveis aos alunos (antes: sessionStorage local)
- 015 `instructor_auth` — `instructors.user_id`, fim do `login_password` plaintext
- 016 `push_tokens` — tokens FCM por usuário/plataforma

Após aplicar 015, rodar `node scripts/seed-users.mjs` para vincular o professor ao auth user.

### RLS
Alunos só escrevem/leem seus próprios dados (`user_progress`, `push_tokens`, comentários próprios); instrutores gerenciam suas sessões; `public.is_admin()` libera acesso total ao admin.

### Tabelas principais
`videos`, `instructors`, `plans`, `profiles`, `payments`, `user_progress`, `instructor_comments`, `studio_sessions`, `push_tokens`.
