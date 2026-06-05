"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";
import { Send, Leaf, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import UserMenu from "@/components/UserMenu";

export default function EducatorPortal() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: { sessionId: "temp-session-123" } // Em produção, este ID virá do banco/auth
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

  useEffect(() => {
    fetchPreferences();
  }, []);

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
            sessionId: "temp-session-123",
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
          sessionId: "temp-session-123",
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
          sessionId: "temp-session-123",
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
        alert("Rascunho salvo com sucesso!");
      } else {
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
          sessionId: "temp-session-123",
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
    } catch (error: any) {
      console.error("Erro ao orquestrar agentes", error);
      setOrchestratorError(error.message || "Erro de rede ou conexão.");
    } finally {
      setIsOrchestrating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#fcfaf7] font-sans relative">
      {/* LADO ESQUERDO: O ESCUTADOR (Chat) */}
      <div className="w-1/3 flex flex-col border-r border-[#e3d8c8] bg-white shadow-sm">
        <div className="p-6 border-b border-[#e3d8c8] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8fb39c] flex items-center justify-center text-white">
            <Leaf size={20} />
          </div>
          <div className="flex-1">
            <header className="flex flex-wrap justify-between items-center gap-2">
              <h1 className="font-bold text-[#4a5d4e] text-lg">O Escutador</h1>
              <div className="flex gap-2">
                <Button className="bg-[#e8a375] hover:bg-[#d49164] text-white shadow-sm transition-all" size="sm" onClick={() => window.location.href = '/biblioteca'}>Biblioteca</Button>
                <Button className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white shadow-sm transition-all" size="sm" onClick={() => window.location.href = '/diretoria'}>Diretoria</Button>
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
      <div className="w-2/3 flex flex-col bg-[#fcfaf7]">
        <div className="p-6 border-b border-[#e3d8c8] flex justify-between items-center bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e8a375] flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#4a5d4e] text-lg">Plano de Vivência</h2>
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

        <div className="flex-1 p-12 overflow-y-auto">
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
              <div className="bg-white p-12 rounded-xl shadow-sm border border-[#e3d8c8] min-h-full">
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
    </div>
  );
}
