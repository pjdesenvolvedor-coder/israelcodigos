
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './config';

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

export function initializeFirebase() {
  try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      // Verifica se temos ao menos o projectId para tentar inicializar
      if (firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
      } else {
        // Fallback para evitar erro crítico de inicialização
        app = initializeApp({
          apiKey: "dummy",
          authDomain: "dummy",
          projectId: "dummy-project",
          storageBucket: "dummy",
          messagingSenderId: "dummy",
          appId: "dummy"
        });
      }
    }
    firestore = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
  return { app, firestore, auth };
}
