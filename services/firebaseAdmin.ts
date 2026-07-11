import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging as _getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import config from "../firebase-applet-config.json";

const apps = getApps();
if (!apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";
  const resolvedPath = path.resolve(serviceAccountPath);
  
  if (fs.existsSync(resolvedPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("🔥 Initialized Firebase Admin via service account file");
    } catch (e) {
      console.error("Error loading service account file, falling back to applicationDefault()", e);
      initializeApp({
        credential: applicationDefault(),
        projectId: config.projectId
      });
    }
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: config.projectId
    });
    console.log("🔥 Initialized Firebase Admin via applicationDefault()");
  }
}

export const firebaseAdminAuth = getAuth();
export const getMessaging = () => _getMessaging();
