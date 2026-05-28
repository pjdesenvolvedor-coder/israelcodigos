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
  Clock,
  RefreshCw
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
  const [isConnected, setIsConnected] = useState(true);

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
      const entries = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        id: doc.id,
        ...doc.data()
      })) as WebhookEntry[];
      
      setHistory(entries);
      setIsConnected(true);
      
      if (!snapshot.metadata.hasPendingWrites && snapshot.docChanges().some(c => c.type === "added")) {
        toast({
          title: "SINAL CAPTURADO",
          description: "Novo código de acesso detectado.",
          className: "bg-blue-600 text-white border-none font-bold",
        });
      }
    }, (error) => {
      console.error("Conexão interrompida:", error);
      setIsConnected(false);
    });
    
    return () => unsubscribe();
  }, [mounted]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(entry => 
      JSON.stringify(entry.payload).toLowerCase().includes(term) ||
      JSON.stringify(entry.headers).toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  const handleClear = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "webhooks"));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setSelectedEntry(null);
      toast({ title: "Histórico Limpo", description: "Todos os sinais foram removidos." });
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
      <header className="h-20 border-b flex items-center justify-between px-8 bg-blue-700 shrink-0 z-30 shadow-lg">
        <div className="flex items-center gap-4 text-white">
          <div className="bg-white p-2 rounded-lg shadow-md">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none uppercase">RECEPTOR ISRAEL</h1>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em] mt-1 opacity-80">Monitor de Códigos Temporários</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">API Endpoint</span>
            <code className="text-[11px] font-mono text-white bg-blue-800/50 px-3 py-1.5 rounded-md border border-white/10">
              /api/israel
            </code>
          </div>
          
          <div className="flex items-center">
            {isConnected ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none flex gap-2 items-center px-4 py-2 font-bold shadow-md">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                SISTEMA ATIVO
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex gap-2 items-center px-4 py-2 font-bold animate-pulse">
                <WifiOff className="w-3 h-3" /> VERIFIQUE CONEXÃO
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/10 font-bold">
            <Trash2 className="w-4 h-4 mr-2" /> LIMPAR
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 border-r flex flex-col shrink-0 bg-slate-50/50">
          <div className="p-5 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar códigos capturados..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none border transition-all"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-8 border-2 border-dashed border-slate-200 rounded-2xl m-2">
                  <Activity className="w-12 h-12 text-blue-100 mx-auto mb-4" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Aguardando Sinais...</p>
                  <p className="text-[12px] text-slate-400 mt-2">Envie POST para /api/israel</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-lg scale-[1.02]' 
                      : 'hover:border-blue-200 border-slate-100 text-slate-700 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-100' : 'text-blue-600'}`}>
                        {entry.payload?.Assunto || "NOVO CÓDIGO"}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono font-bold">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-black truncate font-mono tracking-tight">
                      {entry.payload?.Conteudo || entry.payload?.codigo || "DADO RECEBIDO"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50/80 flex justify-between items-center px-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-[0.2em]">Inspeção de Pacote</span>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700 font-black text-[9px] uppercase tracking-widest">Acesso Volátil</Badge>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <div className="border-r flex flex-col bg-white">
                  <ScrollArea className="flex-1 p-8">
                    <div className="space-y-8">
                      <Card className="border-2 border-blue-50 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="py-4 px-6 bg-blue-50/50 border-b border-blue-50">
                          <div className="flex items-center gap-3 text-blue-800">
                            <Zap className="w-4 h-4 fill-blue-800" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Interpretação IA</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-5">
                              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} className="bg-blue-600 text-white border-none text-[10px] px-3 py-1 font-bold">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-xl shadow-md transition-all active:scale-95"
                            >
                              {isInterpreting ? (
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              {isInterpreting ? "ANALISANDO..." : "DECODIFICAR COM IA"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Meta-dados do Sinal</h4>
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden text-[12px] font-mono">
                          {Object.entries(selectedEntry.headers).slice(0, 8).map(([k, v]) => (
                            <div key={k} className="p-4 border-b border-slate-100 flex flex-col last:border-0 hover:bg-blue-50/30 transition-colors">
                              <span className="text-blue-700 font-black uppercase text-[9px] mb-1">{k}</span>
                              <span className="text-slate-500 break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                <div className="bg-slate-900 text-blue-100 flex flex-col">
                  <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between px-8">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Dados Brutos (JSON)</span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-10 text-[13px] font-mono leading-relaxed overflow-x-auto selection:bg-blue-500/50">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-white">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 text-blue-600 relative">
                <Activity className="w-10 h-10" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-600/10 animate-ping"></div>
              </div>
              <h2 className="text-2xl font-black text-blue-900 mb-3 tracking-tight uppercase">SISTEMA AGUARDANDO</h2>
              <div className="text-slate-400 max-w-sm text-sm leading-relaxed font-medium">
                Envie suas requisições para o endpoint abaixo para iniciar o monitoramento em tempo real.
                <div className="mt-6 p-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl">
                  <code className="text-blue-700 font-black text-base break-all">/api/israel</code>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
