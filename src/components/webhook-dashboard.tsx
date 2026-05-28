
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Search, 
  Zap, 
  Trash2,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { interpretPayload } from "@/ai/flows/interpret-payload-flow";

interface WebhookEntry {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  interpretation?: {
    summary: string;
    codes: string[];
  };
  receivedAt?: string;
  code?: string;
}

export function WebhookDashboard() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInterpreting, setIsInterpreting] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WebhookEntry | null>(null);
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [isPolling, setIsPolling] = useState(true);

  // Carrega do LocalStorage no início
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("israel_signals_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar LocalStorage");
      }
    }
  }, []);

  // Polling para buscar novos sinais da API
  useEffect(() => {
    if (!mounted) return;

    const fetchSignals = async () => {
      try {
        const res = await fetch("/api/israel");
        const data = await res.json();
        if (data.ok && data.emails) {
          // Mapeia o formato da API para o formato do Dashboard
          const newSignals: WebhookEntry[] = data.emails.map((e: any) => ({
            id: e.id,
            timestamp: e.receivedAt,
            method: "POST",
            headers: e.debug.headers,
            payload: e.debug.payload,
            code: e.code
          }));

          setHistory(prev => {
            // Mescla sem duplicatas por ID
            const existingIds = new Set(prev.map(s => s.id));
            const fresh = newSignals.filter(s => !existingIds.has(s.id));
            if (fresh.length > 0) {
              const updated = [...fresh, ...prev].slice(0, 100);
              localStorage.setItem("israel_signals_history", JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("Erro no polling");
      }
    };

    const interval = setInterval(fetchSignals, 3000); // 3 segundos
    return () => clearInterval(interval);
  }, [mounted]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(entry => 
      JSON.stringify(entry.payload).toLowerCase().includes(term) ||
      JSON.stringify(entry.headers).toLowerCase().includes(term) ||
      (entry.code && entry.code.toLowerCase().includes(term))
    );
  }, [history, searchTerm]);

  const handleClear = () => {
    setHistory([]);
    setSelectedEntry(null);
    localStorage.removeItem("israel_signals_history");
    toast({ title: "Sucesso", description: "Histórico limpo localmente." });
  };

  const handleAI = async (entry: WebhookEntry) => {
    if (isInterpreting) return;
    setIsInterpreting(entry.id);
    try {
      const result = await interpretPayload({ payloadJson: JSON.stringify(entry.payload) });
      const updatedEntry = {
        ...entry,
        interpretation: {
          summary: result.interpretation,
          codes: result.extractedDetails
        }
      };
      
      setHistory(prev => {
        const updated = prev.map(s => s.id === entry.id ? updatedEntry : s);
        localStorage.setItem("israel_signals_history", JSON.stringify(updated));
        return updated;
      });
      setSelectedEntry(updatedEntry);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na IA" });
    } finally {
      setIsInterpreting(null);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden text-slate-900 font-sans">
      <header className="h-16 border-b flex items-center justify-between px-6 bg-blue-700 shrink-0 z-30 shadow-lg">
        <div className="flex items-center gap-3 text-white">
          <ShieldCheck className="w-6 h-6" />
          <h1 className="text-xl font-black tracking-tighter uppercase italic">RECEPTOR ISRAEL</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className="bg-emerald-500 text-white border-none font-bold px-3 py-1 animate-pulse">
            SISTEMA ATIVO
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-white hover:bg-white/10 font-bold border border-white/20">
            <Trash2 className="w-4 h-4 mr-2" /> LIMPAR
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-85 border-r flex flex-col bg-slate-50 shadow-inner">
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar códigos ou produtos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 pl-10 text-sm outline-none border focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {filteredHistory.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all transform hover:scale-[1.02] ${
                    selectedEntry?.id === entry.id 
                    ? 'bg-blue-600 border-blue-700 text-white shadow-xl' 
                    : 'hover:bg-blue-50 border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${selectedEntry?.id === entry.id ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {entry.payload?.Produto || "SINAL EXTERNO"}
                    </span>
                    <span className="text-[10px] font-bold opacity-70">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code className={`w-4 h-4 ${selectedEntry?.id === entry.id ? 'text-blue-200' : 'text-blue-600'}`} />
                    <div className="text-base font-black truncate font-mono tracking-wider">
                      {entry.code || entry.payload?.Conteudo || "VER DADOS"}
                    </div>
                  </div>
                </button>
              ))}
              {filteredHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Activity className="w-8 h-8 mb-2 opacity-20 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">Nenhum sinal na fila</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center px-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                  <span className="text-blue-900 font-black text-sm uppercase tracking-tighter">Fluxo de Dados: {selectedEntry.id}</span>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700 font-bold">
                  {selectedEntry.method}
                </Badge>
              </div>
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 overflow-hidden">
                <ScrollArea className="p-8 border-r">
                  <div className="space-y-8">
                    <Card className="border-blue-200 shadow-xl rounded-3xl overflow-hidden border-2">
                      <CardHeader className="py-4 px-6 bg-blue-600">
                        <CardTitle className="text-xs font-black uppercase text-white flex items-center gap-2">
                          <Zap className="w-4 h-4 fill-white" /> Inteligência Artificial Israel
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {selectedEntry.interpretation ? (
                          <div className="space-y-5">
                            <div className="text-base text-slate-800 font-bold leading-relaxed italic">
                              "{selectedEntry.interpretation.summary}"
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {selectedEntry.interpretation.codes.map((c, i) => (
                                <Badge key={i} className="bg-blue-900 text-white font-black px-4 py-1 rounded-lg text-sm">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleAI(selectedEntry)} 
                            disabled={!!isInterpreting}
                            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black h-16 rounded-2xl text-lg shadow-lg transform active:scale-95 transition-all"
                          >
                            {isInterpreting ? <RefreshCw className="animate-spin mr-3 w-6 h-6" /> : <Zap className="mr-3 w-6 h-6 fill-white" />}
                            {isInterpreting ? "DECODIFICANDO..." : "DECODIFICAR COM IA"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">DADOS BRUTOS (JSON)</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold" onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                          toast({ title: "Copiado!" });
                        }}>COPIAR</Button>
                      </div>
                      <div className="relative group">
                        <pre className="bg-slate-900 text-blue-300 p-6 rounded-3xl text-sm overflow-auto font-mono leading-relaxed border-4 border-slate-800 shadow-2xl max-h-[400px]">
                          {JSON.stringify(selectedEntry.payload, null, 2)}
                        </pre>
                        <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                <ScrollArea className="bg-slate-50 p-8">
                  <div className="space-y-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">HEADERS DA TRANSMISSÃO</span>
                    <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
                      {Object.entries(selectedEntry.headers).map(([k, v], i) => (
                        <div key={k} className={`p-4 border-b last:border-0 flex flex-col hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <span className="text-blue-700 font-black uppercase text-[10px] mb-1 tracking-tighter">{k}</span>
                          <span className="text-slate-600 break-all font-mono text-xs font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-white to-blue-50">
              <div className="w-32 h-32 bg-blue-600 rounded-[40px] flex items-center justify-center mb-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
                <Activity className="w-16 h-16 text-white animate-pulse" />
              </div>
              <h2 className="text-4xl font-black text-blue-900 mb-4 uppercase tracking-tighter italic">RECEPTOR ISRAEL</h2>
              <p className="text-slate-500 text-lg max-w-md mb-10 font-bold leading-tight">
                MONITORAMENTO DE SINAIS ATIVO. AGUARDANDO TRANSMISSÃO NO CANAL ABAIXO.
              </p>
              
              <div className="p-8 bg-white border-4 border-blue-600 rounded-[35px] shadow-2xl relative overflow-hidden group cursor-pointer" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/israel`);
                toast({ title: "URL Copiada!" });
              }}>
                <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity" />
                <code className="text-blue-700 font-black text-2xl tracking-tight">/api/israel</code>
                <div className="flex items-center justify-center gap-3 mt-4 text-blue-400">
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-xs uppercase font-black tracking-[0.2em]">PONTO DE CAPTURA ATIVO</span>
                </div>
              </div>

              <div className="mt-12 flex gap-8">
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-black text-blue-600">{history.length}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">SINAIS SALVOS</div>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-black text-emerald-500">200</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">STATUS API</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
