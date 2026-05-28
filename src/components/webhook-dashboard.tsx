"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Search, 
  Zap, 
  Trash2,
  ShieldCheck,
  WifiOff,
  Terminal,
  RefreshCw,
  Code,
  Database,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { WebhookEntry } from "@/lib/webhook-store";
import { toast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs,
  limit,
  writeBatch
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { interpretPayload } from "@/ai/flows/interpret-payload-flow";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export function WebhookDashboard() {
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<WebhookEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInterpreting, setIsInterpreting] = useState<string | null>(null);
  const [status, setStatus] = useState<"online" | "connecting" | "offline">("connecting");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const q = query(
      collection(db, "webhooks"), 
      orderBy("createdAt", "desc"), 
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          firestoreId: doc.id,
          id: doc.id,
          timestamp: data.timestamp || new Date().toISOString(),
          method: data.method || "POST",
          headers: data.headers || {},
          payload: data.payload || {},
          interpretation: data.interpretation
        };
      }) as WebhookEntry[];
      
      setHistory(entries);
      setStatus("online");
    }, (error) => {
      console.error("Erro real-time:", error);
      setStatus("offline");
    });
    
    return () => unsubscribe();
  }, [mounted]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(entry => 
      JSON.stringify(entry.payload).toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  const handleClear = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "webhooks"));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setSelectedEntry(null);
      toast({ title: "Limpo", description: "Histórico removido." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao limpar" });
    }
  };

  const handleAI = async (entry: WebhookEntry) => {
    if (isInterpreting) return;
    setIsInterpreting(entry.id);
    try {
      const result = await interpretPayload({ payloadJson: JSON.stringify(entry.payload) });
      setSelectedEntry({
        ...entry,
        interpretation: {
          summary: result.interpretation,
          codes: result.extractedDetails
        }
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na IA" });
    } finally {
      setIsInterpreting(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900">
      <header className="h-16 border-b flex items-center justify-between px-6 bg-blue-700 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 text-white">
          <ShieldCheck className="w-5 h-5" />
          <h1 className="text-lg font-black tracking-tight uppercase">RECEPTOR ISRAEL</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {status === "online" ? (
            <Badge className="bg-emerald-500 text-white border-none font-bold">ONLINE</Badge>
          ) : (
            <Badge variant="destructive" className="font-bold animate-pulse">OFFLINE</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/10 font-bold border border-white/20">
            <Trash2 className="w-4 h-4 mr-2" /> LIMPAR
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r flex flex-col bg-slate-50">
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 pl-9 text-sm outline-none border focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredHistory.map((entry) => (
                <button
                  key={entry.firestoreId}
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedEntry?.firestoreId === entry.firestoreId 
                    ? 'bg-blue-600 border-blue-700 text-white shadow-md' 
                    : 'hover:bg-blue-50 border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] font-bold uppercase ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-100' : 'text-blue-600'}`}>
                      {entry.payload?.Produto || "SINAL"}
                    </span>
                    <span className="text-[10px] opacity-70">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm font-bold truncate font-mono">
                    {entry.payload?.Conteudo || "VER"}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b bg-slate-50 flex justify-between items-center px-6">
                <span className="text-blue-900 font-bold text-xs uppercase">DETALHES DO PACOTE</span>
              </div>
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 overflow-hidden">
                <ScrollArea className="p-6 border-r">
                  <div className="space-y-6">
                    <Card className="border-blue-100 shadow-sm rounded-2xl overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-blue-50/50">
                        <CardTitle className="text-[10px] font-bold uppercase text-blue-800">Análise IA</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {selectedEntry.interpretation ? (
                          <div className="space-y-4">
                            <div className="text-sm text-slate-700 font-medium">{selectedEntry.interpretation.summary}</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedEntry.interpretation.codes.map((c, i) => (
                                <Badge key={i} className="bg-blue-700 text-white">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleAI(selectedEntry)} 
                            disabled={!!isInterpreting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl"
                          >
                            {isInterpreting ? <RefreshCw className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                            {isInterpreting ? "PROCESSANDO..." : "DECODIFICAR COM IA"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">JSON Bruto</span>
                      <pre className="bg-slate-900 text-blue-100 p-4 rounded-xl text-xs overflow-auto">
                        {JSON.stringify(selectedEntry.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </ScrollArea>
                <ScrollArea className="bg-slate-50 p-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cabeçalhos</span>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[11px]">
                      {Object.entries(selectedEntry.headers).map(([k, v]) => (
                        <div key={k} className="p-3 border-b last:border-0 flex flex-col">
                          <span className="text-blue-700 font-bold uppercase text-[9px]">{k}</span>
                          <span className="text-slate-600 break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                <Activity className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-blue-900 mb-2 uppercase">Aguardando Sinais</h2>
              <div className="text-slate-500 text-sm max-w-sm mb-8 font-medium">
                O sistema está monitorando. Envie seu POST para o link abaixo para ver os dados aparecerem aqui.
              </div>
              <div className="p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl">
                <code className="text-blue-700 font-black text-lg">/api/israel</code>
                <div className="flex items-center justify-center gap-2 mt-2 text-blue-400">
                  <ExternalLink className="w-3 h-3" />
                  <span className="text-[9px] uppercase font-bold">Endpoint Ativo</span>
                </div>
              </div>
              {status === "offline" && (
                <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl max-w-xs">
                  <Database className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-xs text-red-700 font-bold">BANCO DESCONECTADO. ATIVE O FIRESTORE NO PAINEL FIREBASE.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
