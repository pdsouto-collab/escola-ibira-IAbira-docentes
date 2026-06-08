"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, ArrowRight, MessageSquare, Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import UserMenu from "@/components/UserMenu";

// Sub-telas importadas
import BibliotecaTab from "@/components/diretoria/BibliotecaTab";
import ConhecimentoTab from "@/components/diretoria/ConhecimentoTab";
import ConfiguracoesTab from "@/components/diretoria/ConfiguracoesTab";
import AgentesTab from "@/components/diretoria/AgentesTab";

function DirectorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "aprovações";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState<"list" | "detail">("list");

  // Sincronizar o estado da aba ativa quando o parâmetro da busca mudar
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.replace(`/diretoria?tab=${newTab}`);
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/diretoria/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar sessões", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleApprove = async () => {
    if (!selectedSessionId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/diretoria/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId, action: "approve" }),
      });
      if (res.ok) {
        alert("Vivência Aprovada com Sucesso!");
        setSelectedSessionId(null);
        setActiveMobileView("list");
        fetchSessions();
      } else {
        alert("Erro ao aprovar a vivência.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao aprovar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!selectedSessionId || !feedback) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/diretoria/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId: selectedSessionId, 
          action: "feedback", 
          feedbackText: feedback 
        }),
      });
      if (res.ok) {
        alert("Feedback enviado! A proposta retornou para revisão do educador.");
        setFeedback("");
        setSelectedSessionId(null);
        setActiveMobileView("list");
        fetchSessions();
      } else {
        alert("Erro ao enviar o feedback.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao enviar feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "biblioteca":
        return "Biblioteca de Vivências";
      case "conhecimento":
        return "Base de Conhecimento (RAG)";
      case "configuracoes":
        return "Configurações de Categorias";
      case "agentes":
        return "Diretrizes dos Agentes (Treinar IA)";
      case "aprovações":
      default:
        return "Aprovações Pendentes";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "biblioteca":
        return <BibliotecaTab />;
      case "conhecimento":
        return <ConhecimentoTab />;
      case "configuracoes":
        return <ConfiguracoesTab />;
      case "agentes":
        return <AgentesTab />;
      case "aprovações":
      default:
        return (
          <main className="flex-1 p-4 md:p-10 flex flex-col md:flex-row gap-6 md:gap-10 h-[calc(100vh-80px)] overflow-hidden">
            {/* LISTA */}
            <div className={`w-full md:w-1/3 flex-col gap-4 ${
              activeMobileView === "list" ? "flex animate-in fade-in duration-300" : "hidden md:flex"
            }`}>
              <h2 className="text-[#7c8b80] font-medium text-sm mb-2 uppercase tracking-wider">Aguardando Revisão</h2>
              
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#7c8b80] p-4 bg-white rounded-xl shadow-sm">
                  <Loader2 size={16} className="animate-spin text-[#8fb39c]" />
                  Carregando propostas...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-sm text-[#7c8b80] p-6 bg-white rounded-xl shadow-sm border border-dashed border-[#e3d8c8] text-center">
                  Nenhuma proposta pendente no momento.
                </div>
              ) : (
                sessions.map((s) => (
                  <div 
                    key={s.id} 
                    className={`bg-white p-5 rounded-xl border-l-4 ${selectedSessionId === s.id ? 'border-[#e8a375] shadow-md ring-1 ring-[#e8a375]/20' : 'border-[#8fb39c] shadow-sm'} cursor-pointer hover:shadow-md transition-all`}
                    onClick={() => {
                      setSelectedSessionId(s.id);
                      setActiveMobileView("detail");
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-[#4a5d4e]">{s.educator}</span>
                      <span className="text-xs text-[#7c8b80] bg-[#f2efe9] px-2 py-1 rounded-md">{s.date}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium mb-2">{s.theme}</p>
                    
                    {s.classifications && s.classifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {s.classifications.map((c: any, idx: number) => (
                          <span key={idx} className="bg-[#f2efe9] text-[#4a5d4e] px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                            {c.year} • {c.subcategory}
                          </span>
                        ))}
                      </div>
                    )}
 
                    <div className="flex items-center gap-1 text-xs text-[#e8a375] font-medium">
                      <AlertTriangle size={14} /> Requer Aprovação 
                    </div>
                  </div>
                ))
              )}
            </div>
 
            {/* PAINEL DE APROVAÇÃO */}
            <div className={`w-full md:w-2/3 bg-white rounded-2xl shadow-sm border border-[#e3d8c8] overflow-hidden flex-col ${
              activeMobileView === "detail" ? "flex h-full" : "hidden md:flex"
            }`}>
              {selectedSession ? (
                <>
                  <div className="bg-[#fcfaf7] p-4 md:p-6 border-b border-[#e3d8c8] flex flex-col items-start gap-3 shrink-0">
                    <button 
                      onClick={() => setActiveMobileView("list")}
                      className="md:hidden text-xs font-semibold text-[#4a5d4e] flex items-center gap-1 hover:text-[#394a3d] bg-white px-2.5 py-1 rounded-lg border border-[#e3d8c8] w-fit shadow-sm"
                    >
                      ← Voltar para a lista
                    </button>
                    <div>
                      <h3 className="text-lg font-bold text-[#4a5d4e]">{selectedSession.theme}</h3>
                      <p className="text-sm text-[#7c8b80]">Enviado por {selectedSession.educator}</p>
                      {selectedSession.classifications && selectedSession.classifications.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedSession.classifications.map((c: any, idx: number) => (
                            <span key={idx} className="bg-[#4a5d4e] text-white px-2.5 py-0.5 rounded text-[11px] font-medium">
                              {c.year} • {c.subcategory}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 md:p-8 flex-1 overflow-y-auto prose prose-stone max-w-none prose-headings:text-[#4a5d4e] prose-h2:border-b prose-h2:pb-2 prose-p:text-gray-700">
                    <ReactMarkdown>{selectedSession.content}</ReactMarkdown>
                  </div>
 
                  <div className="bg-[#fcfaf7] p-4 md:p-6 border-t border-[#e3d8c8] shrink-0">
                    <h4 className="text-sm font-bold text-[#4a5d4e] mb-3 flex items-center gap-2">
                      <MessageSquare size={16} className="text-[#e8a375]"/> 
                      Toque de Conhecimento (Feedback)
                    </h4>
                    <Textarea 
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Se necessário, sugira um ajuste. O educador visualizará este feedback ao revisar."
                      className="mb-4 bg-white border-[#e3d8c8] focus-visible:ring-[#8fb39c] min-h-[80px]"
                    />
                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleSendFeedback}
                        disabled={!feedback || isSubmitting}
                        className="text-[#e8a375] border-[#e8a375] hover:bg-[#e8a375]/10 text-xs h-9"
                      >
                        Solicitar Alterações
                      </Button>
                      <Button 
                        onClick={handleApprove} 
                        disabled={isSubmitting}
                        className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white text-xs h-9"
                      >
                        {isSubmitting ? "Processando..." : (
                          <>
                            <CheckCircle size={14} className="mr-1.5" /> Aprovar Vivência
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#7c8b80] p-6 text-center">
                  <button 
                    onClick={() => setActiveMobileView("list")}
                    className="md:hidden mb-6 text-xs font-semibold text-[#4a5d4e] flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#e3d8c8] shadow-sm"
                  >
                    ← Voltar para a lista
                  </button>
                  <ArrowRight size={48} className="mb-4 opacity-30 text-[#8fb39c]" />
                  <p>Selecione uma proposta na lista para revisar.</p>
                </div>
              )}
            </div>
          </main>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#f2efe9] font-sans relative overflow-hidden">
      {/* OVERLAY BACKDROP FOR MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)} 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 bg-[#4a5d4e] text-white flex flex-col p-5 shadow-xl z-40 shrink-0 transition-transform duration-300 md:relative md:translate-x-0 w-72 md:w-80 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="mb-10 font-bold text-xl tracking-tight text-[#e8a375] px-2 flex justify-between items-center">
          <div>
            Escola Ibirá
            <span className="block text-sm font-normal text-[#8fb39c]">Diretoria Pedagógica</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-2">
          <button 
            className={`px-3.5 py-3 rounded-lg text-sm font-medium flex items-center justify-between cursor-pointer text-left transition-all ${
              activeTab === "aprovações" ? "bg-[#394a3d] text-white" : "hover:bg-[#394a3d] opacity-70 text-white"
            }`}
            onClick={() => {
              handleTabChange("aprovações");
              setMobileMenuOpen(false);
            }}
          >
            <span>Aprovações Pendentes</span>
            <span className="bg-[#e8a375] text-white text-xs px-2 py-0.5 rounded-full">
              {isLoading ? "..." : sessions.length}
            </span>
          </button>
          <button 
            className={`px-3.5 py-3 rounded-lg text-sm cursor-pointer text-left transition-all ${
              activeTab === "biblioteca" ? "bg-[#394a3d] text-white" : "hover:bg-[#394a3d] opacity-70 text-white"
            }`}
            onClick={() => {
              handleTabChange("biblioteca");
              setMobileMenuOpen(false);
            }}
          >
            Biblioteca de Vivências
          </button>
          <button 
            className={`px-3.5 py-3 rounded-lg text-sm cursor-pointer text-left transition-all ${
              activeTab === "conhecimento" ? "bg-[#394a3d] text-white" : "hover:bg-[#394a3d] opacity-70 text-white"
            }`}
            onClick={() => {
              handleTabChange("conhecimento");
              setMobileMenuOpen(false);
            }}
          >
            Base de Conhecimento (RAG)
          </button>
          <button 
            className={`px-3.5 py-3 rounded-lg text-sm cursor-pointer text-left transition-all ${
              activeTab === "configuracoes" ? "bg-[#394a3d] text-white" : "hover:bg-[#394a3d] opacity-70 text-white"
            }`}
            onClick={() => {
              handleTabChange("configuracoes");
              setMobileMenuOpen(false);
            }}
          >
            Configurações de Categorias
          </button>
          <button 
            className={`px-3.5 py-3 rounded-lg text-sm cursor-pointer text-left transition-all ${
              activeTab === "agentes" ? "bg-[#394a3d] text-white" : "hover:bg-[#394a3d] opacity-70 text-white"
            }`}
            onClick={() => {
              handleTabChange("agentes");
              setMobileMenuOpen(false);
            }}
          >
            Diretrizes dos Agentes (Treinar IA)
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm z-10 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#2A4B3A] hover:bg-black/5 rounded-lg shrink-0"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-[#2A4B3A] truncate">{getHeaderTitle()}</h1>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <Button 
              className="bg-white border border-[#4a5d4e] text-[#4a5d4e] hover:bg-[#f2efe9] transition-all text-xs h-9 px-3" 
              onClick={() => window.location.href = '/'}
            >
              Voltar
            </Button>
            <UserMenu />
          </div>
        </header>
        
        {renderTabContent()}
      </div>
    </div>
  );
}

export default function DirectorDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#f2efe9]">
        <Loader2 className="animate-spin text-[#8fb39c]" size={36} />
      </div>
    }>
      <DirectorDashboardContent />
    </Suspense>
  );
}
