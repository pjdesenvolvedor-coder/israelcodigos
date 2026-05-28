"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Copy, 
  Search, 
  Zap, 
  Code,
  Trash2,
  Check,
  ShieldCheck,
  Globe
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

  useEffect(() => {
    // Escuta em tempo real os códigos que chegam no endpoint /api/israel
    const q = query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        id: doc.id,
        ...doc.data()
      })) as WebhookEntry[];
      setHistory(entries);
    });
    
    return () => unsubscribe();
  }, []);

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
      toast({ variant: "destructive", title: "Erro na análise" });
    } finally {
      setIsInterpreting(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      {/* Header Azul e Branco */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-blue-600 shrink-0 z-30 shadow-md text-white">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight">CÓDIGOS ISRAEL</h1>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
          <Globe className="w-4 h-4" />
          <code className="text-xs font-mono">/api/israel</code>
        </div>

        <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/20">
          <Trash2 className="w-4 h-4 mr-2" /> Limpar
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Recebimento */}
        <aside className="w-80 border-r flex flex-col shrink-0 bg-slate-50">
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <Activity className="w-8 h-8 text-blue-200 mx-auto mb-4 animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aguardando Codes...</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded-lg transition-all border ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md' 
                      : 'hover:bg-white border-transparent text-slate-700 bg-white/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold uppercase">Recebido</span>
                      <span className="text-[9px] font-mono opacity-70">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-bold truncate">
                      {entry.payload?.codigo || entry.payload?.code || entry.payload?.event || "Novo Código"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Visualização de Dados */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-widest">Detalhes da Requisição</span>
                <Badge className="bg-blue-600">Ativo</Badge>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                <div className="border-r flex flex-col">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      <Card className="border-blue-100 shadow-sm">
                        <CardHeader className="py-3 px-4 bg-blue-50">
                          <div className="flex items-center gap-2 text-blue-700">
                            <Zap className="w-4 h-4 fill-blue-700" />
                            <CardTitle className="text-xs font-bold uppercase">Análise de IA</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-3">
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              {isInterpreting ? "Analisando..." : "Interpretar com IA"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Headers</h4>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden text-[10px] font-mono">
                          {Object.entries(selectedEntry.headers).slice(0, 8).map(([k, v]) => (
                            <div key={k} className="p-2 border-b border-slate-200 flex justify-between last:border-0">
                              <span className="text-blue-700 font-bold uppercase">{k}</span>
                              <span className="text-slate-500 truncate ml-4">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                <div className="bg-[#0f172a] text-blue-400 flex flex-col">
                  <div className="p-3 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">JSON Raw Payload</span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-6 text-[11px] leading-relaxed">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600 animate-pulse">
                <Activity className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Monitor Israel Ativo</h2>
              <p className="text-slate-400 max-w-xs text-sm">
                Envie suas requisições para <br/>
                <span className="text-blue-600 font-mono font-bold">/api/israel</span>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
