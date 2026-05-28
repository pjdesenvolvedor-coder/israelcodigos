
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
  LogOut,
  Heart,
  BrainCircuit,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit, getDocs, writeBatch } from "firebase/firestore";

interface WebhookEntry {
  id: string;
  timestamp: string; 
  interpretation?: {
    interpretation: string;
    extractedDetails: string[];
  };
  payload: {
    Produto?: string;
    Assunto?: string;
    Conteudo?: string;
  };
}

const EXPIRATION_MS = 15 * 60 * 1000; // 15 minutos de validade do sinal

export function WebhookDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const [now, setNow] = useState<number>(Date.now());
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    setAccessExpiresAt(localStorage.getItem("israel_access_expires"));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const webhooksQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(20));
  }, [db]);

  const { data: rawData = [] } = useCollection<any>(webhooksQuery);

  const activeHistory = useMemo(() => {
    return (rawData || [])
      .map(doc => ({
        id: doc.id,
        timestamp: doc.timestamp,
        payload: doc.payload,
        interpretation: doc.interpretation
      } as WebhookEntry))
      .filter(item => {
        const startTime = new Date(item.timestamp).getTime();
        return (now - startTime) < EXPIRATION_MS;
      });
  }, [rawData, now]);

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
      className: "bg-blue-600 border-none text-white font-black rounded-2xl",
    });
  };

  const handleClear = async () => {
    if (!db) return;
    const snapshot = await getDocs(collection(db, "webhooks"));
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    toast({ 
      title: "HISTÓRICO LIMPO",
      className: "bg-blue-600 border-none text-white font-black rounded-2xl",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("israel_access_token");
    localStorage.removeItem("israel_access_expires");
    window.location.reload();
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto flex flex-col overflow-hidden relative">
      
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

      <header className="p-6 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0 z-50 border-b border-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-blue-900 leading-none uppercase">ISRAEL05</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Monitoramento Tático</span>
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

      <main className={cn(
        "flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide flex flex-col",
        isAccessExpired && "blur-sm grayscale opacity-50 pointer-events-none"
      )}>
        
        <div className="flex items-center justify-center gap-2 bg-white shadow-sm border border-blue-100 py-2.5 px-5 rounded-full mx-auto w-fit">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
            {daysRemaining} DIAS RESTANTES DE ACESSO
          </span>
        </div>

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
                    <span className="text-7xl font-black font-mono tracking-tighter text-blue-600">
                      {latestEntry.payload.Conteudo || "----"}
                    </span>
                  </div>

                  {latestEntry.interpretation && (
                    <div className="bg-slate-900 rounded-[25px] p-5 space-y-3 shadow-inner">
                      <button 
                        onClick={() => setShowAI(!showAI)}
                        className="w-full flex items-center justify-between text-blue-400"
                      >
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Análise de IA</span>
                        </div>
                        {showAI ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {showAI && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-[11px] font-bold text-slate-300 leading-relaxed">
                            {latestEntry.interpretation.interpretation}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {latestEntry.interpretation.extractedDetails.map((detail, idx) => (
                              <span key={idx} className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full text-[8px] font-black uppercase border border-blue-800/50">
                                {detail}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-[24px] text-lg shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-3"
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

        {activeHistory.length > 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Histórico Ativo</h3>
              <ShieldCheck className="w-4 h-4 text-blue-200" />
            </div>
            
            <div className="space-y-3 pb-10">
              {activeHistory.slice(1).map((entry) => (
                <div 
                  key={entry.id}
                  onClick={() => handleCopy(entry.payload.Conteudo)}
                  className="bg-white p-5 rounded-[30px] border border-blue-50 flex flex-col gap-3 active:bg-blue-50 transition-all shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
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
                  {entry.interpretation && (
                    <div className="pt-3 border-t border-slate-50">
                      <p className="text-[9px] font-bold text-slate-400 line-clamp-2 italic leading-relaxed">
                        "{entry.interpretation.interpretation}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-auto p-8 text-center flex items-center justify-center gap-2 shrink-0">
          <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">FEITO COM</span>
          <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
          <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">POR PJ DEV</span>
        </footer>
      </main>
    </div>
  );
}
