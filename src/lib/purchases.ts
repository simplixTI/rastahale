// Compra de assinatura dentro do app (App Store / Google Play) via RevenueCat.
//
// A Apple (guideline 3.1.1) exige que assinatura de conteúdo digital vendida
// no app passe pela compra dela; o Stripe continua valendo só na web.
//
// O acesso do aluno NÃO é decidido aqui: a compra dispara o webhook do
// RevenueCat (Edge Function "revenuecat-webhook"), que grava
// profiles.status = 'ativo' — a mesma coluna que o webhook do Stripe mantém.
//
// O appUserID do RevenueCat é o id do usuário no Supabase; é por ele que o
// webhook encontra o perfil. O passo a passo de configuração está no início de
// supabase/functions/revenuecat-webhook/index.ts.
import { Capacitor } from "@capacitor/core";
import { Purchases, type PurchasesPackage } from "@revenuecat/purchases-capacitor";

const API_KEYS: Record<string, string | undefined> = {
  ios:     import.meta.env.VITE_REVENUECAT_IOS_KEY,
  android: import.meta.env.VITE_REVENUECAT_ANDROID_KEY,
};

function apiKey(): string | undefined {
  return API_KEYS[Capacitor.getPlatform()] || undefined;
}

/** true quando o app é nativo E há chave do RevenueCat para esta plataforma no build. */
export function isIapAvailable(): boolean {
  return Capacitor.isNativePlatform() && !!apiKey();
}

let configuredFor: string | null = null;

// ATENÇÃO: nunca devolva o objeto `Purchases` de dentro de uma função async
// (nem o resolva numa Promise). O plugin do Capacitor é um Proxy que responde
// a QUALQUER propriedade, inclusive `then` — o JavaScript o trata como uma
// Promise que nunca termina, e a tela de planos fica carregando para sempre.
// Por isso o import é estático e `ensureConfigured` não devolve nada.
async function ensureConfigured(userId: string): Promise<void> {
  const key = apiKey();
  if (!key) throw new Error("Compra no app indisponível neste build.");
  if (configuredFor === null) {
    await Purchases.configure({ apiKey: key, appUserID: userId });
  } else if (configuredFor !== userId) {
    await Purchases.logIn({ appUserID: userId });
  }
  configuredFor = userId;
}

export type IapPackage = PurchasesPackage;

/** Pacotes da oferta atual configurada no painel do RevenueCat. */
export async function getIapPackages(userId: string): Promise<IapPackage[]> {
  await ensureConfigured(userId);
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Resultado de uma compra: "cancelled" quando o aluno fecha a folha da loja. */
export type IapResult = "purchased" | "cancelled";

export async function purchaseIapPackage(userId: string, aPackage: IapPackage): Promise<IapResult> {
  await ensureConfigured(userId);
  try {
    await Purchases.purchasePackage({ aPackage });
    return "purchased";
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e?.userCancelled || e?.code === "1" || e?.code === 1) return "cancelled";
    throw err;
  }
}

/** Restaura compras da conta da loja. Devolve true se há alguma assinatura ativa. */
export async function restoreIapPurchases(userId: string): Promise<boolean> {
  await ensureConfigured(userId);
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo.activeSubscriptions.length > 0;
}
