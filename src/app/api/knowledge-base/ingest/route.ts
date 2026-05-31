import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';


export async function POST(req: Request) {
  try {
    let content = '';
    let documentType = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      documentType = formData.get('documentType') as string;

      if (!file || !documentType) {
        return NextResponse.json({ error: 'File and documentType are required' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(buffer);
      content = pdfData.text;
    } else {
      const json = await req.json();
      content = json.content;
      documentType = json.documentType;

      if (!content || !documentType) {
        return NextResponse.json({ error: 'Content and documentType are required' }, { status: 400 });
      }
    }

    // Dividir em chunks simples (~1000 caracteres, mantendo frases juntas se possível)
    const chunks = content
      .split(/\n\s*\n/) // Divide por parágrafos duplos
      .filter((p) => p.trim().length > 0)
      .reduce((acc, curr) => {
        if (acc.length === 0) return [curr];
        const last = acc[acc.length - 1];
        if (last.length + curr.length < 1500) {
          acc[acc.length - 1] = `${last}\n\n${curr}`;
        } else {
          acc.push(curr);
        }
        return acc;
      }, [] as string[]);

    // Obter embeddings em batch
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values: chunks,
    });

    // Inserir no banco
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const vector = embeddings[i];

      // Usando executeRaw por causa da extensão pgvector e field Unsupported
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeBaseEmbedding" (id, content, metadata, embedding)
        VALUES (gen_random_uuid(), ${chunkText}, CAST(${documentType} AS "DocumentType"), ${JSON.stringify(vector)}::vector)
      `;
    }

    return NextResponse.json({ success: true, message: `Successfully ingested ${chunks.length} chunks.` });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message || 'Failed to ingest document' }, { status: 500 });
  }
}
