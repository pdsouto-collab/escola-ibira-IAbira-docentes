"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn, AlertCircle, Loader2, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const role = data.user.role;
        if (role === "DIRETOR") {
          router.push("/diretoria");
        } else if (role === "ADMIN") {
          router.push("/admin/users");
        } else {
          router.push(callbackUrl);
        }
      } else {
        setError(data.error || "E-mail ou senha incorretos.");
      }
    } catch (err) {
      setError("Erro de conexão. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#e3d8c8] p-8 relative z-10 flex flex-col items-center">
      {/* logo */}
      <div className="mb-6 flex flex-col items-center text-center">
        <img 
          src="/iabira_docentes_logo.png" 
          alt="Escola Ibirá Logo" 
          className="h-44 w-auto object-contain mb-4"
        />
        <p className="text-xs text-[#7c8b80] mt-1 flex items-center gap-1">
          <Leaf size={12} className="text-[#8fb39c]" /> Portal de Inteligência Pedagógica
        </p>
      </div>

      <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1.5 ml-1">E-mail</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#7c8b80]">
              <Mail size={16} />
            </span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="professor@escolaibira.com"
              className="pl-10 bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] h-11 text-sm rounded-xl"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1.5 ml-1">Senha</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#7c8b80]">
              <Lock size={16} />
            </span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] h-11 text-sm rounded-xl"
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-100 flex items-start gap-2 animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#2A4B3A] hover:bg-[#1e3529] text-white h-11 rounded-xl shadow-md font-semibold transition-all duration-200 flex items-center justify-center gap-2 mt-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Entrando...
            </>
          ) : (
            <>
              <LogIn size={18} /> Acessar Portal
            </>
          )}
        </Button>
      </form>


    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f2efe9] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#8fb39c]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#e8a375]/10 blur-3xl pointer-events-none" />

      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#e3d8c8] p-8 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 size={36} className="animate-spin text-[#8fb39c]" />
          <p className="text-sm text-gray-500 mt-2">Carregando portal...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
