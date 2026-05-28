
"use client";

import React, { useState, useEffect } from "react";
import { Settings, Plus, Key, Copy, Trash2, ShieldAlert, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLogged, setIsLogged] = useState(false);
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCodes = async (currentPass: string) => {
    try {
      const res = await fetch("/api/access-codes", {
        headers: { "Authorization": currentPass }
      });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
        setIsLogged(true);
      } else {
        toast({ variant: "destructive", title: "Senha Incorreta" });
      }
    } catch (e) {}
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCodes(password);
  };

  const generateCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/access-codes", {
        method: "POST",
        body: JSON.stringify({ action: "generate", password }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        toast({ title: "CÓDIGO GERADO", className: "bg-blue-600 text-white font-black rounded-2xl" });
        fetchCodes(password);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao gerar" });
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    if (!confirm("Tem certeza que deseja apagar todos os códigos?")) return;
    try {
      await fetch("/api/access-codes", {
        method: "DELETE",
        headers: { "Authorization": password }
      });
      setCodes([]);
    } catch (e) {}
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast({ title: "COPIADO", className: "bg-blue-600 text-white font-black rounded-2xl" });
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Settings className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin-slow" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Painel de Controle</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Administração Receptor Israel</p>
          </div>
          <Card className="bg-slate-800 border-slate-700 rounded-[30px] shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">Senha Mestra</label>
                  <Input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-slate-900 border-slate-700 text-white font-bold rounded-2xl"
                  />
                </div>
                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl">
                  ACESSAR PAINEL
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col">
      <header className="p-6 bg-white border-b flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-600" />
          <h1 className="font-black text-blue-900 uppercase tracking-tighter">Gerenciador de Acessos</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={clearAll} className="text-slate-300 hover:text-red-500">
          <Trash2 className="w-5 h-5" />
        </Button>
      </header>

      <main className="p-6 flex-1 space-y-6">
        <Button 
          onClick={generateCode}
          disabled={loading}
          className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[30px] text-lg shadow-xl shadow-blue-100 flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Plus className="w-6 h-6" />}
          GERAR NOVO CÓDIGO
        </Button>

        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Códigos Ativos ({codes.length})</h2>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-2">
              {codes.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-bold text-xs uppercase">Nenhum código gerado</p>
                </div>
              ) : (
                codes.map((item, idx) => (
                  <Card key={idx} className="bg-white border-blue-50 rounded-[25px] shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3 text-blue-300" />
                          <span className="text-xl font-mono font-black text-blue-900">{item.code}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Criado: {new Date(item.createdAt).toLocaleDateString()}</span>
                          {item.usedAt ? (
                            <div className="flex items-center gap-1 text-blue-500">
                              <Calendar className="w-2.5 h-2.5" />
                              <span className="text-[8px] font-black uppercase">Expira: {new Date(item.expiresAt).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-[8px] font-black text-green-500 uppercase">Aguardando Primeiro Uso</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCode(item.code)} className="bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
