"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut, Shield, Settings, Key, UserCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoggedUser = {
  id: string;
  nome: string;
  sobrenome: string | null;
  email: string;
  role: "EDUCADOR" | "DIRETOR" | "ADMIN";
};

export default function UserMenu() {
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Profile Form States
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Load logged user
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setNome(data.user.nome);
          setSobrenome(data.user.sobrenome || "");
          setEmail(data.user.email);
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };
    fetchUser();
  }, []);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setError("Nome e E-mail são obrigatórios.");
      return;
    }

    if (password && password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, sobrenome, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Perfil atualizado com sucesso!");
        setUser(data.user);
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setModalOpen(false);
          setSuccess("");
        }, 1500);
      } else {
        setError(data.error || "Erro ao atualizar perfil.");
      }
    } catch (err) {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = `${user.nome[0] || ""}${user.sobrenome ? user.sobrenome[0] || "" : ""}`.toUpperCase();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN": return "Administrador";
      case "DIRETOR": return "Diretora Pedagógica";
      default: return "Professora";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 p-1.5 px-3 rounded-full hover:bg-black/5 transition-all text-left outline-none border border-transparent focus:border-black/10"
      >
        <div className="w-8 h-8 rounded-full bg-[#4a5d4e] text-white flex items-center justify-center font-bold text-xs shadow-inner">
          {initials || <User size={14} />}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-[#4a5d4e] leading-tight">{user.nome} {user.sobrenome}</div>
          <div className="text-[10px] text-[#7c8b80] leading-none mt-0.5">{getRoleBadge(user.role)}</div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#e3d8c8] py-2 z-50 text-sm">
          <div className="px-4 py-2 border-b border-[#f2efe9] mb-1">
            <p className="font-bold text-[#4a5d4e]">{user.nome} {user.sobrenome}</p>
            <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            <span className="inline-block bg-[#f2efe9] text-[#4a5d4e] text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 border border-[#e3d8c8]/50">
              {getRoleBadge(user.role)}
            </span>
          </div>

          <button
            onClick={() => {
              setDropdownOpen(false);
              setModalOpen(true);
            }}
            className="w-full text-left px-4 py-2 hover:bg-[#fcfaf7] text-gray-700 flex items-center gap-2"
          >
            <Settings size={15} className="text-[#8fb39c]" />
            Editar Meus Dados
          </button>

          {user.role === "ADMIN" && (
            <button
              onClick={() => {
                setDropdownOpen(false);
                window.location.href = "/admin/users";
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#fcfaf7] text-gray-700 flex items-center gap-2"
            >
              <Shield size={15} className="text-[#e8a375]" />
              Painel do Administrador
            </button>
          )}

          <div className="border-t border-[#f2efe9] my-1"></div>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-[#fcfaf7] text-red-600 flex items-center gap-2 font-medium"
          >
            <LogOut size={15} />
            Logoff / Sair
          </button>
        </div>
      )}

      {/* Modal: Edit Profile */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e3d8c8] overflow-hidden animate-scaleIn">
            <header className="bg-[#fcfaf7] border-b border-[#e3d8c8] p-5 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#4a5d4e]">
                <UserCheck size={20} className="text-[#8fb39c]" />
                <h3 className="font-bold text-lg">Editar Meus Dados</h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-[#f2efe9] rounded-lg"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleUpdateProfile} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Nome</label>
                  <Input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Sobrenome</label>
                  <Input
                    type="text"
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                  required
                />
              </div>

              <div className="border-t border-[#f2efe9] pt-3 mt-1">
                <p className="text-xs font-bold text-[#e8a375] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Key size={12} /> Alterar Senha (Opcional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#4a5d4e] uppercase mb-1">Nova Senha</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#4a5d4e] uppercase mb-1">Confirmar Senha</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 mt-2">
                  {error}
                </p>
              )}

              {success && (
                <p className="text-xs text-green-700 font-semibold bg-green-50 p-2.5 rounded-lg border border-green-100 mt-2">
                  {success}
                </p>
              )}

              <footer className="flex justify-end gap-2 border-t border-[#f2efe9] pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#e3d8c8] text-gray-500 hover:bg-[#f2efe9] h-9 text-xs"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white h-9 text-xs flex items-center gap-1.5"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
