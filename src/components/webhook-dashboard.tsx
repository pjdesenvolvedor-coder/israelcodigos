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
  Terminal
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
    // Escuta em tempo real as novas requisições
    const q = query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        id: doc.id,
        ...doc.data()
      })) as WebhookEntry[];
      
      setHistory(entries);
      setIsConnected(true);
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
      toast({ title: "Limpo", description: "Histórico de códigos removido." });
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
      {/* Header Azul Israel */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-blue-600 shrink-0 z-30 shadow-lg">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-white p-1 rounded">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-black tracking-tighter">CÓDIGOS ISRAEL</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-md border border-white/20">
            <Globe className="w-3 h-3 text-blue-100" />
            <span className="text-[11px] font-mono text-white font-bold">/api/israel</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-white text-blue-600 hover:bg-white border-none flex gap-1 items-center px-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                ONLINE
              </Badge>
            ) : (
              <Badge variant="destructive" className="flex gap-1 items-center">
                <WifiOff className="w-3 h-3" /> OFFLINE
              </Badge>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/10">
            <Trash2 className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Recebimento */}
        <aside className="w-80 border-r flex flex-col shrink-0 bg-slate-50">
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar códigos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none border transition-all"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <Terminal className="w-10 h-10 text-blue-100 mx-auto mb-4" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escutando Porta /api/israel...</p>
                  <p className="text-[11px] text-slate-400 mt-2">Aguardando sinais externos</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded-lg transition-all border ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md' 
                      : 'hover:bg-blue-50 border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-blue-200' : 'text-blue-600'}`}>
                        RECEBIDO
                      </span>
                      <span className={`text-[9px] font-mono ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-bold truncate">
                      {entry.payload?.codigo || entry.payload?.code || entry.payload?.event || "Sinal Externo"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Visualização Central */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-tighter">CÓDIGO SELECIONADO</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 font-bold">VOLÁTIL</Badge>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <div className="border-r flex flex-col bg-white">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      {/* Interpretação por IA */}
                      <Card className="border-blue-100 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-blue-50 border-b border-blue-100">
                          <div className="flex items-center gap-2 text-blue-700">
                            <Zap className="w-4 h-4 fill-blue-700" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">Análise de IA</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-4">
                              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} className="bg-blue-600 text-white border-none text-[10px] px-2 py-0.5">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
                            >
                              {isInterpreting ? "Analisando..." : "Interpretar Payload"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      {/* Cabeçalhos HTTP */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">METADADOS HTTP</h4>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-[11px] font-mono">
                          {Object.entries(selectedEntry.headers).map(([k, v]) => (
                            <div key={k} className="p-2.5 border-b border-slate-200 flex flex-col last:border-0 hover:bg-blue-50 transition-colors">
                              <span className="text-blue-700 font-bold uppercase text-[9px] mb-1">{k}</span>
                              <span className="text-slate-600 break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Código RAW */}
                <div className="bg-slate-900 text-blue-100 flex flex-col">
                  <div className="p-3 border-b border-white/10 bg-black/20 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">CORPO DA REQUISIÇÃO</span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-6 text-[12px] font-mono leading-relaxed overflow-x-auto selection:bg-blue-500/50">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 text-blue-600 relative">
                <Activity className="w-12 h-12" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-600/10 animate-ping"></div>
              </div>
              <h2 className="text-2xl font-black text-blue-900 mb-2 tracking-tighter uppercase">MONITORAMENTO ISRAEL</h2>
              <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
                Nenhum sinal selecionado. Envie dados para: <br/>
                <span className="text-blue-600 font-mono font-bold bg-blue-50 px-3 py-1 rounded inline-block mt-3 border border-blue-100">/api/israel</span>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
