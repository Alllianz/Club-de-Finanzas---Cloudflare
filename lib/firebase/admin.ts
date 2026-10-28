import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const isFirebaseAdminConfigured = Boolean(
  projectId && clientEmail && privateKey,
);

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;
let adminAuth: Auth | null = null;
let adminStorage: Storage | null = null;

const existingApps = getApps();

if (existingApps.length > 0) {
  adminApp = existingApps[0];
} else if (isFirebaseAdminConfigured) {
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  } catch (error) {
    console.warn("[Firebase Admin] Error al inicializar con Service Account:", error);
  }
} else if (projectId) {
  try {
    adminApp = initializeApp({
      projectId,
    });
  } catch (error) {
    console.warn("[Firebase Admin] Inicialización básica sin credenciales completas:", error);
  }
}

if (adminApp) {
  try {
    adminFirestore = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    adminStorage = getStorage(adminApp);
  } catch (err) {
    console.warn("[Firebase Admin] Error al obtener servicios:", err);
  }
}

export { adminApp, adminFirestore, adminAuth, adminStorage };
