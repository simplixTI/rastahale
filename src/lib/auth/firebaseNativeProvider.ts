import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { AuthError } from "./types";

// Login Google NATIVO (Android/iOS via Capacitor).
//
// O signInWithPopup do Firebase JS SDK não funciona dentro do WebView do
// Capacitor (o popup é bloqueado e o redirect não retorna ao app). Aqui usamos
// o plugin @capacitor-firebase/authentication, que abre o fluxo nativo do
// Google (Credential Manager no Android) e devolve o idToken — o mesmo que o
// fluxo web entrega, então o hybridProvider (index.ts) nem percebe a diferença.
//
// ATENÇÃO: este fluxo depende do google-services.json em android/app/ e dos
// SHA-1/SHA-256 do keystore registrados no Firebase Console. Sem as
// impressões digitais, o Google devolve DEVELOPER_ERROR. Ver FIREBASE-SETUP.md.

export interface GoogleSignInResult {
  idToken: string;
  email: string;
  name: string;
  photoUrl: string | null;
}

export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  try {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new AuthError("Não foi possível obter token do Google.", "provider_error");
    }
    const { user } = result;
    return {
      idToken,
      email: user?.email ?? "",
      name: user?.displayName ?? user?.email ?? "",
      photoUrl: user?.photoUrl ?? null,
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const message = ((err as Error)?.message || "").toLowerCase();
    // O plugin rejeita quando o usuário fecha o seletor de contas do Google.
    if (message.includes("cancel")) {
      throw new AuthError("Login com Google cancelado.", "popup_closed");
    }
    if (message.includes("network")) {
      throw new AuthError("Erro de rede ao conectar com Google.", "network_error");
    }
    throw new AuthError(
      (err as Error)?.message || "Erro no login com Google.",
      "provider_error"
    );
  }
}

export async function signOutNative(): Promise<void> {
  try {
    await FirebaseAuthentication.signOut();
  } catch {
    // Ignora — logout local já limpa tokens.
  }
}
