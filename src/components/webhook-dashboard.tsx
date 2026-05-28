"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Copy, 
  Terminal, 
  Search, 
  Zap, 
  Clock, 
  Globe, 
  Database,
  Code,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { interpretPayload } from "@/ai/flows/interpret-payload-flow";
import { WebhookEntry } from "@/lib/webhook-store";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  addDoc, 
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

  useEffect(() => {
    const q = query(collection(db, "webhooks"), orderBy("createdAt", "desc"), limit(25));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      })) as WebhookEntry[];
      setHistory(entries);
      
      // Se houver uma nova entrada e nada selecionado, seleciona a primeira
      if (entries.length > 0 && !selectedEntry) {
        // Opcional: auto-selecionar novo
      }
    });

    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/israel`);
    }
    
    return () => unsubscribe();
  }, [selectedEntry]);

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
    toast({
      title: "URL Copiada",
      description: "Endpoint Israel pronto para uso."
    });
  };

  const handleClearHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "webhooks"));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      setSelectedEntry(null);
      toast({ title: "Limpeza Concluída", description: "Todos os códigos temporários foram removidos." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na Limpeza", description: "Não foi possível limpar o relay." });
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
      toast({ title: "Análise IA", description: "Dados interpretados com sucesso." });
    } catch (error) {
      toast({ variant: "destructive", title: "Falha na IA", description: "Não foi possível analisar o código." });
    } finally {
      setIsInterpreting(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      {/* Header Estilo Azul e Branco */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg shadow-md">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-blue-800 tracking-tight">WebHookPulse <span className="text-slate-300 font-light">| Israel</span></h1>
        </div>
        
        <div className="flex items-center gap-4 bg-blue-50/50 border border-blue-100 px-4 py-1.5 rounded-lg">
          <Globe className="w-4 h-4 text-blue-600" />
          <code className="text-xs font-mono text-blue-700">{webhookUrl}</code>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-100" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-slate-400 hover:text-blue-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Lista de Webhooks */}
        <aside className="w-80 border-r flex flex-col shrink-0 bg-white">
          <div className="p-4 bg-slate-50/50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar códigos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-md py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <Activity className="w-8 h-8 text-blue-200 mx-auto mb-3 animate-pulse" />
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Aguardando Pulso</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId || entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded-lg transition-all border ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">POST</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 truncate">
                      {entry.payload?.codigo || entry.payload?.event || "Requisição Recebida"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Visualização de Dados */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-12 border-b flex items-center justify-between px-6 bg-slate-50/30">
                <span className="text-xs font-bold text-slate-500 uppercase">Detalhes da Transmissão</span>
                <Button variant="outline" size="xs" className="text-[10px] h-7" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                  toast({ title: "Copiado", description: "JSON na área de transferência." });
                }}>
                  Copiar JSON
                </Button>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                {/* Lado Esquerdo: IA e Headers */}
                <div className="border-r flex flex-col overflow-hidden bg-slate-50/20">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      <Card className="border-blue-100 shadow-none">
                        <CardHeader className="py-3 px-4 bg-blue-600 text-white rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 fill-white" />
                            <CardTitle className="text-xs font-bold uppercase tracking-widest">Análise de Segurança IA</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 bg-white">
                          {selectedEntry.interpretation ? (
                            <div className="space-y-3">
                              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                {selectedEntry.interpretation.summary}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedEntry.interpretation.codes.map((c, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] font-mono border-blue-200 text-blue-700 bg-blue-50/30">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Button 
                              onClick={() => runAIInterpretation(selectedEntry)} 
                              disabled={!!isInterpreting}
                              className="w-full bg-blue-700 hover:bg-blue-800 text-white shadow-sm h-9 text-xs"
                            >
                              {isInterpreting ? "Analisando..." : "Interpretar com IA"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadados da Requisição</h4>
                        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2">
                          {Object.entries(selectedEntry.headers).slice(0, 8).map(([k, v]) => (
                            <div key={k} className="flex justify-between items-start gap-4 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                              <span className="text-[10px] font-bold text-blue-600 uppercase shrink-0">{k}</span>
                              <span className="text-[10px] text-slate-500 font-mono break-all text-right">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Lado Direito: Payload Bruto */}
                <div className="flex flex-col bg-[#0a0f1d] text-blue-300">
                  <div className="p-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Payload JSON</span>
                  </div>
                  <ScrollArea className="flex-1">
                    <pre className="p-6 font-mono text-xs leading-relaxed">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
              <Activity className="w-16 h-16 text-blue-100 mb-6 animate-pulse" />
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Monitoramento Ativo</h2>
              <p className="text-slate-400 max-w-sm text-sm">
                O canal <span className="text-blue-600 font-mono">/api/israel</span> está aberto. Envie um POST para visualizar os dados em tempo real.
              </p>
              
              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <Zap className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase text-blue-800">Relay Instantâneo</p>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase text-blue-800">Uso Volátil</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
