import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app =
  getApps().length === 0 && firebaseConfig.apiKey
    ? initializeApp(firebaseConfig)
    : getApps().length > 0
      ? getApp()
      : null;

const db = app
  ? getFirestore(
      app,
      process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)",
    )
  : (null as any);
const auth = app ? getAuth(app) : (null as any);

// Habilita a persistência offline apenas no navegador (client-side)
// O try/catch previne erros durante o hot-reload em desenvolvimento.
if (db && typeof window !== "undefined") {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        // Geralmente acontece com múltiplas abas abertas. A persistência só é ativada na primeira.
      } else if (err.code === "unimplemented") {
        console.warn("Navegador não suporta persistência offline.");
      }
    });
  } catch (err: any) {
    // Ignora o erro que acontece em hot-reloads no modo de desenvolvimento.
  }
}

export { db, auth };
