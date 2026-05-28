
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Settings, Plus, Key, Copy, Trash2, ShieldAlert, Loader2, Users, Clock, CheckCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AccessCode {
  code: string;
  createdAt: string;
  usedAt: string | null;
  expiresAt: string | null;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLogged, setIsLogged] = useState(false);
  const [codes, setCodes] = useState<AccessCode[]>([]);
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

  const handleLogout = () => {
    setIsLogged(false);
    setPassword("");
    setCodes([]);
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
    if (!confirm("Tem certeza que deseja apagar todos os registros?")) return;
    try {
      await fetch("/api/access-codes", {
        method: "DELETE",
        headers: { "Authorization": password }
      });
      setCodes([]);
      toast({ title: "LIMPEZA CONCLUÍDA", className: "bg-blue-600 text-white font-black rounded-2xl" });
    } catch (e) {}
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast({ title: "COPIADO", className: "bg-blue-600 text-white font-black rounded-2xl" });
  };

  // Separação dos códigos
  const activeUsers = useMemo(() => codes.filter(c => c.usedAt !== null), [codes]);
  const pendingCodes = useMemo(() => codes.filter(c => c.usedAt === null), [codes]);

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
    <div className="h-screen bg-slate-50 max-w-md mx-auto flex flex-col overflow-hidden">
      <header className="p-6 bg-white border-b flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-600" />
          <h1 className="font-black text-blue-900 uppercase tracking-tighter">Gerenciador Israel</h1>
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
          <Button variant="ghost" size="icon" onClick={clearAll} className="text-slate-300 hover:text-red-500">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <Button 
          onClick={generateCode}
          disabled={loading}
          className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[30px] text-lg shadow-xl shadow-blue-100 flex items-center justify-center gap-3 shrink-0"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Plus className="w-6 h-6" />}
          GERAR NOVO ACESSO
        </Button>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-14 bg-white border-blue-50 rounded-2xl shadow-sm p-1">
            <TabsTrigger value="users" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Usuários ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Pendentes ({pendingCodes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 space-y-4 outline-none">
            <div className="space-y-3">
              {activeUsers.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum usuário ativo</p>
                </div>
              ) : (
                activeUsers.map((item, idx) => (
                  <Card key={idx} className="bg-white border-green-50 rounded-[25px] shadow-sm overflow-hidden border-l-4 border-l-green-500">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-xl font-mono font-black text-blue-900">{item.code}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Ativado em: {new Date(item.usedAt!).toLocaleDateString()}</span>
                          <span className="text-[8px] font-black text-blue-500 uppercase">Expira em: {new Date(item.expiresAt!).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="bg-green-50 px-3 py-1.5 rounded-full">
                        <span className="text-[8px] font-black text-green-600 uppercase">ATIVO</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6 space-y-4 outline-none">
            <div className="space-y-3">
              {pendingCodes.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <ShieldAlert className="w-10 h-10 text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum código pendente</p>
                </div>
              ) : (
                pendingCodes.map((item, idx) => (
                  <Card key={idx} className="bg-white border-blue-50 rounded-[25px] shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-blue-200">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-blue-300" />
                          <span className="text-xl font-mono font-black text-blue-900">{item.code}</span>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase">Gerado em: {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copyCode(item.code)} className="bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
