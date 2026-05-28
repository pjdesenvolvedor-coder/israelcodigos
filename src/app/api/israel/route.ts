import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    
    // Log para depuração
    console.log("Webhook Recebido:", payload);

    return NextResponse.json({ 
      status: "sucesso", 
      recebido: true,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ 
      status: "erro", 
      mensagem: "Payload inválido" 
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    mensagem: "Endpoint WebHookPulse Pronto", 
    metodo: "POST necessário" 
  });
}