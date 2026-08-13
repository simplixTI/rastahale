import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { AuthError } from "./types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId;

let cachedAuth: Auth | null = null;

// Inicialização preguiçosa e guardada: chamar getAuth() no topo do módulo faz o
// Firebase lançar auth/invalid-api-key durante o import quando o .env não tem as
// chaves. Como este módulo entra na cadeia de import do AuthContext, esse throw
// derrubava o app inteiro na inicialização (tela branca), não só o login Google.
export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) {
    throw new AuthError(
      "Login com Google indisponível: Firebase não configurado neste ambiente.",
      "provider_error"
    );
  }
  if (!cachedAuth) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}
