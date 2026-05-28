
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
  Clock
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
    // Monitoramento em tempo real do túnel de dados
    const q = query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(30));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        id: doc.id,
        ...doc.data()
      })) as WebhookEntry[];
      
      setHistory(entries);
      setIsConnected(true);
      
      // Notificação visual de novo código
      if (snapshot.docChanges().some(change => change.type === "added")) {
        // Opcional: tocar som ou logar
      }
    }, (error) => {
      console.error("Erro na conexão Firebase:", error);
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
      toast({ title: "Histórico Limpo", description: "Todos os sinais temporários foram removidos." });
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
      toast({ variant: "destructive", title: "Erro na análise de IA" });
    } finally {
      setIsInterpreting(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      {/* Barra Superior - Azul Israel */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-blue-700 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-white p-1.5 rounded-sm">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CÓDIGOS ISRAEL</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-white/10 px-4 py-2 rounded border border-white/20">
            <Globe className="w-3 h-3 text-blue-200" />
            <span className="text-[10px] font-mono text-white font-semibold">israelcodigos.vercel.app/api/israel</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-emerald-500 text-white border-none flex gap-1.5 items-center px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                ONLINE
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex gap-1.5 items-center px-3 py-1">
                <WifiOff className="w-3 h-3" /> DESCONECTADO
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/20">
            <Trash2 className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Sinais Recebidos */}
        <aside className="w-80 border-r flex flex-col shrink-0 bg-slate-50">
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar sinais..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-slate-200 rounded py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none border transition-all"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <Activity className="w-8 h-8 text-blue-200 mx-auto mb-4 animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aguardando sinais...</p>
                  <p className="text-[11px] text-slate-400 mt-2">Envie POST para /api/israel</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded border transition-all ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-700 border-blue-800 text-white shadow-lg' 
                      : 'hover:bg-blue-50 border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-200' : 'text-blue-600'}`}>
                        RECEBIDO
                      </span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-50" />
                        <span className={`text-[10px] font-mono ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-white/70' : 'text-slate-400'}`}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-bold truncate">
                      {entry.payload?.codigo || entry.payload?.code || entry.payload?.event || "Sinal de Entrada"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Área de Visualização do Conteúdo */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse"></div>
                  <span className="text-xs font-bold text-blue-900 uppercase">DETALHES DO CÓDIGO</span>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white font-bold">DADO VOLÁTIL</Badge>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <div className="border-r flex flex-col bg-white">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      {/* Análise por Inteligência Artificial */}
                      <Card className="border-blue-200 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-blue-50 border-b border-blue-100">
                          <div className="flex items-center gap-2 text-blue-800">
                            <Zap className="w-4 h-4 fill-blue-800" />
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Análise de IA</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-4">
                              <p className="text-sm text-slate-800 leading-relaxed">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} className="bg-blue-700 text-white border-none text-[10px] px-2.5 py-1">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold"
                            >
                              {isInterpreting ? "Analisando..." : "Interpretar Conteúdo"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      {/* Cabeçalhos HTTP do Remetente */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">CABEÇALHOS DA REQUISIÇÃO</h4>
                        <div className="bg-slate-50 rounded border border-slate-200 overflow-hidden text-[11px] font-mono">
                          {Object.entries(selectedEntry.headers).map(([k, v]) => (
                            <div key={k} className="p-2.5 border-b border-slate-200 flex flex-col last:border-0 hover:bg-blue-50/50 transition-colors">
                              <span className="text-blue-800 font-bold uppercase text-[9px] mb-1">{k}</span>
                              <span className="text-slate-600 break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Exibição RAW do Payload */}
                <div className="bg-slate-900 text-blue-100 flex flex-col">
                  <div className="p-3 border-b border-white/10 bg-black/40 flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">CONTEÚDO BRUTO (RAW)</span>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-6 text-[12px] font-mono leading-relaxed overflow-x-auto">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8 text-blue-700 relative">
                <Activity className="w-10 h-10" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-700/20 animate-ping"></div>
              </div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2 tracking-tight uppercase">MONITORAMENTO ATIVO</h2>
              <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                Nenhum sinal selecionado. O sistema está pronto para receber requisições em: <br/>
                <code className="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded inline-block mt-3 border border-blue-100">/api/israel</code>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
