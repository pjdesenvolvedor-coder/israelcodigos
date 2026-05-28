
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
  Share2,
  Check,
  AlertCircle
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
  updateDoc,
  getDocs
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

  // Escuta o Firestore em tempo real
  useEffect(() => {
    const q = query(collection(db, "webhooks"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      })) as WebhookEntry[];
      setHistory(entries);
      
      // Se houver uma nova entrada e nada selecionado, seleciona a primeira
      if (entries.length > 0 && !selectedEntry) {
        // setSelectedEntry(entries[0]);
      }
    });

    setWebhookUrl(`${window.location.origin}/api/israel`);
    return () => unsubscribe();
  }, []);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history;
    return history.filter(entry => 
      JSON.stringify(entry.payload).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.payload?.evento || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [history, searchTerm]);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "URL Copiada",
      description: "Endpoint pronto para receber requisições externas."
    });
  };

  const handleClearHistory = async () => {
    const querySnapshot = await getDocs(collection(db, "webhooks"));
    querySnapshot.forEach(async (document) => {
      await deleteDoc(doc(db, "webhooks", document.id));
    });
    setSelectedEntry(null);
    toast({ title: "Histórico Limpo", description: "Todos os registros foram removidos." });
  };

  const runAIInterpretation = async (entry: WebhookEntry) => {
    if (entry.interpretation || isInterpreting) return;
    
    setIsInterpreting(entry.id);
    try {
      const result = await interpretPayload({ payloadJson: JSON.stringify(entry.payload, null, 2) });
      
      if (entry.firestoreId) {
        await updateDoc(doc(db, "webhooks", entry.firestoreId), {
          interpretation: {
            summary: result.interpretation,
            codes: result.extractedDetails
          }
        });
        
        // Atualiza o estado local para refletir a mudança imediata na UI
        const updatedEntry = {
          ...entry,
          interpretation: {
            summary: result.interpretation,
            codes: result.extractedDetails
          }
        };
        setSelectedEntry(updatedEntry);
      }
      
      toast({ title: "Análise Concluída", description: "A IA interpretou o payload com sucesso." });
    } catch (error) {
      console.error("Erro na IA:", error);
      toast({
        variant: "destructive",
        title: "Erro na IA",
        description: "Falha ao analisar o payload com GenAI."
      });
    } finally {
      setIsInterpreting(null);
    }
  };

  const simulateWebhook = async () => {
    const mockData = {
      evento: "venda.confirmada",
      id_transacao: `tr_${Math.random().toString(36).substr(2, 9)}`,
      valor: (Math.random() * 500).toFixed(2),
      cliente: {
        nome: "Israel Teste",
        status: "VIP"
      },
      origem: "Simulador WebHookPulse"
    };

    await addDoc(collection(db, "webhooks"), {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Simulador-Interno" },
      payload: mockData
    });
    
    toast({
      title: "Simulação Enviada",
      description: "O payload foi gravado no banco de dados."
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-blue-200 shadow-lg">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-blue-700">WebHookPulse</h1>
          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-600 border-blue-100 font-medium">Real-Time</Badge>
        </div>
        
        <div className="hidden md:flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 group hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="font-mono text-xs text-slate-600 truncate max-w-[300px]">{webhookUrl}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:text-blue-600" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={simulateWebhook} className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
            <Terminal className="w-4 h-4" />
            Testar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-slate-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r flex flex-col shrink-0 bg-white shadow-sm">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filtrar eventos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center px-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300">
                    <Activity className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">Nenhuma requisição</p>
                  <p className="text-xs text-slate-400 mt-2">Envie um POST para o link acima para ver os dados aqui em tempo real.</p>
                </div>
              ) : (
                filteredHistory.map((entry) => (
                  <button
                    key={entry.firestoreId || entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                      selectedEntry?.firestoreId === entry.firestoreId 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                      : 'hover:bg-slate-50 border-transparent text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedEntry?.firestoreId === entry.firestoreId ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {entry.method}
                      </span>
                      <span className={`text-[10px] font-mono ${
                        selectedEntry?.firestoreId === entry.firestoreId ? 'text-white/70' : 'text-slate-400'
                      }`}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-bold truncate">
                      {entry.payload?.evento || entry.payload?.event || "Requisição Recebida"}
                    </div>
                    {entry.interpretation && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Zap className={`w-3 h-3 ${selectedEntry?.firestoreId === entry.firestoreId ? 'text-white' : 'text-blue-500'} fill-current`} />
                        <span className="text-[10px] opacity-80">Analisado por IA</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-white">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white">
                <div className="flex items-center gap-4">
                  <h2 className="font-bold text-slate-800">Detalhes da Requisição</h2>
                  <Badge className="bg-green-500 text-white border-none">Sucesso 200</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600" onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                    toast({ title: "Copiado", description: "JSON copiado para a área de transferência." });
                  }}>
                    <Copy className="w-4 h-4 mr-2" /> Copiar JSON
                  </Button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
                {/* AI & Context */}
                <div className="lg:col-span-2 border-r p-6 overflow-y-auto bg-slate-50/50 space-y-6">
                  <Card className="border-blue-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-blue-600 text-white py-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4 fill-white" />
                          Inteligência Artificial
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {selectedEntry.interpretation ? (
                        <div className="space-y-4">
                          <p className="text-sm leading-relaxed text-slate-700 italic">
                            "{selectedEntry.interpretation.summary}"
                          </p>
                          <Separator />
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identificadores Extraídos</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedEntry.interpretation.codes.map((code, idx) => (
                                <Badge key={idx} className="bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 font-mono">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Button 
                            onClick={() => runAIInterpretation(selectedEntry)} 
                            disabled={!!isInterpreting}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {isInterpreting === selectedEntry.id ? (
                              <Activity className="w-4 h-4 animate-spin" />
                            ) : (
                              "Interpretar com GenAI"
                            )}
                          </Button>
                          <p className="text-[10px] text-slate-400 mt-3 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Analisa o propósito e extrai IDs
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">HTTP Headers</h3>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
                      {Object.entries(selectedEntry.headers).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                          <span className="text-[10px] font-bold text-blue-500 uppercase">{key}</span>
                          <span className="text-xs text-slate-600 font-mono break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Raw Payload */}
                <div className="lg:col-span-3 flex flex-col bg-white">
                  <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Conteúdo do Payload</span>
                  </div>
                  <div className="flex-1 overflow-auto bg-[#0f172a]">
                    <pre className="p-6 font-mono text-sm leading-relaxed text-blue-300">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
              <div className="w-24 h-24 rounded-3xl bg-white border border-blue-100 flex items-center justify-center mb-8 shadow-xl shadow-blue-500/5 animate-bounce">
                <Activity className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-slate-800">Aguardando Pulso...</h2>
              <p className="text-slate-500 max-w-md leading-relaxed">
                Nenhuma requisição detectada no momento. Conecte seu serviço ao endpoint azul acima e os dados aparecerão aqui instantaneamente via Firestore.
              </p>
              
              <div className="mt-12 flex gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm w-40">
                  <Zap className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Tempo Real</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm w-40">
                  <Database className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Firestore</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
