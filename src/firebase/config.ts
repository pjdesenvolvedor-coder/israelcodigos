'use client';

/**
 * CONFIGURAÇÃO MANUAL DO FIREBASE
 * 
 * Se o "Set Up" automático falhar, siga estes passos:
 * 1. Vá para https://console.firebase.google.com/
 * 2. Crie um projeto e adicione um "Web App".
 * 3. Copie os valores do objeto 'firebaseConfig' e cole abaixo.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "COLE_AQUI_SUA_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "COLE_AQUI_SEU_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "COLE_AQUI_SEU_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "COLE_AQUI_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "COLE_AQUI_APP_ID"
};
