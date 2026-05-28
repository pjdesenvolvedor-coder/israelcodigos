
import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";

export const dynamic = 'force-dynamic';

const { firestore } = initializeFirebase();
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

  const snapshot = await getDocs(collection(firestore, "access_codes"));
  const codes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ codes }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    if (body.password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await addDoc(collection(firestore, "access_codes"), {
      code: newCode,
      createdAt: new Date().toISOString(),
      usedAt: null,
      expiresAt: null
    });
    return NextResponse.json({ success: true, code: newCode }, { headers: corsHeaders });
  }

  if (body.action === "validate") {
    const { code } = body;
    const q = query(collection(firestore, "access_codes"), where("code", "==", code.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return NextResponse.json({ valid: false, message: "Código inválido" }, { status: 404 });
    }

    const docSnap = snapshot.docs[0];
    const entry = docSnap.data();

    if (entry.usedAt && entry.expiresAt) {
      if (new Date() > new Date(entry.expiresAt)) {
        return NextResponse.json({ valid: false, message: "Código expirado" }, { status: 403 });
      }
      return NextResponse.json({ valid: true, expiresAt: entry.expiresAt }, { headers: corsHeaders });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await updateDoc(doc(firestore, "access_codes", docSnap.id), {
      usedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    });

    return NextResponse.json({ 
      valid: true, 
      expiresAt: expiresAt.toISOString(),
      message: "Código ativado por 30 dias" 
    }, { headers: headers });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const snapshot = await getDocs(collection(firestore, "access_codes"));
  const promises = snapshot.docs.map(d => deleteDoc(doc(firestore, "access_codes", d.id)));
  await Promise.all(promises);
  return NextResponse.json({ success: true }, { headers: corsHeaders });
}
