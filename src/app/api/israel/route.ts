import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

export const dynamic = 'force-dynamic';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    let payload;
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { Conteudo: text };
      }
    }

    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmissão para o Firestore (Relay) - SEM ESPERAR AWAIT para resposta rápida
    addDoc(collection(db, "webhooks"), {
      timestamp: new Date().toISOString(),
      payload: payload,
      headers: headers,
      createdAt: serverTimestamp(),
      method: "POST"
    }).catch(err => console.error("Erro no relay do sinal:", err));

    return NextResponse.json(
      { ok: true, message: "Sinal capturado" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: true, processed: true },
      { status: 200, headers: corsHeaders }
    );
  }
}

export async function GET() {
  try {
    const q = query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    
    const emails = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const payload = data.payload || {};
      
      return {
        id: doc.id,
        senderEmail: "desconhecido",
        recipientEmail: null,
        subject: "Nova mensagem recebida",
        message: "",
        code: payload.Conteudo || payload.codigo || payload.code || null,
        receivedAt: data.timestamp || new Date().toISOString(),
        debug: {
          original: payload,
          payload: payload,
          headers: data.headers || {},
          body: payload
        }
      };
    });

    return NextResponse.json({
      ok: true,
      total: emails.length,
      emails: emails
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      total: 0,
      emails: [],
      error: "Erro ao buscar sinais"
    }, { status: 200, headers: corsHeaders });
  }
}
