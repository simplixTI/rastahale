import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarClock, ChevronDown, Clock, Play, Send, Trash2, MessageCircle, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructor } from "@/hooks/useInstructors";
import { useVideos } from "@/hooks/useVideos";
import { useInstructorComments } from "@/hooks/useInstructorComments";
import { useStudioSessions } from "@/hooks/useStudioSessions";
import VideoCard from "@/components/VideoCard";
import BuyModuleButton from "@/components/BuyModuleButton";
import { useLabels } from "@/i18n/labels";
import { currentLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatRelease, isUpcoming } from "@/lib/release";

// Comentários ficam fora do app das lojas (iOS/Android): a Apple (guideline 1.2)
// exige denúncia e bloqueio de usuários para conteúdo gerado por alunos, e isso
// ainda não existe. Na web continuam aparecendo.
const SHOW_COMMENTS = !Capacitor.isNativePlatform();

// ── CommentCard ───────────────────────────────────────────────────────────────

function CommentCard({ comment, canDelete, onDelete }: {
  comment: { id: string; userName: string; text: string; createdAt: string };
  canDelete: boolean; onDelete: () => void;
}) {
  const date = (() => {
    try { return new Date(comment.createdAt).toLocaleDateString(currentLocale()); } catch { return ""; }
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{comment.userName}</p>
            <p className="text-[10px] text-muted-foreground">{date}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{comment.text}</p>
    </div>
  );
}

// ── Fold ──────────────────────────────────────────────────────────────────────
// Cabeçalho que recolhe/expande a seção, para a página não virar uma lista
// gigante de capas.

function Fold({ title, count, icon, defaultOpen = true, className, children }: {
  title: string; count?: string; icon?: ReactNode; defaultOpen?: boolean;
  className?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        {icon}
        <h2 className="flex-1 truncate text-sm font-bold text-foreground">{title}</h2>
        {count && <span className="text-[10px] text-muted-foreground">{count}</span>}
        <ChevronDown size={16} className={cn("flex-shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}

// ── InstructorSection ─────────────────────────────────────────────────────────

const InstructorSection = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const labels   = useLabels();

  const { data: instructor,  isLoading: loadInst } = useInstructor(id ?? "");
  const { data: allVideos = [], isLoading: loadVid } = useVideos(user?.id ?? "");
  const { comments, addComment, removeComment, userComment } = useInstructorComments(id ?? "");
  const { sessions } = useStudioSessions(id ?? "");

  const [commentText, setCommentText] = useState("");

  const videos = allVideos.filter((v) => v.instructorId === id);

  const grouped = videos.reduce<Record<string, typeof videos>>((acc, v) => {
    if (!acc[v.subcategory]) acc[v.subcategory] = [];
    acc[v.subcategory].push(v);
    return acc;
  }, {});

  const totalMinutes = videos.reduce((s, v) => {
    const [m = 0, sec = 0] = v.duration.split(":").map(Number);
    return s + m + sec / 60;
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainMin  = Math.round(totalMinutes % 60);

  const myComment  = user ? userComment(user.id) : undefined;

  async function handleSubmitComment() {
    if (!user) { toast.error(t("instructorSection.loginToComment")); return; }
    if (commentText.trim().length < 10) { toast.error(t("instructorSection.minChars")); return; }
    if (myComment) { toast.error(t("instructorSection.oneCommentOnly")); return; }
    try {
      await addComment(user.id, user.name, commentText);
      setCommentText("");
      toast.success(t("instructorSection.commentSent"));
    } catch {
      toast.error(t("instructorSection.commentError"));
    }
  }

  if (loadInst || loadVid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">{t("instructorSection.notFound")}</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary">{t("common.back")}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background pb-28">
      {/* hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl"
          style={{ backgroundImage: `url(${instructor.avatar})` }} />
        <div className="relative px-4 pb-6 pt-14">
          <button onClick={() => navigate(-1)}
            className="absolute left-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm">
            <ArrowLeft size={18} />
          </button>

          <div className="flex flex-col items-center gap-3 text-center">
            <img src={instructor.avatar} alt={instructor.name}
              className="h-24 w-24 rounded-full border-4 border-primary object-cover shadow-xl" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{instructor.name}</h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground px-4">{instructor.bio}</p>
            </div>

            {/* stats */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen size={12} className="text-primary" />
                <span>{t("common.lessons", { count: videos.length })}</span>
              </div>
              {totalMinutes > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} className="text-primary" />
                  <span>{labels.duration(totalHours * 60 + remainMin)}</span>
                </div>
              )}
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle size={12} className="text-primary" />
                  <span>{t("common.comments", { count: comments.length })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2">
        {/* carrosséis por subcategoria */}
        {videos.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <Play size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("instructorSection.noLessons")}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catVids]) => (
            <Fold key={cat} className="mt-6" title={cat} count={t("common.lessons", { count: catVids.length })}>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {catVids.map((v) => <VideoCard key={v.id} video={v} size="sm" />)}
              </div>
            </Fold>
          ))
        )}

        {/* módulos do professor (sessões criadas no Studio) */}
        {sessions.length > 0 && (
          <Fold className="mt-8" title={t("instructorSection.modules")} icon={<LayoutList size={16} className="text-primary" />}>
            <div className="space-y-2">
              {sessions.map((s, idx) => {
                const modVids = s.videoIds
                  .map((vid) => allVideos.find((v) => v.id === vid))
                  .filter(Boolean) as typeof allVideos;
                // Só o primeiro módulo começa aberto; os outros o aluno abre quando quiser.
                return (
                  <Fold key={s.id} className="rounded-xl border border-border bg-card p-3 pb-0"
                    title={s.title} defaultOpen={idx === 0}
                    count={isUpcoming(s.releaseAt)
                      ? t("video.releaseOn", { date: formatRelease(s.releaseAt as string, i18n.language) })
                      : t("common.lessons", { count: modVids.length })}>
                    {s.description && <p className="-mt-2 mb-3 text-[11px] text-muted-foreground">{s.description}</p>}
                    <BuyModuleButton module={s} className="mb-3" />
                    {modVids.length > 0 ? (
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                        {modVids.map((v) => <VideoCard key={v.id} video={v} size="sm" />)}
                      </div>
                    ) : (
                      <p className="pb-3 text-[10px] text-muted-foreground">{t("instructorSection.emptyModule")}</p>
                    )}
                  </Fold>
                );
              })}
            </div>
          </Fold>
        )}

        {/* lista completa — recolhida de início: as aulas já aparecem nos carrosséis */}
        {videos.length > 0 && (
          <Fold className="mt-8" title={t("instructorSection.allLessons")} count={t("common.lessons", { count: videos.length })} defaultOpen={false}>
            <div className="space-y-2">
              {videos.map((v) => (
                <button key={v.id} onClick={() => navigate(`/video/${v.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary/30 transition-colors">
                  <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                    <img src={v.thumbnail} alt={v.title} className={cn("h-full w-full object-cover", isUpcoming(v.releaseAt) && "opacity-60 grayscale")} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {isUpcoming(v.releaseAt) ? <CalendarClock size={14} className="text-white" aria-label={t("video.upcoming")} /> : <Play size={14} className="text-white" fill="currentColor" />}
                    </div>
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] text-white">{v.duration}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
                    {isUpcoming(v.releaseAt) && v.releaseAt && (
                      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t("video.upcoming")} · {t("video.releaseOn", { date: formatRelease(v.releaseAt, i18n.language) })}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{v.subcategory}</p>
                  </div>
                </button>
              ))}
            </div>
          </Fold>
        )}

        {/* ── seção de comentários ── */}
        {SHOW_COMMENTS && (
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                {t("instructorSection.commentsTitle")}
              </h2>
              {comments.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                  {comments.length}
                </span>
              )}
            </div>

            {/* formulário — só para quem ainda não comentou */}
            {!myComment && user?.role !== "instructor" && (
              <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">{t("instructorSection.leaveComment")}</p>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder={t("instructorSection.commentPlaceholder")}
                  className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />

                <button
                  onClick={handleSubmitComment}
                  disabled={commentText.trim().length < 10}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full btn-press bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send size={12} /> {t("instructorSection.sendComment")}
                </button>
              </div>
            )}

            {myComment && (
              <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-[10px] text-primary font-semibold">{t("instructorSection.alreadyCommented")}</p>
              </div>
            )}

            {/* lista de comentários */}
            {comments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <MessageCircle size={28} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("instructorSection.noComments")}</p>
                <p className="text-xs text-muted-foreground">{t("instructorSection.beFirst")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <CommentCard
                    key={c.id}
                    comment={c}
                    canDelete={user?.id === c.userId}
                    onDelete={async () => {
                      try {
                        await removeComment(c.id);
                        toast.success(t("instructorSection.commentRemoved"));
                      } catch {
                        toast.error(t("instructorSection.commentError"));
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorSection;
