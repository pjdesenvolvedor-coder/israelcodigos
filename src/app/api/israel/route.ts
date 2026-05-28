import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Inicialização segura do Firebase para o ambiente de servidor
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

/**
 * Manipula a requisição OPTIONS para evitar erros de CORS.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Endpoint de recebimento de Webhooks (Relay rápido).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão para o Firestore (Relay)
    // Não usamos 'await' de forma pesada aqui para evitar o Timeout no remetente.
    // O objetivo é apenas "pulsar" o dado no Dashboard.
    addDoc(collection(db, "webhooks"), {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      method: "POST",
      headers: headers,
      payload: payload,
      createdAt: serverTimestamp()
    }).catch(err => console.error("Erro no relay silencioso:", err));

    // Respondemos IMEDIATAMENTE para evitar Timeout
    return NextResponse.json(
      { status: "sucesso", mensagem: "WebHookPulse: Recebido e processado." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "erro", mensagem: "Payload inválido ou malformado." },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "ativo", servico: "WebHookPulse Relay" },
    { status: 200, headers: corsHeaders }
  );
}
