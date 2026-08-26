// Termos de Serviço — rota pública (sem login), exigida pela tela de
// consentimento OAuth do Google e pelas lojas (Play Store / App Store).
// A URL final é https://<dominio-do-app>/termos.
const CONTACT_EMAIL = "contato@rastahale.com";
const LAST_UPDATED = "25 de agosto de 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Termos de Serviço</h1>
          <p className="text-sm text-muted-foreground">
            RastaHale Academy · Última atualização: {LAST_UPDATED}
          </p>
        </header>

        <Section title="1. O serviço">
          <p>
            O RastaHale Academy é uma plataforma de aulas e treinos em vídeo de
            Jiu-Jitsu Brasileiro e Luta Livre, oferecida em site e aplicativo.
            Ao criar uma conta ou usar o serviço, você concorda com estes termos.
          </p>
        </Section>

        <Section title="2. Conta e acesso">
          <ul className="list-disc pl-5 space-y-1">
            <li>Você é responsável por manter a confidencialidade da sua conta;</li>
            <li>O acesso é pessoal e intransferível — não compartilhe sua conta;</li>
            <li>Você pode excluir sua conta a qualquer momento (Configurações →
              Excluir minha conta, ou pela página /excluir-conta).</li>
          </ul>
        </Section>

        <Section title="3. Assinaturas e pagamentos">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Alguns conteúdos exigem assinatura paga (planos Básico e Premium),
              cobrada de forma recorrente conforme o plano escolhido;
            </li>
            <li>
              O cancelamento pode ser feito a qualquer momento e vale a partir
              do fim do período já pago — não há reembolso proporcional;
            </li>
            <li>
              Compras feitas pela Google Play ou App Store seguem também as
              regras de pagamento e reembolso da loja correspondente;
            </li>
            <li>Preços podem mudar, com aviso prévio dentro do app.</li>
          </ul>
        </Section>

        <Section title="4. Uso permitido">
          <p>Você concorda em não:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Baixar, gravar, redistribuir ou revender o conteúdo das aulas;</li>
            <li>Usar o serviço para fins ilegais ou que violem direitos de terceiros;</li>
            <li>Tentar burlar a segurança ou o controle de acesso da plataforma.</li>
          </ul>
          <p>
            Todo o conteúdo (vídeos, marcas, materiais) pertence ao RastaHale
            Academy ou aos seus instrutores e é protegido por direitos autorais.
          </p>
        </Section>

        <Section title="5. Saúde e segurança">
          <p>
            As aulas envolvem atividade física. Pratique dentro dos seus limites
            e, se necessário, consulte um profissional de saúde antes de treinar.
            O RastaHale Academy não se responsabiliza por lesões decorrentes da
            prática dos exercícios.
          </p>
        </Section>

        <Section title="6. Disponibilidade e alterações">
          <p>
            Trabalhamos para manter o serviço sempre disponível, mas não
            garantimos funcionamento ininterrupto. Podemos alterar o catálogo,
            funcionalidades e estes termos; mudanças relevantes serão avisadas
            dentro do app.
          </p>
        </Section>

        <Section title="7. Contato e foro">
          <p>
            Dúvidas sobre estes termos:{" "}
            <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            . Estes termos são regidos pelas leis do Brasil.
          </p>
        </Section>
      </div>
    </div>
  );
};

export default TermsOfService;
