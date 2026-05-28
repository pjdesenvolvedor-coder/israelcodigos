
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Copy,
  Trash2,
  Smartphone,
  ShieldCheck,
  Zap,
  Clock,
  Timer,
  AlertCircle,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WebhookEntry {
  id: string;
  timestamp: string; 
  payload: {
    Produto?: string;
    Assunto?: string;
    Conteudo?: string;
  };
}

const EXPIRATION_MS = 15 * 60 * 1000; // 15 minutos de validade do sinal

export function WebhookDashboard() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);

  // Inicialização
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("israel_mobile_v4");
    const expiresAt = localStorage.getItem("israel_access_expires");
    setAccessExpiresAt(expiresAt);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const currentTime = Date.now();
        const valid = parsed.filter((item: WebhookEntry) => 
          (currentTime - new Date(item.timestamp).getTime()) < EXPIRATION_MS
        );
        setHistory(valid);
      } catch (e) {
        console.error("Erro ao carregar LocalStorage");
      }
    }
  }, []);

  // Timer global
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca de sinais
  useEffect(() => {
    if (!mounted) return;

    const fetchSignals = async () => {
      try {
        const res = await fetch("/api/israel");
        const data = await res.json();
        if (data.ok && data.emails) {
          const currentTime = Date.now();
          const newSignals: WebhookEntry[] = data.emails
            .map((e: any) => ({
              id: e.id,
              timestamp: e.receivedAt,
              payload: e.debug.payload
            }))
            .filter((s: WebhookEntry) => (currentTime - new Date(s.timestamp).getTime()) < EXPIRATION_MS);

          setHistory(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const fresh = newSignals.filter(s => !existingIds.has(s.id));
            
            if (fresh.length > 0) {
              const updated = [...fresh, ...prev];
              localStorage.setItem("israel_mobile_v4", JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {}
    };

    const interval = setInterval(fetchSignals, 3000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Lógica de Expiração do Sinal
  const activeHistory = useMemo(() => {
    const filtered = history.filter(item => {
      const startTime = new Date(item.timestamp).getTime();
      return (now - startTime) < EXPIRATION_MS;
    });

    if (filtered.length !== history.length) {
      localStorage.setItem("israel_mobile_v4", JSON.stringify(filtered));
    }

    return filtered;
  }, [history, now]);

  // Lógica de Expiração do ACESSO (30 dias)
  const isAccessExpired = useMemo(() => {
    if (!accessExpiresAt) return false;
    return now > new Date(accessExpiresAt).getTime();
  }, [accessExpiresAt, now]);

  const daysRemaining = useMemo(() => {
    if (!accessExpiresAt) return 0;
    const diff = new Date(accessExpiresAt).getTime() - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [accessExpiresAt, now]);

  const latestEntry = activeHistory[0];

  const formatTimeLeft = (timestamp: string) => {
    const startTime = new Date(timestamp).getTime();
    const diff = EXPIRATION_MS - (now - startTime);
    if (diff <= 0) return "EXPIRADO";
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCopy = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({
      title: "COPIADO",
      description: "Código pronto para uso.",
      className: "bg-blue-600 border-none text-white font-black rounded-2xl",
    });
  };

  const handleClear = async () => {
    try {
      await fetch("/api/israel", { method: "DELETE" });
      setHistory([]);
      localStorage.removeItem("israel_mobile_v4");
      toast({ 
        title: "HISTÓRICO LIMPO",
        className: "bg-blue-600 border-none text-white font-black rounded-2xl",
      });
    } catch (error) {}
  };

  const handleLogout = () => {
    localStorage.removeItem("israel_access_token");
    localStorage.removeItem("israel_access_expires");
    window.location.reload();
  };

  if (!mounted) return null;

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto flex flex-col overflow-hidden relative">
      
      {/* Overlay de Acesso Expirado */}
      {isAccessExpired && (
        <div className="fixed inset-0 z-[200] backdrop-blur-xl bg-white/40 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="bg-red-500 p-5 rounded-[2.5rem] shadow-2xl shadow-red-200 mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">ACESSO EXPIRADO</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed mb-8">
            Seu prazo de 30 dias acabou.<br/>Contate o suporte para renovar.
          </p>
          <Button 
            onClick={handleLogout}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[24px] text-lg shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
          >
            <LogOut className="w-5 h-5" />
            VOLTAR AO LOGIN
          </Button>
        </div>
      )}

      {/* Header Fixo */}
      <header className="p-6 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0 z-50 border-b border-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-blue-900 leading-none uppercase">ISRAEL</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Sinais</span>
              <div className="h-1 w-1 rounded-full bg-blue-200" />
              <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">{daysRemaining} dias restantes</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-[10px] h-8 px-4 uppercase tracking-widest shadow-lg shadow-red-100"
          >
            SAIR
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} className="text-slate-200 hover:text-red-500 rounded-full">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Área de Conteúdo */}
      <main className={cn(
        "flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide transition-all duration-700",
        isAccessExpired && "blur-sm grayscale opacity-50 pointer-events-none"
      )}>
        
        {/* Status */}
        <div className="flex items-center justify-center gap-2 bg-white shadow-sm border border-blue-100 py-2.5 px-5 rounded-full mx-auto w-fit">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
            OPERACIONAL • {new Date(now).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
          </span>
        </div>

        {/* Card Principal */}
        <div className="space-y-4">
          <Card className="bg-white border-none rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.05)] overflow-hidden">
            <CardContent className="p-7 space-y-6">
              {latestEntry ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-[35px] py-10 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-4 right-6 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                      <Timer className="w-3 h-3 text-blue-600" />
                      <span className="text-[10px] font-black text-blue-600 font-mono">
                        {formatTimeLeft(latestEntry.timestamp)}
                      </span>
                    </div>
                    
                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">Código Israel</span>
                    <span className="text-7xl font-black font-mono tracking-tighter text-blue-600 animate-pulse-blue">
                      {latestEntry.payload.Conteudo || "----"}
                    </span>
                  </div>

                  <div className="space-y-4 px-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Assinatura:</span>
                      <span className="text-xl font-black text-slate-800">{latestEntry.payload.Produto || "N/A"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Conteúdo:</span>
                      <span className="text-xl font-black text-slate-800">{latestEntry.payload.Assunto || "CÓDIGO"}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleCopy(latestEntry.payload.Conteudo)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-[24px] text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <Copy className="w-5 h-5" />
                    COPIAR AGORA
                  </Button>
                </>
              ) : (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center animate-bounce">
                    <Zap className="w-10 h-10 text-blue-300" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Sem Sinais</h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] leading-relaxed">
                      Escaneando frequências...<br/>Aguardando entrada.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico */}
        {activeHistory.length > 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sinais Ativos</h3>
              <ShieldCheck className="w-4 h-4 text-blue-200" />
            </div>
            
            <div className="space-y-3">
              {activeHistory.slice(1).map((entry) => (
                <div 
                  key={entry.id}
                  onClick={() => handleCopy(entry.payload.Conteudo)}
                  className="bg-white p-5 rounded-[30px] border border-blue-50 flex items-center justify-between active:bg-blue-50 transition-all shadow-sm group"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{entry.payload.Produto}</span>
                      <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5 text-blue-400" />
                        <span className="text-[9px] font-mono font-bold text-blue-400">
                          {formatTimeLeft(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xl font-mono font-black text-blue-600 leading-none">{entry.payload.Conteudo}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl text-slate-300">
                    <Copy className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="p-8 text-center">
          <p className="text-[9px] font-black text-blue-200 uppercase tracking-[0.5em]">PROTEÇÃO TÁTICA ISRAEL</p>
        </footer>
      </main>
    </div>
  );
}
