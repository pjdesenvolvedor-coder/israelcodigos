"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Search, 
  Zap, 
  Trash2,
  ShieldCheck,
  RefreshCw,
  Copy,
  Clock,
  ChevronRight,
  Database,
  Wifi,
  Terminal,
  ArrowRightLeft
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

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("israel_signals_v3");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar LocalStorage");
      }
    }
  }, []);

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
              localStorage.setItem("israel_signals_v3", JSON.stringify(updated));
              setLastUpdate(new Date());
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    const interval = setInterval(fetchSignals, 2000);
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
    localStorage.removeItem("israel_signals_v3");
    toast({ title: "Histórico Limpo", description: "Todos os dados locais foram removidos." });
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
        localStorage.setItem("israel_signals_v3", JSON.stringify(updated));
        return updated;
      });
      setSelectedEntry(updatedEntry);
      toast({ title: "Análise Concluída", description: "O sinal foi decodificado pela IA." });
    } catch (e) {
      toast({ variant: "destructive", title: "Falha na IA", description: "Não foi possível conectar ao processador." });
    } finally {
      setIsInterpreting(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-[#F1F5F9] overflow-hidden text-slate-900 font-sans">
      {/* Top Navigation - Ultra Premium */}
      <header className="h-20 bg-blue-900 border-b border-blue-800 flex items-center justify-between px-8 shrink-0 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2.5 rounded-2xl border border-white/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none italic uppercase">RECEPTOR ISRAEL</h1>
            <span className="text-[10px] text-blue-300 font-bold tracking-[0.3em] uppercase mt-1">SISTEMA TÁTICO DE MONITORAMENTO</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden xl:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">PULSO DO SERVIDOR</span>
              <span className="text-xs font-mono font-bold text-white">{lastUpdate.toLocaleTimeString()}</span>
            </div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-blue-600 text-white border-none font-black px-4 py-2 rounded-xl shadow-lg hidden md:flex items-center gap-2">
              <Wifi className="w-3 h-3" /> ONLINE
            </Badge>
            <Button 
              variant="ghost" 
              onClick={handleClear} 
              className="text-white/60 hover:text-white hover:bg-red-600 px-4 font-bold rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4 mr-2" /> LIMPAR
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tactical List */}
        <aside className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-40">
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar transmissões..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-[20px] py-4 pl-12 text-sm outline-none border-2 focus:border-blue-600 focus:bg-white transition-all shadow-inner"
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FILTRADOS: {filteredHistory.length}</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">TOTAL: {history.length}</span>
            </div>
          </div>
          
          <ScrollArea className="flex-1 bg-slate-50/50">
            <div className="p-4 space-y-3">
              {filteredHistory.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`w-full text-left p-6 rounded-[28px] border-2 transition-all relative overflow-hidden group ${
                    selectedEntry?.id === entry.id 
                    ? 'bg-blue-700 border-blue-800 text-white shadow-2xl shadow-blue-200 -translate-y-1' 
                    : 'hover:bg-white border-white bg-white/50 shadow-sm hover:shadow-md'
                  }`}
                >
                  {selectedEntry?.id === entry.id && (
                    <div className="absolute top-0 right-0 p-2">
                      <ChevronRight className="w-5 h-5 text-white/50" />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={`${selectedEntry?.id === entry.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'} border-none font-black text-[9px] px-3 py-1 rounded-full uppercase italic`}>
                      {entry.payload?.Produto || "SINAL EXTERNO"}
                    </Badge>
                    <span className={`text-[10px] font-bold flex items-center gap-1.5 ${selectedEntry?.id === entry.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      <Clock className="w-3 h-3" /> {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-2xl font-black font-mono tracking-tighter truncate leading-none">
                      {entry.code || entry.payload?.Conteudo || "VER DADOS"}
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest ${selectedEntry?.id === entry.id ? 'text-blue-300' : 'text-slate-400'}`}>
                      ID: {entry.id}
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 text-slate-300">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Activity className="w-10 h-10 opacity-20 animate-pulse" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Escaneando frequências...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main View - Command Center */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col">
              {/* Detail Header */}
              <div className="h-24 px-10 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                    <Terminal className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">PROTOCOLO DE TRANSMISSÃO</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedEntry.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DATA E HORA</p>
                    <p className="text-sm font-black text-blue-900">{new Date(selectedEntry.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                  <Badge variant="outline" className="h-10 border-blue-100 bg-blue-50 text-blue-700 font-black px-6 rounded-2xl text-xs">
                    HTTP {selectedEntry.method}
                  </Badge>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: AI and Raw Data */}
                <ScrollArea className="flex-1 bg-white border-r border-slate-100">
                  <div className="p-10 space-y-12 max-w-4xl mx-auto">
                    
                    {/* IA Card - Tactical Look */}
                    <Card className="border-0 shadow-2xl rounded-[40px] overflow-hidden bg-blue-900 text-white">
                      <CardHeader className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-900 to-blue-800">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                            <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" /> ANALISADOR GEMINI 2.5
                          </CardTitle>
                          {selectedEntry.interpretation && (
                            <Badge className="bg-emerald-500 text-white border-none font-black px-3 py-1 text-[9px]">PROCESSADO</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-10">
                        {selectedEntry.interpretation ? (
                          <div className="space-y-8">
                            <div className="text-2xl font-bold leading-tight tracking-tight text-blue-50">
                              "{selectedEntry.interpretation.summary}"
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {selectedEntry.interpretation.codes.map((c, i) => (
                                <Badge key={i} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black px-6 py-3 rounded-2xl text-base shadow-xl transition-all">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-4">
                            <Button 
                              onClick={() => handleAI(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-blue-950 font-black h-24 rounded-[30px] text-2xl shadow-[0_15px_30px_rgba(16,185,129,0.3)] transition-all transform active:scale-95 flex items-center justify-center gap-4 group"
                            >
                              {isInterpreting ? (
                                <RefreshCw className="animate-spin w-8 h-8" />
                              ) : (
                                <Zap className="w-8 h-8 fill-blue-950 group-hover:scale-125 transition-transform" />
                              )}
                              {isInterpreting ? "PROCESSANDO..." : "DECODIFICAR SINAL"}
                            </Button>
                            <p className="mt-6 text-blue-300 text-xs font-bold uppercase tracking-widest opacity-60">Utilizando inteligência artificial para extrair informações críticas</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* JSON Preview */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">CARGA ÚTIL DO SINAL (JSON)</h3>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-4 h-9" 
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                            toast({ title: "Copiado para Área de Transferência" });
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" /> COPIAR
                        </Button>
                      </div>
                      <div className="relative group rounded-[40px] overflow-hidden border-4 border-slate-100 shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-transparent to-blue-600 opacity-30" />
                        <pre className="bg-[#0F172A] text-[#94A3B8] p-10 text-sm overflow-auto font-mono leading-relaxed max-h-[600px] scrollbar-hide">
                          <code className="block">
                            {JSON.stringify(selectedEntry.payload, null, 2)}
                          </code>
                        </pre>
                        <div className="absolute bottom-8 right-8 w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_20px_#3b82f6] animate-pulse" />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                {/* Right Side: Security Headers */}
                <aside className="w-[450px] bg-[#F8FAFC] p-10 overflow-auto scrollbar-hide">
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-8">
                      <Database className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">CABEÇALHOS DE SEGURANÇA</h3>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(selectedEntry.headers).map(([k, v], i) => (
                        <div key={k} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                          <span className="text-blue-600 font-black uppercase text-[10px] block mb-2 tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">{k}</span>
                          <span className="text-slate-800 break-all font-mono text-xs font-bold leading-relaxed">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            /* Empty State - Israel Landing */
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-white relative overflow-hidden">
              {/* Background Grid Decoration */}
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:40px_40px] opacity-40" />
              <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[100px] opacity-50" />
              <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[100px] opacity-50" />
              
              <div className="relative z-10 space-y-12">
                <div className="relative inline-block group">
                  <div className="absolute -inset-8 bg-blue-600/10 rounded-[60px] blur-2xl group-hover:bg-blue-600/20 transition-all duration-700" />
                  <div className="w-48 h-48 bg-blue-800 rounded-[54px] flex items-center justify-center shadow-[0_30px_60px_rgba(30,58,138,0.3)] transform rotate-6 hover:rotate-0 transition-all duration-700 border-4 border-white">
                    <Activity className="w-24 h-24 text-white animate-pulse" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-emerald-500 p-4 rounded-3xl shadow-xl border-4 border-white animate-bounce">
                    <Zap className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h2 className="text-7xl font-black text-blue-900 uppercase tracking-tighter italic leading-none">
                    RECEPTOR <span className="text-blue-600">ISRAEL</span>
                  </h2>
                  <p className="text-slate-500 text-2xl max-w-2xl mx-auto font-bold leading-snug">
                    CENTRAL DE MONITORAMENTO INDEPENDENTE ATIVA. <br/>
                    <span className="text-blue-400 text-lg uppercase tracking-widest font-black">Sintonizando frequências de webhooks...</span>
                  </p>
                </div>
                
                <div 
                  className="max-w-xl mx-auto p-12 bg-white border-4 border-blue-900 rounded-[48px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] relative overflow-hidden group cursor-pointer transform hover:-translate-y-2 transition-all active:scale-95"
                  onClick={() => {
                    const url = `${window.location.origin}/api/israel`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Link de Captura Copiado", description: "Pronto para receber transmissões." });
                  }}
                >
                  <div className="absolute inset-0 bg-blue-900 opacity-0 group-hover:opacity-[0.03] transition-opacity" />
                  <div className="flex flex-col items-center gap-6">
                    <Badge className="bg-blue-100 text-blue-700 font-black px-6 py-2 rounded-full tracking-[0.2em] uppercase text-[10px]">PONTO DE ACESSO UNIVERSAL</Badge>
                    <code className="text-blue-900 font-black text-4xl tracking-tight block font-mono">/api/israel</code>
                    <div className="flex items-center justify-center gap-3 text-blue-400 font-black uppercase text-xs tracking-widest mt-4">
                      <ArrowRightLeft className="w-5 h-5" />
                      CLIQUE PARA SINCRONIZAR URL
                    </div>
                  </div>
                </div>

                <div className="pt-12 flex gap-16 justify-center">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-black text-blue-900 italic">{history.length}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">CAPTURAS</div>
                  </div>
                  <div className="w-px h-16 bg-slate-100" />
                  <div className="flex flex-col items-center">
                    <div className="text-4xl font-black text-emerald-500 italic flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                      ESTÁVEL
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">STATUS API</div>
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