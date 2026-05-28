
import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

export const dynamic = 'force-dynamic';

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
    
    // Captura flexível de dados
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
      payload = { status: "error", message: "Invalid payload format" };
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão de Baixa Latência via Firestore (Túnel)
    // Usamos timestamp como string para evitar problemas de índice em tempo real
    addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
    }).catch(err => console.error("Falha no túnel de sinal:", err));

    // Resposta imediata para evitar timeouts no remetente
    return NextResponse.json(
      { status: "success", info: "Signal captured" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "ok", info: "Processed with fallback" },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { service: "Israel Receiver", status: "online", endpoint: "/api/israel" },
    { status: 200, headers: corsHeaders }
  );
}
