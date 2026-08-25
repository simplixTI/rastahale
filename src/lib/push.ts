// ============================================================
//  Push notifications — Web (PWA via FCM) + Android (nativo)
//
//  Web: usa firebase/messaging com o MESMO service worker do app
//  (public/sw.js) — ver o comentário no topo do sw.js. O token FCM precisa
//  da chave VAPID (VITE_FIREBASE_VAPID_KEY).
//
//  Android: usa @capacitor/push-notifications, que fala direto com o FCM
//  nativo (google-services.json). Não depende das env vars VITE_FIREBASE_*.
//
//  Em ambos, o token é persistido na tabela `push_tokens` do Supabase
//  (migration 016) vinculado ao usuário logado, para um backend poder
//  disparar notificações depois (envio server-side é fora do escopo aqui).
//
//  Tudo degrada graciosamente: sem Firebase configurado, sem VAPID, sem
//  Supabase ou sem usuário logado, as funções simplesmente não fazem nada.
// ============================================================

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "./supabase";
import { getFirebaseApp, isFirebaseConfigured } from "./auth/firebase";

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// Token atual deste dispositivo, para conseguir removê-lo ao desligar o toggle.
let currentToken: string | null = null;
// Garante que os listeners nativos sejam registrados uma única vez por sessão.
let nativeListenersRegistered = false;
// Usuário atual, lido pelos listeners (o FCM pode re-emitir o token a qualquer
// momento, inclusive depois de outra conta logar na mesma sessão).
let currentUserId: string | null = null;

/** Persiste (ou atualiza) o token FCM no Supabase, vinculado ao usuário. */
async function saveToken(token: string, userId: string | null): Promise<void> {
  currentToken = token;
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );
  } catch {
    // Falha de rede/RLS não deve quebrar o fluxo de permissão.
  }
}

/** Remove o token do Supabase (toggle desligado ou logout). */
async function deleteToken(): Promise<void> {
  const token = currentToken;
  currentToken = null;
  if (!isSupabaseConfigured || !token) return;
  try {
    await supabase.from("push_tokens").delete().eq("token", token);
  } catch { /* ignore */ }
}

// ------------------------------------------------------------
//  Web (PWA) — firebase/messaging
// ------------------------------------------------------------

async function getWebMessaging() {
  // Import dinâmico: firebase/messaging usa APIs de SW e não pode entrar no
  // bundle inicial nem rodar em ambiente sem suporte.
  const { getMessaging } = await import("firebase/messaging");
  return getMessaging(getFirebaseApp());
}

async function registerWebToken(userId: string | null): Promise<boolean> {
  if (!isFirebaseConfigured || !vapidKey) return false;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;
  try {
    const messaging = await getWebMessaging();
    // Reutiliza o registro do /sw.js feito em main.tsx — o mesmo worker que
    // já controla a página passa a receber os push events do FCM.
    const swRegistration = await navigator.serviceWorker.getRegistration("/");
    if (!swRegistration) return false;
    const { getToken, onMessage } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    if (!token) return false;
    await saveToken(token, userId);
    // Foreground: o SW não recebe o push enquanto a página está aberta —
    // mostramos um toast no lugar da notificação do sistema.
    onMessage(messaging, (payload) => {
      toast(payload.notification?.title ?? "Nova notificação", {
        description: payload.notification?.body,
      });
    });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
//  Android nativo — @capacitor/push-notifications
// ------------------------------------------------------------

async function registerNative(userId: string | null): Promise<boolean> {
  currentUserId = userId;
  await ensureNativeListeners();
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return false;
  await PushNotifications.register();
  return true;
}

async function ensureNativeListeners(): Promise<void> {
  if (!nativeListenersRegistered) {
    nativeListenersRegistered = true;
    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", (token) => {
      void saveToken(token.value, currentUserId);
    });
    await PushNotifications.addListener("registrationError", () => {
      // Sem google-services.json o registro falha aqui — ignorar em silêncio.
    });
    // Notificação recebida com o app ABERTO: o Android não exibe na bandeja
    // nesse caso, então mostramos um toast.
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      toast(notification.title ?? "Nova notificação", {
        description: notification.body,
      });
    });
    // Usuário tocou na notificação (app estava fechado/em background).
    await PushNotifications.addListener("pushNotificationActionPerformed", () => {
      // O sistema já trouxe o app para o foreground; deep-links podem ser
      // tratados aqui no futuro usando notification.data.
    });
  }
}

// ------------------------------------------------------------
//  API pública
// ------------------------------------------------------------

/**
 * Inicialização silenciosa (chamada após login): só registra listeners e,
 * se o usuário JÁ deu permissão antes, renova/salva o token. Nunca mostra
 * o prompt de permissão — isso é papel do toggle em Settings.
 */
export async function initPushNotifications(userId: string | null): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      currentUserId = userId;
      await ensureNativeListeners();
      // Só renova o token se o usuário JÁ deu permissão antes — init nunca
      // mostra o prompt; pedir permissão é papel do toggle em Settings.
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive === "granted") {
        await PushNotifications.register();
      }
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      await registerWebToken(userId);
    }
  } catch {
    // Push é best-effort: nunca derrubar o app por causa dele.
  }
}

/**
 * Toggle LIGADO em Settings: pede permissão ao usuário e registra o token.
 * Retorna true se as notificações ficaram ativas.
 */
export async function enablePushNotifications(userId: string | null): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      return await registerNative(userId);
    }
    if (typeof Notification === "undefined") return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    return await registerWebToken(userId);
  } catch {
    return false;
  }
}

/** Toggle DESLIGADO: remove o token deste dispositivo. */
export async function disablePushNotifications(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() && isFirebaseConfigured) {
      try {
        const { getMessaging, deleteToken: fcmDeleteToken } = await import("firebase/messaging");
        await fcmDeleteToken(getMessaging(getFirebaseApp()));
      } catch { /* token pode nem existir */ }
    }
    // Nativo: não há como revogar a permissão pelo app; basta apagar o token
    // para o backend parar de enviar para este dispositivo.
    await deleteToken();
  } catch { /* ignore */ }
}
