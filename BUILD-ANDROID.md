# Build Android — RastaHale Academy

O app Android é o mesmo app web, empacotado com [Capacitor](https://capacitorjs.com/) 8.
Os arquivos do `dist/` são embutidos no pacote e servidos dentro de um WebView em
`https://localhost`. **Não** é um wrapper que carrega o site remoto: publicar na
Vercel não atualiza o app da loja — cada mudança exige um novo envio.

---

## 1. Pré-requisitos

Já instalados nesta máquina:

| Ferramenta | Versão | Local |
|---|---|---|
| JDK | 21.0.12 | `C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot` |
| Android SDK | platform 36, build-tools 36.0.0 | `%LOCALAPPDATA%\Android\Sdk` |

As variáveis `JAVA_HOME`, `ANDROID_HOME` e `ANDROID_SDK_ROOT` foram gravadas no
ambiente do usuário. Se um terminal novo não enxergar, reabra o terminal.

O caminho do SDK também está em `android/local.properties`, que **não** vai para
o git (é específico da máquina).

---

## 2. Gerar o AAB de produção

```bash
npm run build          # gera o dist/
npx cap sync android   # copia o dist/ para dentro do projeto Android
cd android
./gradlew bundleRelease
```

Saída: `android/app/build/outputs/bundle/release/app-release.aab`

Para um APK instalável (teste em aparelho, não serve para a loja):

```bash
./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

**Esquecer o `npx cap sync` é o erro mais comum:** o Gradle empacota o que está
em `android/app/src/main/assets/public`, não o `dist/`. Sem o sync, você gera um
AAB com a versão anterior do app e não percebe.

---

## 3. Versionamento

Em `android/app/build.gradle`:

```gradle
versionCode 1        // inteiro, DEVE aumentar a cada envio à loja
versionName "1.0.0"  // string mostrada ao usuário
```

A Play Store rejeita um AAB cujo `versionCode` seja igual ou menor que o de um
envio anterior. Suba o `versionCode` antes de cada release, sempre.

---

## 4. Assinatura

O keystore fica **fora do repositório**, de propósito:

```
C:\Users\Banzai\keystores\rastahale-upload.jks   (RSA 4096, validade ~27 anos)
C:\Users\Banzai\keystores\rastahale-senha.txt    (senha)
```

As credenciais são lidas de `android/keystore.properties`, que está no
`.gitignore` junto com `*.jks` e `*.keystore`.

> ### Faça backup do keystore agora
>
> Essa chave é a identidade do app. Guarde uma cópia do `.jks` **e** da senha
> num gerenciador de senhas ou num drive separado. Se você ativar o **Play App
> Signing** (recomendado, e padrão para apps novos), o Google guarda a chave de
> assinatura final e essa aqui vira só a *chave de upload* — que pode ser
> redefinida com o suporte se for perdida. Sem o Play App Signing, perder o
> keystore significa **nunca mais conseguir atualizar o app**: só resta publicar
> outro, com outro ID, perdendo instalações e avaliações.

Conferir a assinatura de um AAB:

```bash
"$JAVA_HOME/bin/jarsigner" -verify -verbose:summary app-release.aab
```

---

## 5. Identidade do app

| Campo | Valor |
|---|---|
| `applicationId` | `com.rastahale.academy` |
| Nome no launcher | `RastaHale` (`app_name` em `strings.xml`) |
| `minSdk` | 24 (Android 7.0) |
| `targetSdk` | 36 |
| Permissões | apenas `INTERNET` |

O `applicationId` é **definitivo** depois do primeiro envio: a Play Store o usa
como identidade do app e ele não pode ser alterado.

---

## 6. Ícones e splash

Fontes em `assets/`, geradas a partir do emblema do `public/icon-512.png`:

| Arquivo | Uso |
|---|---|
| `icon.png` | ícone legado (launcher clássico) |
| `icon-foreground.png` / `icon-background.png` | ícone adaptativo (Android 8+) |
| `splash.png` / `splash-dark.png` | tela de abertura |

Regenerar depois de mexer nas fontes:

```bash
npx capacitor-assets generate --android
```

O `public/icon-512.png` **não** serve como ícone direto: o círculo sangra até a
borda e há um pedaço de texto cortado no rodapé da imagem, que apareceria
recortado dentro da máscara do Android. Por isso os assets usam só o emblema,
recortado e centralizado com folga para a zona segura do ícone adaptativo.

---

## 7. Safe areas

Com `targetSdk 36`, o Android desenha o app atrás da barra de status e da barra
de navegação (edge-to-edge obrigatório desde o Android 15). O tratamento está em
`src/index.css`:

- `#root` recebe `padding-top` igual ao inset superior;
- headers `sticky` usam `.top-safe` em vez de `top-0`, senão deslizam por baixo
  da barra de status ao rolar;
- as barras inferiores já usavam `env(safe-area-inset-bottom)`.

Os utilitários combinam `env(safe-area-inset-*)` com `var(--safe-area-inset-*)`
porque o Capacitor usa um mecanismo ou outro conforme a versão do WebView. Na
web os dois valem 0, então o site não muda.

---

## 8. Antes de enviar à Play Store

- [ ] Conta de desenvolvedor Google Play (taxa única de US$ 25)
- [ ] Política de privacidade hospedada numa URL pública — **obrigatória**, o app
      coleta email e dados de uso
- [ ] Ficha da loja: descrição curta e longa, ícone 512×512, banner 1024×500,
      no mínimo 2 screenshots de celular
- [ ] Questionário de classificação indicativa
- [ ] Seção "Segurança dos dados" declarando o que é coletado (email, nome,
      progresso) e que trafega criptografado
- [ ] Testar em aparelho real antes da produção — use uma faixa de teste interno

### Faturamento — leia antes de publicar

O app vende assinaturas (`/perfil/plano`, planos e pagamentos no admin). A
política do Google Play exige que **conteúdo digital consumido dentro do app**
use o Google Play Billing, com comissão de 15–30%. Cobrar por fora (checkout web,
PIX, cartão direto) é uma das causas mais comuns de reprovação e de remoção do
app depois de publicado.

Antes de enviar, decida uma das saídas:

1. Integrar o Google Play Billing para as assinaturas; ou
2. Remover do app Android qualquer fluxo de compra e deixar a tela de plano
   apenas informativa (sem link nem instrução de pagamento); ou
3. Verificar se o caso se enquadra em alguma exceção da política — o que é raro
   para conteúdo digital como aulas em vídeo.

Publicar sem resolver isso é o risco mais alto deste projeto na loja.
