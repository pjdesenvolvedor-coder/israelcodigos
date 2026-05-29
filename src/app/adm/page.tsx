
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Settings, Plus, Key, Copy, Trash2, ShieldAlert, Loader2, Users, Clock, CheckCircle2, Wifi, WifiOff, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useCollection } from "@/firebase";
import { collection, addDoc, query, orderBy, writeBatch, getDocs, doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";

interface AccessCode {
  id: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  expiresAt: string | null;
  dailyLimit: number;
}

const ADMIN_PASSWORD = "Ae@1234Br";

export default function AdminPage() {
  const [passInput, setPassInput] = useState("");
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [dailyLimitInput, setDailyLimitInput] = useState("10");
  const { toast } = useToast();
  const db = useFirestore();

  const codesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "access_codes"), orderBy("createdAt", "desc"));
  }, [db]);

  const { data: codes = [] } = useCollection<AccessCode>(codesQuery);

  useEffect(() => {
    if (isLogged && db) {
      const checkConnection = async () => {
        try {
          const testDoc = doc(collection(db, "_system_check"), "status");
          await setDoc(testDoc, { lastCheck: new Date().toISOString() });
          setDbStatus('online');
        } catch (err) {
          setDbStatus('error');
        }
      };
      checkConnection();
    }
  }, [isLogged, db]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsLogged(true);
    } else {
      toast({ variant: "destructive", title: "Senha Incorreta" });
    }
  };

  const generateCode = () => {
    if (!db) return;
    setLoading(true);
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const data = {
      code: newCode,
      createdAt: new Date().toISOString(),
      usedAt: null,
      expiresAt: null,
      dailyLimit: parseInt(dailyLimitInput) || 10
    };

    addDoc(collection(db, "access_codes"), data)
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'access_codes',
          operation: 'create',
          requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));

    toast({ title: "CÓDIGO GERADO", className: "bg-blue-600 text-white font-black rounded-2xl" });
  };

  const clearAll = async () => {
    if (!db || !confirm("Limpar todo o histórico de códigos?")) return;
    const snapshot = await getDocs(collection(db, "access_codes"));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    batch.commit();
    toast({ title: "LIMPEZA CONCLUÍDA" });
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast({ title: "COPIADO" });
  };

  const activeUsers = useMemo(() => (codes || []).filter(c => c.usedAt !== null), [codes]);
  const pendingCodes = useMemo(() => (codes || []).filter(c => c.usedAt === null), [codes]);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Settings className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Admin Receptor</h1>
          </div>
          <Card className="bg-slate-800 border-slate-700 rounded-[30px]">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <Input 
                  type="password" 
                  placeholder="SENHA MESTRA"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className="h-14 bg-slate-900 border-slate-700 text-white font-bold rounded-2xl"
                />
                <Button className="w-full h-14 bg-blue-600 font-black rounded-2xl">ENTRAR</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 max-w-md mx-auto flex flex-col overflow-hidden">
      <header className="p-6 bg-white border-b flex items-center justify-between shrink-0">
        <h1 className="font-black text-blue-900 uppercase">Gerenciador Israel</h1>
        <Button variant="ghost" size="icon" onClick={clearAll} className="text-slate-300 hover:text-red-500">
          <Trash2 className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className={cn("p-4 rounded-2xl flex items-center gap-3", dbStatus === 'online' ? "bg-green-50" : "bg-red-50")}>
          {dbStatus === 'online' ? <Wifi className="text-green-600" /> : <WifiOff className="text-red-600" />}
          <span className="text-[10px] font-black uppercase tracking-widest">Status: {dbStatus === 'online' ? "ONLINE" : "ERRO"}</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">Sinais por dia p/ usuário</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <Input 
                type="number" 
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(e.target.value)}
                className="h-12 pl-12 bg-white border-blue-100 font-black rounded-2xl"
              />
            </div>
          </div>
          
          <Button onClick={generateCode} disabled={loading} className="w-full h-20 bg-blue-600 text-white font-black rounded-[30px] text-lg shadow-xl shadow-blue-100">
            {loading ? <Loader2 className="animate-spin" /> : <Plus className="w-6 h-6 mr-2" />}
            GERAR NOVO ACESSO
          </Button>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="w-full grid grid-cols-2 h-12 bg-white rounded-2xl p-1 mb-6">
            <TabsTrigger value="users" className="rounded-xl font-black text-[10px] uppercase">Usuários ({activeUsers.length})</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl font-black text-[10px] uppercase">Pendentes ({pendingCodes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            {activeUsers.map(item => (
              <Card key={item.id} className="bg-white border-l-4 border-l-green-500 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xl font-mono font-black text-blue-900">{item.code}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Limite: {item.dailyLimit} | Expira: {new Date(item.expiresAt!).toLocaleDateString()}</p>
                  </div>
                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pendingCodes.map(item => (
              <Card key={item.id} className="bg-white border-l-4 border-l-blue-200 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xl font-mono font-black text-blue-900">{item.code}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Limite: {item.dailyLimit}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyCode(item.code)} className="bg-slate-50 text-slate-400 rounded-xl">
                    <Copy className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
