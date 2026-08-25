# Firebase — Setup completo (login Google + push notifications)

Este guia configura o Firebase para o RastaHale Academy: login com Google
(web e Android nativo) e push notifications (PWA web e Android).

Resumo da arquitetura:

- **Web**: Firebase JS SDK (`signInWithPopup`) → o `idToken` do Google é
  trocado por uma sessão Supabase via `supabase.auth.signInWithIdToken`.
- **Android nativo**: plugin `@capacitor-firebase/authentication` (Credential
  Manager) → mesmo `idToken` → mesma troca no Supabase.
- **Push web**: `firebase/messaging` + a chave VAPID, usando o service worker
  do próprio app (`public/sw.js`).
- **Push Android**: `@capacitor/push-notifications` (FCM nativo).
- Os tokens FCM ficam na tabela `push_tokens` do Supabase (migration 016).

---

## 1. Criar o projeto no Firebase Console

1. Acesse <https://console.firebase.google.com> → **Add project**.
2. Nome: `rastahale-academy` (ou similar). Google Analytics é opcional.

## 2. Ativar Authentication → Google

1. No menu lateral: **Build → Authentication → Get started**.
2. Aba **Sign-in method** → **Google** → **Enable** → selecione o e-mail de
   suporte → **Save**.

## 3. Registrar o app Web e copiar as chaves para o `.env`

1. **Project settings (engrenagem) → General → Your apps** → ícone `</>` (Web).
2. Apelido: `RastaHale Web`. **Não** marque Firebase Hosting.
3. Copie os valores do `firebaseConfig` para o `.env` na raiz:

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

   (ver `.env.example` para o formato exato)

## 4. Authorized domains

Em **Authentication → Settings → Authorized domains**, adicione o domínio de
produção (ex.: `app.rastahale.com`). `localhost` já vem liberado.

## 5. Supabase: habilitar o provider Google

O app troca o `idToken` do Firebase por uma sessão Supabase
(`signInWithIdToken`). Para isso funcionar:

1. No **Firebase Console → Project settings → Service accounts**, ou no
   **Google Cloud Console → APIs & Services → Credentials**, copie o
   **Web Client ID** (OAuth 2.0, tipo "Web application") do projeto.
2. No **Supabase Dashboard → Authentication → Sign In / Providers → Google**:
   - Habilite o provider.
   - Em **Client IDs**, cole o Web Client ID.
   - **Skip nonce check** pode ficar desligado.
3. Salve.

> Sem este passo, o login Google falha com "provider is not enabled" ou erro
> de token inválido no Supabase.

## 6. App Android (google-services.json + SHA)

1. **Firebase Console → Project settings → Your apps** → ícone Android.
2. **Package name**: `com.rastahale.academy` (obrigatório — é o `appId`).
3. Baixe o **`google-services.json`** e coloque em `android/app/`.
   - O `android/app/build.gradle` só aplica o plugin `google-services` se o
     arquivo existir — **o build continua funcionando sem ele** (login Google
     nativo e push Android é que ficam inoperantes).
4. **Registre as impressões digitais SHA-1 e SHA-256** do keystore no app
   Android do Firebase (Project settings → Your apps → SHA certificate
   fingerprints):

   ```bash
   # Debug keystore (desenvolvimento):
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # Keystore de release (o mesmo de android/keystore.properties):
   keytool -list -v -keystore <caminho-do-keystore> -alias <keyAlias>
   ```

   > **Sem o SHA-1/SHA-256 registrado, o login Google nativo falha com
   > `DEVELOPER_ERROR`** (o seletor de contas abre e fecha, ou nem abre).
   > Se usar Play App Signing, registre também o SHA do "App signing
   > certificate" do Play Console.

## 7. Cloud Messaging (push)

### Web (VAPID)

1. **Firebase Console → Project settings → Cloud Messaging**.
2. Em **Web Push certificates** → **Generate key pair**.
3. Copie a chave pública para o `.env`:

   ```
   VITE_FIREBASE_VAPID_KEY=
   ```

### Android

Nada extra no código: com o `google-services.json` no lugar e o FCM ativo no
projeto, o plugin `@capacitor/push-notifications` já registra o dispositivo.
No Android 13+, o app pede a permissão `POST_NOTIFICATIONS` em runtime
(o toggle de notificações em Configurações dispara o pedido).

## 8. Rodar a migration 016 no Supabase

A tabela `push_tokens` guarda os tokens FCM por usuário/dispositivo:

```bash
supabase db push   # ou cole supabase/migrations/016_push_tokens.sql no SQL Editor
```

## 9. Como testar

### Web

1. Preencha o `.env`, rode `npm run dev` (ou o deploy em HTTPS — push exige
   contexto seguro).
2. Login com Google: botão na tela de login.
3. Push: faça login → **Perfil → Configurações** → ligue um toggle de
   notificação → aceite a permissão. O token aparece na tabela `push_tokens`.
4. Envie um teste pelo **Firebase Console → Cloud Messaging → Send test
   message** com o token da tabela.

### Android

1. Com o `google-services.json` em `android/app/`:

   ```bash
   npm run build
   npx cap sync android
   npx cap open android   # roda num dispositivo/emulador com Google Play Services
   ```

2. Login com Google: abre o seletor de contas nativo.
3. Push: ligue o toggle em Configurações → aceite a permissão → o token vai
   para `push_tokens` com `platform = 'android'`.

## 10. Enviando notificações (server-side)

O envio é feito pelo script `scripts/send-push.mjs`, que usa a **service account**
do Firebase (Admin SDK) para falar com o FCM e lê os tokens de `push_tokens`
com a service role key do Supabase.

1. Baixe a service account: Firebase Console → **Project settings → Service accounts
   → Generate new private key**. Salve como `firebase-service-account.json` na raiz
   do projeto. **Esse arquivo é um segredo de servidor** — já está no `.gitignore`,
   nunca commite nem exponha no cliente.
2. Envie:

   ```bash
   npm run push -- "Título" "Mensagem"                      # todos os dispositivos
   npm run push -- "Título" "Mensagem" -- --user <uuid>     # um usuário
   npm run push -- "Título" "Mensagem" -- --url /video/v1   # deep link ao clicar
   ```

3. Tokens que o FCM reportar como inválidos (app desinstalado etc.) são removidos
   da tabela automaticamente.

---

## Troubleshooting

| Sintoma | Causa provável |
| --- | --- |
| `DEVELOPER_ERROR` no login Android | SHA-1/SHA-256 não registrados (passo 6.4) |
| "provider is not enabled" após login Google | Passo 5 não feito no Supabase |
| Push web não chega | Falta `VITE_FIREBASE_VAPID_KEY` ou o domínio não está em Authorized domains |
| Push Android não registra token | `google-services.json` ausente/emulador sem Play Services |
| Login Google web abre e fecha | Domínio não autorizado (passo 4) |
