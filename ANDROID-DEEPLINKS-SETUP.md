# ANDROID-DEEPLINKS-SETUP.md — App Links (RastaHale Academy)

Este guia habilita **App Links** no Android para que qualquer URL de `rastahalevirtualacademy.com` abra dentro do app RastaHale ao invés do browser. É o que faz o Stripe Checkout voltar direto pro app depois do pagamento (também vale pra qualquer outro deep link — email de reset de senha, notificações push com URL, etc.).

## Como funciona

1. Usuário toca em `https://www.rastahalevirtualacademy.com/perfil/plano?checkout=success` (ou o Stripe redireciona pra essa URL)
2. Android olha `/.well-known/assetlinks.json` no domínio
3. Confirma que o pacote `com.rastahale.academy` está autorizado
4. Abre o app diretamente na rota `/perfil/plano?checkout=success`
5. O hook `useDeepLinks` no React roda `navigate(url.pathname + url.search)`
6. MyPlan.tsx detecta `?checkout=success` no query string e mostra o toast

Sem os passos abaixo, o Android abre a URL no browser normal e o fluxo quebra.

---

## Passo 1 — Pegar a SHA-256 da chave de assinatura

Se você já tem o app publicado na Play Store, o Google gerencia a chave de assinatura. Vá em:

**Play Console → Test and release → Setup → App signing** →
role até **"App signing key certificate"** →
copie o valor de **"SHA-256 certificate fingerprint"**.

Formato: `AA:BB:CC:DD:EE:FF:...` (64 caracteres hex separados por `:`).

### Se você ainda NÃO publicou (build local com signing key própria)

Roda no terminal, dentro da pasta `android/`:

```bash
keytool -list -v -keystore <caminho-do-seu-keystore.jks> -alias <seu-alias>
```

Ou pega da keystore de debug (só serve pra testar em dev, não em produção):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copia a linha `SHA256:`.

---

## Passo 2 — Criar `assetlinks.json`

Cria um arquivo chamado exatamente `assetlinks.json` com este conteúdo (substitua a SHA-256):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.rastahale.academy",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

Se você tiver **duas chaves** (ex: chave de upload local + chave gerenciada pelo Google Play), adicione **as duas SHA-256** na lista `sha256_cert_fingerprints`. É recomendado.

---

## Passo 3 — Publicar o arquivo no servidor

O arquivo tem que ficar acessível **exatamente** nestas URLs (as duas, um por variação do domínio):

- `https://www.rastahalevirtualacademy.com/.well-known/assetlinks.json`
- `https://rastahalevirtualacademy.com/.well-known/assetlinks.json`

Regras críticas:

- Content-Type: `application/json` (não `text/html`)
- HTTPS válido (sem certificado auto-assinado)
- Sem redirect (nem 301, nem 302 — resposta 200 direta)

### Como servir dependendo do host

**Vercel / Netlify:** cria a pasta `public/.well-known/` no repositório da landing/site e coloca `assetlinks.json` dentro. Faz o deploy — vai ficar acessível na URL certa automaticamente.

**Servidor próprio (Nginx):** cria o arquivo em `/var/www/html/.well-known/assetlinks.json` e adiciona no config do Nginx:

```nginx
location /.well-known/assetlinks.json {
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

**Apache:** cria `/.well-known/assetlinks.json` na raiz. Se precisar forçar o Content-Type, adiciona no `.htaccess`:

```apache
<Files "assetlinks.json">
    ForceType application/json
</Files>
```

---

## Passo 4 — Rebuild + install do APK

```bash
npm run build
npx cap sync android
```

Abre `android/` no Android Studio → **Build → Generate Signed Bundle / APK** → assina com a mesma chave cuja SHA-256 está no `assetlinks.json`.

Instala o novo APK no seu celular.

---

## Passo 5 — Verificar se o autoVerify passou

No seu celular Android, roda pelo `adb`:

```bash
adb shell dumpsys package com.rastahale.academy | grep -A5 "Domain verification"
```

Ou mais completo:

```bash
adb shell pm get-app-links com.rastahale.academy
```

Deve mostrar `verified` (verde) para os dois domínios. Se aparecer `denied` ou `none`:

- Confirma que a SHA-256 no `assetlinks.json` bate com a chave que assinou o APK
- Confirma que a URL abre no browser e devolve JSON com Content-Type correto
- Tenta reiniciar a verificação: `adb shell pm verify-app-links --re-verify com.rastahale.academy`

---

## Passo 6 — Testar o fluxo completo

1. Abre o app
2. Vai em **Perfil → Meu Plano → Assinar**
3. Paga com cartão de teste `4242 4242 4242 4242`
4. Depois do pagamento, o Stripe redireciona pra `https://www.rastahalevirtualacademy.com/perfil/plano?checkout=success`
5. **Android abre o app diretamente na tela Meu Plano** com o toast de sucesso

Se ainda abrir o browser em vez do app:
- `adb shell pm get-app-links com.rastahale.academy` — deve estar verified
- Verifica se as URLs do `assetlinks.json` estão acessíveis (`curl -I https://www.rastahalevirtualacademy.com/.well-known/assetlinks.json`)
- Alguns celulares têm um menu por app: **Configurações → Apps → RastaHale → Abrir por padrão → Adicionar link**

---

## Bônus: como isso interage com o browser web

O mesmo domínio funciona pra web e pra app:

- Usuário sem o app instalado (ou desktop): abre `https://www.rastahalevirtualacademy.com/perfil/plano` no browser → carrega a versão web (se você tiver deployada nesse domínio)
- Usuário com o app instalado no celular: Android intercepta o link e abre o app

Se o `rastahalevirtualacademy.com` ainda não tem o webapp hostado, considere fazer isso — dá fallback pra desktop e melhora SEO.
