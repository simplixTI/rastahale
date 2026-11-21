import { useEffect, useState } from "react";
import { Trophy, Flame, BookOpen, Gift, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentRanking, type RankedStudent } from "@/hooks/useStudentRanking";
import { seasonHasEnded } from "@/hooks/useSeason";
import VoucherModal from "@/components/VoucherModal";
import { cn } from "@/lib/utils";

const VOUCHER_ACK_KEY = "rasta_voucher_ack";

/** Medalha para o pódio; da 4ª posição em diante, o número no formato do idioma. */
// Pódio em ouro, prata e bronze; do 4º em diante, só o número.
const PODIUM = ["#d4a017", "#9ca3af", "#b45309"];

function positionLabel(pos: number, ordinal: (n: number) => string): React.ReactNode {
  if (pos <= 3) {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: PODIUM[pos - 1] }}
        aria-label={ordinal(pos)}
      >
        {pos}
      </span>
    );
  }
  return ordinal(pos);
}

/** Tempo restante até a data final, em formato curto. */
function timeLeft(iso: string, endedLabel: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return endedLabel;
  const days  = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${mins}min`;
}

function Avatar({ student }: { student: RankedStudent }) {
  if (student.avatarUrl) {
    return (
      <img
        src={student.avatarUrl}
        alt={student.name}
        className="h-10 w-10 flex-shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
      {student.name.charAt(0).toUpperCase()}
    </div>
  );
}

function RankRow({ student, isMe }: { student: RankedStudent; isMe: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3",
        isMe ? "border-primary/50 bg-primary/10" : "border-border bg-card"
      )}
    >
      <span className="w-6 flex-shrink-0 text-center text-sm font-bold text-muted-foreground">
        {positionLabel(student.position, (n) => t("ranking.ordinal", { position: n }))}
      </span>
      <Avatar student={student} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-foreground">
          {student.name}
          {isMe && <span className="ml-1 text-[10px] font-semibold text-primary">{t("ranking.you")}</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span aria-hidden="true" className="h-2 w-2 rounded-full ring-1 ring-foreground/15" style={{ backgroundColor: student.belt.belt.color }} />
          {t(`belt.${student.belt.belt.key}`)}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-bold text-foreground">{student.points}</p>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{t("ranking.pts")}</p>
      </div>
    </div>
  );
}

/** Card pessoal: faixa atual do aluno e progresso até a próxima. */
function MyBeltCard({ me }: { me: RankedStudent }) {
  const { belt, next, pointsToNext, progressPct } = me.belt;
  const { t } = useTranslation();
  return (
    <div className="mb-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${belt.color}22`, border: `2px solid ${belt.color}` }}
          aria-hidden="true"
        >
          {/* A faixa em si: uma barra na cor da graduação, com a ponta preta. */}
          <span className="flex h-2.5 w-7 overflow-hidden rounded-sm" style={{ backgroundColor: belt.color }}>
            <span className="ml-auto h-full w-2 bg-foreground/80" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{t(`belt.${belt.key}`)}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("ranking.place", { position: me.position, points: me.points })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen size={11} className="text-primary" /> {me.videosWatched}
          </span>
        </div>
      </div>

      {next ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{t("ranking.towards", { belt: t(`belt.${next.key}`) })}</span>
            <span className="font-semibold text-foreground">{t("ranking.pointsToNext", { count: pointsToNext })}</span>
          </div>
          {/* A barra é uma faixa: se estende da esquerda ao abrir a tela e
              termina nas três cores da marca. */}
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="belt-fill relative h-full rounded-full bg-primary"
              style={{ width: progressPct > 0 ? `${Math.max(progressPct, 8)}%` : 0 }}
            >
              <span aria-hidden="true" className="absolute inset-y-0 right-0 flex w-4 overflow-hidden rounded-r-full">
                <span className="flex-1 bg-[hsl(var(--brand-red))]" />
                <span className="flex-1 bg-[hsl(var(--brand-yellow))]" />
                <span className="flex-1 bg-[hsl(var(--brand-green))]" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-amber-400">
          <Flame size={12} /> {t("ranking.topReached")}
        </p>
      )}
    </div>
  );
}

/** Banner do desafio: prêmio + contagem regressiva até a data final. */
function ChallengeBanner({ endsAt, prizeText }: { endsAt: string; prizeText: string }) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
        <Gift size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-foreground">
          {t("ranking.challengeTitle")}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {t("ranking.challengePrize", { prize: prizeText || t("ranking.defaultPrize") })}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-background/60 px-2 py-1 text-[10px] font-semibold text-amber-400">
        <Clock size={11} /> {timeLeft(endsAt, t("ranking.ended"))}
      </div>
    </div>
  );
}

const StudentRanking = () => {
  const { user }                       = useAuth();
  const { t }                          = useTranslation();
  const { ranking, season, isLoading } = useStudentRanking();
  const [showVoucher, setShowVoucher]  = useState(false);

  // Mostra o modal do voucher uma vez para o vencedor (por premiação).
  useEffect(() => {
    if (!user || !season?.awardedAt) return;
    if (season.winnerId !== user.id) return;
    let acked = "";
    try { acked = localStorage.getItem(VOUCHER_ACK_KEY) ?? ""; } catch { /* ignora */ }
    if (acked !== season.awardedAt) setShowVoucher(true);
  }, [user, season]);

  function dismissVoucher() {
    setShowVoucher(false);
    try {
      if (season?.awardedAt) localStorage.setItem(VOUCHER_ACK_KEY, season.awardedAt);
    } catch { /* ignora */ }
  }

  if (isLoading || ranking.length === 0) return null;

  const top       = ranking.slice(0, 5);
  const me        = user ? ranking.find((s) => s.id === user.id) : undefined;
  const meInTop   = me ? top.some((s) => s.id === me.id) : false;
  const scheduled = season?.endsAt && !seasonHasEnded(season);

  return (
    <section className="mt-6 px-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Trophy size={16} className="text-amber-400" />
        <h2 className="text-base font-bold text-foreground">{t("ranking.title")}</h2>
      </div>

      {scheduled && season && (
        <ChallengeBanner endsAt={season.endsAt!} prizeText={season.prizeText} />
      )}

      {me && <MyBeltCard me={me} />}

      <div className="stagger space-y-2">
        {top.map((student) => (
          <RankRow key={student.id} student={student} isMe={student.id === user?.id} />
        ))}
      </div>

      {me && !meInTop && (
        <>
          <p className="my-2 text-center text-[10px] text-muted-foreground">• • •</p>
          <RankRow student={me} isMe />
        </>
      )}

      <VoucherModal
        open={showVoucher}
        onClose={dismissVoucher}
        prizeText={season?.prizeText ?? ""}
        prizeCode={season?.prizeCode ?? ""}
      />
    </section>
  );
};

export default StudentRanking;
