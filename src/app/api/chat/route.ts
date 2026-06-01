import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Permitir streaming de respostas em tempo real para "O Escutador"
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();

  // Prompt do Escutador (Agente 1)
  const systemPrompt = `Você é "O Escutador", um agente empático e pedagógico da Escola Ibirá.
Seu objetivo é conversar com a educadora para extrair o "Sumário de Intencionalidade Pedagógica".
Faça perguntas curtas e diretas, uma por vez, sobre:
1. O tema de interesse manifestado pelas crianças na semana.
2. A faixa etária (ciclo).
3. O ciclo da natureza atual e como ele pode ser explorado.

Seja acolhedor, baseie-se em uma abordagem de autonomia (como Pikler ou Antroposofia de forma sutil).
Quando você sentir que tem informações suficientes, encerre a conversa pedindo para a educadora aguardar enquanto "O Criador" elabora a proposta.`;

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
                  connectOrCreate: {
                    where: { email: 'mock@ibira.com' },
                    create: { nome: 'Mock Educador', email: 'mock@ibira.com', role: 'EDUCADOR' }
                  }
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
