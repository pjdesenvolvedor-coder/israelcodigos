
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Search, 
  Zap, 
  Code,
  Trash2,
  ShieldCheck,
  Globe,
  Wifi,
  WifiOff,
  Terminal,
  Clock,
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
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<WebhookEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInterpreting, setIsInterpreting] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Monitoramento em tempo real ultra-sensível
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
      
      // Notificação de novo sinal
      if (snapshot.docChanges().some(change => change.type === "added" && !snapshot.metadata.hasPendingWrites)) {
        toast({
          title: "SINAL RECEBIDO",
          description: "Um novo código de acesso chegou ao sistema.",
          className: "bg-blue-700 text-white border-none",
        });
      }
    }, (error) => {
      console.error("Erro na escuta real-time:", error);
      setIsConnected(false);
    });
    
    return () => unsubscribe();
  }, []);

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
      toast({ variant: "destructive", title: "Falha na análise inteligente" });
    } finally {
      setIsInterpreting(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      {/* Barra de Status e Cabeçalho */}
      <header className="h-20 border-b flex items-center justify-between px-8 bg-blue-700 shrink-0 z-30 shadow-xl">
        <div className="flex items-center gap-4 text-white">
          <div className="bg-white p-2 rounded-lg shadow-inner">
            <ShieldCheck className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none">RECEPTOR ISRAEL</h1>
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-[0.2em] mt-1">Monitoramento de Sinais</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Link do Webhook</span>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded border border-white/20">
              <code className="text-[11px] font-mono text-white">/api/israel</code>
              <ExternalLink className="w-3 h-3 text-blue-300" />
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            {isConnected ? (
              <Badge className="bg-emerald-500 text-white border-none flex gap-2 items-center px-4 py-1.5 font-bold shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                ONLINE
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex gap-2 items-center px-4 py-1.5 font-bold animate-bounce">
                <WifiOff className="w-3 h-3" /> OFFLINE
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/20 font-bold border border-white/10">
            <Trash2 className="w-4 h-4 mr-2" /> LIMPAR TUDO
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Sinais */}
        <aside className="w-96 border-r flex flex-col shrink-0 bg-slate-50 shadow-inner">
          <div className="p-5 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Procurar nos sinais recebidos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-lg py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none border transition-all shadow-sm"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="py-24 text-center px-8 border-2 border-dashed border-slate-200 rounded-xl m-4">
                  <Activity className="w-12 h-12 text-blue-200 mx-auto mb-4 animate-pulse" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Escaneando a rede...</p>
                  <p className="text-[12px] text-slate-400 mt-2 font-medium">Envie uma requisição para o endpoint para capturar códigos.</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all group ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-700 border-blue-800 text-white shadow-xl translate-x-1' 
                      : 'hover:border-blue-300 border-slate-200 text-slate-700 bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-200' : 'text-blue-600'}`}>
                        SINAL CAPTURADO
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3 h-3 ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-300' : 'text-slate-400'}`} />
                        <span className={`text-[11px] font-mono font-bold ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-white/80' : 'text-slate-500'}`}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-black truncate font-mono">
                      {entry.payload?.codigo || entry.payload?.code || entry.payload?.event || "DADO_RECEBIDO_EXTERNO"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Visualização de Conteúdo */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-5 border-b bg-slate-50 flex justify-between items-center px-8">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-700 animate-ping"></div>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-widest">VISUALIZANDO PACOTE DE DADOS</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white font-black text-[10px] px-3">PROTEÇÃO ATIVA</Badge>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white font-black text-[10px] px-3">SINAL VOLÁTIL</Badge>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <div className="border-r flex flex-col bg-white overflow-hidden">
                  <ScrollArea className="flex-1 p-8">
                    <div className="space-y-8">
                      {/* Análise por Inteligência Artificial */}
                      <Card className="border-2 border-blue-100 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="py-4 px-6 bg-blue-50 border-b border-blue-100">
                          <div className="flex items-center gap-3 text-blue-800">
                            <Zap className="w-5 h-5 fill-blue-800" />
                            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em]">Interpretação Inteligente</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-6">
                              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-2.5">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} className="bg-blue-700 text-white border-none text-[11px] px-4 py-1.5 font-bold shadow-md">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-6 rounded-xl shadow-lg transition-all hover:scale-[1.01]"
                            >
                              {isInterpreting ? "PROCESSANDO..." : "ANALISAR COM INTELIGÊNCIA ARTIFICIAL"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      {/* Cabeçalhos Técnicos */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-blue-900/40 uppercase tracking-[0.3em] px-1">Metadados da Requisição</h4>
                        <div className="bg-slate-50 rounded-2xl border-2 border-slate-100 overflow-hidden text-[12px] font-mono shadow-inner">
                          {Object.entries(selectedEntry.headers).map(([k, v]) => (
                            <div key={k} className="p-4 border-b border-slate-100 flex flex-col last:border-0 hover:bg-blue-50/50 transition-colors">
                              <span className="text-blue-800 font-black uppercase text-[10px] mb-1.5 tracking-tighter">{k}</span>
                              <span className="text-slate-600 break-all leading-relaxed">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Área RAW */}
                <div className="bg-slate-900 text-blue-100 flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-white/10 bg-black/50 flex items-center justify-between px-8">
                    <div className="flex items-center gap-3">
                      <Terminal className="w-5 h-5 text-blue-400" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Console de Payload</span>
                    </div>
                    <div className="text-[10px] font-mono text-white/40">FORMATO: JSON_UTF8</div>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-10 text-[13px] font-mono leading-loose overflow-x-auto selection:bg-blue-500 selection:text-white">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-white">
              <div className="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-10 text-blue-700 relative shadow-2xl">
                <Activity className="w-16 h-16" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-700/20 animate-ping"></div>
                <div className="absolute inset-[-10px] rounded-full border border-blue-700/10"></div>
              </div>
              <h2 className="text-3xl font-black text-blue-900 mb-4 tracking-tighter uppercase">SISTEMA ATIVO</h2>
              <p className="text-slate-400 max-w-md text-sm leading-relaxed font-medium">
                Pronto para interceptar sinais. Utilize o endpoint abaixo para enviar dados do seu outro site:
                <br/>
                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl">
                  <code className="text-blue-700 font-black text-lg break-all">/api/israel</code>
                </div>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
