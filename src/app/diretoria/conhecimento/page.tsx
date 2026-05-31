'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function ConhecimentoPage() {
  const [docType, setDocType] = useState('PPP');
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      let res;
      if (uploadMode === 'text') {
        res = await fetch('/api/knowledge-base/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, documentType: docType }),
        });
      } else {
        if (!file) throw new Error('Selecione um arquivo PDF.');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', docType);

        res = await fetch('/api/knowledge-base/ingest', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar');
      setMessage(data.message || 'Adicionado com sucesso!');
      setContent('');
      setFile(null);
    } catch (error: any) {
      setMessage(`Erro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#2A4B3A]">Repositório de Conhecimento</h1>
        <Button variant="outline" onClick={() => window.location.href = '/diretoria'}>Voltar</Button>
      </div>

      <Card className="max-w-2xl mx-auto border-[#E8F3EB] shadow-lg">
        <CardHeader className="bg-[#F8FBF9] border-b border-[#E8F3EB]">
          <CardTitle className="text-[#2A4B3A]">Alimentar Memória da IA</CardTitle>
          <CardDescription>Faça upload de PDFs ou cole textos das metodologias Ibirá.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria (Tipo de Documento)</label>
              <select 
                value={docType} 
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
              >
                <option value="PPP">PPP (Projeto Político Pedagógico)</option>
                <option value="BNCC">BNCC</option>
                <option value="PIKLER">Pikler (Autonomia)</option>
                <option value="ESPACO_FISICO">Espaço Físico / Natureza</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Inserção</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={uploadMode === 'text'} onChange={() => setUploadMode('text')} className="accent-[#4A7C59]" />
                  Colar Texto
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={uploadMode === 'file'} onChange={() => setUploadMode('file')} className="accent-[#4A7C59]" />
                  Upload de PDF
                </label>
              </div>
            </div>

            {uploadMode === 'text' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo do Texto</label>
                <Textarea 
                  placeholder="Cole aqui o trecho do documento..." 
                  className="min-h-[200px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo PDF</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-700 p-2 border border-dashed border-gray-300 rounded-md"
                  required
                />
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-md text-sm ${message.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#E57A44] hover:bg-[#D16A34] text-white" disabled={isLoading}>
              {isLoading ? 'Processando Documento (Isso pode levar alguns minutos)...' : 'Adicionar à Base de Conhecimento'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
