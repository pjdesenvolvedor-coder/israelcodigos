
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
  Activity,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, where, updateDoc } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

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

const getSignalReason = (entry: WebhookEntry) => {
  const conteudo = (entry.payload.Conteudo || "").toLowerCase();
  const assunto = (entry.payload.Assunto || "").toLowerCase();
  const produto = (entry.payload.Produto || "").toLowerCase();

  if (
    conteudo.includes("http") || 
    conteudo.includes("www.") || 
    conteudo.includes("link") || 
    conteudo.includes("residencia") || 
    conteudo.includes("residência") || 
    conteudo.includes("household") ||
    assunto.includes("link") ||
    assunto.includes("residencia") ||
    assunto.includes("residência") ||
    produto.includes("link") ||
    produto.includes("residencia") ||
    produto.includes("residência")
  ) {
    return "Link de Residência";
  }

  return "Código de Acesso";
};

const isCodeOrResidenceLink = (entry: WebhookEntry) => {
  const content = (entry.payload.Conteudo || "").trim();
  if (!content) return false;

  const reason = getSignalReason(entry);
  if (reason === "Link de Residência") {
    return true;
  }

  // Se for código, não deve ter espaços e deve ser curto para ignorar mensagens de texto
  const hasSpaces = content.includes(" ") || content.includes("\n");
  if (hasSpaces || content.length > 20) {
    return false;
  }

  const lowercaseContent = content.toLowerCase();
  if (lowercaseContent === "teste" || lowercaseContent === "test" || lowercaseContent.includes("configurado")) {
    return false;
  }

  return true;
};

const EXPIRATION_MS = 15 * 60 * 1000;

export function WebhookDashboard() {
  const { toast } = useToast();
  const db = useFirestore();
  const [now, setNow] = useState<number>(Date.now());
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showPayload, setShowPayload] = useState(false);
  
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem("israel_access_token") : null;

  // Busca o documento do código de acesso atual para sincronizar o uso entre dispositivos
  const accessCodeQuery = useMemoFirebase(() => {
    if (!db || !accessToken) return null;
    return query(collection(db, "access_codes"), where("code", "==", accessToken.toUpperCase()));
  }, [db, accessToken]);

  const { data: accessDocs = [] } = useCollection<any>(accessCodeQuery);
  const accessDocData = accessDocs?.[0];
  const accessDocId = accessDocData?.id;

  // Escuta o limite global do banco de dados em tempo real
  const configDocRef = useMemo(() => (db ? doc(db, "_system", "config") : null), [db]);
  const { data: globalConfig } = useDoc<any>(configDocRef);
  const dailyLimit = globalConfig?.globalLimit || 10;
  const disableCounting = true; // Sempre desativado (sem login/barras de limites)

  useEffect(() => {
    setAccessExpiresAt(localStorage.getItem("israel_access_expires"));
    setSessionStart(localStorage.getItem("israel_session_start"));
    
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lógica de consumo diário sincronizado
  const usedTodayIds = useMemo(() => {
    if (!accessDocData) return [];
    const today = new Date().toLocaleDateString();
    
    // Se a data do último uso no banco for diferente de hoje, o contador é zero
    if (accessDocData.lastUsageDate !== today) {
      return [];
    }
    return accessDocData.consumedSignals || [];
  }, [accessDocData]);

  const webhooksQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(100));
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
      .filter(isCodeOrResidenceLink)
      .slice(0, 10);
  }, [rawData]);

  // EFEITO CRÍTICO: Consumo automático de cota ao receber sinal
  useEffect(() => {
    if (!db || !accessDocId || !activeHistory.length || !sessionStart || disableCounting) return;

    const sessionStartTime = new Date(sessionStart).getTime();

    // Filtra sinais que acabaram de chegar, ainda não foram contabilizados e foram recebidos APÓS o login
    const uncountedSignals = activeHistory.filter(s => {
      const isUncounted = !usedTodayIds.includes(s.id);
      const isAfterLogin = new Date(s.timestamp).getTime() >= sessionStartTime;
      return isUncounted && isAfterLogin;
    });

    if (uncountedSignals.length === 0) return;

    // Quanto espaço temos na cota diária?
    const spaceAvailable = dailyLimit - usedTodayIds.length;
    if (spaceAvailable <= 0) return;

    // Pegamos os novos sinais que cabem na cota para consumir
    const signalsToConsume = uncountedSignals.slice(0, spaceAvailable).map(s => s.id);
    if (signalsToConsume.length === 0) return;

    const today = new Date().toLocaleDateString();
    const isNewDay = accessDocData?.lastUsageDate !== today;
    
    const newConsumedSignals = isNewDay ? signalsToConsume : [...usedTodayIds, ...signalsToConsume];

    // Atualiza no Firestore para que todos os dispositivos vejam o consumo
    updateDoc(doc(db, "access_codes", accessDocId), {
      consumedSignals: newConsumedSignals,
      lastUsageDate: today
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: `access_codes/${accessDocId}`,
        operation: 'update',
        requestResourceData: { consumedSignals: newConsumedSignals, lastUsageDate: today }
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  }, [activeHistory, usedTodayIds, db, accessDocId, dailyLimit, accessDocData?.lastUsageDate, sessionStart, disableCounting]);

  const usedCount = usedTodayIds.length;
  const progressValue = (usedCount / dailyLimit) * 100;

  // Função para formatar o tempo decorrido
  const formatTimeElapsed = (timestamp: string) => {
    const diffMs = now - new Date(timestamp).getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return "Agora mesmo";
    }
    if (diffMins < 60) {
      return `há ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `há ${diffHours} h`;
    }
    return `há ${diffDays} d`;
  };
  
  // O sinal mais recente
  const latestEntry = activeHistory[0];

  // Função para determinar se um sinal pode ser visto
  const canViewSignal = (signalId: string) => {
    return true; // Todos os sinais são liberados
  };

  const handleCopy = (entry: WebhookEntry) => {
    if (!db) return;

    if (!canViewSignal(entry.id)) {
      toast({
        variant: "destructive",
        title: "SINAL BLOQUEADO",
        description: `Limite diário de ${dailyLimit} atingido.`
      });
      return;
    }

    const isLink = getSignalReason(entry) === "Link de Residência";
    const content = entry.payload.Conteudo || "";

    if (isLink && content.startsWith("http")) {
      window.open(content, "_blank");
      toast({
        title: "ABRINDO LINK",
        description: "O link de residência está sendo aberto em uma nova aba.",
        className: "bg-blue-600 border-none text-white font-black rounded-2xl"
      });
    } else {
      navigator.clipboard.writeText(content);
      toast({ 
        title: "CÓDIGO COPIADO", 
        className: "bg-blue-600 border-none text-white font-black rounded-2xl"
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("israel_access_token");
    localStorage.removeItem("israel_access_expires");
    localStorage.removeItem("israel_session_start");
    localStorage.removeItem("israel_daily_limit");
    window.location.reload();
  };

  return (
    <div className="h-screen bg-slate-50 max-w-md mx-auto flex flex-col overflow-hidden relative">
      <header className="sticky top-0 z-50 p-6 flex items-center justify-between bg-white border-b shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-blue-900 uppercase leading-none">ISRAEL V4</h1>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Operacional</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
        {!disableCounting && (
          <div className="w-full bg-white p-5 rounded-[30px] shadow-sm border border-blue-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className={cn("w-3 h-3", usedCount >= dailyLimit ? "text-red-500" : "text-blue-500")} />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Consumo Tático (Auto-Contagem)</span>
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
                ? "Cota esgotada! Novos sinais bloqueados automaticamente." 
                : "Cada novo sinal recebido consome 1 ponto da cota."}
            </p>
          </div>
        )}

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
                    Aguardando sinal...<br/>Contagem automática ativa.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 border border-blue-50/50 rounded-[35px] py-12 flex flex-col items-center justify-center relative group overflow-hidden">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                      <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">
                        {getSignalReason(latestEntry)}
                      </span>
                    </div>
                    
                    {!canViewSignal(latestEntry.id) ? (
                      <div className="flex flex-col items-center gap-3 py-4 px-6 text-center">
                        <div className="bg-red-50 p-4 rounded-full">
                          <Lock className="w-8 h-8 text-red-500" />
                        </div>
                        <span className="text-sm font-black text-red-600 uppercase tracking-widest">SINAL BLOQUEADO</span>
                        <p className="text-[10px] font-bold text-red-400 uppercase">Cota Diária Excedida</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        {getSignalReason(latestEntry) === "Link de Residência" ? (
                          <span className="text-3xl font-black text-blue-900 drop-shadow-sm uppercase tracking-tight text-center py-4">
                            CÓDIGO RESIDÊNCIA
                          </span>
                        ) : (
                          <span className="text-7xl font-black font-mono tracking-tighter text-blue-900 drop-shadow-sm">
                            {latestEntry.payload.Conteudo || "----"}
                          </span>
                        )}
                        <span className="text-[10px] bg-emerald-500 text-white font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                          {formatTimeElapsed(latestEntry.timestamp)}
                        </span>
                      </div>
                    )}
                  </div>

                  {latestEntry.interpretation && canViewSignal(latestEntry.id) && (
                    <div className="bg-slate-900 rounded-[25px] p-5 space-y-3 shadow-xl">
                      <button onClick={() => setShowAI(!showAI)} className="w-full flex items-center justify-between text-blue-400">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Análise IA Israel</span>
                        </div>
                        {showAI ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                      </button>
                      {showAI && <p className="text-[11px] font-bold text-slate-300 leading-relaxed antialiased">{latestEntry.interpretation.interpretation}</p>}
                    </div>
                  )}

                  {/* DADOS DA REQUISIÇÃO (PAYLOAD BRUTO) */}
                  {canViewSignal(latestEntry.id) && (
                    <div className="bg-slate-900 rounded-[25px] p-5 space-y-3 shadow-xl">
                      <button onClick={() => setShowPayload(!showPayload)} className="w-full flex items-center justify-between text-blue-400">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Payload Recebido (JSON)</span>
                        </div>
                        {showPayload ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                      </button>
                      {showPayload && (
                        <pre className="text-[10px] font-mono text-emerald-400 bg-slate-950 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all max-h-48 scrollbar-hide text-left">
                          {JSON.stringify(latestEntry.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={() => handleCopy(latestEntry)}
                    disabled={!canViewSignal(latestEntry.id)}
                    className={cn(
                      "w-full font-black h-18 rounded-[24px] text-lg transition-all active:scale-95",
                      !canViewSignal(latestEntry.id)
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100"
                    )}
                  >
                    {getSignalReason(latestEntry) === "Link de Residência" ? (
                      <>
                        <ExternalLink className="w-5 h-5 mr-3" />
                        {!canViewSignal(latestEntry.id) ? "BLOQUEADO" : "CLIQUE AQUI"}
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-3" />
                        {!canViewSignal(latestEntry.id) ? "BLOQUEADO" : "COPIAR SINAL"}
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {activeHistory.length > 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico da Sessão</h3>
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{getSignalReason(entry)}</span>
                      <span className="text-[8px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {formatTimeElapsed(entry.timestamp)}
                      </span>
                    </div>
                    {!canViewSignal(entry.id) ? (
                      <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-red-300" />
                        <span className="text-sm font-black text-red-300 uppercase">BLOQUEADO</span>
                      </div>
                    ) : (
                      getSignalReason(entry) === "Link de Residência" ? (
                        <span className="text-base font-black text-blue-900 uppercase tracking-wide group-hover:text-blue-600 transition-colors">CÓDIGO RESIDÊNCIA</span>
                      ) : (
                        <span className="text-2xl font-mono font-black text-slate-800 group-hover:text-blue-600 transition-colors">{entry.payload.Conteudo}</span>
                      )
                    )}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    {getSignalReason(entry) === "Link de Residência" ? (
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    )}
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
