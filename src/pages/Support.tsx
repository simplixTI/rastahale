import { Link } from "react-router-dom";

// Suporte — rota pública (sem login), usada como "URL de suporte" no
// App Store Connect e no Play Console. A Apple exige que esta página tenha
// um meio de contato visível sem precisar entrar no app.
// A URL final é https://<dominio-do-app>/suporte.
const CONTACT_EMAIL = "contato@rastahale.com";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
          <p className="text-sm text-muted-foreground">RastaHale Club</p>
        </header>

        <Section title="Fale com a gente">
          <p>
            Para dúvidas, problemas de acesso, cobrança ou sugestões, escreva para{" "}
            <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            . Informe o e-mail da sua conta e, se for um erro, o aparelho que
            você usa e o que aconteceu — isso agiliza o atendimento.
          </p>
        </Section>

        <Section title="Não consigo entrar na minha conta">
          <p>
            Na tela de login, toque em “Esqueci minha senha” ou acesse{" "}
            <Link className="text-primary underline" to="/esqueci-senha">
              /esqueci-senha
            </Link>{" "}
            para receber um link de redefinição no seu e-mail. Se você criou a
            conta com Google ou Apple, entre usando o mesmo botão.
          </p>
        </Section>

        <Section title="Assinatura e cobrança">
          <p>
            Você vê o plano atual e gerencia a assinatura dentro do app, em
            Perfil → Meu plano. O cancelamento vale a partir do fim do período
            já pago. Compras feitas pela App Store ou Google Play também podem
            ser gerenciadas nas configurações de assinaturas da própria loja.
          </p>
        </Section>

        <Section title="Um vídeo não carrega">
          <p>
            Confira sua conexão com a internet, feche e abra o app novamente e
            verifique se ele está atualizado. Se o problema continuar, envie um
            e-mail dizendo qual aula não abriu.
          </p>
        </Section>

        <Section title="Excluir minha conta">
          <p>
            Você pode excluir a conta e os dados associados em Perfil →
            Configurações → Excluir minha conta, ou pela página{" "}
            <Link className="text-primary underline" to="/excluir-conta">
              /excluir-conta
            </Link>
            .
          </p>
        </Section>

        <Section title="Documentos">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <Link className="text-primary underline" to="/termos">
                Termos de Serviço
              </Link>
            </li>
            <li>
              <Link className="text-primary underline" to="/privacidade">
                Política de Privacidade
              </Link>
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
};

export default Support;
