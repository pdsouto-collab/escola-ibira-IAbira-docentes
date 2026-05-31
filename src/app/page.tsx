"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Send, Leaf, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";

export default function EducatorPortal() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { sessionId: "temp-session-123" } // Em produção, este ID virá do banco/auth
  });

  const [finalContent, setFinalContent] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  // Gatilho para O Criador & O Revisor
  const handleGenerateProposal = async () => {
    setIsOrchestrating(true);
    try {
      const res = await fetch("/api/agent/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "temp-session-123" }),
      });
      const data = await res.json();
      if (data.content) {
        setFinalContent(data.content);
      }
    } catch (error) {
      console.error("Erro ao orquestrar agentes", error);
    } finally {
      setIsOrchestrating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#fcfaf7] font-sans">
      {/* LADO ESQUERDO: O ESCUTADOR (Chat) */}
      <div className="w-1/3 flex flex-col border-r border-[#e3d8c8] bg-white shadow-sm">
        <div className="p-6 border-b border-[#e3d8c8] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8fb39c] flex items-center justify-center text-white">
            <Leaf size={20} />
          </div>
          <div>
            <header className="flex justify-between items-center">
              <h1 className="font-bold text-[#4a5d4e] text-lg">O Escutador</h1>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/biblioteca'}>Biblioteca</Button>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/diretoria'}>Diretoria</Button>
              </div>
            </header>
            <p className="text-xs text-[#7c8b80]">Briefing Dinâmico e Intencionalidade</p>
          </div>
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
          <div className="flex gap-2">
            <Button variant="outline" className="text-[#6d8a77] border-[#6d8a77] hover:bg-[#f2efe9]">
              Salvar Rascunho
            </Button>
            <Button className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white shadow-md">
              Enviar para Aprovação (Diretoria)
            </Button>
          </div>
        </div>

        <div className="flex-1 p-12 overflow-y-auto">
          {finalContent ? (
            <div className="max-w-3xl mx-auto bg-white p-12 rounded-xl shadow-sm border border-[#e3d8c8] min-h-full">
              {/* Se o educador quiser editar, um Textarea rico pode ser integrado aqui (ex: TipTap). Para mock, usamos react-markdown no view. */}
              <div className="prose prose-stone max-w-none prose-headings:text-[#4a5d4e] prose-h2:border-b-2 prose-h2:border-[#f2efe9] prose-h2:pb-2 prose-p:text-gray-700 prose-li:text-gray-700">
                <ReactMarkdown>{finalContent}</ReactMarkdown>
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
