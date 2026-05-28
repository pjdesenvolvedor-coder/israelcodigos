"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Copy, 
  Search, 
  Zap, 
  Clock, 
  Globe, 
  Code,
  Trash2,
  Check,
  ShieldCheck,
  Wifi,
  WifiOff,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { interpretPayload } from "@/ai/flows/interpret-payload-flow";
import { WebhookEntry } from "@/lib/webhook-store";
import { toast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs,
  limit,
  writeBatch
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export function WebhookDashboard() {
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<WebhookEntry | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<"conectado" | "desconectado" | "erro">("desconectado");

  // Verifica se as chaves do Firebase estão configuradas (Importante para Vercel)
  const isConfigured = firebaseConfig.apiKey !== "mock-key";

  useEffect(() => {
    if (!isConfigured) {
      setStatus("erro");
      return;
    }

    // Escuta em tempo real a coleção de webhooks
    const q = query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          firestoreId: doc.id,
          id: doc.id,
          ...doc.data()
        })) as WebhookEntry[];
        setHistory(entries);
        setStatus("conectado");
      },
      (error) => {
        console.error("Erro na conexão em tempo real:", error);
        setStatus("erro");
        toast({
          variant: "destructive",
          title: "Erro de Conexão",
          description: "Verifique as permissões do Firebase."
        });
      }
    );

    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/israel`);
    }
    
    return () => unsubscribe();
  }, [isConfigured]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(entry => 
      JSON.stringify(entry.payload).toLowerCase().includes(term) ||
      (entry.payload?.codigo || entry.payload?.code || "").toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "URL Copiada", description: "Endpoint pronto para receber requisições." });
  };

  const handleClearHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "webhooks"));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setSelectedEntry(null);
      toast({ title: "Limpeza Concluída", description: "Histórico temporário removido." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao limpar dados." });
    }
  };

  const runAIInterpretation = async (entry: WebhookEntry) => {
    if (isInterpreting) return;
    setIsInterpreting(entry.id);
    try {
      const result = await interpretPayload({ payloadJson: JSON.stringify(entry.payload, null, 2) });
      const updated = {
        ...entry,
        interpretation: {
          summary: result.interpretation,
          codes: result.extractedDetails
        }
      };
      setSelectedEntry(updated);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na IA", description: "Não foi possível analisar o payload." });
    } finally {
      setIsInterpreting(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      {/* Header Azul e Branco */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-blue-900 leading-none">WebHookPulse Israel</h1>
            <div className="flex items-center gap-1.5 mt-1">
              {status === "conectado" ? (
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                  <Wifi className="w-3 h-3" /> CANAL ATIVO
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                  <WifiOff className="w-3 h-3" /> DESCONECTADO
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-3 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full">
          <Globe className="w-4 h-4 text-blue-600" />
          <code className="text-xs font-mono text-slate-600 truncate max-w-[300px]">{webhookUrl}</code>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClearHistory} className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <Trash2 className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </header>

      {!isConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center justify-center gap-2 text-amber-800 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Configuração de ambiente detectada como pendente. Verifique as Variáveis de Ambiente na Vercel.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Lista Lateral */}
        <aside className="w-80 border-r flex flex-col shrink-0 bg-white">
          <div className="p-4 bg-slate-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar códigos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <Activity className="w-10 h-10 text-blue-100 mx-auto mb-4 animate-pulse" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Aguardando Pulso...</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded-lg transition-all border ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-600 border-blue-700 shadow-md text-white' 
                      : 'hover:bg-slate-50 border-transparent text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 opacity-80">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">POST</span>
                      <span className="text-[10px] font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-bold truncate">
                      {entry.payload?.codigo || entry.payload?.event || "Requisição Recebida"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Visualização de Conteúdo */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-12 border-b flex items-center justify-between px-6 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Análise de Transmissão</span>
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Ativo</Badge>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                {/* Lado Esquerdo: IA e Headers */}
                <div className="border-r flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      <Card className="border-blue-100 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-blue-600 text-white">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 fill-white" />
                            <CardTitle className="text-xs font-bold uppercase tracking-widest">Inteligência Artificial</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 bg-white">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-4">
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 font-mono text-[10px]">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Button 
                                onClick={() => runAIInterpretation(selectedEntry)} 
                                disabled={!!isInterpreting}
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                              >
                                {isInterpreting ? "Analisando..." : "Interpretar Payload"}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cabeçalhos HTTP</h4>
                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                          {Object.entries(selectedEntry.headers).slice(0, 10).map(([k, v]) => (
                            <div key={k} className="p-3 flex justify-between gap-4 hover:bg-slate-50 transition-colors">
                              <span className="text-[10px] font-bold text-blue-600 uppercase shrink-0">{k}</span>
                              <span className="text-[10px] text-slate-500 font-mono break-all text-right">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Lado Direito: JSON Bruto */}
                <div className="flex flex-col bg-[#0f172a]">
                  <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-300">
                      <Code className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Corpo da Requisição (JSON)</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="xs" 
                      className="text-white/50 hover:text-white text-[10px] h-6"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                        toast({ title: "Copiado", description: "JSON copiado com sucesso." });
                      }}
                    >
                      COPIAR
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-6 font-mono text-[11px] leading-relaxed text-blue-400">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Activity className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Monitoramento de Códigos</h2>
              <p className="text-slate-400 max-w-xs text-sm">
                O endpoint <span className="text-blue-600 font-mono">/api/israel</span> está pronto para receber transmissões do seu site externo.
              </p>
              
              <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <Zap className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-[10px] font-bold uppercase text-slate-500">Relay Instantâneo</p>
                </div>
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <Clock className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-[10px] font-bold uppercase text-slate-500">Histórico Volátil</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
