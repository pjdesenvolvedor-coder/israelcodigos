"use client";

import React, { useState, useEffect } from "react";
import { 
  Copy,
  Trash2,
  Smartphone,
  ShieldCheck,
  Zap,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface WebhookEntry {
  id: string;
  timestamp: string;
  payload: {
    Produto?: string;
    Assunto?: string;
    Conteudo?: string;
  };
}

export function WebhookDashboard() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("israel_mobile_v2");
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
            payload: e.debug.payload
          }));

          setHistory(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const fresh = newSignals.filter(s => !existingIds.has(s.id));
            
            if (fresh.length > 0) {
              const updated = [...fresh, ...prev].slice(0, 100);
              localStorage.setItem("israel_mobile_v2", JSON.stringify(updated));
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

  const latestEntry = history[0];

  const handleCopy = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({
      title: "Copiado!",
      description: "Código pronto para uso.",
      className: "bg-blue-600 border-none text-white font-bold",
    });
  };

  const handleClear = () => {
    if (confirm("Deseja limpar todo o histórico?")) {
      setHistory([]);
      localStorage.removeItem("israel_mobile_v2");
      toast({ title: "Histórico Limpo" });
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto relative">
      {/* Design Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -z-10" />

      {/* Header Mobile */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-blue-900 leading-none">ISRAEL</h1>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Receptor de Sinais</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} className="text-slate-400 hover:text-red-500 rounded-full">
          <Trash2 className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 px-5 pb-8 space-y-6">
        
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 bg-white/50 backdrop-blur-sm py-2 px-4 rounded-full border border-blue-100 self-center mx-auto w-fit">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">
            ATIVO: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>

        {/* Hero Card: O Último Código */}
        <div className="space-y-4">
          <Card className="bg-white border-none rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
            <CardContent className="p-7 space-y-6">
              {latestEntry ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-[30px] py-10 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Código Detectado</span>
                    <span className="text-6xl font-black font-mono tracking-tighter text-blue-600 animate-pulse-blue">
                      {latestEntry.payload.Conteudo || "----"}
                    </span>
                  </div>

                  <div className="space-y-4 px-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Assinatura:</span>
                      <span className="text-lg font-bold text-slate-800">{latestEntry.payload.Produto || "N/A"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Conteúdo:</span>
                      <span className="text-sm font-medium text-slate-500">{latestEntry.payload.Assunto || "Sem descrição"}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleCopy(latestEntry.payload.Conteudo)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-[24px] text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Copy className="w-5 h-5" />
                    COPIAR CÓDIGO
                  </Button>
                </>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                    <Zap className="w-10 h-10 text-blue-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                    Aguardando novo <br/> sinal de entrada...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        {history.length > 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimas Atividades</h3>
              <ShieldCheck className="w-4 h-4 text-blue-100" />
            </div>
            
            <ScrollArea className="h-[280px]">
              <div className="space-y-3 pr-1">
                {history.slice(1).map((entry) => (
                  <div 
                    key={entry.id}
                    onClick={() => handleCopy(entry.payload.Conteudo)}
                    className="bg-white p-5 rounded-[28px] border border-slate-100 flex items-center justify-between active:bg-blue-50 transition-colors shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{entry.payload.Produto}</span>
                        <span className="text-[9px] text-slate-300 font-bold flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-xl font-mono font-black text-blue-600">{entry.payload.Conteudo}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl text-slate-400">
                      <Copy className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-[1px] w-8 bg-blue-100" />
          <ShieldCheck className="w-4 h-4 text-blue-200" />
          <div className="h-[1px] w-8 bg-blue-100" />
        </div>
        <p className="text-[8px] font-black text-blue-200 uppercase tracking-[0.4em]">PROTEÇÃO TÁTICA ISRAEL</p>
      </footer>
    </div>
  );
}