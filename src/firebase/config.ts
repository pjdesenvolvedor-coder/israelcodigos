
'use client';

/**
 * CONFIGURAÇÃO MANUAL DO FIREBASE
 * 
 * 1. Acesse: https://console.firebase.google.com/
 * 2. Crie um projeto e adicione um App Web.
 * 3. Copie as credenciais e substitua os valores abaixo.
 * 
 * O link direto para o seu banco de dados (Firestore) será:
 * https://console.firebase.google.com/project/SEU-PROJECT-ID/firestore
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "COLE_AQUI_SUA_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "COLE_AQUI_SEU_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "COLE_AQUI_SEU_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "COLE_AQUI_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "COLE_AQUI_APP_ID"
};
