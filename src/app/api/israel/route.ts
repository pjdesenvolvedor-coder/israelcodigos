
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

export const dynamic = 'force-dynamic';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Headers para permitir TUDO (CORS irrestrito)
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
      payload = { erro: "Conteúdo inválido", detalhes: String(e) };
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Envia para o Firestore para o Dashboard capturar
    // Não usamos 'await' na resposta para não travar o remetente (evita timeout)
    addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
    }).catch(e => console.error("Erro Firestore:", e));

    return NextResponse.json(
      { status: "sucesso", mensagem: "Sinal capturado" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "erro", mensagem: "Processado com ressalvas" },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
