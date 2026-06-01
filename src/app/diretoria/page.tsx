"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, Eye, ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";

export default function DirectorDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="flex h-screen bg-[#f2efe9] font-sans">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#4a5d4e] text-white flex flex-col p-6 shadow-xl z-10">
        <div className="mb-10 font-bold text-xl tracking-tight text-[#e8a375]">
          Escola Ibirá
          <span className="block text-sm font-normal text-[#8fb39c]">Diretoria Pedagógica</span>
        </div>
        <nav className="flex flex-col gap-2">
          <div className="p-3 bg-[#394a3d] rounded-lg text-sm font-medium flex items-center justify-between">
            Aprovações Pendentes
            <span className="bg-[#e8a375] text-white text-xs px-2 py-0.5 rounded-full">
              {isLoading ? "..." : sessions.length}
            </span>
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70" onClick={() => window.location.href = '/biblioteca'}>
            Biblioteca de Vivências
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70" onClick={() => window.location.href = '/diretoria/conhecimento'}>
            Base de Conhecimento (RAG)
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70" onClick={() => window.location.href = '/diretoria/configuracoes'}>
            Configurações de Categorias
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#2A4B3A]">Portal da Diretoria</h1>
          <div className="flex gap-3 flex-wrap">
            <Button className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white shadow-sm transition-all" onClick={() => window.location.href = '/diretoria/configuracoes'}>Configurar Categorias</Button>
            <Button className="bg-[#e8a375] hover:bg-[#d49164] text-white shadow-sm transition-all" onClick={() => window.location.href = '/diretoria/conhecimento'}>Alimentar IA (Conhecimento)</Button>
            <Button className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white shadow-sm transition-all" onClick={() => window.location.href = '/biblioteca'}>Biblioteca de Vivências</Button>
            <Button className="bg-white border border-[#4a5d4e] text-[#4a5d4e] hover:bg-[#f2efe9] transition-all" onClick={() => window.location.href = '/'}>Sair / Voltar</Button>
          </div>
        </header>
        
        <main className="flex-1 p-10 overflow-y-auto flex gap-10">
          {/* LISTA */}
          <div className="w-1/3 flex flex-col gap-4">
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
                  onClick={() => setSelectedSessionId(s.id)}
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
          <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-[#e3d8c8] overflow-hidden flex flex-col">
            {selectedSession ? (
              <>
                <div className="bg-[#fcfaf7] p-6 border-b border-[#e3d8c8] flex justify-between items-center">
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
                
                <div className="p-8 flex-1 overflow-y-auto prose prose-stone max-w-none prose-headings:text-[#4a5d4e] prose-h2:border-b prose-h2:pb-2 prose-p:text-gray-700">
                  <ReactMarkdown>{selectedSession.content}</ReactMarkdown>
                </div>

                <div className="bg-[#fcfaf7] p-6 border-t border-[#e3d8c8]">
                  <h4 className="text-sm font-bold text-[#4a5d4e] mb-3 flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#e8a375]"/> 
                    Toque de Conhecimento (Feedback)
                  </h4>
                  <Textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Se necessário, sugira um ajuste. O educador visualizará este feedback ao revisar."
                    className="mb-4 bg-white border-[#e3d8c8] focus-visible:ring-[#8fb39c] min-h-[100px]"
                  />
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleSendFeedback}
                      disabled={!feedback || isSubmitting}
                      className="text-[#e8a375] border-[#e8a375] hover:bg-[#e8a375]/10"
                    >
                      Solicitar Alterações
                    </Button>
                    <Button 
                      onClick={handleApprove} 
                      disabled={isSubmitting}
                      className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white"
                    >
                      {isSubmitting ? "Processando..." : (
                        <>
                          <CheckCircle size={16} className="mr-2" /> Aprovar Vivência
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#7c8b80]">
                <ArrowRight size={48} className="mb-4 opacity-30 text-[#8fb39c]" />
                <p>Selecione uma proposta na lista para revisar.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
