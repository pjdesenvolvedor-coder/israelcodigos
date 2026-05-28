"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Zap, 
  Trash2,
  Copy,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle
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
    const saved = localStorage.getItem("israel_mobile_v1");
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
              const updated = [...fresh, ...prev].slice(0, 50);
              localStorage.setItem("israel_mobile_v1", JSON.stringify(updated));
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
      title: "Código Copiado",
      description: `O código ${code} foi copiado com sucesso.`,
      className: "bg-green-600 border-none text-white font-bold",
    });
  };

  const handleClear = () => {
    setHistory([]);
    localStorage.removeItem("israel_mobile_v1");
    toast({ title: "Histórico Limpo" });
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans max-w-md mx-auto relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-900/20 rounded-full blur-[100px]" />
      
      {/* Header Mobile */}
      <header className="p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-xl">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase">ISRAEL MOBILE</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClear} className="text-red-500 hover:bg-red-500/10 rounded-full">
          <Trash2 className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 px-6 pb-6 z-10 space-y-8">
        
        {/* Status Area */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SISTEMA ATIVO: {lastUpdate.toLocaleTimeString()}</span>
        </div>

        {/* Hero Card: O Último Código */}
        <div className="space-y-4">
          <h2 className="text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ÚLTIMO CÓDIGO DETECTADO</h2>
          
          <Card className="bg-[#0A0A0A] border-2 border-white/5 rounded-[40px] shadow-2xl overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {latestEntry ? (
                <>
                  <div className="bg-black/40 border border-white/5 rounded-[30px] py-12 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-600/5 opacity-0 group-active:opacity-100 transition-opacity" />
                    <span className="text-6xl font-black font-mono tracking-tighter text-white animate-pulse-red">
                      {latestEntry.payload.Conteudo || "----"}
                    </span>
                  </div>

                  <div className="space-y-4 px-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Assinatura:</span>
                      <span className="text-lg font-bold text-white">{latestEntry.payload.Produto || "Desconhecido"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Conteúdo:</span>
                      <span className="text-sm font-medium text-gray-400 italic">{latestEntry.payload.Assunto || "Nenhum assunto informado"}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleCopy(latestEntry.payload.Conteudo)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black h-16 rounded-3xl text-lg shadow-[0_10px_20px_rgba(220,38,38,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Copy className="w-5 h-5" />
                    Copiar último código
                  </Button>
                </>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                    <Zap className="w-10 h-10 text-gray-700 animate-pulse" />
                  </div>
                  <p className="text-gray-500 font-bold uppercase text-xs tracking-widest leading-relaxed">
                    Nenhuma mensagem <br/> capturada ainda
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        {history.length > 1 && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">HISTÓRICO RECENTE</h3>
            <ScrollArea className="h-[250px] pr-2">
              <div className="space-y-3">
                {history.slice(1).map((entry) => (
                  <div 
                    key={entry.id}
                    onClick={() => handleCopy(entry.payload.Conteudo)}
                    className="bg-[#0A0A0A] p-5 rounded-[24px] border border-white/5 flex items-center justify-between group active:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{entry.payload.Produto}</span>
                        <span className="text-[8px] text-gray-600 font-bold">• {new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-lg font-mono font-black text-red-500">{entry.payload.Conteudo}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl group-active:bg-red-600 group-active:text-white transition-all">
                      <Copy className="w-4 h-4 text-gray-600 group-active:text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>

      {/* Footer Decoration */}
      <footer className="p-6 text-center">
        <p className="text-[8px] font-black text-gray-700 uppercase tracking-[0.4em]">SISTEMA TÁTICO DE RECEPÇÃO</p>
      </footer>
    </div>
  );
}