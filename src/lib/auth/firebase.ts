import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
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

// App Firebase compartilhado (auth + messaging). Mesmo motivo do init
// preguiçoso abaixo: sem as env vars, inicializar no import derruba o app.
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new AuthError(
      "Firebase não configurado neste ambiente.",
      "provider_error"
    );
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

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
    cachedAuth = getAuth(getFirebaseApp());
  }
  return cachedAuth;
}
