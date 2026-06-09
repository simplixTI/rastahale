import { MessageCircle, Star, Inbox } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructorComments } from "@/hooks/useInstructorComments";
import logo from "@/assets/logo.png";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <Star key={n} size={11}
          className={rating >= n ? "text-amber-400" : "text-muted-foreground"}
          fill={rating >= n ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

const StudioFeedback = () => {
  const { user }   = useAuth();
  const { comments, avgRating } = useInstructorComments(user?.id ?? "");

  const positive = comments.filter((c) => c.rating >= 4);
  const neutral  = comments.filter((c) => c.rating === 3);
  const negative = comments.filter((c) => c.rating <= 2);

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
        {/* resumo */}
        {comments.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
                <StarRow rating={Math.round(avgRating)} />
                <p className="mt-1 text-[10px] text-muted-foreground">{comments.length} avaliação{comments.length !== 1 ? "ões" : ""}</p>
              </div>
              <div className="space-y-1 flex-1 ml-6">
                {[5,4,3,2,1].map((star) => {
                  const count = comments.filter((c) => c.rating === star).length;
                  const pct   = comments.length ? Math.round((count / comments.length) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-3 text-[10px] text-muted-foreground text-right">{star}</span>
                      <Star size={9} className="text-amber-400 flex-shrink-0" fill="currentColor" />
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-[10px] text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* filtros por categoria */}
        {comments.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center">
              <p className="text-base font-bold text-emerald-400">{positive.length}</p>
              <p className="text-[10px] text-muted-foreground">Positivas</p>
              <p className="text-[9px] text-muted-foreground">4–5 ⭐</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
              <p className="text-base font-bold text-amber-400">{neutral.length}</p>
              <p className="text-[10px] text-muted-foreground">Neutras</p>
              <p className="text-[9px] text-muted-foreground">3 ⭐</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-center">
              <p className="text-base font-bold text-red-400">{negative.length}</p>
              <p className="text-[10px] text-muted-foreground">Críticas</p>
              <p className="text-[9px] text-muted-foreground">1–2 ⭐</p>
            </div>
          </div>
        )}

        {/* lista de comentários */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
            <MessageCircle size={14} className="text-primary" /> Todos os comentários
          </h2>

          {comments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Inbox size={40} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Nenhum feedback ainda</p>
              <p className="text-xs text-muted-foreground">
                Quando alunos avaliarem seu perfil, os comentários aparecerão aqui.
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary flex-shrink-0">
                          {c.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{c.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <StarRow rating={c.rating} />
                        <span className="text-[10px] font-bold text-amber-400 ml-0.5">{c.rating}</span>
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
