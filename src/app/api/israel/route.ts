import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Inicialização rápida
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Headers para permitir TUDO (CORS total)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

/**
 * OPTIONS: Pre-flight para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST: Recebe o Webhook e transmite para o Dashboard
 */
export async function POST(req: NextRequest) {
  try {
    let payload;
    const contentType = req.headers.get("content-type") || "";
    
    // Tenta ler o corpo da requisição de várias formas para não dar erro
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      payload = { raw: await req.text() };
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão via Firestore (Necessário para o Dashboard "ouvir" o servidor)
    // Os dados são voláteis e você pode limpar no Dashboard
    await addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json(
      { status: "sucesso", msg: "Código recebido em Israel" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // Mesmo com erro, retornamos 200 para não travar o remetente
    return NextResponse.json(
      { status: "erro", msg: "Processado com ressalvas" },
      { status: 200, headers: corsHeaders }
    );
  }
}

// Aceitar GET também para testes rápidos
export async function GET() {
  return NextResponse.json(
    { status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
