// Exclusão de conta — rota pública (sem login), exigida pela Play Store.
// A URL final é https://<dominio-do-app>/excluir-conta.
// Ajuste CONTACT_EMAIL para o e-mail real de contato/encarregado de dados.
const CONTACT_EMAIL = "contato@rastahale.com";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const DeleteAccount = () => {
  const mailto =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent("Pedido de exclusão de conta — RastaHale Academy")}` +
    `&body=${encodeURIComponent(
      "Olá,\n\nQuero solicitar a exclusão da minha conta e dos meus dados.\n\nE-mail cadastrado no app: \nNome: \n\nObrigado(a)."
    )}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Exclusão de conta</h1>
          <p className="text-sm text-muted-foreground">RastaHale Academy</p>
        </header>

        <Section title="Como pedir a exclusão">
          <p>
            Para excluir sua conta e os dados associados, envie um e-mail para{" "}
            <a className="text-primary underline" href={mailto}>
              {CONTACT_EMAIL}
            </a>{" "}
            a partir do e-mail cadastrado no app, com o assunto{" "}
            <strong>“Pedido de exclusão de conta”</strong>.
          </p>
          <p>
            <a className="text-primary underline" href={mailto}>
              Clique aqui para abrir o e-mail já preenchido
            </a>
            .
          </p>
        </Section>

        <Section title="O que é excluído">
          <ul className="list-disc pl-5 space-y-1">
            <li>Conta de acesso (nome, e-mail e foto de perfil);</li>
            <li>Progresso nas aulas, vídeos assistidos e favoritos;</li>
            <li>Conquistas e tokens de notificação push.</li>
          </ul>
        </Section>

        <Section title="Prazos e retenção">
          <p>
            A exclusão é processada em até <strong>30 dias</strong> após a
            confirmação do pedido. Registros fiscais de pagamento podem ser
            mantidos pelo prazo exigido por lei, sem vínculo com uma conta
            ativa.
          </p>
        </Section>

        <Section title="Assinatura ativa">
          <p>
            Excluir a conta <strong>não cancela</strong> uma assinatura ativa.
            Cancele antes pela loja onde assinou (Google Play → Perfil →
            Pagamentos e assinaturas) para evitar novas cobranças.
          </p>
        </Section>
      </div>
    </div>
  );
};

export default DeleteAccount;
