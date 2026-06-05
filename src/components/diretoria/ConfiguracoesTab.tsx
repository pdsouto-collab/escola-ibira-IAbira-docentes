"use client";

import { useState, useEffect } from "react";
import { Edit3, Trash2, Plus, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Subcategory = {
  id: string;
  name: string;
  year: string;
};

export default function ConfiguracoesTab() {
  const [years] = useState(["Infantil", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"]);
  const [selectedYear, setSelectedYear] = useState("Infantil");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for adding
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // States for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // State for deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubcategories();
  }, [selectedYear]);

  const fetchSubcategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subcategories?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.subcategories || []);
      }
    } catch (error) {
      console.error("Erro ao carregar sub-categorias:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, year: selectedYear }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewName("");
        fetchSubcategories();
      } else {
        setAddError(data.error || "Erro ao adicionar sub-categoria.");
      }
    } catch (error) {
      setAddError("Erro de conexão ao adicionar.");
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (sub: Subcategory) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditError("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    setUpdating(true);
    setEditError("");
    try {
      const res = await fetch("/api/subcategories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setEditName("");
        fetchSubcategories();
      } else {
        setEditError(data.error || "Erro ao atualizar sub-categoria.");
      }
    } catch (error) {
      setEditError("Erro de conexão ao atualizar.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta sub-categoria? Vivências que já usam esta tag não serão deletadas, mas ela não estará disponível para novas vivências.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/subcategories?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchSubcategories();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir sub-categoria.");
      }
    } catch (error) {
      alert("Erro de conexão ao excluir.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex-1 p-10 overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e3d8c8] p-8 flex flex-col gap-8">
        
        {/* Seletor de Ano */}
        <div>
          <label className="block text-sm font-bold text-[#4a5d4e] mb-2">Selecione o Ano Escolar</label>
          <div className="flex gap-2 flex-wrap">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  selectedYear === y
                    ? "bg-[#4a5d4e] text-white border-[#4a5d4e] shadow-sm"
                    : "bg-[#fcfaf7] text-[#4a5d4e] border-[#e3d8c8] hover:bg-[#f2efe9]"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#f2efe9] pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Form de Adicionar */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#4a5d4e]">Adicionar Sub-categoria</h2>
            <p className="text-xs text-gray-500">
              Adicione uma nova disciplina ou área de conhecimento para a classificação do <strong>{selectedYear}</strong>.
            </p>
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Geografia, Música..."
                className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c] flex-1"
                disabled={adding}
              />
              <Button 
                type="submit" 
                className="bg-[#e8a375] hover:bg-[#d49164] text-white flex items-center gap-1.5 shrink-0"
                disabled={adding || !newName.trim()}
              >
                {adding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} /> Adicionar
                  </>
                )}
              </Button>
            </form>
            {addError && <p className="text-xs text-red-500 font-medium">{addError}</p>}
          </div>

          {/* Listagem e Edição */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#4a5d4e]">Sub-categorias Atuais ({selectedYear})</h2>
            
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#7c8b80] py-6">
                <Loader2 size={18} className="animate-spin text-[#8fb39c]" />
                Carregando categorias...
              </div>
            ) : subcategories.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-6">Nenhuma sub-categoria cadastrada para este ano.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2">
                {subcategories.map((sub) => {
                  const isEditing = editingId === sub.id;
                  const isDeleting = deletingId === sub.id;

                  return (
                    <div 
                      key={sub.id} 
                      className="flex items-center justify-between p-3 rounded-xl border border-[#e3d8c8] bg-[#fcfaf7] hover:shadow-sm transition-all"
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex gap-2 w-full">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-white border-[#e3d8c8] focus-visible:ring-[#8fb39c] flex-1 text-sm h-9"
                              disabled={updating}
                              autoFocus
                            />
                            <Button 
                              size="sm"
                              className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white p-2 h-9 w-9"
                              onClick={() => handleUpdate(sub.id)}
                              disabled={updating || !editName.trim()}
                            >
                              {updating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={16} />
                              )}
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              className="border-[#e3d8c8] hover:bg-[#f2efe9] text-gray-500 p-2 h-9 w-9"
                              onClick={handleCancelEdit}
                              disabled={updating}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                          {editError && <p className="text-[10px] text-red-500 font-medium">{editError}</p>}
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-[#4a5d4e]">{sub.name}</span>
                          <div className="flex gap-1.5">
                            <button 
                              className="p-1.5 text-gray-400 hover:text-[#e8a375] hover:bg-white rounded transition-all"
                              onClick={() => handleStartEdit(sub)}
                              disabled={isDeleting}
                              title="Editar nome"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button 
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded transition-all"
                              onClick={() => handleDelete(sub.id)}
                              disabled={isDeleting}
                              title="Excluir sub-categoria"
                            >
                              {isDeleting ? (
                                <Loader2 size={15} className="animate-spin text-red-500" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
