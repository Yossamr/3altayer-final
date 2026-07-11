import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import config from "../firebase-applet-config.json";

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || config.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || config.appId,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const getFirebaseMessaging = async () => {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  return getMessaging(firebaseApp);
};

export const VAPID_KEY = metaEnv.VITE_FIREBASE_VAPID_KEY || "";
