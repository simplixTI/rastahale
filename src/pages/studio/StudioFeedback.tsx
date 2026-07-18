import { MessageCircle, Inbox } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructorComments } from "@/hooks/useInstructorComments";
import logo from "@/assets/logo.png";

const StudioFeedback = () => {
  const { user }     = useAuth();
  const { comments } = useInstructorComments(user?.id ?? "");

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="RastaHale" className="h-8 rounded-lg" />
          <div>
            <p className="text-xs font-bold text-foreground leading-none">Feedback dos alunos</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{user?.name}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* lista de comentários */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
            <MessageCircle size={14} className="text-primary" /> Todos os comentários
            {comments.length > 0 && (
              <span className="ml-auto text-[11px] font-semibold text-muted-foreground">{comments.length}</span>
            )}
          </h2>

          {comments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Inbox size={40} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Nenhum feedback ainda</p>
              <p className="text-xs text-muted-foreground">
                Quando alunos comentarem no seu perfil, as mensagens aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...comments].reverse().map((c) => {
                const date = (() => {
                  try { return new Date(c.createdAt).toLocaleDateString("pt-BR"); } catch { return ""; }
                })();
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary flex-shrink-0">
                        {c.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{c.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{date}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-3">
                      "{c.text}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioFeedback;
