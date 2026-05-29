
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

interface AccessGuardProps {
  children: React.ReactNode;
}

export function AccessGuard({ children }: AccessGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  // Monitor de segurança em tempo real para desconexão automática
  useEffect(() => {
    const savedCode = typeof window !== 'undefined' ? localStorage.getItem("israel_access_token") : null;
    
    if (!savedCode || !db) {
      if (isAuthorized === null) setIsAuthorized(false);
      return;
    }

    // Cria um listener para o código de acesso atual
    const q = query(collection(db, "access_codes"), where("code", "==", savedCode.toUpperCase()));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Se o código for deletado ou não existir mais, desconecta na hora
      if (snapshot.empty) {
        if (isAuthorized === true) {
          localStorage.removeItem("israel_access_token");
          localStorage.removeItem("israel_access_expires");
          localStorage.removeItem("israel_session_start");
          localStorage.removeItem("israel_daily_limit");
          setIsAuthorized(false);
          toast({
            variant: "destructive",
            title: "ACESSO REMOVIDO",
            description: "Este código foi desativado pelo administrador."
          });
        } else {
          setIsAuthorized(false);
        }
      } else {
        // Verifica expiração
        const data = snapshot.docs[0].data();
        if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
          localStorage.removeItem("israel_access_token");
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      }
    }, (error) => {
      console.error("Erro no monitor de acesso:", error);
    });

    return () => unsubscribe();
  }, [db, isAuthorized, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !db) return;

    setLoading(true);
    try {
      const q = query(collection(db, "access_codes"), where("code", "==", code.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({ variant: "destructive", title: "CÓDIGO INVÁLIDO" });
        setLoading(false);
        return;
      }

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();

      const sessionStart = new Date().toISOString();
      const dailyLimit = data.dailyLimit || 50;

      if (data.usedAt && data.expiresAt) {
        if (new Date() > new Date(data.expiresAt)) {
          toast({ variant: "destructive", title: "CÓDIGO EXPIRADO" });
          setLoading(false);
          return;
        }
        localStorage.setItem("israel_access_token", code.toUpperCase());
        localStorage.setItem("israel_access_expires", data.expiresAt);
        localStorage.setItem("israel_session_start", sessionStart);
        localStorage.setItem("israel_daily_limit", dailyLimit.toString());
        setIsAuthorized(true);
      } else {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const expiresAtStr = expiresAt.toISOString();

        const updateData = {
          usedAt: new Date().toISOString(),
          expiresAt: expiresAtStr
        };

        await updateDoc(doc(db, "access_codes", docSnap.id), updateData);

        localStorage.setItem("israel_access_token", code.toUpperCase());
        localStorage.setItem("israel_access_expires", expiresAtStr);
        localStorage.setItem("israel_session_start", sessionStart);
        localStorage.setItem("israel_daily_limit", dailyLimit.toString());
        setIsAuthorized(true);
        toast({
          title: "ACESSO LIBERADO",
          className: "bg-blue-600 border-none text-white font-black rounded-2xl",
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "ERRO DE CONEXÃO" });
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-8 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="bg-blue-600 p-4 rounded-[2.5rem] shadow-xl shadow-blue-100 inline-block mb-4">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-blue-900 tracking-tighter uppercase">ÁREA PROTEGIDA</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest px-8 leading-relaxed">
            MONITORAMENTO DE CODIGOS
          </p>
        </div>

        <Card className="w-full bg-white border-none rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.05)] overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Código de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="DIGITE SEU CÓDIGO"
                    className="h-16 pl-14 pr-6 rounded-[24px] border-blue-50 bg-slate-50 font-black text-blue-900 placeholder:text-slate-300 focus:ring-blue-600 border-2"
                  />
                </div>
              </div>

              <Button 
                disabled={loading}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[24px] text-lg shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "ENTRAR NO SISTEMA"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <footer className="text-center">
          <p className="text-[9px] font-black text-blue-200 uppercase tracking-[0.5em]">SISTEMA RECEPTOR ISRAEL V4</p>
        </footer>
      </div>
    );
  }

  return <>{children}</>;
}
