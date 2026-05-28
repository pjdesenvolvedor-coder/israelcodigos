import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Inicialização rápida para garantir resposta veloz
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Endpoint: /api/israel
 * Recebe o Webhook e transmite para o Dashboard via Firestore.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão instantânea via Firestore
    await addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json(
      { status: "sucesso", mensagem: "Recebido em Israel" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "erro", mensagem: "Falha no recebimento" },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
