// Política de Privacidade — rota pública (sem login), exigida pela Play Store.
// A URL final é https://<dominio-do-app>/privacidade.
// Ajuste CONTACT_EMAIL para o e-mail real de contato/encarregado de dados.
const CONTACT_EMAIL = "contato@rastahale.com";
const LAST_UPDATED = "24 de agosto de 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">
            RastaHale Academy · Última atualização: {LAST_UPDATED}
          </p>
        </header>

        <Section title="1. Quem somos">
          <p>
            O RastaHale Academy é um aplicativo de aulas e treinos em vídeo.
            Esta política explica quais dados coletamos, por quê, e quais são os
            seus direitos, em conformidade com a Lei Geral de Proteção de Dados
            (LGPD — Lei nº 13.709/2018).
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Conta:</strong> nome, e-mail e foto de perfil (quando você
              entra com Google, recebemos esses dados do provedor).
            </li>
            <li>
              <strong>Uso:</strong> progresso nas aulas, vídeos assistidos,
              favoritos e conquistas dentro do app.
            </li>
            <li>
              <strong>Dispositivo:</strong> token de notificação push (somente se
              você ativar as notificações) e plataforma (web/Android).
            </li>
            <li>
              <strong>Assinatura:</strong> status do plano e histórico de
              pagamento. Dados de cartão são processados pelo provedor de
              pagamento e não ficam armazenados no app.
            </li>
          </ul>
        </Section>

        <Section title="3. Para que usamos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Autenticar seu acesso e manter sua sessão;</li>
            <li>Salvar e exibir seu progresso e favoritos;</li>
            <li>Gerenciar sua assinatura e liberar conteúdos do plano;</li>
            <li>
              Enviar notificações sobre novos conteúdos e lembretes (você pode
              desativar a qualquer momento nas Configurações).
            </li>
          </ul>
        </Section>

        <Section title="4. Onde os dados ficam e com quem são compartilhados">
          <p>
            Os dados são armazenados na plataforma Supabase (banco de dados e
            autenticação). Utilizamos ainda:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google Firebase</strong> — login com Google e envio de
              notificações push;
            </li>
            <li>
              <strong>Google Play / provedores de pagamento</strong> — cobrança
              das assinaturas;
            </li>
            <li>
              <strong>Vercel</strong> — hospedagem da versão web do app.
            </li>
          </ul>
          <p>
            Não vendemos nem compartilhamos seus dados com terceiros para fins
            de publicidade.
          </p>
        </Section>

        <Section title="5. Seus direitos (LGPD)">
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acessar e corrigir seus dados (Perfil → Editar);</li>
            <li>Solicitar a exclusão da conta e dos dados associados;</li>
            <li>Revogar consentimentos, como o de notificações;</li>
            <li>
              Falar com o encarregado de dados pelo e-mail{" "}
              <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </li>
          </ul>
        </Section>

        <Section title="6. Segurança e retenção">
          <p>
            Todo o tráfego é criptografado (HTTPS/TLS). Mantemos seus dados
            enquanto a conta estiver ativa; após a exclusão da conta, os dados
            pessoais são removidos em até 30 dias, salvo obrigações legais de
            retenção (ex.: registros fiscais de pagamento).
          </p>
        </Section>

        <Section title="7. Alterações desta política">
          <p>
            Se esta política mudar, avisaremos dentro do app. A versão vigente
            é sempre a publicada nesta página.
          </p>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
