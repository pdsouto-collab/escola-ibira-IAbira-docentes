"use client";

import { useState, useEffect } from "react";
import { UserPlus, Edit3, Trash2, Shield, ArrowLeft, Loader2, Plus, Mail, Lock, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/UserMenu";

type AdminUser = {
  id: string;
  nome: string;
  sobrenome: string | null;
  email: string;
  role: "EDUCADOR" | "DIRETOR" | "ADMIN";
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EDUCADOR" | "DIRETOR" | "ADMIN">("EDUCADOR");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editSobrenome, setEditSobrenome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState(""); // optional password reset
  const [editRole, setEditRole] = useState<"EDUCADOR" | "DIRETOR" | "ADMIN">("EDUCADOR");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        console.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !password.trim()) {
      setCreateError("Nome, e-mail e senha são obrigatórios.");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, sobrenome, email, password, role }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        // Reset form
        setNome("");
        setSobrenome("");
        setEmail("");
        setPassword("");
        setRole("EDUCADOR");
        fetchUsers();
      } else {
        setCreateError(data.error || "Erro ao criar usuário.");
      }
    } catch (err) {
      setCreateError("Erro de conexão com o servidor.");
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (u: AdminUser) => {
    setEditId(u.id);
    setEditNome(u.nome);
    setEditSobrenome(u.sobrenome || "");
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword("");
    setEditError("");
    setEditOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNome.trim() || !editEmail.trim()) {
      setEditError("Nome e e-mail são obrigatórios.");
      return;
    }

    setUpdating(true);
    setEditError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          nome: editNome,
          sobrenome: editSobrenome,
          email: editEmail,
          password: editPassword,
          role: editRole
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditOpen(false);
        fetchUsers();
      } else {
        setEditError(data.error || "Erro ao atualizar usuário.");
      }
    } catch (err) {
      setEditError("Erro de conexão com o servidor.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Tem certeza de que deseja excluir o usuário "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir usuário.");
      }
    } catch (err) {
      alert("Erro de conexão com o servidor.");
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case "ADMIN": return "bg-red-50 text-red-700 border-red-200";
      case "DIRETOR": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case "ADMIN": return "Administrador";
      case "DIRETOR": return "Diretora Pedagógica";
      default: return "Professora";
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.sobrenome && u.sobrenome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f2efe9] font-sans">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#4a5d4e] text-white flex flex-col p-6 shadow-xl z-10">
        <div className="mb-10 font-bold text-xl tracking-tight text-[#e8a375]">
          Escola Ibirá
          <span className="block text-sm font-normal text-[#8fb39c]">Painel de Controle</span>
        </div>
        <nav className="flex flex-col gap-2">
          <div className="p-3 bg-[#394a3d] rounded-lg text-sm font-medium flex items-center justify-between">
            Gerenciar Usuários
            <span className="bg-[#e8a375] text-white text-xs px-2 py-0.5 rounded-full">
              {users.length}
            </span>
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70" onClick={() => window.location.href = '/'}>
            Portal do Educador
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70" onClick={() => window.location.href = '/diretoria'}>
            Portal da Diretoria
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#2A4B3A]">Administração de Usuários</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-[#e8a375] hover:bg-[#d49164] text-white flex items-center gap-1.5 shadow-sm transition-all"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlus size={16} /> Novo Usuário
            </Button>
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-10 overflow-y-auto max-w-6xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e3d8c8] overflow-hidden flex flex-col">
            
            {/* Filtro e Busca */}
            <div className="p-6 border-b border-[#f2efe9] bg-[#fcfaf7] flex justify-between items-center gap-4">
              <div className="w-72">
                <Input
                  type="text"
                  placeholder="Pesquisar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border-[#e3d8c8] focus-visible:ring-[#8fb39c]"
                />
              </div>
              <div className="text-xs text-gray-500 font-medium">
                Mostrando {filteredUsers.length} de {users.length} usuários
              </div>
            </div>

            {/* Listagem */}
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-gray-500">
                <Loader2 size={36} className="animate-spin text-[#8fb39c]" />
                <p>Carregando usuários cadastrados...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 italic border-t">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#fcfaf7] border-b border-[#e3d8c8] text-xs font-bold text-[#4a5d4e] uppercase tracking-wider">
                      <th className="p-4 pl-6">Nome</th>
                      <th className="p-4">E-mail</th>
                      <th className="p-4">Perfil</th>
                      <th className="p-4">Cadastrado em</th>
                      <th className="p-4 pr-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2efe9]">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#fcfaf7]/50 transition-colors text-sm text-gray-700">
                        <td className="p-4 pl-6 font-semibold text-[#4a5d4e]">
                          {u.nome} {u.sobrenome}
                        </td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">
                          <span className={`inline-block border px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="p-1.5 text-gray-400 hover:text-[#e8a375] hover:bg-[#f2efe9] rounded-lg transition-colors"
                              title="Editar Usuário"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, `${u.nome} ${u.sobrenome || ""}`)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-[#f2efe9] rounded-lg transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal: Criar Usuário */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e3d8c8] overflow-hidden animate-scaleIn">
            <header className="bg-[#fcfaf7] border-b border-[#e3d8c8] p-5 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#4a5d4e]">
                <UserPlus size={20} className="text-[#8fb39c]" />
                <h3 className="font-bold text-lg">Criar Novo Usuário</h3>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-[#f2efe9] rounded-lg">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleCreateUser} className="p-6 flex flex-col gap-4">
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
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Senha Inicial</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9 bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Perfil / Função</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full border border-[#e3d8c8] rounded-md p-2 bg-[#fcfaf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#8fb39c] h-9"
                >
                  <option value="EDUCADOR">Professora (Educador)</option>
                  <option value="DIRETOR">Diretora Pedagógica (Diretor)</option>
                  <option value="ADMIN">Administrador (Admin)</option>
                </select>
              </div>

              {createError && (
                <p className="text-xs text-red-500 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 mt-2">
                  {createError}
                </p>
              )}

              <footer className="flex justify-end gap-2 border-t border-[#f2efe9] pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#e3d8c8] text-gray-500 hover:bg-[#f2efe9] h-9 text-xs"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white h-9 text-xs"
                  disabled={creating}
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : "Criar Usuário"}
                </Button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuário */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#e3d8c8] overflow-hidden animate-scaleIn">
            <header className="bg-[#fcfaf7] border-b border-[#e3d8c8] p-5 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#4a5d4e]">
                <UserCheck size={20} className="text-[#e8a375]" />
                <h3 className="font-bold text-lg">Editar Usuário</h3>
              </div>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-[#f2efe9] rounded-lg">
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleUpdateUser} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Nome</label>
                  <Input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Sobrenome</label>
                  <Input
                    type="text"
                    value={editSobrenome}
                    onChange={(e) => setEditSobrenome(e.target.value)}
                    className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">E-mail</label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Alterar Senha (Opcional)</label>
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a atual"
                  className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] text-sm h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4a5d4e] uppercase mb-1">Perfil / Função</label>
                <select
                  value={editRole}
                  onChange={(e: any) => setEditRole(e.target.value)}
                  className="w-full border border-[#e3d8c8] rounded-md p-2 bg-[#fcfaf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#8fb39c] h-9"
                >
                  <option value="EDUCADOR">Professora (Educador)</option>
                  <option value="DIRETOR">Diretora Pedagógica (Diretor)</option>
                  <option value="ADMIN">Administrador (Admin)</option>
                </select>
              </div>

              {editError && (
                <p className="text-xs text-red-500 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 mt-2">
                  {editError}
                </p>
              )}

              <footer className="flex justify-end gap-2 border-t border-[#f2efe9] pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#e3d8c8] text-gray-500 hover:bg-[#f2efe9] h-9 text-xs"
                  onClick={() => setEditOpen(false)}
                  disabled={updating}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white h-9 text-xs"
                  disabled={updating}
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : "Salvar Alterações"}
                </Button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
