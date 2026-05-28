
import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

const { firestore } = initializeFirebase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
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
    const timestamp = new Date().toISOString();

    await addDoc(collection(firestore, "webhooks"), {
      timestamp: timestamp,
      payload: payload,
      headers: headers,
      method: "POST",
      createdAt: timestamp
    });

    return NextResponse.json(
      { ok: true, message: "Capturado" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200, headers: corsHeaders });
  }
}

export async function GET() {
  try {
    const q = query(collection(firestore, "webhooks"), orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);
    const mapped = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        receivedAt: data.timestamp,
        debug: {
          payload: data.payload,
          headers: data.headers
        }
      };
    });

    return NextResponse.json({
      ok: true,
      total: mapped.length,
      emails: mapped
    }, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ ok: false, emails: [] }, { status: 200, headers: corsHeaders });
  }
}

export async function DELETE() {
  try {
    const snapshot = await getDocs(collection(firestore, "webhooks"));
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(firestore, "webhooks", d.id)));
    await Promise.all(deletePromises);
    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
