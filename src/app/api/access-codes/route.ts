
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Memória temporária para códigos (reseta ao reiniciar servidor)
// No mundo ideal sem DB, isso é o máximo que conseguimos de compartilhamento entre usuários
let accessCodes: Array<{
  code: string;
  createdAt: string;
  usedAt: string | null;
  expiresAt: string | null;
}> = [];

const ADMIN_PASSWORD = "Ae@1234Br";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return NextResponse.json({ codes: accessCodes }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Rota de Geração (ADM)
  if (body.action === "generate") {
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const entry = {
      code: newCode,
      createdAt: new Date().toISOString(),
      usedAt: null,
      expiresAt: null
    };
    accessCodes.push(entry);
    return NextResponse.json({ success: true, code: newCode }, { headers: corsHeaders });
  }

  // Rota de Validação (Cliente)
  if (body.action === "validate") {
    const { code } = body;
    const index = accessCodes.findIndex(c => c.code === code);
    
    if (index === -1) {
      return NextResponse.json({ valid: false, message: "Código inválido" }, { status: 404 });
    }

    const entry = accessCodes[index];

    // Se já foi usado, verifica expiração
    if (entry.usedAt && entry.expiresAt) {
      if (new Date() > new Date(entry.expiresAt)) {
        return NextResponse.json({ valid: false, message: "Código expirado" }, { status: 403 });
      }
      return NextResponse.json({ valid: true, expiresAt: entry.expiresAt }, { headers: corsHeaders });
    }

    // Primeiro uso: Ativa os 30 dias
    const usedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    accessCodes[index] = {
      ...entry,
      usedAt: usedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    return NextResponse.json({ 
      valid: true, 
      expiresAt: expiresAt.toISOString(),
      message: "Código ativado por 30 dias" 
    }, { headers: corsHeaders });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  accessCodes = [];
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
