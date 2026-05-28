import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// Inicializa Firebase no lado do servidor
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

/**
 * Manipula a requisição OPTIONS para CORS.
 * Isso é fundamental para permitir que outros sites (origens diferentes) 
 * enviem requisições POST para esta API sem erros 401 ou 403.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    
    // Transmitimos para o Firestore para que o Dashboard (que usa onSnapshot)
    // receba a atualização instantaneamente na tela.
    try {
      await addDoc(collection(db, "webhooks"), {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        method: "POST",
        headers: headers,
        payload: payload,
        createdAt: serverTimestamp()
      });
    } catch (dbError) {
      // Se houver erro no banco (ex: permissões), logamos mas não travamos a resposta.
      console.error("Erro de transmissão para o relay:", dbError);
    }

    const response = NextResponse.json({ 
      status: "sucesso", 
      recebido: true,
      mensagem: "Webhook WebHookPulse recebido com sucesso"
    }, { status: 200 });

    // Inserimos headers CORS na resposta de sucesso também
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return response;
  } catch (error) {
    console.error("Erro crítico no processamento do Webhook:", error);
    const errorResponse = NextResponse.json({ 
      status: "erro", 
      mensagem: "O servidor não conseguiu ler o payload enviado." 
    }, { status: 400 });
    
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    return errorResponse;
  }
}

export async function GET() {
  const response = NextResponse.headers.set ? null : NextResponse.json({ 
    status: "online",
    servico: "WebHookPulse Relay",
    instrucao: "Use o método POST para enviar seus códigos de acesso."
  });
  
  const res = response || NextResponse.json({ status: "ativo" });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}
