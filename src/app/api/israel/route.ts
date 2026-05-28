import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Inicialização segura para ambiente Serverless
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Endpoint /api/israel
 * Recebe o Webhook e "pulsa" no Firestore para o Dashboard exibir em tempo real.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    // Gravamos no Firestore para que o Dashboard (que está ouvindo via onSnapshot) receba o dado.
    // Usamos um ID aleatório para a entrada e serverTimestamp para ordenação precisa.
    await addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      method: "POST",
      headers: headers,
      payload: payload,
      createdAt: serverTimestamp(),
      volatil: true // Marcação para indicar que é dado temporário
    });

    return NextResponse.json(
      { status: "sucesso", mensagem: "WebHookPulse Israel: Código Recebido." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Erro no processamento do webhook:", error);
    return NextResponse.json(
      { status: "erro", mensagem: "Falha ao processar payload." },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "ativo", servico: "WebHookPulse Israel Relay" },
    { status: 200, headers: corsHeaders }
  );
}
