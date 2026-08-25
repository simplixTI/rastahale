import { Capacitor } from "@capacitor/core";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { getFirebaseAuth } from "./firebase";
import { AuthError } from "./types";

// Login com Apple — OBRIGATÓRIO na App Store (guideline 4.8): app que oferece
// login social de terceiros (Google) precisa oferecer Sign in with Apple.
//
// Nativo (iOS): plugin @capacitor-firebase/authentication, que usa o fluxo
// nativo da Apple e devolve o idToken. Exige a capability "Sign in with
// Apple" no Xcode e o provider Apple habilitado no Firebase Console.
//
// Web: popup OAuth do Firebase. Exige o Services ID configurado no Apple
// Developer e registrado no provider Apple do Firebase.
// Em ambos, o idToken vai para o Supabase via signInWithIdToken (ver index.ts).

export interface AppleSignInResult {
  idToken: string;
  email: string;
  name: string;
  photoUrl: string | null;
}

export async function signInWithAppleFirebase(): Promise<AppleSignInResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await FirebaseAuthentication.signInWithApple();
      const idToken = result.credential?.idToken;
      if (!idToken) {
        throw new AuthError("Não foi possível obter token da Apple.", "provider_error");
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
      if (message.includes("cancel")) {
        throw new AuthError("Login com Apple cancelado.", "popup_closed");
      }
      if (message.includes("network")) {
        throw new AuthError("Erro de rede ao conectar com Apple.", "network_error");
      }
      throw new AuthError(
        (err as Error)?.message || "Erro no login com Apple.",
        "provider_error"
      );
    }
  }

  try {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const result = await signInWithPopup(getFirebaseAuth(), provider);
    const credential = OAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;
    if (!idToken) {
      throw new AuthError("Não foi possível obter token da Apple.", "provider_error");
    }
    const { user } = result;
    return {
      idToken,
      email: user.email ?? "",
      name: user.displayName ?? user.email ?? "",
      photoUrl: user.photoURL,
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw new AuthError("Login com Apple cancelado.", "popup_closed");
    }
    if (code?.startsWith("auth/network-request-failed")) {
      throw new AuthError("Erro de rede ao conectar com Apple.", "network_error");
    }
    throw new AuthError(
      (err as Error)?.message || "Erro no login com Apple.",
      "provider_error"
    );
  }
}
