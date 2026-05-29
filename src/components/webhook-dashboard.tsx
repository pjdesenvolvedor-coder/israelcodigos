
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
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Lock
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

const EXPIRATION_MS = 15 * 60 * 1000;

export function WebhookDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const [now, setNow] = useState<number>(Date.now());
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(10);
  const [showAI, setShowAI] = useState(false);
  const [usedTodayIds, setUsedTodayIds] = useState<string[]>([]);

  useEffect(() => {
    setAccessExpiresAt(localStorage.getItem("israel_access_expires"));
    setSessionStart(localStorage.getItem("israel_session_start"));
    const limitVal = localStorage.getItem("israel_daily_limit");
    if (limitVal) setDailyLimit(parseInt(limitVal));
    
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
  const latestEntry = activeHistory[0];

  const handleCopy = (entry: WebhookEntry) => {
    // Se o sinal já foi contado hoje, apenas copia
    if (usedTodayIds.includes(entry.id)) {
      navigator.clipboard.writeText(entry.payload.Conteudo || "");
      toast({ title: "CÓDIGO COPIADO" });
      return;
    }

    // Se é um sinal novo e atingiu o limite
    if (usedCount >= dailyLimit) {
      toast({
        variant: "destructive",
        title: "LIMITE DIÁRIO EXCEDIDO",
        description: `Você já consumiu seus ${dailyLimit} sinais diários.`
      });
      return;
    }

    // Conta o novo sinal
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

      <header className="p-6 flex items-center justify-between bg-white border-b">
        <div className="flex items-center gap-3">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-black text-blue-900 uppercase">ISRAEL V4</h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleLogout} className="font-black rounded-xl text-[10px]">SAIR</Button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-slate-900 py-1.5 px-4 rounded-full">
            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">
              SINAIS HOJE: {usedCount} / {dailyLimit}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="bg-white border-none rounded-[40px] shadow-sm overflow-hidden">
            <CardContent className="p-7 space-y-6">
              {!latestEntry ? (
                <div className="py-24 text-center space-y-6">
                  <Zap className="w-10 h-10 text-blue-300 mx-auto animate-bounce" />
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Aguardando sinais após login...</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-[35px] py-10 flex flex-col items-center justify-center relative">
                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em] mb-2">Sinal em Tempo Real</span>
                    
                    {usedCount >= dailyLimit && !usedTodayIds.includes(latestEntry.id) ? (
                      <div className="flex flex-col items-center gap-2">
                        <Lock className="w-8 h-8 text-red-400" />
                        <span className="text-sm font-black text-red-500 uppercase">LIMITE EXCEDIDO</span>
                      </div>
                    ) : (
                      <span className="text-7xl font-black font-mono tracking-tighter text-blue-600">
                        {latestEntry.payload.Conteudo || "----"}
                      </span>
                    )}
                  </div>

                  {latestEntry.interpretation && (
                    <div className="bg-slate-900 rounded-[25px] p-5 space-y-3">
                      <button onClick={() => setShowAI(!showAI)} className="w-full flex items-center justify-between text-blue-400">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase">Análise de IA</span>
                        </div>
                        {showAI ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showAI && <p className="text-[11px] font-bold text-slate-300 leading-relaxed">{latestEntry.interpretation.interpretation}</p>}
                    </div>
                  )}

                  <Button 
                    onClick={() => handleCopy(latestEntry)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-[24px] text-lg shadow-xl shadow-blue-100"
                  >
                    <Copy className="w-5 h-5 mr-2" />
                    {usedCount >= dailyLimit && !usedTodayIds.includes(latestEntry.id) ? "DESBLOQUEAR ACESSO" : "COPIAR AGORA"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {activeHistory.length > 1 && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase px-3">Histórico Recente</h3>
            <div className="space-y-3 pb-10">
              {activeHistory.slice(1).map((entry) => (
                <div 
                  key={entry.id}
                  onClick={() => handleCopy(entry)}
                  className="bg-white p-5 rounded-[30px] border border-blue-50 flex items-center justify-between shadow-sm active:bg-blue-50"
                >
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase">{entry.payload.Produto}</span>
                    {usedCount >= dailyLimit && !usedTodayIds.includes(entry.id) ? (
                      <span className="text-sm font-black text-red-400 uppercase">BLOQUEADO</span>
                    ) : (
                      <span className="text-2xl font-mono font-black text-blue-600">{entry.payload.Conteudo}</span>
                    )}
                  </div>
                  <Copy className="w-4 h-4 text-slate-200" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
