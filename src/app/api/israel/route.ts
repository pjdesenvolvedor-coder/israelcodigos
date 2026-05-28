
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Memória temporária no servidor (limpa ao reiniciar/redesdobrar)
let signals: any[] = [];

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
    const id = Math.random().toString(36).substring(2, 15);
    const timestamp = new Date().toISOString();

    const newSignal = {
      id: id,
      timestamp: timestamp,
      payload: payload,
      headers: headers,
      method: "POST",
      createdAt: timestamp
    };

    // Adiciona ao início da lista
    signals = [newSignal, ...signals].slice(0, 100);

    return NextResponse.json(
      { ok: true, message: "Sinal capturado com sucesso", id },
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
  const emails = signals.map(s => {
    const payload = s.payload || {};
    return {
      id: s.id,
      senderEmail: "desconhecido",
      recipientEmail: null,
      subject: "Nova mensagem recebida",
      message: "",
      code: payload.Conteudo || payload.codigo || payload.code || null,
      receivedAt: s.timestamp,
      debug: {
        original: payload,
        payload: payload,
        headers: s.headers || {},
        body: payload
      }
    };
  });

  return NextResponse.json({
    ok: true,
    total: emails.length,
    emails: emails
  }, { status: 200, headers: corsHeaders });
}
