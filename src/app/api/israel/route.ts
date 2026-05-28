import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Forçar execução dinâmica para evitar cache
export const dynamic = 'force-dynamic';

// Inicialização segura
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Headers para permitir TUDO (CORS irrestrito)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

/**
 * OPTIONS: Pre-flight para permitir requisições de outros domínios
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST: Recebe o Webhook e transmite imediatamente
 */
export async function POST(req: NextRequest) {
  try {
    let payload;
    const contentType = req.headers.get("content-type") || "";
    
    // Tenta ler o corpo da requisição sem travar
    try {
      if (contentType.includes("application/json")) {
        payload = await req.json();
      } else {
        const text = await req.text();
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { raw: text };
        }
      }
    } catch (e) {
      payload = { erro: "Corpo inválido ou vazio" };
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão via Firestore (Apenas como ponte de sinal para o Dashboard)
    // O Dashboard limpa esses dados automaticamente se desejar
    await addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
    });

    // Resposta imediata 200 para evitar TIMEOUT no remetente
    return NextResponse.json(
      { status: "sucesso", mensagem: "Código recebido" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // Retorna 200 mesmo em erro interno para o remetente não dar timeout
    return NextResponse.json(
      { status: "ok", aviso: "Processado em segundo plano" },
      { status: 200, headers: corsHeaders }
    );
  }
}

/**
 * GET: Apenas para teste de status
 */
export async function GET() {
  return NextResponse.json(
    { status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
