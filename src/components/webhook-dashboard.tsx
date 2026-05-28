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
  RefreshCw,
  Code
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Escuta a coleção em tempo real
    const q = query(
      collection(db, "webhooks"), 
      orderBy("createdAt", "desc"), 
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
      setIsConnected(true);
      
      // Notifica novo sinal se não for carregamento inicial
      if (!snapshot.metadata.fromCache && snapshot.docChanges().some(c => c.type === "added")) {
        toast({
          title: "SINAL CAPTURADO",
          description: "Um novo código acaba de chegar ao sistema.",
          className: "bg-blue-600 text-white border-none font-bold",
        });
      }
    }, (error) => {
      console.error("Erro na escuta real-time:", error);
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
      toast({ title: "Histórico Limpo", description: "Todos os sinais foram removidos com sucesso." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao limpar banco de dados" });
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
      toast({ variant: "destructive", title: "Erro ao processar com IA" });
    } finally {
      setIsInterpreting(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      <header className="h-20 border-b flex items-center justify-between px-8 bg-blue-700 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-4 text-white">
          <div className="bg-white p-2 rounded-xl shadow-inner">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none uppercase">RECEPTOR ISRAEL</h1>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-[0.2em] mt-1 opacity-80">Sinais em Tempo Real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">Status do Receptor</span>
            <div className="flex items-center gap-2">
              <code className="text-[11px] font-mono text-white bg-blue-800/50 px-3 py-1 rounded-md border border-white/10">
                /api/israel
              </code>
            </div>
          </div>
          
          <div className="flex items-center">
            {isConnected ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none flex gap-2 items-center px-4 py-2 font-black shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                SISTEMA ONLINE
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex gap-2 items-center px-4 py-2 font-black animate-pulse shadow-lg">
                <WifiOff className="w-3 h-3" /> OFFLINE
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/10 font-bold px-4">
            <Trash2 className="w-4 h-4 mr-2" /> LIMPAR TUDO
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-96 border-r flex flex-col shrink-0 bg-slate-50">
          <div className="p-6 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar sinais capturados..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none border transition-all"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="py-24 text-center px-8 border-2 border-dashed border-slate-200 rounded-3xl m-2 bg-white/50">
                  <Activity className="w-12 h-12 text-blue-200 mx-auto mb-4 animate-pulse" />
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Escaneando Rede...</div>
                  <div className="text-[12px] text-slate-400 mt-2 font-medium">Aguardando sinais externos</div>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-xl scale-[1.02] z-10' 
                      : 'hover:border-blue-200 border-slate-100 text-slate-700 bg-white hover:shadow-lg'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Code className={`w-3 h-3 ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-200' : 'text-blue-600'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-100' : 'text-blue-600'}`}>
                          {entry.payload?.Assunto || entry.payload?.Produto || "SINAL BRUTO"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-70">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono font-bold">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-black truncate font-mono tracking-tight bg-black/5 p-2 rounded-lg">
                      {entry.payload?.Conteudo || entry.payload?.codigo || entry.payload?.code || "VER DETALHES"}
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
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center px-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-[0.2em]">Monitor de Pacote</span>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700 font-black text-[9px] uppercase tracking-widest">Acesso Instantâneo</Badge>
              </div>

              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 overflow-hidden">
                <div className="border-r flex flex-col bg-white">
                  <ScrollArea className="flex-1 p-8">
                    <div className="space-y-8">
                      <Card className="border-2 border-blue-50 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="py-5 px-6 bg-blue-50/30 border-b border-blue-50">
                          <div className="flex items-center gap-3 text-blue-800">
                            <Zap className="w-5 h-5 fill-blue-800" />
                            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em]">Interpretação por IA</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-8">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-6">
                              <div className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {selectedEntry.interpretation.summary}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} className="bg-blue-700 text-white border-none text-[10px] px-4 py-1.5 font-black uppercase tracking-wider shadow-sm">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-7 rounded-2xl shadow-xl transition-all active:scale-95 group"
                            >
                              {isInterpreting ? (
                                <RefreshCw className="w-5 h-5 animate-spin mr-3" />
                              ) : (
                                <Zap className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />
                              )}
                              {isInterpreting ? "ANALISANDO DADOS..." : "DECODIFICAR CÓDIGO COM IA"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                          <Terminal className="w-3 h-3" /> Metadados de Recebimento
                        </h4>
                        <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden text-[12px] font-mono">
                          {Object.entries(selectedEntry.headers).slice(0, 12).map(([k, v]) => (
                            <div key={k} className="p-4 border-b border-slate-100 flex flex-col last:border-0 hover:bg-blue-50/20 transition-colors">
                              <span className="text-blue-700 font-black uppercase text-[9px] mb-1 opacity-70">{k}</span>
                              <span className="text-slate-600 break-all leading-tight">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                <div className="bg-slate-900 flex flex-col">
                  <div className="p-5 border-b border-white/10 bg-black/40 flex items-center justify-between px-8">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Estrutura Bruta (JSON)</span>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px] font-black">PROTOCOLO SEGURO</Badge>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-10">
                      <pre className="text-[13px] font-mono leading-relaxed overflow-x-auto text-blue-100 selection:bg-blue-500/50">
                        {JSON.stringify(selectedEntry.payload, null, 2)}
                      </pre>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-white relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)]"></div>
              <div className="w-28 h-28 bg-blue-50 rounded-3xl flex items-center justify-center mb-10 text-blue-600 relative rotate-3 shadow-blue-100 shadow-xl">
                <Activity className="w-12 h-12" />
                <div className="absolute -inset-4 rounded-3xl border-2 border-blue-600/5 animate-ping"></div>
              </div>
              <h2 className="text-3xl font-black text-blue-900 mb-4 tracking-tight uppercase">SISTEMA ATIVO</h2>
              <div className="max-w-md">
                <div className="text-slate-500 text-sm leading-relaxed font-medium mb-8">
                  O receptor está operando na frequência máxima. Qualquer sinal enviado para o endpoint abaixo aparecerá aqui instantaneamente.
                </div>
                <div className="p-6 bg-slate-50 border-2 border-dashed border-blue-100 rounded-3xl group hover:border-blue-400 transition-all cursor-copy">
                  <code className="text-blue-700 font-black text-lg break-all">/api/israel</code>
                  <p className="text-[9px] text-slate-400 mt-3 uppercase font-black tracking-widest">Clique para copiar o endpoint</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}