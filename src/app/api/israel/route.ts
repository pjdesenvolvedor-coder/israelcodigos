import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Inicializa Firebase no lado do servidor (Edge/Node)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    // Salva no Firestore para atualização em tempo real no dashboard.
    // Usamos isso apenas como um "relay" em tempo real.
    await addDoc(collection(db, "webhooks"), {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      method: "POST",
      headers: headers,
      payload: payload,
      createdAt: serverTimestamp()
    });

    return NextResponse.json({ 
      status: "sucesso", 
      recebido: true,
      mensagem: "Webhook processado e transmitido com sucesso"
    }, { status: 200 });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ 
      status: "erro", 
      mensagem: "Falha ao processar payload" 
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    mensagem: "Endpoint WebHookPulse Ativo", 
    instrucao: "Envie um POST para este link para ver os dados no painel" 
  });
}