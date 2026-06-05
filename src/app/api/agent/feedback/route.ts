import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { sessionId, rating, comment } = await req.json().catch(() => ({}));

    if (!sessionId || rating === undefined) {
      return NextResponse.json({ error: 'Session ID and Rating are required' }, { status: 400 });
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json({ error: 'Rating must be 1 (Thumbs Up) or -1 (Thumbs Down)' }, { status: 400 });
    }

    // 1. Salvar o feedback no banco de dados
    const feedback = await prisma.feedback.create({
      data: {
        sessionId,
        userId: user.id,
        rating,
        comment: comment || null,
      },
    });

    // 2. Se houver um comentário, atualizar a memória/preferências do educador
    if (comment && comment.trim().length > 0) {
      // Buscar a proposta gerada na sessão correspondente
      const finalContent = await prisma.finalContent.findUnique({
        where: { sessionId },
      });

      // Buscar a preferência atual do usuário
      const currentPref = await prisma.userPreference.findUnique({
        where: { userId: user.id },
      });

      const currentPreferencesText = currentPref?.preferences || 'Nenhuma preferência registrada ainda.';
      const proposalText = finalContent?.content || 'Não há conteúdo de proposta disponível.';

      // Chamar o modelo da Anthropic para destilar e atualizar as preferências
      const prompt = `Você é um assistente encarregado de consolidar e gerenciar a "memória de preferências" de um(a) educador(a) da Escola Ibirá.
Seu objetivo é atualizar a lista de preferências pedagógicas do(a) educador(a) com base no feedback que ele(a) acabou de dar sobre uma proposta gerada.

Preferências atuais do educador:
"""
${currentPreferencesText}
"""

Proposta gerada pela IA:
"""
${proposalText}
"""

Feedback do educador:
Avaliação: ${rating === 1 ? 'Gostou (👍)' : 'Não Gostou (👎)'}
Comentário do educador: "${comment}"

Sua tarefa é retornar a lista consolidada e atualizada de preferências em formato de tópicos (bullet points) claros e curtos.
Regras:
1. Mantenha os aprendizados válidos anteriores.
2. Adicione, ajuste ou remova preferências com base no novo feedback.
3. Seja conciso e direto. Exemplos: "- Prefere atividades que explorem elementos de barro e terra.", "- Evitar o uso de garrafas PET ou plásticos nas propostas."
4. Retorne APENAS a lista atualizada de tópicos. Não adicione saudações, introduções ou explicações.`;

      try {
        const { text: updatedPreferences } = await generateText({
          model: anthropic('claude-sonnet-4-6'),
          prompt: prompt,
        });

        const trimmedPreferences = updatedPreferences.trim();

        if (trimmedPreferences) {
          // Atualiza ou cria as preferências do usuário no banco
          await prisma.userPreference.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              preferences: trimmedPreferences,
            },
            update: {
              preferences: trimmedPreferences,
            },
          });
        }
      } catch (aiError) {
        console.error('Falha ao processar atualização de memória com a IA:', aiError);
        // Não falha a requisição do usuário se o LLM falhar, apenas loga
      }
    }

    return NextResponse.json({ success: true, feedback });

  } catch (error: any) {
    console.error('Erro ao salvar feedback:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar feedback' }, { status: 500 });
  }
}
