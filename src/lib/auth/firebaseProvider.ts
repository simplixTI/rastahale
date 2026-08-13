import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { AuthError } from "./types";

const provider = new GoogleAuthProvider();

export async function signInWithGoogleFirebase(): Promise<{
  idToken: string;
  email: string;
  name: string;
  photoUrl: string | null;
}> {
  try {
    const result = await signInWithPopup(getFirebaseAuth(), provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;
    if (!idToken) {
      throw new AuthError("Não foi possível obter token do Google.", "provider_error");
    }
    const { user } = result;
    return {
      idToken,
      email: user.email ?? "",
      name: user.displayName ?? user.email ?? "",
      photoUrl: user.photoURL,
    };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw new AuthError("Login com Google cancelado.", "popup_closed");
    }
    if (code?.startsWith("auth/network-request-failed")) {
      throw new AuthError("Erro de rede ao conectar com Google.", "network_error");
    }
    throw new AuthError(
      (err as Error)?.message || "Erro no login com Google.",
      "provider_error"
    );
  }
}

export async function signOutFirebase(): Promise<void> {
  // Sem Firebase configurado não há sessão dele para encerrar.
  if (!isFirebaseConfigured) return;
  try {
    await firebaseSignOut(getFirebaseAuth());
  } catch {
    // Ignora — logout local já limpa tokens.
  }
}
