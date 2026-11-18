# RastaHale Academy

Plataforma mobile-first de streaming educacional para artes marciais
(Jiu-Jitsu Brasileiro e Luta Livre) — web (Vercel), Android e iOS (Capacitor).

## Desenvolvimento

```bash
npm install
npm run dev        # localhost:8080
npm run verify     # tipos + lint + testes (roda na Vercel antes do build)
```

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `CLAUDE.md` | Arquitetura, convenções e decisões do projeto |
| `BUILD-IOS.md` | Publicação na App Store (do zero à revisão) |
| `BUILD-ANDROID.md` | Publicação na Play Store |
| `FIREBASE-SETUP.md` | Login Google/Apple e push notifications |
| `STRIPE-SETUP.md` | Assinaturas (checkout, portal, webhook) |
| `ANDROID-DEEPLINKS-SETUP.md` | App Links / deep links |
| `.env.example` | Todas as variáveis de ambiente explicadas |

## Stack

React 18 + TypeScript + Vite · Tailwind + shadcn/ui · Supabase (auth, Postgres,
edge functions) · Firebase (login social + push) · Bunny Stream (vídeos) ·
Stripe (assinaturas, somente web) · Capacitor 8 (Android/iOS).
