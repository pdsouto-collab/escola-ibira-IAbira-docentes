"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";
import { Send, Leaf, Sparkles, BookOpen, Plus, Trash2, FolderOpen, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import UserMenu from "@/components/UserMenu";

export default function EducatorPortal() {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionStatus, setSessionStatus] = useState<string>("BRIEFING");
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "editor">("chat");

  const { messages, setMessages, input, setInput, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: { sessionId }
  });

  const [finalContent, setFinalContent] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestratorError, setOrchestratorError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Estados de Memória (Preferências do Educador)
  const [preferences, setPreferences] = useState("");
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [tempPrefs, setTempPrefs] = useState("");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [showPrefsWidget, setShowPrefsWidget] = useState(false);

  // Estados de feedback ativo
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Helper para gerar UUIDv4
  const generateUUID = () => {
    if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Buscar preferências no banco ao montar a tela
  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/agent/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || "");
        setTempPrefs(data.preferences || "");
      }
    } catch (err) {
      console.error("Erro ao buscar preferências:", err);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/agent/sessions?id=${id}`);
      if (!res.ok) throw new Error("Erro ao buscar sessão");
      const data = await res.json();
      const session = data.session;
      
      const reconstructedMessages: any[] = [];
      if (session.agentLogs) {
        session.agentLogs
          .filter((log: any) => log.agentName === 'ESCUTADOR')
          .forEach((log: any) => {
            reconstructedMessages.push({
              id: `${log.id}-user`,
              role: 'user',
              content: log.input
            });
            reconstructedMessages.push({
              id: `${log.id}-assistant`,
              role: 'assistant',
              content: log.output
            });
          });
      }
      
      setSessionId(session.id);
      setSessionStatus(session.status);
      setFinalContent(session.finalContent?.content || "");
      setTema(session.tema || "");
      
      if (session.classifications) {
        setClassifications(session.classifications.map((c: any) => ({
          year: c.year,
          subcategory: c.subcategory
        })));
      } else {
        setClassifications([]);
      }
      
      setMessages(reconstructedMessages);
      setInput("");
      
      if (typeof window !== "undefined") {
        localStorage.setItem("iabira_current_session_id", session.id);
      }
    } catch (err) {
      console.error("Erro ao carregar sessão:", err);
      if (typeof window !== "undefined") {
        localStorage.removeItem("iabira_current_session_id");
      }
      throw err;
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/agent/sessions");
      if (res.ok) {
        const data = await res.json();
        setSavedSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Erro ao listar sessões:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleNewSession = () => {
    const newId = generateUUID();
    setSessionId(newId);
    setSessionStatus("BRIEFING");
    setMessages([]);
    setFinalContent("");
    setTema("");
    setClassifications([]);
    setInput("");
    if (typeof window !== "undefined") {
      localStorage.setItem("iabira_current_session_id", newId);
    }
    setSessionsModalOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta vivência permanentemente?")) {
      return;
    }
    try {
      const res = await fetch(`/api/agent/sessions?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Vivência excluída com sucesso!");
        fetchSessions();
        if (id === sessionId) {
          handleNewSession();
        }
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir vivência");
      }
    } catch (err) {
      console.error("Erro ao excluir sessão:", err);
      alert("Erro de conexão ao excluir.");
    }
  };

  useEffect(() => {
    fetchPreferences();
    
    const storedId = localStorage.getItem("iabira_current_session_id");
    if (storedId) {
      loadSession(storedId).catch((err) => {
        console.warn("Sessão salva não encontrada, iniciando nova.", err);
        const newId = generateUUID();
        setSessionId(newId);
        localStorage.setItem("iabira_current_session_id", newId);
      });
    } else {
      const newId = generateUUID();
      setSessionId(newId);
      localStorage.setItem("iabira_current_session_id", newId);
    }
  }, []);

  useEffect(() => {
    if (sessionsModalOpen) {
      fetchSessions();
    }
  }, [sessionsModalOpen]);

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await fetch("/api/agent/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: tempPrefs }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || "");
        setIsEditingPrefs(false);
      }
    } catch (err) {
      console.error("Erro ao salvar preferências:", err);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleResetPreferences = async () => {
    if (!confirm("Tem certeza que deseja limpar toda a memória de preferências do assistente? Isso não poderá ser desfeito.")) {
      return;
    }
    try {
      const res = await fetch("/api/agent/preferences", {
        method: "DELETE",
      });
      if (res.ok) {
        setPreferences("");
        setTempPrefs("");
        setIsEditingPrefs(false);
        alert("Memória do assistente redefinida com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao resetar preferências:", err);
    }
  };

  const handleSubmitFeedback = async (rating: number) => {
    if (rating === 1) {
      setIsSubmittingFeedback(true);
      try {
        const res = await fetch("/api/agent/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            rating: 1,
            comment: "Gostei da proposta gerada.",
          }),
        });
        if (res.ok) {
          setFeedbackSubmitted(true);
          setFeedbackRating(1);
          fetchPreferences(); // Atualiza a memória na tela imediatamente
        }
      } catch (err) {
        console.error("Erro ao enviar feedback positivo:", err);
      } finally {
        setIsSubmittingFeedback(false);
      }
    } else {
      setFeedbackRating(-1);
    }
  };

  const handleSendNegativeFeedback = async () => {
    if (!feedbackComment.trim()) {
      alert("Por favor, digite seu comentário indicando o que melhorar.");
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch("/api/agent/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating: -1,
          comment: feedbackComment,
        }),
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
        fetchPreferences(); // Atualiza a memória na tela imediatamente
      }
    } catch (err) {
      console.error("Erro ao enviar feedback negativo:", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Estados de classificação e Tema
  const [tema, setTema] = useState("");
  const [classifications, setClassifications] = useState<{ year: string; subcategory: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState("Infantil");
  const [selectedSub, setSelectedSub] = useState("");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const faixasAnos = ["Infantil", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];

  useEffect(() => {
    const fetchSubCategories = async () => {
      setLoadingSubs(true);
      try {
        const res = await fetch(`/api/subcategories?year=${selectedYear}`);
        if (res.ok) {
          const data = await res.json();
          const names = data.subcategories.map((s: any) => s.name);
          setSubCategories(names);
          if (names.length > 0) {
            setSelectedSub(names[0]);
          } else {
            setSelectedSub("");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar sub-categorias:", error);
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubCategories();
  }, [selectedYear]);

  const handleAddClassification = () => {
    const exists = classifications.some(c => c.year === selectedYear && c.subcategory === selectedSub);
    if (!exists) {
      setClassifications([...classifications, { year: selectedYear, subcategory: selectedSub }]);
    }
  };

  const handleRemoveClassification = (index: number) => {
    setClassifications(classifications.filter((_, idx) => idx !== index));
  };

  const handleSave = async (action: "draft" | "approve") => {
    if (!finalContent) return;
    if (!tema.trim()) {
      alert("Por favor, preencha o Tema/Título da vivência antes de salvar.");
      return;
    }

    let activeClassifications = [...classifications];
    if (
      activeClassifications.length === 0 &&
      selectedYear &&
      selectedSub &&
      selectedSub !== "Carregando..." &&
      selectedSub !== "Nenhuma sub-categoria"
    ) {
      const defaultClass = { year: selectedYear, subcategory: selectedSub };
      activeClassifications = [defaultClass];
      setClassifications([defaultClass]);
    }

    if (activeClassifications.length === 0) {
      alert("Por favor, adicione pelo menos uma classificação de ano/sub-categoria.");
      return;
    }

    if (action === "draft") setIsSavingDraft(true);
    else setIsSubmittingApproval(true);
    setOrchestratorError(null);

    try {
      const res = await fetch("/api/agent/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          content: finalContent,
          action,
          tema,
          classifications: activeClassifications,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar proposta");
      }

      if (action === "draft") {
        setSessionStatus("GERADO");
        alert("Rascunho salvo com sucesso!");
      } else {
        setSessionStatus("AGUARDANDO_DIRETORIA");
        alert("Vivência enviada para aprovação da diretoria!");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ocorreu um erro ao salvar.");
    } finally {
      setIsSavingDraft(false);
      setIsSubmittingApproval(false);
    }
  };

  // Gatilho para O Criador & O Revisor
  const handleGenerateProposal = async () => {
    setIsOrchestrating(true);
    setOrchestratorError(null);
    setFinalContent("");
    setTema("");
    setClassifications([]);
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackSubmitted(false);
    try {
      const res = await fetch("/api/agent/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro no servidor (Status ${res.status})`);
      }

      if (!res.body) {
        throw new Error("O servidor não retornou um corpo de transmissão válido.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          text += chunk;
          setFinalContent(text);
        }
      }
      setSessionStatus(text.toLowerCase().includes('projeto') ? 'AGUARDANDO_DIRETORIA' : 'REVISADO');
    } catch (error: any) {
      console.error("Erro ao orquestrar agentes", error);
      setOrchestratorError(error.message || "Erro de rede ou conexão.");
    } finally {
      setIsOrchestrating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#fcfaf7] font-sans relative overflow-hidden">
      {/* Barra de abas mobile */}
      <div className="flex md:hidden border-b border-[#e3d8c8] bg-white w-full sticky top-0 z-30 shrink-0">
        <button
          onClick={() => setActiveMobileTab("chat")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
            activeMobileTab === "chat" 
              ? "border-[#8fb39c] text-[#4a5d4e] bg-[#faf8f4]/50" 
              : "border-transparent text-gray-400"
          }`}
        >
          O Escutador
        </button>
        <button
          onClick={() => setActiveMobileTab("editor")}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
            activeMobileTab === "editor" 
              ? "border-[#8fb39c] text-[#4a5d4e] bg-[#faf8f4]/50" 
              : "border-transparent text-gray-400"
          }`}
        >
          Plano de Vivência
        </button>
      </div>

      {/* LADO ESQUERDO: O ESCUTADOR (Chat) */}
      <div className={`w-full md:w-1/3 flex-col border-r border-[#e3d8c8] bg-white shadow-sm ${
        activeMobileTab === "chat" ? "flex h-[calc(100vh-50px)] md:h-screen" : "hidden md:flex"
      }`}>
        <div className="p-6 border-b border-[#e3d8c8] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8fb39c] flex items-center justify-center text-white">
            <Leaf size={20} />
          </div>
          <div className="flex-1">
            <header className="flex flex-wrap justify-between items-center gap-2">
              <h1 className="font-bold text-[#4a5d4e] text-lg">O Escutador</h1>
              <div className="flex gap-1.5 flex-wrap">
                <Button className="bg-[#e8a375] hover:bg-[#d49164] text-white shadow-sm transition-all text-xs px-2.5 h-8" size="sm" onClick={() => window.location.href = '/biblioteca'}>Biblioteca</Button>
                <Button className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white shadow-sm transition-all text-xs px-2.5 h-8" size="sm" onClick={() => window.location.href = '/diretoria'}>Diretoria</Button>
                <Button className="bg-[#6d8a77] hover:bg-[#5a7363] text-white shadow-sm transition-all text-xs px-2.5 h-8" size="sm" onClick={() => setSessionsModalOpen(true)}>Vivências</Button>
              </div>
            </header>
            <p className="text-xs text-[#7c8b80] mt-1">Briefing Dinâmico e Intencionalidade</p>
          </div>
        </div>

        {/* WIDGET: Memória do Assistente */}
        <div className="border-b border-[#e3d8c8] bg-[#faf8f4] p-4 text-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowPrefsWidget(!showPrefsWidget)}
              className="flex items-center gap-2 font-semibold text-[#4a5d4e] hover:text-[#394a3d] transition-all"
            >
              <Leaf size={16} className="text-[#8fb39c]" />
              <span>Memória do Assistente {preferences ? '🧠' : '✨'}</span>
            </button>
            <div className="flex gap-2">
              {preferences && (
                <button 
                  onClick={handleResetPreferences} 
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Limpar
                </button>
              )}
              <button 
                onClick={() => {
                  setIsEditingPrefs(!isEditingPrefs);
                  setTempPrefs(preferences);
                  setShowPrefsWidget(true);
                }} 
                className="text-xs text-[#6d8a77] hover:text-[#4a5d4e] font-medium"
              >
                {isEditingPrefs ? "Cancelar" : "Editar"}
              </button>
            </div>
          </div>

          {showPrefsWidget && (
            <div className="mt-3 bg-white p-3 rounded-lg border border-[#e3d8c8] shadow-inner">
              {isEditingPrefs ? (
                <div className="flex flex-col gap-2">
                  <Textarea 
                    value={tempPrefs}
                    onChange={(e) => setTempPrefs(e.target.value)}
                    placeholder="Ex: - Prefere atividades que foquem no ciclo da natureza..."
                    className="min-h-[100px] text-xs font-mono bg-[#fcfaf7] border-[#e3d8c8]"
                  />
                  <Button 
                    onClick={handleSavePreferences}
                    disabled={isSavingPrefs}
                    size="sm"
                    className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white self-end text-xs"
                  >
                    {isSavingPrefs ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              ) : (
                <div>
                  {preferences ? (
                    <div className="text-xs text-[#4a5d4e] whitespace-pre-line leading-relaxed">
                      {preferences}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      O assistente ainda não aprendeu suas preferências. Conforme você der feedback nas propostas geradas, ele registrará seus gostos e estilos aqui de forma automática!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="flex flex-col gap-4">
            <div className="bg-[#f2efe9] text-[#4a5d4e] p-3 rounded-2xl rounded-tl-sm self-start max-w-[85%] text-sm">
              Olá! Sou O Escutador. Que tema e faixa etária das crianças vamos explorar esta semana inspirados pela natureza?
            </div>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                  m.role === "user"
                    ? "bg-[#6d8a77] text-white rounded-tr-sm self-end"
                    : "bg-[#f2efe9] text-[#4a5d4e] rounded-tl-sm self-start"
                }`}
              >
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-[#8fb39c] self-start ml-2 flex items-center gap-2">
                <Sparkles size={12} className="animate-pulse" />
                O Escutador está refletindo...
              </div>
            )}
            {error && (
              <div className="bg-red-100 text-red-600 p-3 rounded-2xl max-w-[85%] text-sm self-start">
                <strong>Erro:</strong> Não foi possível conectar. Detalhes: {error.message || "Erro desconhecido"}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t border-[#e3d8c8]">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Descreva as percepções das crianças..."
              className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c]"
            />
            <Button type="submit" size="icon" className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white">
              <Send size={18} />
            </Button>
          </form>
          <Button 
            onClick={handleGenerateProposal}
            disabled={messages.length === 0 || isOrchestrating}
            className="w-full mt-3 bg-[#e8a375] hover:bg-[#d49164] text-white font-medium"
          >
            {isOrchestrating ? (
              <span className="flex items-center gap-2"><Sparkles className="animate-spin" size={16} /> Cocriando Vivência...</span>
            ) : (
              "Gerar Proposta Pedagógica (Criador)"
            )}
          </Button>
        </div>
      </div>

      {/* LADO DIREITO: EDITOR RICO (O Criador & Revisor) */}
      <div className={`w-full md:w-2/3 flex-col bg-[#fcfaf7] ${
        activeMobileTab === "editor" ? "flex h-[calc(100vh-50px)] md:h-screen" : "hidden md:flex"
      }`}>
        <div className="p-4 md:p-6 border-b border-[#e3d8c8] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e8a375] flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#4a5d4e] text-lg">Plano de Vivência</h2>
                {sessionStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    sessionStatus === "APROVADO" 
                      ? "bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]"
                      : sessionStatus === "AGUARDANDO_DIRETORIA"
                      ? "bg-[#fff3e0] text-[#e65100] border-[#ffe0b2]"
                      : sessionStatus === "REVISADO"
                      ? "bg-[#f3e5f5] text-[#4a148c] border-[#e1bee7]"
                      : sessionStatus === "GERADO"
                      ? "bg-[#e3f2fd] text-[#0d47a1] border-[#bbdefb]"
                      : "bg-[#efebe9] text-[#4e342e] border-[#d7ccc8]"
                  }`}>
                    {sessionStatus === "APROVADO" && "Aprovado"}
                    {sessionStatus === "AGUARDANDO_DIRETORIA" && "Aguardando Aprovação"}
                    {sessionStatus === "REVISADO" && "Revisado"}
                    {sessionStatus === "GERADO" && "Rascunho"}
                    {sessionStatus === "BRIEFING" && "Briefing"}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7c8b80]">Revisado e Alinhado com a BNCC</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <Button 
              variant="outline" 
              onClick={() => handleSave("draft")}
              disabled={!finalContent || isSavingDraft || isSubmittingApproval || isOrchestrating}
              className="text-[#6d8a77] border-[#6d8a77] hover:bg-[#f2efe9]"
            >
              {isSavingDraft ? "Salvando..." : "Salvar Rascunho"}
            </Button>
            <Button 
              onClick={() => handleSave("approve")}
              disabled={!finalContent || isSavingDraft || isSubmittingApproval || isOrchestrating}
              className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white shadow-md"
            >
              {isSubmittingApproval ? "Enviando..." : "Enviar para Aprovação (Diretoria)"}
            </Button>
            <div className="border-l border-[#e3d8c8] pl-3 ml-1 flex items-center">
              <UserMenu />
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-12 overflow-y-auto">
          {orchestratorError && (
            <div className="max-w-3xl mx-auto bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 shadow-sm">
              <h4 className="font-bold text-sm mb-1">Não foi possível gerar a proposta</h4>
              <p className="text-xs">{orchestratorError}</p>
            </div>
          )}
          {finalContent ? (
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              {/* Card de Configuração */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e3d8c8]">
                <h3 className="text-md font-bold text-[#4a5d4e] mb-4">Configuração da Vivência</h3>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tema / Título da Vivência</label>
                    <Input 
                      value={tema}
                      onChange={(e) => setTema(e.target.value)}
                      placeholder="Digite o título da vivência..."
                      className="bg-[#fcfaf7] border-[#e3d8c8] focus-visible:ring-[#8fb39c]"
                    />
                  </div>
                </div>

                <div className="border-t border-[#f2efe9] pt-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Classificar por Ano e Sub-categoria</label>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1">
                      <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full border border-[#e3d8c8] rounded-md p-2 bg-[#fcfaf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#8fb39c]"
                      >
                        {faixasAnos.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select 
                        value={selectedSub}
                        onChange={(e) => setSelectedSub(e.target.value)}
                        className="w-full border border-[#e3d8c8] rounded-md p-2 bg-[#fcfaf7] text-sm focus:outline-none focus:ring-2 focus:ring-[#8fb39c]"
                        disabled={loadingSubs || subCategories.length === 0}
                      >
                        {loadingSubs ? (
                          <option>Carregando...</option>
                        ) : subCategories.length === 0 ? (
                          <option>Nenhuma sub-categoria</option>
                        ) : (
                          subCategories.map(s => <option key={s} value={s}>{s}</option>)
                        )}
                      </select>
                    </div>
                    <Button 
                      type="button"
                      onClick={handleAddClassification}
                      className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white text-sm"
                    >
                      Adicionar
                    </Button>
                  </div>

                  {/* Classificações Adicionadas */}
                  <div className="flex flex-wrap gap-2">
                    {classifications.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhuma classificação adicionada ainda.</p>
                    ) : (
                      classifications.map((c, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-[#f2efe9] text-[#4a5d4e] px-2.5 py-1 rounded-full text-xs font-medium border border-[#e3d8c8]">
                          {c.year} • {c.subcategory}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveClassification(idx)}
                            className="text-red-500 hover:text-red-700 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* CARD: Loop de Feedback Ativo */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e3d8c8]">
                <h3 className="text-md font-bold text-[#4a5d4e] mb-1 flex items-center gap-2">
                  <Sparkles size={18} className="text-[#e8a375]" />
                  Como avalia esta proposta pedagógica?
                </h3>
                <p className="text-xs text-[#7c8b80] mb-4">
                  Seu feedback ativo calibra e "treina" o assistente de forma personalizada para as próximas gerações.
                </p>

                {feedbackSubmitted ? (
                  <div className="bg-[#f0f7f4] border border-[#d2e6de] text-[#2b593f] p-4 rounded-lg text-sm flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <div>
                      <p className="font-bold">Feedback enviado com sucesso!</p>
                      <p className="text-xs opacity-80">A memória do seu assistente foi atualizada e recalibrada com base nos seus comentários.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                      <Button
                        type="button"
                        onClick={() => handleSubmitFeedback(1)}
                        disabled={isSubmittingFeedback}
                        className={`flex-1 py-3.5 flex items-center justify-center gap-2 border rounded-md transition-all ${
                          feedbackRating === 1 
                            ? "bg-[#6d8a77] text-white border-[#6d8a77] shadow-sm" 
                            : "bg-[#fcfaf7] text-[#4a5d4e] border-[#e3d8c8] hover:bg-[#f2efe9]"
                        }`}
                      >
                        <span className="text-base">👍</span> Gostei do plano
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmitFeedback(-1)}
                        disabled={isSubmittingFeedback}
                        className={`flex-1 py-3.5 flex items-center justify-center gap-2 border rounded-md transition-all ${
                          feedbackRating === -1 
                            ? "bg-[#d97c7c] text-white border-[#d97c7c] shadow-sm" 
                            : "bg-[#fcfaf7] text-[#4a5d4e] border-[#e3d8c8] hover:bg-[#f2efe9]"
                        }`}
                      >
                        <span className="text-base">👎</span> Precisa melhorar
                      </Button>
                    </div>

                    {feedbackRating === -1 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="text-xs font-semibold text-gray-700">
                          O que o assistente deve corrigir ou lembrar da próxima vez?
                        </label>
                        <Textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Ex: Não use bexigas ou plásticos descartáveis. Prefira sementes, argila ou elementos 100% orgânicos. Faltou detalhar a roda de conversa."
                          className="bg-[#fcfaf7] border-[#e3d8c8] text-sm focus-visible:ring-[#8fb39c] min-h-[80px]"
                        />
                        <Button
                          onClick={handleSendNegativeFeedback}
                          disabled={isSubmittingFeedback}
                          className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white self-end text-xs"
                        >
                          {isSubmittingFeedback ? "Processando..." : "Enviar Feedback e Treinar IA"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Documento Markdown */}
              <div className="bg-white p-6 md:p-12 rounded-xl shadow-sm border border-[#e3d8c8] min-h-full">
                {/* Se o educador quiser editar, um Textarea rico pode ser integrado aqui (ex: TipTap). Para mock, usamos react-markdown no view. */}
                <div className="prose prose-stone max-w-none prose-headings:text-[#4a5d4e] prose-h2:border-b-2 prose-h2:border-[#f2efe9] prose-h2:pb-2 prose-p:text-gray-700 prose-li:text-gray-700">
                  <ReactMarkdown>{finalContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto opacity-60">
              <Leaf size={48} className="text-[#8fb39c] mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-[#4a5d4e] mb-2">Folha em Branco</h3>
              <p className="text-[#7c8b80] text-sm">
                Converse com "O Escutador" à esquerda. Quando tiver captado a intencionalidade e interesses, clique em "Gerar Proposta" para ver a mágica da IA desenhar a experiência alinhada ao PPP e BNCC.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Minhas Vivências */}
      {sessionsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#e3d8c8] overflow-hidden animate-scaleIn flex flex-col max-h-[85vh]">
            <header className="bg-[#fcfaf7] border-b border-[#e3d8c8] p-5 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2 text-[#4a5d4e]">
                <FolderOpen size={20} className="text-[#8fb39c]" />
                <div>
                  <h3 className="font-bold text-lg">Minhas Vivências</h3>
                  <p className="text-xs text-[#7c8b80]">Seus rascunhos, briefings e propostas pedagógicas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleNewSession}
                  className="bg-[#e8a375] hover:bg-[#d49164] text-white text-xs flex items-center gap-1 h-9 rounded-xl"
                >
                  <Plus size={14} /> Nova Vivência
                </Button>
                <button 
                  onClick={() => setSessionsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-[#f2efe9] rounded-lg ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <ScrollArea className="flex-1 p-6 bg-[#faf8f4]">
              {loadingSessions ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#7c8b80] gap-2">
                  <span className="animate-spin text-lg">⏳</span>
                  <p className="text-sm">Carregando suas vivências...</p>
                </div>
              ) : savedSessions.length === 0 ? (
                <div className="text-center py-12 text-[#7c8b80] max-w-md mx-auto">
                  <Leaf className="mx-auto text-[#8fb39c] opacity-40 mb-3" size={36} />
                  <p className="text-sm font-semibold">Nenhuma vivência encontrada</p>
                  <p className="text-xs mt-1 text-gray-400">Clique em "+ Nova Vivência" acima para iniciar o briefing do seu primeiro planejamento.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {savedSessions.map((session) => {
                    const statusConfig = {
                      APROVADO: { label: "Aprovado", style: "bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]" },
                      AGUARDANDO_DIRETORIA: { label: "Aguardando Aprovação", style: "bg-[#fff3e0] text-[#e65100] border-[#ffe0b2]" },
                      REVISADO: { label: "Revisado", style: "bg-[#f3e5f5] text-[#4a148c] border-[#e1bee7]" },
                      GERADO: { label: "Rascunho", style: "bg-[#e3f2fd] text-[#0d47a1] border-[#bbdefb]" },
                      BRIEFING: { label: "Briefing", style: "bg-[#efebe9] text-[#4e342e] border-[#d7ccc8]" }
                    }[session.status as string] || { label: "Desconhecido", style: "bg-gray-100 text-gray-800" };

                    const lastUpdated = new Date(session.updatedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    const isCurrent = session.id === sessionId;

                    return (
                      <div 
                        key={session.id} 
                        className={`bg-white p-4.5 rounded-2xl border transition-all flex justify-between items-center shadow-sm ${
                          isCurrent 
                            ? "border-[#8fb39c] ring-1 ring-[#8fb39c]/30 bg-[#f7faf8]" 
                            : "border-[#e3d8c8] hover:border-gray-300"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-bold text-[#4a5d4e] truncate max-w-[320px] text-sm">
                              {session.tema || "Sem Título Definido"}
                            </h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig.style}`}>
                              {statusConfig.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-[#8fb39c] bg-[#e8f0eb] border border-[#d2e2d8] px-2 py-0.5 rounded-full">
                                Em Edição
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] mt-1.5">
                            <Clock size={11} />
                            <span>Última alteração: {lastUpdated}</span>
                          </div>
                          
                          {session.classifications && session.classifications.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {session.classifications.map((c: any, idx: number) => (
                                <span key={idx} className="bg-[#fcfaf7] text-gray-500 border border-gray-100 px-1.5 py-0.5 rounded text-[9px]">
                                  {c.year} • {c.subcategory}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => {
                              loadSession(session.id);
                              setSessionsModalOpen(false);
                            }}
                            variant={isCurrent ? "outline" : "default"}
                            size="sm"
                            className={`text-xs px-3 h-8.5 rounded-xl ${
                              isCurrent 
                                ? "border-[#8fb39c] text-[#8fb39c] hover:bg-[#e8f0eb]"
                                : "bg-[#8fb39c] hover:bg-[#7a9e88] text-white"
                            }`}
                          >
                            {isCurrent ? "Carregado" : "Retomar"}
                          </Button>
                          <Button 
                            onClick={() => handleDeleteSession(session.id)}
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 w-8.5 h-8.5 rounded-xl"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
