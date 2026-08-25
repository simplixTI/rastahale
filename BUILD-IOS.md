# Build iOS — RastaHale Academy (App Store)

O app iOS é o mesmo app web, empacotado com Capacitor 8 (igual ao Android).
O build de iOS **só funciona num Mac** com Xcode instalado — não existe caminho
100% Windows. Este guia cobre do clone ao envio para revisão.

---

## 0. Pré-requisitos (uma vez)

- Mac com **Xcode** atualizado (App Store) + Command Line Tools:
  `xcode-select --install`
- **Node 20+** no Mac (via https://nodejs.org ou `brew install node`)
- **CocoaPods**: `sudo gem install cocoapods` (ou `brew install cocoapods`)
- Conta **Apple Developer Program** ativa (US$ 99/ano) — já temos
- Este repositório clonado no Mac, com o `.env` preenchido (copiar do Windows;
  o `.env` não vai para o git)

---

## 1. Gerar o projeto

```bash
npm install
npm run build
npx cap sync ios     # copia o dist/ e instala os pods
npx cap open ios     # abre o Xcode
```

O projeto fica em `ios/App/App.xcworkspace` — **sempre abra o .xcworkspace,
não o .xcodeproj** (o CocoaPods exige o workspace).

**Esquecer o `cap sync` é o erro mais comum** (igual ao Android): sem ele o
Xcode empacota a versão anterior do app.

---

## 2. Configuração no Xcode (uma vez)

1. Selecione o target **App** → aba **Signing & Capabilities**
2. **Team**: selecione a equipe da conta Apple Developer
3. **Bundle Identifier**: `com.rastahale.academy` (mesmo do Android) —
   ele é definitivo depois do primeiro envio
4. Marque **Automatically manage signing**
5. Em **+ Capability**, adicione **Sign in with Apple**
   (obrigatório — o app tem login Google, guideline 4.8)
6. **Version** `1.0.5` e **Build** `1` — o Build precisa aumentar a cada envio

### GoogleService-Info.plist (login Google + push no iOS)

O equivalente iOS do `google-services.json`:

1. Firebase Console → Project settings → **Add app** → iOS
   (bundle `com.rastahale.academy`)
2. Baixe o `GoogleService-Info.plist`
3. Arraste para dentro de `ios/App/App/` no Xcode (marcar "Copy items")
4. **Não commitar** — adicionar ao `.gitignore` se ainda não estiver

---

## 3. Console da Apple / Firebase / Supabase (uma vez)

### Sign in with Apple
- **Apple Developer** → Certificates, IDs → Identifiers → o App ID
  `com.rastahale.academy` → marcar **Sign In with Apple**
- **Firebase Console** → Authentication → Sign-in method → habilitar **Apple**
- **Supabase** → Authentication → Providers → **Apple** habilitado, com
  `com.rastahale.academy` em Authorized Client IDs

### Notificações push (APNs)
- Firebase Console → Project settings → Cloud Messaging → **APNs Authentication
  Key** (gerar em Apple Developer → Keys → APNs) e subir lá
- Xcode → + Capability → **Push Notifications** e **Background Modes →
  Remote notifications**

---

## 4. Build e envio

```bash
npm run build && npx cap sync ios && npx cap open ios
```

No Xcode:

1. Destino: **Any iOS Device (arm64)** (não simulador)
2. **Product → Archive** (~5 min)
3. No Organizer: **Distribute App → App Store Connect → Upload**
4. Aguardar o processamento (email da Apple, ~10-30 min)

---

## 5. App Store Connect

Em https://appstoreconnect.apple.com → My Apps → **+ New App**:

| Campo | Valor |
|---|---|
| Nome | RastaHale Academy |
| Bundle ID | `com.rastahale.academy` |
| URL de privacidade | `https://rastahalevirtualacademy.com/privacidade` |
| Exclusão de conta | dentro do app: Configurações → Excluir minha conta |

Checklist da ficha:

- [ ] Build selecionado na versão
- [ ] Screenshots 6.7" (iPhone 15 Pro Max) e 6.5" — mínimo 2
- [ ] Descrição, palavras-chave, categoria (Sports/Education)
- [ ] Questionário de privacidade (App Privacy) — mesmo conteúdo do Data
      Safety do Play: email, nome, progresso, histórico de compra
- [ ] Classificação indicativa
- [ ] TestFlight: adicionar testadores internos antes de submeter à revisão

### Faturamento — o mesmo aviso do Android vale aqui

A Apple exige **In-App Purchase** para assinatura de conteúdo digital vendida
dentro do app. O checkout Stripe só pode existir na **versão web**; no app iOS
a tela de plano deve ficar informativa (sem link de pagamento), igual ao que
faremos no Android. Submeter com checkout Stripe no app é reprovação quase
certa (guideline 3.1.1).

---

## 6. Antes de submeter — checklist final

- [ ] Login Google, Apple e email/senha testados em aparelho real via TestFlight
- [ ] Vídeos do catálogo com URL configurada (sem aulas placeholder)
- [ ] Ícone e splash novos aparecendo
- [ ] Configurações → Excluir minha conta abrindo a página
- [ ] Tela de plano sem checkout Stripe dentro do app
