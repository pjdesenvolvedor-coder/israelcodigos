
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Settings, Plus, Copy, Trash2, Loader2, Users, Clock, Hash, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, query, orderBy, writeBatch, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [deleting, setDeleting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [dailyLimitInput, setDailyLimitInput] = useState("10");
  const { toast } = useToast();
  const db = useFirestore();

  const codesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "access_codes"), orderBy("createdAt", "desc"));
  }, [db]);

  const { data: codes = [] } = useCollection<AccessCode>(codesQuery);

  useEffect(() => {
    if (isLogged && db) {
      const loadSettings = async () => {
        try {
          const settingsDoc = await getDoc(doc(db, "_system", "config"));
          if (settingsDoc.exists()) {
            setDailyLimitInput(settingsDoc.data().defaultDailyLimit?.toString() || "10");
          }
          setDbStatus('online');
        } catch (err) {
          setDbStatus('error');
        }
      };
      loadSettings();
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

  const handleSaveSettings = () => {
    if (!db) return;
    setSavingSettings(true);
    const configData = {
      defaultDailyLimit: parseInt(dailyLimitInput) || 10,
      updatedAt: new Date().toISOString()
    };
    
    setDoc(doc(db, "_system", "config"), configData)
      .then(() => {
        toast({ title: "CONFIGURAÇÃO SALVA", className: "bg-green-600 text-white rounded-2xl" });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: '_system/config',
          operation: 'update',
          requestResourceData: configData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setSavingSettings(false));
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
      .then(() => {
        toast({ title: "CÓDIGO GERADO", className: "bg-blue-600 text-white font-black rounded-2xl" });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: 'access_codes',
          operation: 'create',
          requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setLoading(false));
  };

  const deleteIndividualCode = (id: string) => {
    if (!db || !id) return;
    
    const docRef = doc(db, "access_codes", id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "ACESSO REMOVIDO" });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const clearAllCodes = async () => {
    if (!db) return;
    
    setDeleting(true);
    try {
      const snapshot = await getDocs(collection(db, "access_codes"));
      if (snapshot.empty) {
        toast({ title: "NÃO HÁ CÓDIGOS PARA APAGAR" });
        setDeleting(false);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      
      batch.commit()
        .then(() => {
          toast({ title: "SISTEMA LIMPO", className: "bg-red-600 text-white rounded-2xl" });
        })
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: 'access_codes',
            operation: 'delete'
          });
          errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setDeleting(false));
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO AO ACESSAR BANCO" });
      setDeleting(false);
    }
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast({ title: "CÓDIGO COPIADO" });
  };

  const activeUsers = useMemo(() => (codes || []).filter(c => c.usedAt !== null), [codes]);
  const pendingCodes = useMemo(() => (codes || []).filter(c => c.usedAt === null), [codes]);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
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
        <div className="flex flex-col">
          <h1 className="font-black text-blue-900 uppercase">Gerenciador Israel</h1>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Painel de Controle Tático</span>
        </div>
        <div className={cn("px-3 py-1 rounded-full flex items-center gap-2", dbStatus === 'online' ? "bg-green-50" : "bg-red-50")}>
          <div className={cn("w-2 h-2 rounded-full", dbStatus === 'online' ? "bg-green-500" : "bg-red-500")} />
          <span className="text-[8px] font-black uppercase tracking-widest">{dbStatus === 'online' ? "Online" : "Erro"}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <div className="space-y-4">
          <div className="space-y-3 bg-white p-5 rounded-[30px] border border-blue-50">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">Sinais Diários Padrão</label>
              <Hash className="w-3 h-3 text-blue-200" />
            </div>
            <div className="flex gap-2">
              <Input 
                type="number" 
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(e.target.value)}
                className="h-12 bg-slate-50 border-none font-black rounded-2xl text-blue-900"
                placeholder="Ex: 10"
              />
              <Button 
                onClick={handleSaveSettings} 
                disabled={savingSettings}
                className="h-12 bg-blue-600 text-white font-black rounded-2xl px-6 hover:bg-blue-700"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : "SALVAR"}
              </Button>
            </div>
          </div>
          
          <Button onClick={generateCode} disabled={loading} className="w-full h-20 bg-blue-600 text-white font-black rounded-[30px] text-lg shadow-xl shadow-blue-100 active:scale-95 transition-transform">
            {loading ? <Loader2 className="animate-spin" /> : <Plus className="w-6 h-6 mr-2" />}
            GERAR NOVO ACESSO
          </Button>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="w-full grid grid-cols-2 h-12 bg-white rounded-2xl p-1 mb-6 border">
            <TabsTrigger value="users" className="rounded-xl font-black text-[10px] uppercase">Usuários ({activeUsers.length})</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl font-black text-[10px] uppercase">Pendentes ({pendingCodes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            {activeUsers.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] font-black text-slate-300 uppercase">Nenhum usuário ativo</p>
              </div>
            ) : (
              activeUsers.map(item => (
                <Card key={item.id} className="bg-white border-l-4 border-l-green-500 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-mono font-black text-blue-900">{item.code}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Limite: {item.dailyLimit}</p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-10 w-10 rounded-xl"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[30px]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black uppercase text-blue-900">APAGAR USUÁRIO?</AlertDialogTitle>
                          <AlertDialogDescription className="font-bold text-slate-400">
                            O usuário será desconectado imediatamente do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-black">CANCELAR</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteIndividualCode(item.id)}
                            className="bg-red-600 rounded-xl font-black"
                          >
                            CONFIRMAR
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pendingCodes.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] font-black text-slate-300 uppercase">Nenhum código pendente</p>
              </div>
            ) : (
              pendingCodes.map(item => (
                <Card key={item.id} className="bg-white border-l-4 border-l-blue-200 rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xl font-mono font-black text-blue-900">{item.code}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Limite: {item.dailyLimit}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyCode(item.code)} 
                        className="bg-slate-50 text-slate-400 rounded-xl h-10 w-10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-10 w-10 rounded-xl"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[30px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black uppercase text-blue-900">APAGAR CÓDIGO?</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold text-slate-400">
                              Este código pendente será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl font-black">CANCELAR</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteIndividualCode(item.id)}
                              className="bg-red-600 rounded-xl font-black"
                            >
                              CONFIRMAR
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {codes.length > 0 && (
          <div className="pt-8 pb-12">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  disabled={deleting}
                  variant="outline"
                  className="w-full h-16 border-red-100 text-red-500 hover:bg-red-500 hover:text-white font-black rounded-[25px] flex items-center justify-center gap-2 transition-all"
                >
                  {deleting ? <Loader2 className="animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                  APAGAR TODOS OS CÓDIGOS
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[30px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black uppercase text-red-600">LIMPEZA TOTAL?</AlertDialogTitle>
                  <AlertDialogDescription className="font-bold text-slate-400">
                    ISSO VAI APAGAR TODOS OS ACESSOS. Todos os usuários serão desconectados agora.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-black">CANCELAR</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={clearAllCodes}
                    className="bg-red-600 rounded-xl font-black"
                  >
                    APAGAR TUDO
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </main>
    </div>
  );
}
