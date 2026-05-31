"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, Eye, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function DirectorDashboard() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // Mock sessions list
  const sessions = [
    {
      id: "session-123",
      educator: "Maria Clara",
      theme: "Exploração de texturas com barro e gravetos",
      status: "AGUARDANDO_DIRETORIA",
      date: "31 Mai 2026",
    }
  ];

  const handleApprove = () => {
    alert("Vivência Aprovada! O educador foi notificado.");
    setSelectedSession(null);
  };

  const handleSendFeedback = () => {
    alert("Toque de Conhecimento enviado! 'O Revisor' refinará a vivência baseado nas suas observações.");
    setSelectedSession(null);
  };

  return (
    <div className="flex h-screen bg-[#f2efe9] font-sans">
      {/* SIDEBAR MOCK */}
      <div className="w-64 bg-[#4a5d4e] text-white flex flex-col p-6 shadow-xl z-10">
        <div className="mb-10 font-bold text-xl tracking-tight text-[#e8a375]">
          Escola Ibirá
          <span className="block text-sm font-normal text-[#8fb39c]">Diretoria Pedagógica</span>
        </div>
        <nav className="flex flex-col gap-2">
          <div className="p-3 bg-[#394a3d] rounded-lg text-sm font-medium flex items-center justify-between">
            Aprovações Pendentes
            <span className="bg-[#e8a375] text-white text-xs px-2 py-0.5 rounded-full">1</span>
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70">
            Histórico de Vivências
          </div>
          <div className="p-3 hover:bg-[#394a3d] rounded-lg text-sm cursor-pointer opacity-70">
            Base de Conhecimento (RAG)
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#2A4B3A]">Portal da Diretoria</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.location.href = '/diretoria/conhecimento'}>Alimentar IA (Conhecimento)</Button>
          <Button variant="outline" onClick={() => window.location.href = '/biblioteca'}>Biblioteca de Vivências</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>Sair / Voltar</Button>
        </div>
      </header>
        
        <main className="flex-1 p-10 overflow-y-auto flex gap-10">
          {/* LISTA */}
          <div className="w-1/3 flex flex-col gap-4">
            <h2 className="text-[#7c8b80] font-medium text-sm mb-2 uppercase tracking-wider">Aguardando Revisão</h2>
            {sessions.map((s) => (
              <div 
                key={s.id} 
                className={`bg-white p-5 rounded-xl border-l-4 ${selectedSession === s.id ? 'border-[#e8a375] shadow-md ring-1 ring-[#e8a375]/20' : 'border-[#8fb39c] shadow-sm'} cursor-pointer hover:shadow-md transition-all`}
                onClick={() => setSelectedSession(s.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-[#4a5d4e]">{s.educator}</span>
                  <span className="text-xs text-[#7c8b80] bg-[#f2efe9] px-2 py-1 rounded-md">{s.date}</span>
                </div>
                <p className="text-sm text-gray-700 font-medium mb-3">{s.theme}</p>
                <div className="flex items-center gap-1 text-xs text-[#e8a375] font-medium">
                  <AlertTriangle size={14} /> Requer Aprovação 
                </div>
              </div>
            ))}
          </div>

          {/* PAINEL DE APROVAÇÃO */}
          <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-[#e3d8c8] overflow-hidden flex flex-col">
            {selectedSession ? (
              <>
                <div className="bg-[#fcfaf7] p-6 border-b border-[#e3d8c8] flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-[#4a5d4e]">Visualização de Proposta</h3>
                    <p className="text-sm text-[#7c8b80]">Educação Infantil - Ciclo das Águas</p>
                  </div>
                  <Button variant="outline" className="text-[#8fb39c] border-[#8fb39c] hover:bg-[#8fb39c]/10">
                    <Eye size={16} className="mr-2" />
                    Expandir Histórico de Agentes
                  </Button>
                </div>
                
                <div className="p-8 flex-1 overflow-y-auto prose prose-sm prose-stone">
                  <h2 className="text-[#4a5d4e]">1. Preparação do Espaço Natural</h2>
                  <p>Organizar cestos de vime no jardim principal contendo barro úmido, potes com água e folhas secas recolhidas na véspera.</p>
                  <h2 className="text-[#4a5d4e]">2. Roda de Investigação</h2>
                  <p>Questionar as crianças sobre a diferença térmica e tátil entre o barro seco e molhado.</p>
                  <div className="bg-[#f2efe9] p-4 rounded-lg my-4 text-xs text-[#6d8a77] font-medium border border-[#e3d8c8]">
                    <strong>Nota do Revisor IA:</strong> Atividade validada com foco em autonomia Pikleriana.
                    <br/><strong>BNCC:</strong> (EI03TS02) Expressar-se livremente por meio de desenho, pintura, colagem...
                  </div>
                </div>

                <div className="bg-[#fcfaf7] p-6 border-t border-[#e3d8c8]">
                  <h4 className="text-sm font-bold text-[#4a5d4e] mb-3 flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#e8a375]"/> 
                    Toque de Conhecimento (Feedback)
                  </h4>
                  <Textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Se necessário, sugira um ajuste. O Agente Revisor irá acatar e reescrever a proposta."
                    className="mb-4 bg-white border-[#e3d8c8] focus-visible:ring-[#8fb39c] min-h-[100px]"
                  />
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleSendFeedback}
                      disabled={!feedback}
                      className="text-[#e8a375] border-[#e8a375] hover:bg-[#e8a375]/10"
                    >
                      Solicitar Revisão pela IA
                    </Button>
                    <Button onClick={handleApprove} className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white">
                      <CheckCircle size={16} className="mr-2" /> Aprovar Vivência
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
