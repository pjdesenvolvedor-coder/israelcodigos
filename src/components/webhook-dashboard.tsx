
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Copy,
  Smartphone,
  Zap,
  AlertCircle,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Lock,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

const EXPIRATION_MS = 15 * 60 * 1000;

export function WebhookDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const [now, setNow] = useState<number>(Date.now());
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [usedTodayIds, setUsedTodayIds] = useState<string[]>([]);

  // Escuta o limite global do banco de dados em tempo real
  const configDocRef = useMemo(() => (db ? doc(db, "_system", "config") : null), [db]);
  const { data: globalConfig } = useDoc<any>(configDocRef);
  const dailyLimit = globalConfig?.globalLimit || 10;

  useEffect(() => {
    setAccessExpiresAt(localStorage.getItem("israel_access_expires"));
    setSessionStart(localStorage.getItem("israel_session_start"));
    
    // Recupera IDs de sinais já "consumidos" hoje
    const today = new Date().toLocaleDateString();
    const storedDay = localStorage.getItem("israel_usage_day");
    if (storedDay !== today) {
      localStorage.setItem("israel_usage_day", today);
      localStorage.setItem("israel_usage_ids", JSON.stringify([]));
      setUsedTodayIds([]);
    } else {
      const storedIds = localStorage.getItem("israel_usage_ids");
      if (storedIds) setUsedTodayIds(JSON.parse(storedIds));
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const webhooksQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(50));
  }, [db]);

  const { data: rawData = [] } = useCollection<any>(webhooksQuery);

  const activeHistory = useMemo(() => {
    if (!sessionStart) return [];
    const sessionStartTime = new Date(sessionStart).getTime();

    return (rawData || [])
      .map(doc => ({
        id: doc.id,
        timestamp: doc.timestamp,
        payload: doc.payload,
        interpretation: doc.interpretation
      } as WebhookEntry))
      .filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        const isNotExpired = (now - itemTime) < EXPIRATION_MS;
        const isAfterLogin = itemTime >= sessionStartTime;
        return isNotExpired && isAfterLogin;
      });
  }, [rawData, now, sessionStart]);

  const usedCount = usedTodayIds.length;
  const progressValue = (usedCount / dailyLimit) * 100;
  const latestEntry = activeHistory[0];

  const handleCopy = (entry: WebhookEntry) => {
    if (usedTodayIds.includes(entry.id)) {
      navigator.clipboard.writeText(entry.payload.Conteudo || "");
      toast({ title: "CÓDIGO COPIADO" });
      return;
    }

    if (usedCount >= dailyLimit) {
      toast({
        variant: "destructive",
        title: "LIMITE DIÁRIO EXCEDIDO",
        description: `Você já consumiu seus ${dailyLimit} sinais diários permitidos.`
      });
      return;
    }

    const newIds = [...usedTodayIds, entry.id];
    setUsedTodayIds(newIds);
    localStorage.setItem("israel_usage_ids", JSON.stringify(newIds));
    
    navigator.clipboard.writeText(entry.payload.Conteudo || "");
    toast({ 
      title: "CÓDIGO COPIADO", 
      description: `Sinais de hoje: ${newIds.length}/${dailyLimit}`,
      className: "bg-blue-600 border-none text-white font-black rounded-2xl"
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("israel_access_token");
    localStorage.removeItem("israel_access_expires");
    localStorage.removeItem("israel_session_start");
    localStorage.removeItem("israel_daily_limit");
    window.location.reload();
  };

  const isAccessExpired = accessExpiresAt ? now > new Date(accessExpiresAt).getTime() : false;

  return (
    <div className="h-screen bg-slate-50 max-w-md mx-auto flex flex-col overflow-hidden relative">
      {isAccessExpired && (
        <div className="fixed inset-0 z-[200] backdrop-blur-xl bg-white/40 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-6" />
          <h2 className="text-3xl font-black text-slate-900 uppercase mb-8">ACESSO EXPIRADO</h2>
          <Button onClick={handleLogout} className="w-full h-16 bg-blue-600 font-black rounded-2xl">SAIR</Button>
        </div>
      )}

      <header className="p-6 flex items-center justify-between bg-white border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-blue-900 uppercase leading-none">ISRAEL V4</h1>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Operacional</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="font-black rounded-xl text-[10px] text-red-500 hover:bg-red-50">SAIR</Button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
        <div className="w-full bg-white p-5 rounded-[30px] shadow-sm border border-blue-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={cn("w-3 h-3", usedCount >= dailyLimit ? "text-red-500" : "text-blue-500")} />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Cota de Uso Diário</span>
            </div>
            <span className="text-[10px] font-mono font-black text-blue-600">
              {usedCount} <span className="text-slate-300">/</span> {dailyLimit}
            </span>
          </div>
          
          <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500 ease-out rounded-full",
                usedCount >= dailyLimit ? "bg-red-500" : "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
              )}
              style={{ width: `${Math.min(progressValue, 100)}%` }}
            />
          </div>
          
          <p className="text-[8px] font-bold text-slate-400 uppercase text-center tracking-widest">
            {usedCount >= dailyLimit 
              ? "Limite atingido! Novos sinais bloqueados." 
              : `Você ainda pode visualizar ${dailyLimit - usedCount} sinais hoje.`}
          </p>
        </div>

        <div className="space-y-4">
          <Card className="bg-white border-none rounded-[40px] shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardContent className="p-7 space-y-6">
              {!latestEntry ? (
                <div className="py-24 text-center space-y-6">
                  <div className="relative inline-block">
                    <Zap className="w-12 h-12 text-blue-100 animate-pulse" />
                    <Zap className="w-12 h-12 text-blue-600 absolute inset-0 animate-bounce" />
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest leading-relaxed px-10">
                    Sincronizando com a rede...<br/>Aguardando novo sinal.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 border border-blue-50/50 rounded-[35px] py-12 flex flex-col items-center justify-center relative group overflow-hidden">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                      <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Live Signal</span>
                    </div>
                    
                    {usedCount >= dailyLimit && !usedTodayIds.includes(latestEntry.id) ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="bg-red-50 p-4 rounded-full">
                          <Lock className="w-8 h-8 text-red-500" />
                        </div>
                        <span className="text-sm font-black text-red-600 uppercase tracking-widest">LIMITE EXCEDIDO</span>
                      </div>
                    ) : (
                      <span className="text-7xl font-black font-mono tracking-tighter text-blue-900 drop-shadow-sm">
                        {latestEntry.payload.Conteudo || "----"}
                      </span>
                    )}
                  </div>

                  {latestEntry.interpretation && (
                    <div className="bg-slate-900 rounded-[25px] p-5 space-y-3 shadow-xl">
                      <button onClick={() => setShowAI(!showAI)} className="w-full flex items-center justify-between text-blue-400">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Inteligência Artificial Israel</span>
                        </div>
                        {showAI ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                      </button>
                      {showAI && <p className="text-[11px] font-bold text-slate-300 leading-relaxed antialiased">{latestEntry.interpretation.interpretation}</p>}
                    </div>
                  )}

                  <Button 
                    onClick={() => handleCopy(latestEntry)}
                    className={cn(
                      "w-full font-black h-18 rounded-[24px] text-lg transition-all active:scale-95",
                      usedCount >= dailyLimit && !usedTodayIds.includes(latestEntry.id)
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100"
                    )}
                  >
                    <Copy className="w-5 h-5 mr-3" />
                    {usedCount >= dailyLimit && !usedTodayIds.includes(latestEntry.id) ? "BLOQUEADO" : "COPIAR SINAL"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {activeHistory.length > 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico Recente</h3>
              <div className="h-px bg-slate-100 flex-1 ml-4" />
            </div>
            
            <div className="space-y-3 pb-10">
              {activeHistory.slice(1).map((entry) => (
                <div 
                  key={entry.id}
                  onClick={() => handleCopy(entry)}
                  className="bg-white p-5 rounded-[30px] border border-blue-50/50 flex items-center justify-between shadow-sm active:bg-blue-50 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">{entry.payload.Produto || "Sinal Tático"}</span>
                    {usedCount >= dailyLimit && !usedTodayIds.includes(entry.id) ? (
                      <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-red-300" />
                        <span className="text-sm font-black text-red-300 uppercase">BLOQUEADO</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-mono font-black text-slate-800 group-hover:text-blue-600 transition-colors">{entry.payload.Conteudo}</span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    <Copy className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
