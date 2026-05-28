
"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

interface AccessGuardProps {
  children: React.ReactNode;
}

export function AccessGuard({ children }: AccessGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  useEffect(() => {
    const checkAccess = async () => {
      const savedCode = localStorage.getItem("israel_access_token");
      const expiresAt = localStorage.getItem("israel_access_expires");

      if (savedCode && expiresAt) {
        if (new Date() > new Date(expiresAt)) {
          localStorage.removeItem("israel_access_token");
          localStorage.removeItem("israel_access_expires");
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
      } else {
        setIsAuthorized(false);
      }
    };
    checkAccess();
  }, []);

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

      if (data.usedAt && data.expiresAt) {
        if (new Date() > new Date(data.expiresAt)) {
          toast({ variant: "destructive", title: "CÓDIGO EXPIRADO" });
          setLoading(false);
          return;
        }
        localStorage.setItem("israel_access_token", code.toUpperCase());
        localStorage.setItem("israel_access_expires", data.expiresAt);
        setIsAuthorized(true);
      } else {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const expiresAtStr = expiresAt.toISOString();

        await updateDoc(doc(db, "access_codes", docSnap.id), {
          usedAt: new Date().toISOString(),
          expiresAt: expiresAtStr
        });

        localStorage.setItem("israel_access_token", code.toUpperCase());
        localStorage.setItem("israel_access_expires", expiresAtStr);
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
            Insira seu código de acesso para entrar no monitoramento tático.
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
