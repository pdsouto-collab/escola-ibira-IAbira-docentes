import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';

const DEFAULT_PROMPTS: Record<string, string> = {
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

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'DIRETOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const configs = await prisma.agentConfig.findMany();
    
    // Mapear registros existentes ou preencher com defaults
    const result = {
      escutador: configs.find(c => c.agentName === 'ESCUTADOR')?.instructions || DEFAULT_PROMPTS.ESCUTADOR,
      criador: configs.find(c => c.agentName === 'CRIADOR')?.instructions || DEFAULT_PROMPTS.CRIADOR,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao buscar configurações dos agentes:', error);
    // Em caso de erro de banco (ex: tabela não criada ainda), retorna os defaults
    return NextResponse.json({
      escutador: DEFAULT_PROMPTS.ESCUTADOR,
      criador: DEFAULT_PROMPTS.CRIADOR,
      warning: 'Banco de dados não disponível. Utilizando padrões de fábrica.'
    });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'DIRETOR' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { agentName, instructions } = await req.json();

    if (!agentName || !instructions) {
      return NextResponse.json({ error: 'agentName e instructions são obrigatórios' }, { status: 400 });
    }

    if (agentName !== 'ESCUTADOR' && agentName !== 'CRIADOR') {
      return NextResponse.json({ error: 'Agente inválido' }, { status: 400 });
    }

    const config = await prisma.agentConfig.upsert({
      where: { agentName },
      update: { instructions },
      create: { agentName, instructions }
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Erro ao salvar configuração do agente:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
