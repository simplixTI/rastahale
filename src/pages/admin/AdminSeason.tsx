import { useEffect, useState } from "react";
import { Trophy, Gift, Calendar, RotateCcw, Award, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { useStudentRanking } from "@/hooks/useStudentRanking";
import {
  useSaveSeasonConfig, useRestartSeason, useAwardAndRestart, seasonHasEnded,
} from "@/hooks/useSeason";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const AdminSeason = () => {
  const { ranking, season, isLoading } = useStudentRanking();
  const saveConfig   = useSaveSeasonConfig();
  const restart      = useRestartSeason();
  const award        = useAwardAndRestart();

  const [endsAt,    setEndsAt]    = useState("");
  const [prizeText, setPrizeText] = useState("");
  const [prizeCode, setPrizeCode] = useState("");
  const [confirm,   setConfirm]   = useState<null | "restart" | "award">(null);

  // Preenche o form quando a config carrega.
  useEffect(() => {
    if (!season) return;
    setEndsAt(toLocalInput(season.endsAt));
    setPrizeText(season.prizeText);
    setPrizeCode(season.prizeCode);
  }, [season]);

  const students = ranking.map((r) => ({ id: r.id, videosWatched: r.videosWatched }));
  const leader   = ranking[0];
  const ended    = seasonHasEnded(season);

  function handleSave() {
    const iso = endsAt ? new Date(endsAt).toISOString() : null;
    saveConfig.mutate(
      { endsAt: iso, prizeText: prizeText.trim(), prizeCode: prizeCode.trim() },
      {
        onSuccess: () => toast.success("Temporada salva"),
        onError:   () => toast.error("Erro ao salvar"),
      }
    );
  }

  function handleRestart() {
    restart.mutate({ students }, {
      onSuccess: () => { toast.success("Níveis reiniciados"); setConfirm(null); },
      onError:   () => toast.error("Erro ao reiniciar"),
    });
  }

  function handleAward() {
    if (!leader) return;
    award.mutate(
      { winner: { id: leader.id, name: leader.name }, students },
      {
        onSuccess: () => { toast.success(`${leader.name} premiado! Nova temporada iniciada.`); setConfirm(null); },
        onError:   () => toast.error("Erro ao premiar"),
      }
    );
  }

  return (
    <AdminLayout title="Temporada" backTo="/admin">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Temporada / Desafio</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Trophy size={13} /> {ranking.length} alunos
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Defina a data final e o prêmio. Quando a data chegar, encerre pelo painel: o 1º lugar
        recebe o voucher (aviso na tela dele) e os níveis reiniciam.
      </p>

      {/* último vencedor */}
      {season?.winnerName && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <Crown size={16} className="text-amber-400" />
          <p className="text-xs text-foreground">
            Último vencedor: <span className="font-bold">{season.winnerName}</span>
            {season.awardedAt && (
              <span className="text-muted-foreground"> · {new Date(season.awardedAt).toLocaleDateString("pt-BR")}</span>
            )}
          </p>
        </div>
      )}

      {/* configuração */}
      <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <label className={labelCls}><Calendar size={11} className="mb-0.5 mr-1 inline" />Data final do desafio</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={fieldCls} />
          {season?.endsAt && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {ended ? "⏰ A data já passou — pode encerrar e premiar." : "Desafio em andamento."}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}><Gift size={11} className="mb-0.5 mr-1 inline" />Prêmio (descrição)</label>
          <input value={prizeText} onChange={(e) => setPrizeText(e.target.value)} placeholder="Ex: R$100 na loja RastaHale" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Código do voucher</label>
          <input value={prizeCode} onChange={(e) => setPrizeCode(e.target.value)} placeholder="Ex: RASTA100" className={fieldCls} />
        </div>
        <button onClick={handleSave} disabled={saveConfig.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {saveConfig.isPending ? <Loader2 size={14} className="animate-spin" /> : null} Salvar temporada
        </button>
      </div>

      {/* ações */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setConfirm("restart")} disabled={restart.isPending || ranking.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2.5 text-xs font-semibold text-foreground disabled:opacity-50">
          <RotateCcw size={13} /> Reiniciar níveis
        </button>
        <button onClick={() => setConfirm("award")} disabled={award.isPending || !leader || leader.points === 0}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
          <Award size={13} /> Encerrar e premiar
        </button>
      </div>

      {/* ranking */}
      <h3 className="mt-6 mb-2 text-sm font-bold text-foreground">Ranking atual</h3>
      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : ranking.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Nenhum aluno ainda.</p>
      ) : (
        <div className="space-y-2">
          {ranking.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="w-6 flex-shrink-0 text-center text-sm font-bold text-muted-foreground">
                {s.position === 1 ? "🥇" : s.position === 2 ? "🥈" : s.position === 3 ? "🥉" : `${s.position}º`}
              </span>
              {s.avatarUrl
                ? <img src={s.avatarUrl} alt={s.name} className="h-9 w-9 flex-shrink-0 rounded-full border border-border object-cover" />
                : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{s.name.charAt(0).toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{s.name}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{s.belt.belt.emoji} {s.belt.belt.name}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-foreground">{s.points}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">pts</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* confirmar reinício */}
      {confirm === "restart" && (
        <Dialog open onOpenChange={(v) => { if (!v) setConfirm(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Reiniciar níveis?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">
              Os pontos de todos voltam a zero (as aulas já assistidas são preservadas — a contagem
              recomeça a partir de agora). Nenhum prêmio é entregue.
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setConfirm(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleRestart} disabled={restart.isPending} className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">Reiniciar</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* confirmar premiação */}
      {confirm === "award" && leader && (
        <Dialog open onOpenChange={(v) => { if (!v) setConfirm(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Encerrar e premiar?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{leader.name}</span> está em 1º lugar com{" "}
              <span className="font-bold text-foreground">{leader.points} pts</span> e receberá o voucher
              <span className="font-semibold text-foreground"> {prizeText || "(sem descrição)"}</span>.
              Depois disso os níveis reiniciam e uma nova temporada começa.
              {!ended && <span className="mt-1 block text-amber-400">A data final ainda não chegou — encerrar mesmo assim?</span>}
            </p>
            <DialogFooter className="pt-2">
              <button onClick={() => setConfirm(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleAward} disabled={award.isPending} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Premiar 1º lugar</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default AdminSeason;
