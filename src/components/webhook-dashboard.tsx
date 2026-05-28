"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Activity, 
  Copy, 
  Terminal, 
  Search, 
  Zap, 
  Clock, 
  Globe, 
  Database,
  ChevronRight,
  Code,
  Trash2,
  Share2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { interpretPayload } from "@/ai/flows/interpret-payload-flow";
import { WebhookEntry } from "@/lib/webhook-store";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "webhook_pulse_history";

export function WebhookDashboard() {
  const [history, setHistory] = useState<WebhookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<WebhookEntry | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);

  const saveToLocalStorage = useCallback((data: WebhookEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "URL Copied",
      description: "Webhook endpoint ready for use."
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedEntry(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const runAIInterpretation = async (entry: WebhookEntry) => {
    if (entry.interpretation || isInterpreting) return;
    
    setIsInterpreting(entry.id);
    try {
      const result = await interpretPayload({ payloadJson: JSON.stringify(entry.payload, null, 2) });
      const updatedEntry = {
        ...entry,
        interpretation: {
          summary: result.interpretation,
          codes: result.extractedDetails
        }
      };
      
      const newHistory = history.map(h => h.id === entry.id ? updatedEntry : h);
      setHistory(newHistory);
      saveToLocalStorage(newHistory);
      setSelectedEntry(updatedEntry);
    } catch (error) {
      console.error("AI Error:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to analyze payload."
      });
    } finally {
      setIsInterpreting(null);
    }
  };

  const simulateWebhook = async () => {
    const mockData = {
      event: "order.completed",
      id: `ord_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      amount: Math.floor(Math.random() * 1000),
      currency: "USD",
      customer: {
        email: "demo@webhookpulse.ai",
        name: "Test User"
      },
      metadata: {
        source: "simulated",
        promo_code: "WELCOME2025"
      }
    };

    const newEntry: WebhookEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "WebhookPulse-Simulator" },
      payload: mockData
    };

    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    saveToLocalStorage(newHistory);
    setSelectedEntry(newEntry);
    toast({
      title: "New Webhook Received",
      description: `Event: ${mockData.event}`
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Zap className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
          </div>
          <h1 className="text-xl font-headline font-bold tracking-tight">WebHookPulse</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-muted/30 px-4 py-1.5 rounded-full border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span className="font-code text-xs truncate max-w-[200px] md:max-w-md">{webhookUrl}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={simulateWebhook} className="hidden sm:flex gap-2">
            <Terminal className="w-4 h-4" />
            Test Webhook
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearHistory} className="hidden sm:flex gap-2">
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - History */}
        <aside className="w-80 border-r flex flex-col shrink-0">
          <div className="p-4 border-b bg-muted/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search payloads..." 
                className="w-full bg-background border rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {history.length === 0 ? (
                <div className="py-20 text-center px-4">
                  <Clock className="w-10 h-10 text-muted mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No webhooks received yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Send a POST request to your endpoint.</p>
                </div>
              ) : (
                history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-3 rounded-md transition-all group relative overflow-hidden ${
                      selectedEntry?.id === entry.id 
                      ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/20' 
                      : 'hover:bg-muted/50 border-transparent'
                    } border`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 uppercase font-bold ${
                        entry.method === 'POST' ? 'text-primary border-primary/20' : ''
                      }`}>
                        {entry.method}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-code">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm font-medium font-headline truncate pr-4">
                      {entry.payload?.event || entry.payload?.type || "Generic Webhook"}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-code mt-1 truncate">
                      ID: {entry.id}
                    </div>
                    {entry.interpretation && (
                      <div className="absolute top-1 right-1">
                        <Zap className="w-3 h-3 text-secondary fill-secondary" />
                      </div>
                    )}
                    {selectedEntry?.id === entry.id && (
                      <div className="absolute right-2 bottom-3 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-muted/5">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Toolbar */}
              <div className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="font-headline font-bold">Inspection</h2>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="font-code text-[10px] px-1.5">
                      {selectedEntry.method}
                    </Badge>
                    <Badge variant="outline" className="font-code text-[10px] px-1.5">
                      200 OK
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-2 text-xs">
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </Button>
                </div>
              </div>

              {/* Viewport Grid */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
                {/* AI & Codes Column */}
                <div className="lg:col-span-2 border-r p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                  <Card className="bg-gradient-to-br from-card to-secondary/5 border-secondary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-headline flex items-center gap-2">
                          <Zap className="w-4 h-4 text-secondary fill-secondary" />
                          AI Interpreter
                        </CardTitle>
                        {selectedEntry.interpretation && (
                          <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 text-[10px]">
                            Processed
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedEntry.interpretation ? (
                        <div className="space-y-4">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {selectedEntry.interpretation.summary}
                          </p>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                              <Database className="w-3 h-3" />
                              Extracted Artifacts
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedEntry.interpretation.codes.map((code, idx) => (
                                <Badge key={idx} variant="secondary" className="font-code text-xs bg-primary/5 text-primary border-primary/20 py-0.5">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Button 
                            onClick={() => runAIInterpretation(selectedEntry)} 
                            disabled={!!isInterpreting}
                            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                          >
                            {isInterpreting === selectedEntry.id ? (
                              <>
                                <Activity className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2 fill-current" />
                                Analyze with AI
                              </>
                            )}
                          </Button>
                          <p className="text-[10px] text-muted-foreground mt-3">
                            Generates a concise summary and extracts specific identifiers.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Headers</h3>
                      <Badge variant="ghost" className="text-[10px] h-4">
                        {Object.keys(selectedEntry.headers).length} fields
                      </Badge>
                    </div>
                    <div className="space-y-1 font-code text-[11px]">
                      {Object.entries(selectedEntry.headers).map(([key, value]) => (
                        <div key={key} className="flex border-b border-border/30 py-1.5 last:border-0">
                          <span className="text-muted-foreground shrink-0 w-24 truncate">{key}:</span>
                          <span className="text-foreground break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Raw Inspector Column */}
                <div className="lg:col-span-3 bg-card/50 flex flex-col h-full overflow-hidden">
                  <div className="p-4 flex items-center justify-between border-b shrink-0 bg-card">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-primary" />
                      <span className="text-sm font-headline font-bold">Raw Payload</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedEntry.payload, null, 2));
                      toast({ title: "Copied JSON", description: "JSON payload copied to clipboard." });
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto p-0">
                    <pre className="p-6 font-code text-xs leading-relaxed text-primary/90 bg-[#0d0f11] min-h-full">
                      {JSON.stringify(selectedEntry.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 animate-pulse-blue">
                <Activity className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-headline font-bold mb-2">Awaiting Payload</h2>
              <p className="text-muted-foreground max-w-sm">
                Connect your external service to the unique endpoint or use the simulation tool to start monitoring activity.
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                {[
                  { icon: Zap, label: "Real-time", desc: "Instantly catch POST requests" },
                  { icon: Terminal, label: "AI Analysis", desc: "Auto-extract critical codes" },
                  { icon: Database, label: "Persistence", desc: "Local history auto-saved" }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-card/50 text-left">
                    <item.icon className="w-5 h-5 text-primary mb-2" />
                    <div className="text-sm font-bold">{item.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
