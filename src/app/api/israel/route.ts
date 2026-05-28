import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Memória temporária no servidor (reseta ao reiniciar o servidor/deploy)
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
        payload = { Conteudo: text, Produto: "Sinal Externo", Assunto: "Raw Text" };
      }
    }

    const headers = Object.fromEntries(req.headers.entries());
    const id = `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const newSignal = {
      id: id,
      timestamp: timestamp,
      payload: payload,
      headers: headers,
      method: "POST",
      createdAt: timestamp
    };

    // Adiciona ao início e mantém apenas os últimos 50 na memória do servidor
    signals = [newSignal, ...signals].slice(0, 50);

    return NextResponse.json(
      { ok: true, message: "Capturado", id },
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
  const mapped = signals.map(s => ({
    id: s.id,
    receivedAt: s.timestamp,
    debug: {
      payload: s.payload,
      headers: s.headers
    }
  }));

  return NextResponse.json({
    ok: true,
    total: mapped.length,
    emails: mapped
  }, { status: 200, headers: corsHeaders });
}