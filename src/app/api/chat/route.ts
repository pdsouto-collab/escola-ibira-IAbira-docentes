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
            // TEMPORARILY DISABLED PRISMA TO ISOLATE ERROR
            /*
            await Promise.race([
              (async () => {
                await prisma.pedagogicalSession.upsert({ ... });
                await prisma.agentLog.create({ ... });
              })().catch(e => console.error(e)),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Prisma timeout exceeding 5s")), 5000))
            ]);
            */
          } catch (dbError) {
            console.error("ERRO AO SALVAR NO BANCO DE DADOS (Prisma):", dbError);
          }
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("DEU ERRO NO SERVIDOR:", error);
    // Retorna o erro exato para a interface mostrar
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
