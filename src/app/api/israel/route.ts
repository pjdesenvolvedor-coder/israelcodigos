
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

export const dynamic = 'force-dynamic';

// Inicialização ultra-rápida do Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    let payload;
    const contentType = req.headers.get("content-type") || "";
    
    // Captura o corpo da requisição de forma flexível
    try {
      if (contentType.includes("application/json")) {
        payload = await req.json();
      } else {
        const text = await req.text();
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { conteudo_bruto: text };
        }
      }
    } catch (e) {
      payload = { status: "recebido", aviso: "formato_nao_identificado" };
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão Instantânea para o Dashboard via Firestore (Túnel de Sinais)
    // Não usamos await na gravação para liberar a resposta ao remetente imediatamente
    addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
    }).catch(err => console.error("Erro no Túnel de Sinal:", err));

    // Resposta imediata com sucesso 200
    return NextResponse.json(
      { status: "sucesso", sinal: "capturado" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // Retorna 200 mesmo em caso de erro interno para não travar o remetente
    return NextResponse.json(
      { status: "ok", aviso: "processado_com_ressalvas" },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { servico: "RECEPTOR ISRAEL", status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
