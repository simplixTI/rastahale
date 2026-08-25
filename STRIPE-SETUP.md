# STRIPE-SETUP.md — RastaHale Academy

Passo a passo pra ligar o Stripe do zero. Segue tudo em modo teste (`sk_test_` / `pk_test_`) — nunca use chave live durante o desenvolvimento.

---

## 1. Aplicar a migration no Supabase

No SQL Editor do Dashboard do Supabase (ou via `supabase db push`), rode:

```sql
-- Arquivo: supabase/migrations/018_stripe_integration.sql
```

Adiciona colunas `stripe_*` em `plans`, `profiles` e `payments`, mais o helper `plan_id_by_stripe_price`. Nada é removido: sem Stripe configurado, o app continua funcionando como antes.

---

## 2. Criar conta e ativar modo teste no Stripe

1. Cria conta em [dashboard.stripe.com](https://dashboard.stripe.com) (2 min)
2. No canto superior direito, ative o **toggle "Modo de teste"** — o header fica com fundo laranja
3. Menu **Desenvolvedores → Chaves de API**
4. Copie:
   - **Publishable key** — começa com `pk_test_...`
   - **Secret key** — começa com `sk_test_...`

---

## 3. Configurar as variáveis de ambiente

### 3.1. Cliente (browser, no `.env` local)

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3.2. Edge Functions do Supabase

As funções rodam no Deno da Supabase, então as chaves vão via `functions secrets`, não pelo `.env` do frontend:

```bash
# Instale a CLI uma vez: npm install -g supabase
supabase login
supabase link --project-ref <SEU_PROJECT_REF>

# Chaves do Stripe (modo teste)
supabase functions secrets set STRIPE_SECRET_KEY=sk_test_...
supabase functions secrets set STRIPE_WEBHOOK_SECRET=whsec_...   # (setado no passo 5)

# URL do app pro success/cancel do checkout e retorno do portal
supabase functions secrets set APP_URL=http://localhost:8080     # dev
# em produção: supabase functions secrets set APP_URL=https://app.rastahale.com

# Service role (só se ainda não estiver setada — a Supabase adiciona automaticamente)
supabase functions secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

Confira o que está setado:

```bash
supabase functions secrets list
```

---

## 4. Deployar as 4 edge functions

```bash
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy admin-sync-plan
supabase functions deploy stripe-webhook   # única sem JWT (o Stripe chama direto)
```

Depois do deploy, cada uma tem uma URL:

```
https://<PROJECT_REF>.supabase.co/functions/v1/create-checkout
https://<PROJECT_REF>.supabase.co/functions/v1/create-portal
https://<PROJECT_REF>.supabase.co/functions/v1/admin-sync-plan
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

Anote a URL do `stripe-webhook` — vai ser usada no próximo passo.

---

## 5. Configurar o webhook no Stripe

Dashboard Stripe → **Desenvolvedores → Webhooks → Adicionar endpoint**:

- **URL do endpoint:** `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
- **Eventos pra escutar** (adicione um por um):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Depois de criar, clique no endpoint e copie o **Signing secret** (começa com `whsec_...`). Setar como secret:

```bash
supabase functions secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy stripe-webhook   # re-deploy pra pegar a nova secret
```

---

## 6. Ativar PIX (opcional, mas fortemente recomendado no BR)

Dashboard Stripe → **Configurações → Métodos de pagamento** → ative **PIX**.

- Modo teste: aprovação instantânea
- Modo live: aprovação ~1 dia (Stripe pede documentação da empresa)

Depois de ativado, edite `supabase/functions/create-checkout/index.ts`:

```ts
payment_method_types: ["card", "pix"],   // adicione "pix"
```

E re-deploy:

```bash
supabase functions deploy create-checkout
```

---

## 7. Configurar o Customer Portal

Dashboard Stripe → **Configurações → Portal do cliente**:

- Marque **"Assinaturas → Permitir cancelamento"** (cancelamento ao fim do ciclo)
- Marque **"Assinaturas → Permitir troca de plano"** (para o fluxo de upgrade/downgrade)
- Adicione os produtos que quer permitir trocar
- Ative **"Faturas → Permitir download"**
- Ative **"Métodos de pagamento → Permitir atualização"**
- **Salvar**

Sem essa configuração, o portal abre em "modo pobre" (só ver histórico).

---

## 8. Criar os planos no admin e sincronizar

1. Login como admin em `/admin/planos`
2. Clique **"Criar Novo Plano"** — preencha nome, preço, intervalo etc.
3. Ao salvar, o app chama `admin-sync-plan` automaticamente e sincroniza com o Stripe:
   - Cria um **product** no Stripe
   - Cria um **price** no Stripe
   - Salva `stripe_product_id` e `stripe_price_id` no banco
4. Se sincronizar falhar (rede/config), aparece um toast — dá pra retentar clicando **"Sync Stripe"** no plano expandido

Ao editar um plano com preço diferente, o preço antigo é **arquivado** (não deletado — assinaturas antigas continuam válidas) e um novo é criado. O histórico fica em `plans.stripe_price_history`.

---

## 9. Testar o fluxo completo do aluno

1. Login como aluno
2. Vai em **Perfil → Meu Plano**
3. Clica **"Assinar"** (ou "Trocar Plano" se já tiver algum)
4. Redireciona pra Checkout do Stripe
5. Usa um **cartão de teste**:
   - Número: `4242 4242 4242 4242`
   - Data: qualquer futura (ex: `12/34`)
   - CVC: qualquer 3 dígitos (ex: `123`)
6. Confirma pagamento — volta pro app em `/perfil/plano?checkout=success`
7. Em ~2 segundos o webhook `invoice.paid` chega e:
   - Cria uma linha em `payments`
   - Atualiza `profiles.subscription_status = "active"`
   - Atualiza `profiles.stripe_subscription_id`
   - Atualiza `profiles.current_period_end`

### Cartões de teste úteis (Stripe)

| Cenário | Cartão |
|---------|--------|
| Sucesso | `4242 4242 4242 4242` |
| Falha genérica | `4000 0000 0000 0002` |
| 3D Secure obrigatório | `4000 0025 0000 3155` |
| Sem fundos | `4000 0000 0000 9995` |

Lista completa: [stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## 10. Testar o webhook localmente (dev sem deploy)

Se quiser iterar no `stripe-webhook` sem deployar toda hora:

```bash
# Terminal 1 — encaminha eventos do Stripe pra sua função local
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# A saída mostra um whsec_... — use como STRIPE_WEBHOOK_SECRET local

# Terminal 2 — roda a função Supabase local
supabase functions serve stripe-webhook --env-file supabase/.env.local
```

Dispara evento manual:

```bash
stripe trigger invoice.paid
```

---

## 11. Ir pra produção (live)

Quando for lançar de verdade:

1. **Rotacione** qualquer chave live que já tenha aparecido em código ou log
2. Ative **modo live** no Dashboard Stripe (toggle no canto superior direito)
3. Complete o cadastro da empresa e conta bancária
4. Ative PIX no modo live (leva ~1 dia)
5. Crie um **novo webhook** apontando pra mesma URL do `stripe-webhook`, mas em modo live — ele terá um `whsec_` diferente
6. Re-configure secrets:
   ```bash
   supabase functions secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase functions secrets set STRIPE_WEBHOOK_SECRET=whsec_...   # o novo, live
   supabase functions secrets set APP_URL=https://app.rastahale.com
   supabase functions deploy stripe-webhook create-checkout create-portal admin-sync-plan
   ```
7. Atualize `.env` de produção com `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
8. Re-sincronize os planos (Admin → Planos → cada plano → **Sync Stripe**) — em modo live você tem outra conta Stripe, então os `stripe_price_id` de teste não valem mais

---

## Troubleshooting

**"Plano ainda não sincronizado com o Stripe"** ao clicar Assinar
→ vá em `/admin/planos`, expanda o plano, clique **Sync Stripe**.

**Webhook retorna 400 "Invalid signature"**
→ o `STRIPE_WEBHOOK_SECRET` no Supabase não bate com o signing secret do endpoint no Stripe. Copie de novo do Dashboard Stripe → Webhooks → seu endpoint → "Signing secret". Rode `supabase functions secrets set STRIPE_WEBHOOK_SECRET=whsec_...` e re-deploy.

**Checkout abre mas mostra "No such price"**
→ o `stripe_price_id` no banco foi criado com uma chave de outra conta (ex: teste vs live). Force uma re-sincronização do plano.

**Assinatura criada no Stripe mas perfil continua "inativo"**
→ o webhook não chegou ou falhou. Vá em Dashboard Stripe → Webhooks → seu endpoint → aba "Recent events" pra ver o erro. Reenvie o evento manualmente clicando "Resend".

**Portal do cliente abre em modo mínimo (só histórico)**
→ falta configurar o que o cliente pode fazer no Dashboard → Settings → Customer portal (passo 7).
