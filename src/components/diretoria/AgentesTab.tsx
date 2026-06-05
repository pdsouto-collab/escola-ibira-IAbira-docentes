"use client";

import { useState, useEffect } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle, Bot, MessageSquare, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const HELP_TIPS = {
  ESCUTADOR: [
    "Seja claro quanto aos dados obrigatórios (ex: tema, faixa etária, ciclo da natureza).",
    "Indique para a IA fazer uma pergunta por vez, evitando cansar o professor.",
    "Mantenha o tom acolhedor, valorizando a intencionalidade pedagógica.",
    "Defina instruções claras de quando o agente deve sugerir a geração da proposta."
  ],
  CRIADOR: [
    "Defina a estrutura exata do plano de aula / proposta de vivência (ex: Preparação do Espaço, Roda, Vivência Livre).",
    "Exija abordagens específicas como Pikler (autonomia motora) ou Waldorf/Antroposofia.",
    "Especifique o tipo de materiais (ex: materiais naturais não estruturados, evitar folhas prontas).",
    "Instrua a IA a justificar com base nos códigos e competências da BNCC."
  ]
};

export default function AgentesTab() {
  const [selectedAgent, setSelectedAgent] = useState<"ESCUTADOR" | "CRIADOR">("ESCUTADOR");
  const [instructions, setInstructions] = useState({ ESCUTADOR: "", CRIADOR: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning", text: string } | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/diretoria/agent-config");
      if (res.ok) {
        const data = await res.json();
        setInstructions({
          ESCUTADOR: data.escutador || "",
          CRIADOR: data.criador || ""
        });
        if (data.warning) {
          setMessage({ type: "warning", text: data.warning });
        }
      } else {
        throw new Error("Erro ao carregar as diretrizes dos agentes");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao conectar à API." });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/diretoria/agent-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: selectedAgent,
          instructions: instructions[selectedAgent]
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Instruções do ${selectedAgent === "ESCUTADOR" ? "Escutador" : "Criador"} salvas com sucesso!` });
      } else {
        throw new Error(data.error || "Erro ao salvar as configurações.");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha ao salvar diretrizes." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetDefault = () => {
    const confirmReset = window.confirm(
      `Deseja realmente restaurar o prompt padrão de fábrica para o agente ${
        selectedAgent === "ESCUTADOR" ? "Escutador" : "Criador"
      }? As suas modificações atuais não salvas serão descartadas.`
    );

    if (!confirmReset) return;

    const DEFAULTS = {
      ESCUTADOR: `Você é "O Escutador", um agente empático e pedagógico da Escola Ibirá.
Seu objetivo é conversar com a educadora para extrair o "Sumário de Intencionalidade Pedagógica" ou receber ajustes sobre a proposta gerada.

Diretrizes de conversação:
1. Coleta Inicial: Faça perguntas curtas e diretas, uma por vez, sobre o tema de interesse das crianças, a faixa etária/ciclo, e o ciclo da natureza atual.
2. Sugestão de Geração: Quando tiver informações suficientes, encerre com uma mensagem acolhedora e peça para a educadora clicar em "Gerar Proposta Pedagógica (Criador)" para elaborar a vivência.
3. Ciclo de Feedback/Ajustes: Se a educadora solicitar alterações na proposta já gerada (ex: mudar materiais, focar mais em barro, alterar dinâmicas), acolha a ideia de forma empática sob a ótica da autonomia infantil (abordagem Pikler/Antroposofia) e sugira que ela clique em "Gerar Proposta" novamente para que "O Criador" aplique as alterações no documento.`,

      CRIADOR: `Você é o assistente pedagógico da Escola Ibirá.
Com base no briefing do educador e no contexto pedagógico (RAG) fornecidos abaixo, crie uma proposta de vivência sensorial na natureza de alta qualidade.

A proposta deve ser muito detalhada e dividida estritamente nas seguintes seções em Markdown:
1. Preparação do Espaço Natural
2. Roda de Investigação
3. Vivência Livre
4. Registro Coletivo

Foque em experiências sensoriais, autonomia da criança (abordagem Pikler/Antroposófica) e livre exploração. Substitua quaisquer atividades tradicionais ou estruturadas (como folhas de colorir) por exploração e brincadeira livre com materiais não estruturados.
Ao final do documento, de forma natural, adicione e liste os códigos e campos de experiência da BNCC (Educação Infantil) adequados para esta vivência.`
    };

    setInstructions(prev => ({
      ...prev,
      [selectedAgent]: DEFAULTS[selectedAgent]
    }));

    setMessage({ type: "success", text: "Prompt padrão restaurado na caixa de texto. Lembre-se de salvar para aplicar!" });
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full">
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm shadow-sm transition-all animate-in fade-in slide-in-from-top-4 ${
          message.type === "success" ? "bg-[#E8F3EB] text-[#2A4B3A] border border-[#d2ead9]" : 
          message.type === "warning" ? "bg-amber-50 text-amber-800 border border-amber-200" :
          "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle className="shrink-0 text-[#4A7C59]" size={20} /> : <AlertCircle className="shrink-0" size={20} />}
          <div>{message.text}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PAINEL DE CONTROLES E SELEÇÃO */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="border-[#e3d8c8] bg-white shadow-sm">
            <CardHeader className="bg-[#fcfaf7] border-b border-[#e3d8c8]">
              <CardTitle className="text-[#4a5d4e] text-lg flex items-center gap-2">
                <Bot size={20} className="text-[#e8a375]" />
                Selecionar Agente
              </CardTitle>
              <CardDescription>Escolha qual agente deseja treinar/customizar.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <button
                onClick={() => { setSelectedAgent("ESCUTADOR"); setMessage(null); }}
                className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all ${
                  selectedAgent === "ESCUTADOR"
                    ? "border-[#e8a375] bg-[#e8a375]/5 text-[#4a5d4e] ring-1 ring-[#e8a375]/20 font-semibold"
                    : "border-[#e3d8c8] text-gray-600 hover:bg-[#fcfaf7]"
                }`}
              >
                <MessageSquare size={20} className={selectedAgent === "ESCUTADOR" ? "text-[#e8a375]" : "text-gray-400"} />
                <div>
                  <div className="text-sm">O Escutador</div>
                  <div className="text-xs text-gray-500 font-normal">Conversa com a educadora no chat e extrai a intencionalidade.</div>
                </div>
              </button>

              <button
                onClick={() => { setSelectedAgent("CRIADOR"); setMessage(null); }}
                className={`flex items-center gap-3 p-4 rounded-xl text-left border transition-all ${
                  selectedAgent === "CRIADOR"
                    ? "border-[#e8a375] bg-[#e8a375]/5 text-[#4a5d4e] ring-1 ring-[#e8a375]/20 font-semibold"
                    : "border-[#e3d8c8] text-gray-600 hover:bg-[#fcfaf7]"
                }`}
              >
                <PenTool size={20} className={selectedAgent === "CRIADOR" ? "text-[#e8a375]" : "text-gray-400"} />
                <div>
                  <div className="text-sm">O Criador / Revisor</div>
                  <div className="text-xs text-gray-500 font-normal">Gera e formata o plano de vivência baseado no RAG e diretrizes.</div>
                </div>
              </button>
            </CardContent>
          </Card>

          {/* DICAS DE CUSTOMIZAÇÃO */}
          <Card className="border-[#e3d8c8] bg-white shadow-sm">
            <CardHeader className="bg-[#fcfaf7] border-b border-[#e3d8c8]">
              <CardTitle className="text-[#4a5d4e] text-sm font-bold uppercase tracking-wider">
                Dicas de Direcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <ul className="space-y-3">
                {HELP_TIPS[selectedAgent].map((tip, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex gap-2 items-start">
                    <span className="text-[#e8a375] font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ÁREA DE EDIÇÃO DO PROMPT */}
        <div className="lg:col-span-2">
          <Card className="border-[#e3d8c8] bg-white shadow-sm flex flex-col h-full min-h-[500px]">
            <CardHeader className="bg-[#fcfaf7] border-b border-[#e3d8c8] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#4a5d4e]">
                  Instruções de Personalidade
                </CardTitle>
                <CardDescription>
                  Edite as regras de ouro abaixo. A IA seguirá essas orientações estritamente.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#e3d8c8] text-gray-500 hover:bg-[#f2efe9] text-xs"
                onClick={handleResetDefault}
                disabled={loading || submitting}
              >
                Restaurar Padrão
              </Button>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col gap-4">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-20">
                  <RefreshCw size={36} className="animate-spin text-[#8fb39c] mb-3" />
                  <p className="text-sm">Carregando diretrizes pedagógicas...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4">
                  <Textarea
                    value={instructions[selectedAgent]}
                    onChange={(e) => setInstructions(prev => ({ ...prev, [selectedAgent]: e.target.value }))}
                    placeholder="Insira as regras que o agente deve seguir..."
                    className="flex-1 min-h-[350px] bg-[#fcfaf7] border-[#e3d8c8] text-gray-700 text-sm leading-relaxed p-4 focus-visible:ring-[#8fb39c] font-mono"
                    disabled={submitting}
                  />
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={fetchConfigs}
                      disabled={submitting}
                    >
                      Descartar Alterações
                    </Button>
                    
                    <Button
                      onClick={handleSave}
                      className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white flex items-center gap-2 shadow-md transition-all px-6"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Salvar Diretrizes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
