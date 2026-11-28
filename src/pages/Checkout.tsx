// Checkout do site pela Appmax (migration 027). O cartão é tokenizado no
// navegador pelo Appmax JS — número e CVV nunca passam pelo nosso servidor.
// A Edge Function "appmax-checkout" cria cliente, pedido e pagamento e só
// libera o acesso depois de ler o status do pedido na API da Appmax.
//
// Regras do Appmax JS numa SPA (docs.appmax.com.br, "Checkout em SPA"):
//  - os dois forms (data-appmax-customer e data-appmax-checkout) existem no
//    DOM antes do init() e ficam sempre montados (escondidos só por CSS);
//  - os name dos campos do cartão são fixos;
//  - o preventDefault do submit é nosso.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, CreditCard, Loader2, Lock, QrCode, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, usePlans } from "@/hooks/useProfile";
import { useLabels } from "@/i18n/labels";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    AppmaxScripts?: { init: (opts: Record<string, unknown>) => void };
  }
}

type Method = "creditcard" | "pix";
type Phase = "form" | "processing" | "pix" | "analysis" | "approved" | "declined";

interface PayResult {
  orderId: string;
  status: string;
  applied?: boolean;
  error?: string;
  pix?: { qrcode: string | null; emv: string | null; expiresAt: string | null };
}

const APPROVED = ["aprovado", "integrado", "pendente_integracao"];
const FAILED   = ["cancelado", "estornado", "recusado_por_risco"];

async function callCheckout<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("appmax-checkout", { body });
  // Cartão recusado volta 402 com o motivo no corpo.
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    if (detail && typeof detail === "object") return detail as T;
    throw new Error(error.message);
  }
  return data as T;
}

const digits = (s: string) => s.replace(/\D/g, "");
const fmtCpf = (s: string) => digits(s).slice(0, 11)
  .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const fmtPhone = (s: string) => {
  const d = digits(s).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

function useCountdown(iso: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return null;
  const left = Math.max(0, new Date(iso).getTime() - now);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { expired: left === 0, text: `${m}:${String(s).padStart(2, "0")}` };
}

const inputCls = "mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const Checkout = () => {
  const { planId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const labels = useLabels();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id ?? "");
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const plan = plans.find((p) => p.id === planId);

  const [method, setMethod] = useState<Method>("creditcard");
  const [phase, setPhase]   = useState<Phase>("form");
  const [name, setName]     = useState("");
  const [cpf, setCpf]       = useState("");
  const [phone, setPhone]   = useState("");
  const [holder, setHolder] = useState("");
  const [ready, setReady]   = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [pix, setPix] = useState<PayResult["pix"] | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const ipRef = useRef("");
  const inFlight = useRef(false);
  const fields = useRef({ name, cpf, phone, holder });
  fields.current = { name, cpf, phone, holder };

  useEffect(() => { if (profile?.name && !name) setName(profile.name); }, [profile?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const period = plan?.interval === "anual" ? t("checkout.periodYear")
    : plan?.interval === "trimestral" ? t("checkout.periodQuarter") : t("checkout.periodMonth");
  const price = plan ? labels.currency(plan.price) : "";

  /** Nome, CPF e celular: devolve a mensagem de erro, ou "" se ok. */
  const validate = () => {
    const f = fields.current;
    if (f.name.trim().split(/\s+/).length < 2) return t("checkout.fillName");
    if (digits(f.cpf).length !== 11) return t("checkout.fillCpf");
    if (digits(f.phone).length < 10) return t("checkout.fillPhone");
    return "";
  };

  const finish = useCallback((r: PayResult) => {
    setOrderId(r.orderId);
    if (r.applied || APPROVED.includes(r.status)) {
      setPhase("approved");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-payments", user?.id] });
      return;
    }
    if (FAILED.includes(r.status) || r.error) {
      setMessage(r.error || t("checkout.declined"));
      setPhase("declined");
      return;
    }
    setPhase(r.pix ? "pix" : "analysis");
  }, [queryClient, user?.id, t]);

  const pay = useCallback(async (m: Method, cardToken?: string) => {
    if (inFlight.current) return;
    const problem = validate();
    if (problem) { toast.error(problem); return; }
    inFlight.current = true;
    setPhase("processing");
    try {
      const f = fields.current;
      const r = await callCheckout<PayResult>({
        action: "pay", planId, method: m, ip: ipRef.current,
        name: f.name, cpf: f.cpf, phone: f.phone, cardToken, holderName: f.holder || f.name,
      });
      if (!r?.orderId) throw new Error(r?.error || t("checkout.declined"));
      if (r.pix) setPix(r.pix);
      finish(r);
    } catch (err) {
      setMessage((err as Error).message || t("checkout.declined"));
      setPhase("declined");
    } finally {
      inFlight.current = false;
    }
  }, [planId, finish, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guarda a versão mais nova de pay() para o callback do Appmax JS.
  const payRef = useRef(pay);
  payRef.current = pay;

  // Carrega o Appmax JS depois que os forms estão no DOM.
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await callCheckout<{ externalId: string; scriptUrl: string }>({ action: "config" });
        if (cancelled || !cfg?.externalId) throw new Error("config");
        script = document.createElement("script");
        script.src = cfg.scriptUrl;
        script.async = true;
        script.onload = () => {
          try {
            window.AppmaxScripts?.init({
              externalId: cfg.externalId,
              onIp: ({ ip }: { ip: string }) => { ipRef.current = ip; setReady(true); },
              onTokenize: ({ token }: { token: string }) => { payRef.current("creditcard", token); },
              onError: (err: { code?: string; message?: string; stage?: string; status?: number; details?: unknown }) => {
                console.error("[Appmax]", err?.code, err?.stage, err?.status, err?.details);
                if (err?.stage && err.stage !== "ip") {
                  inFlight.current = false;
                  setMessage(t("checkout.declined"));
                  setPhase("declined");
                }
              },
            });
          } catch (e) {
            console.error("[Appmax] init", e);
            setLoadFailed(true);
          }
        };
        script.onerror = () => setLoadFailed(true);
        document.head.appendChild(script);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => { cancelled = true; script?.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pix e cartão em análise: confere o pedido a cada 5 s.
  useEffect(() => {
    if (!orderId || (phase !== "pix" && phase !== "analysis")) return;
    const timer = setInterval(async () => {
      try {
        const r = await callCheckout<PayResult>({ action: "status", orderId });
        if (r?.applied || APPROVED.includes(r?.status)) finish({ ...r, pix: undefined });
        else if (phase === "analysis" && FAILED.includes(r?.status)) finish(r);
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [orderId, phase, finish]);

  const countdown = useCountdown(phase === "pix" ? pix?.expiresAt ?? null : null);

  const copyPix = async () => {
    if (!pix?.emv) return;
    try { await navigator.clipboard.writeText(pix.emv); toast.success(t("checkout.pixCopied")); }
    catch { /* navegador sem permissão: o código continua visível */ }
  };

  const restart = () => { setPhase("form"); setPix(null); setOrderId(null); setMessage(""); };

  if (plansLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const showForm = phase === "form" || phase === "processing";

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background page-narrow pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/perfil/plano")} className="rounded-full bg-card border border-border p-2 text-foreground" aria-label={t("common.back")}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("checkout.title")}</h1>
      </div>

      <div className="px-4 mt-3 space-y-4">
        {!plan ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("checkout.planUnavailable")}</p>
        ) : (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-xs text-muted-foreground">{t("checkout.summary")}</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-base font-bold text-foreground">{plan.name}</p>
              <p className="tabular text-lg font-bold text-foreground">{price}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t("checkout.accessFor", { period })}</p>
          </div>
        )}

        {/* Gatilho da coleta de IP: sempre montado. */}
        <form data-appmax-customer hidden />

        {/* ── Formulário (dados + forma de pagamento) ── */}
        <div className={cn("space-y-4", !showForm && "hidden")}>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("checkout.yourData")}</p>
            <label className="block text-[11px] font-medium text-muted-foreground">
              {t("checkout.name")}
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-medium text-muted-foreground">
                {t("checkout.cpf")}
                <input value={cpf} onChange={(e) => setCpf(fmtCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" className={inputCls} />
              </label>
              <label className="block text-[11px] font-medium text-muted-foreground">
                {t("checkout.phone")}
                <input value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" className={inputCls} />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("checkout.method")}</p>
            <div className="grid grid-cols-2 gap-2">
              {([["creditcard", CreditCard, t("checkout.card")], ["pix", QrCode, t("checkout.pix")]] as const).map(([m, Icon, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold",
                    method === m ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>

            {/* Cartão: sempre montado; os name são os que o Appmax JS lê. */}
            <form
              data-appmax-checkout
              method="POST"
              // Regra 4 do Appmax JS: sem isto, um clique antes do init() faz
              // o navegador postar o form e sair do site. Nome/CPF/celular são
              // conferidos em pay(), quando o token chega.
              onSubmit={(e) => e.preventDefault()}
              className={cn("space-y-2", method !== "creditcard" && "hidden")}
            >
              <label className="block text-[11px] font-medium text-muted-foreground">
                {t("checkout.cardNumber")}
                <input required name="card-number" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className={inputCls} />
              </label>
              <label className="block text-[11px] font-medium text-muted-foreground">
                {t("checkout.cardHolder")}
                <input required name="card-holder-name" value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="cc-name" className={inputCls} />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  {t("checkout.expMonth")}
                  <input required name="exp-month" inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} placeholder="MM" className={inputCls} />
                </label>
                <label className="block text-[11px] font-medium text-muted-foreground">
                  {t("checkout.expYear")}
                  <input required name="exp-year" inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} placeholder="AA" className={inputCls} />
                </label>
                <label className="block text-[11px] font-medium text-muted-foreground">
                  {t("checkout.cvv")}
                  <input required name="cvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" className={inputCls} />
                </label>
              </div>
              <button
                type="submit"
                disabled={!ready || !plan || phase === "processing"}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {phase === "processing" ? <><Loader2 size={16} className="animate-spin" /> {t("checkout.processing")}</> : <><Lock size={15} /> {t("checkout.payCard", { price })}</>}
              </button>
            </form>

            {method === "pix" && (
              <button
                type="button"
                onClick={() => pay("pix")}
                disabled={!ready || !plan || phase === "processing"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {phase === "processing" ? <><Loader2 size={16} className="animate-spin" /> {t("checkout.processing")}</> : <><QrCode size={15} /> {t("checkout.payPix", { price })}</>}
              </button>
            )}
          </div>

          {loadFailed && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">{t("checkout.loadError")}</p>}
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"><Lock size={12} className="mt-0.5 shrink-0" /> {t("checkout.secure")}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("checkout.noRenew")}</p>
        </div>

        {/* ── Pix gerado ── */}
        {phase === "pix" && pix && (
          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-3">
            <p className="text-base font-bold text-foreground">{t("checkout.pixTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("checkout.pixHelp")}</p>
            {countdown?.expired ? (
              <>
                <p className="text-sm text-foreground">{t("checkout.pixExpired")}</p>
                <button onClick={restart} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">{t("checkout.newPix")}</button>
              </>
            ) : (
              <>
                {pix.qrcode && (
                  <img src={`data:image/png;base64,${pix.qrcode}`} alt="QR Code Pix" className="mx-auto h-56 w-56 rounded-xl bg-white p-2" />
                )}
                {pix.emv && (
                  <>
                    <p className="break-all rounded-lg bg-secondary p-2 text-left font-mono text-[10px] text-muted-foreground">{pix.emv}</p>
                    <button onClick={copyPix} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
                      <Copy size={15} /> {t("checkout.pixCopy")}
                    </button>
                  </>
                )}
                {countdown && <p className="tabular text-xs text-muted-foreground">{t("checkout.pixExpires", { time: countdown.text })}</p>}
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" /> {t("checkout.pixWaiting")}</p>
              </>
            )}
          </div>
        )}

        {/* ── Cartão em análise antifraude ── */}
        {phase === "analysis" && (
          <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-2">
            <Loader2 className="mx-auto animate-spin text-primary" />
            <p className="text-sm text-foreground">{t("checkout.analysis")}</p>
          </div>
        )}

        {/* ── Aprovado ── */}
        {phase === "approved" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
            <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
            <p className="text-base font-bold text-foreground">{t("checkout.approved")}</p>
            <button onClick={() => navigate("/")} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">{t("checkout.goToClasses")}</button>
          </div>
        )}

        {/* ── Recusado ── */}
        {phase === "declined" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-center space-y-3">
            <XCircle className="mx-auto text-destructive" size={36} />
            <p className="text-sm text-foreground">{message || t("checkout.declined")}</p>
            <button onClick={restart} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">{t("common.retry")}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
