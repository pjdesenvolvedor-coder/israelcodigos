
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

export const dynamic = 'force-dynamic';

// Inicialização segura do Firebase para ambiente Serverless
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Headers CORS ultra-permissivos para aceitar qualquer origem externa
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    let payload;
    const contentType = req.headers.get("content-type") || "";
    
    // Captura flexível de dados
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { conteudo: text };
      }
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Envia o sinal para o Firestore (Túnel de tempo real)
    // Usamos addDoc para que o Dashboard "escute" a mudança instantaneamente
    try {
      await addDoc(collection(db, "webhooks"), {
        timestamp: new Date().toISOString(),
        payload: payload,
        headers: headers,
        createdAt: serverTimestamp(),
      });
    } catch (dbError) {
      console.error("Erro ao transmitir sinal para o dashboard:", dbError);
      // Mesmo com erro no DB, retornamos 200 para o remetente não falhar
    }

    // Resposta imediata para evitar Timeout no remetente
    return NextResponse.json(
      { status: "success", message: "Sinal capturado com sucesso" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json(
      { status: "ok", processed: true },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { servico: "Receptor Israel", status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
