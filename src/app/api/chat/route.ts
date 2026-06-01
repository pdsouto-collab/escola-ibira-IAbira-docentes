import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

// Permitir streaming de respostas em tempo real para "O Escutador"
export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { messages, sessionId } = await req.json();

  // Prompt do Escutador (Agente 1)
  const systemPrompt = `Você é "O Escutador", um agente empático e pedagógico da Escola Ibirá.
Seu objetivo é conversar com a educadora para extrair o "Sumário de Intencionalidade Pedagógica" ou receber ajustes sobre a proposta gerada.

Diretrizes de conversação:
1. Coleta Inicial: Faça perguntas curtas e diretas, uma por vez, sobre o tema de interesse das crianças, a faixa etária/ciclo, e o ciclo da natureza atual.
2. Sugestão de Geração: Quando tiver informações suficientes, encerre com uma mensagem acolhedora e peça para a educadora clicar em "Gerar Proposta Pedagógica (Criador)" para elaborar a vivência.
3. Ciclo de Feedback/Ajustes: Se a educadora solicitar alterações na proposta já gerada (ex: mudar materiais, focar mais em barro, alterar dinâmicas), acolha a ideia de forma empática sob a ótica da autonomia infantil (abordagem Pikler/Antroposofia) e sugira que ela clique em "Gerar Proposta" novamente para que "O Criador" aplique as alterações no documento.`;

  try {
    const result = await streamText({
      model: anthropic('claude-sonnet-4-6'),
      messages,
      system: systemPrompt,
      async onFinish({ text }) {
        if (sessionId) {
          try {
            // Garante que a sessão exista no banco para não dar erro de chave estrangeira
            await prisma.pedagogicalSession.upsert({
              where: { id: sessionId },
              create: { 
                id: sessionId, 
                status: "BRIEFING",
                educador: {
                  connect: { email: user.email }
                }
              },
              update: {}
            });

            // Log da interação do Escutador no banco de dados
            await prisma.agentLog.create({
              data: {
                sessionId: sessionId,
                agentName: 'ESCUTADOR',
                input: messages[messages.length - 1].content,
                output: text,
              },
            });
          } catch (dbError) {
            console.error("ERRO AO SALVAR NO BANCO DE DADOS (Prisma):", dbError);
          }
        }
      }
    });

    const streamResponse = result.toDataStreamResponse();
    
    // Hack: intercepta o stream para engolir chunks de erro "e:" 
    // gerados no final da stream por incompatibilidade do parser do SDK.
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        const filteredLines = lines.filter(line => !line.startsWith('e:'));
        if (filteredLines.length > 0) {
          const newText = filteredLines.join('\n');
          if (newText) {
            controller.enqueue(new TextEncoder().encode(newText));
          }
        }
      }
    });

    return new Response(streamResponse.body?.pipeThrough(transformStream), {
      headers: streamResponse.headers,
      status: streamResponse.status
    });
  } catch (error: any) {
    console.error("DEU ERRO NO SERVIDOR:", error);
    // Retorna o erro exato para a interface mostrar
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
