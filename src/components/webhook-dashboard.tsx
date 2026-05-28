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
  Code,
  Copy,
  Clock
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
  code?: string;
}

export function WebhookDashboard() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInterpreting, setIsInterpreting] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WebhookEntry | null>(null);
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Carrega do LocalStorage apenas uma vez no início
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("israel_signals_v2");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar LocalStorage");
      }
    }
  }, []);

  // Polling ultra-rápido para buscar novos sinais da API
  useEffect(() => {
    if (!mounted) return;

    const fetchSignals = async () => {
      try {
        const res = await fetch("/api/israel");
        const data = await res.json();
        if (data.ok && data.emails) {
          const newSignals: WebhookEntry[] = data.emails.map((e: any) => ({
            id: e.id,
            timestamp: e.receivedAt,
            method: "POST",
            headers: e.debug.headers,
            payload: e.debug.payload,
            code: e.code
          }));

          setHistory(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const fresh = newSignals.filter(s => !existingIds.has(s.id));
            
            if (fresh.length > 0) {
              const updated = [...fresh, ...prev].slice(0, 200);
              localStorage.setItem("israel_signals_v2", JSON.stringify(updated));
              setLastUpdate(new Date());
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {
        // Silencioso para não poluir a UI
      }
    };

    const interval = setInterval(fetchSignals, 2000); // Consulta a cada 2 segundos
    return () => clearInterval(interval);
  }, [mounted]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(entry => 
      JSON.stringify(entry.payload).toLowerCase().includes(term) ||
      (entry.code && entry.code.toLowerCase().includes(term)) ||
      entry.id.toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  const handleClear = () => {
    setHistory([]);
    setSelectedEntry(null);
    localStorage.removeItem("israel_signals_v2");
    toast({ title: "Limpo", description: "Histórico local removido." });
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
        localStorage.setItem("israel_signals_v2", JSON.stringify(updated));
        return updated;
      });
      setSelectedEntry(updatedEntry);
      toast({ title: "Decodificado", description: "IA analisou o sinal com sucesso." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na IA", description: "Falha na conexão com Gemini." });
    } finally {
      setIsInterpreting(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden text-slate-900 font-sans">
      {/* Header Estilo Israel */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-blue-700 shrink-0 z-30 shadow-xl border-blue-800">
        <div className="flex items-center gap-3 text-white">
          <ShieldCheck className="w-7 h-7" />
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">RECEPTOR ISRAEL</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4 text-white/70">
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Última Atualização</span>
            <span className="text-xs font-mono font-bold text-white">{lastUpdate.toLocaleTimeString()}</span>
          </div>
          <Badge className="bg-emerald-500 text-white border-none font-bold px-3 py-1.5 animate-pulse shadow-lg">
            SISTEMA 100% ATIVO
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClear} 
            className="text-white hover:bg-red-600 hover:text-white font-bold border border-white/20 transition-all"
          >
            <Trash2 className="w-4 h-4 mr-2" /> LIMPAR TUDO
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Barra Lateral de Sinais */}
        <aside className="w-96 border-r flex flex-col bg-white shadow-2xl z-20">
          <div className="p-4 border-b bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar códigos ou IDs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-xl py-3 pl-10 text-sm outline-none border-2 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {filteredHistory.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all transform active:scale-95 ${
                    selectedEntry?.id === entry.id 
                    ? 'bg-blue-600 border-blue-700 text-white shadow-blue-200 shadow-xl' 
                    : 'hover:bg-blue-50 border-slate-100 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${selectedEntry?.id === entry.id ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {entry.payload?.Produto || "SINAL EXTERNO"}
                    </span>
                    <span className="text-[10px] font-bold opacity-70 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-black truncate font-mono tracking-widest">
                      {entry.code || entry.payload?.Conteudo || "VER DADOS"}
                    </div>
                  </div>
                  <div className={`text-[10px] mt-2 font-mono opacity-50 ${selectedEntry?.id === entry.id ? 'text-white' : 'text-slate-500'}`}>
                    ID: {entry.id}
                  </div>
                </button>
              ))}
              {filteredHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                  <Activity className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Aguardando Sinais...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Visualização Principal */}
        <main className="flex-1 flex flex-col bg-slate-50 relative">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header do Detalhe */}
              <div className="p-5 border-b bg-white flex justify-between items-center px-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping" />
                  <span className="text-blue-900 font-black text-lg uppercase tracking-tighter italic">DETALHES DA TRANSMISSÃO</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-200 text-blue-700 font-black px-4 py-1">
                    {selectedEntry.method} 200 OK
                  </Badge>
                </div>
              </div>

              {/* Conteúdo do Detalhe */}
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 overflow-hidden">
                {/* Coluna IA e Brutos */}
                <ScrollArea className="p-8 border-r bg-white">
                  <div className="space-y-10 max-w-3xl mx-auto">
                    {/* Card de IA Estilo Israel */}
                    <Card className="border-blue-600 shadow-2xl rounded-[32px] overflow-hidden border-4">
                      <CardHeader className="py-5 px-8 bg-blue-600">
                        <CardTitle className="text-sm font-black uppercase text-white flex items-center gap-3 italic">
                          <Zap className="w-5 h-5 fill-white" /> DECODIFICADOR ISRAEL (IA)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 bg-gradient-to-br from-white to-blue-50">
                        {selectedEntry.interpretation ? (
                          <div className="space-y-6">
                            <div className="text-xl text-slate-800 font-black leading-tight border-l-8 border-blue-600 pl-6 py-2">
                              {selectedEntry.interpretation.summary}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {selectedEntry.interpretation.codes.map((c, i) => (
                                <Badge key={i} className="bg-blue-900 text-white font-black px-5 py-2 rounded-xl text-sm shadow-md">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleAI(selectedEntry)} 
                            disabled={!!isInterpreting}
                            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black h-20 rounded-[24px] text-xl shadow-xl transform active:scale-95 transition-all group"
                          >
                            {isInterpreting ? (
                              <RefreshCw className="animate-spin mr-3 w-7 h-7" />
                            ) : (
                              <Zap className="mr-3 w-7 h-7 fill-white group-hover:scale-125 transition-transform" />
                            )}
                            {isInterpreting ? "PROCESSANDO..." : "DECODIFICAR COM IA"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    {/* Dados JSON */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">SINAL BRUTO (JSON)</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 font-black text-xs border-blue-100 text-blue-600 hover:bg-blue-50" 
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                            toast({ title: "Copiado!" });
                          }}
                        >
                          <Copy className="w-3 h-3 mr-2" /> COPIAR JSON
                        </Button>
                      </div>
                      <div className="relative group">
                        <pre className="bg-slate-900 text-blue-400 p-8 rounded-[32px] text-sm overflow-auto font-mono leading-relaxed border-4 border-slate-800 shadow-2xl max-h-[500px] scrollbar-hide">
                          {JSON.stringify(selectedEntry.payload, null, 2)}
                        </pre>
                        <div className="absolute top-6 right-6 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-pulse" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                {/* Coluna Headers */}
                <ScrollArea className="bg-slate-50 p-8">
                  <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">CERTIFICADO DE TRANSMISSÃO</span>
                    </div>
                    <div className="bg-white rounded-[32px] border-2 border-slate-200 overflow-hidden shadow-xl">
                      {Object.entries(selectedEntry.headers).map(([k, v], i) => (
                        <div key={k} className={`p-5 border-b last:border-0 flex flex-col hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <span className="text-blue-700 font-black uppercase text-[10px] mb-1.5 tracking-tighter opacity-70">{k}</span>
                          <span className="text-slate-800 break-all font-mono text-xs font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            /* Tela Vazia - Onde tudo começou */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white relative">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-50" />
              
              <div className="relative z-10">
                <div className="w-40 h-40 bg-blue-700 rounded-[50px] flex items-center justify-center mb-10 shadow-[0_20px_50px_rgba(29,78,216,0.3)] transform rotate-3 hover:rotate-0 transition-all duration-700 group cursor-pointer">
                  <Activity className="w-20 h-20 text-white animate-pulse group-hover:scale-110 transition-transform" />
                </div>
                
                <h2 className="text-6xl font-black text-blue-900 mb-6 uppercase tracking-tighter italic leading-none">RECEPTOR ISRAEL</h2>
                <p className="text-slate-500 text-xl max-w-md mb-12 font-bold leading-tight">
                  SISTEMA DE CAPTURA INDEPENDENTE ATIVO. <br/>AGUARDANDO SINAIS NO CANAL.
                </p>
                
                <div 
                  className="p-10 bg-white border-4 border-blue-700 rounded-[40px] shadow-2xl relative overflow-hidden group cursor-pointer transform hover:-translate-y-2 transition-all"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/israel`);
                    toast({ title: "Link Copiado!", description: "Pronto para enviar POST." });
                  }}
                >
                  <div className="absolute inset-0 bg-blue-700 opacity-0 group-hover:opacity-5 transition-opacity" />
                  <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Ponto de Captura Universal</div>
                  <code className="text-blue-700 font-black text-3xl tracking-tight block">/api/israel</code>
                  <div className="flex items-center justify-center gap-3 mt-6 text-blue-400">
                    <ExternalLink className="w-5 h-5" />
                    <span className="text-xs uppercase font-black tracking-[0.2em]">CLIQUE PARA COPIAR A URL</span>
                  </div>
                </div>

                <div className="mt-16 flex gap-12 justify-center">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-blue-700">{history.length}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SINAIS NO CACHE</div>
                  </div>
                  <div className="w-px h-12 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-emerald-500 italic">ON</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS API</div>
                  </div>
                  <div className="w-px h-12 bg-slate-200" />
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-black text-blue-900">100%</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESTÁVEL</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
