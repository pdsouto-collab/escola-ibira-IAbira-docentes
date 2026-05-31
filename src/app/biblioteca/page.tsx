'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

type Session = {
  id: string;
  tema: string | null;
  faixaEtaria: string | null;
  cicloNatureza: string | null;
  educador: { nome: string };
  finalContent: { content: string } | null;
  updatedAt: string;
};

export default function BibliotecaPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [faixaFiltro, setFaixaFiltro] = useState('TODAS');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const faixas = ['TODAS', 'Infantil', '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'];

  useEffect(() => {
    fetchSessions();
  }, [faixaFiltro]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/biblioteca?faixaEtaria=${faixaFiltro}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FBF9]">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#2A4B3A]">Biblioteca de Vivências</h1>
        <div className="flex gap-3">
          <Button className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white shadow-sm transition-all" onClick={() => window.location.href = '/'}>Painel do Educador</Button>
          <Button className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white shadow-sm transition-all" onClick={() => window.location.href = '/diretoria'}>Painel da Diretoria</Button>
        </div>
      </header>

      <main className="container mx-auto p-6 flex gap-6 h-[calc(100vh-80px)]">
        {/* Menu Lateral de Filtros e Lista */}
        <div className="w-1/3 flex flex-col gap-4 border-r pr-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por Faixa Etária</label>
            <select 
              className="w-full border rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
              value={faixaFiltro}
              onChange={(e) => setFaixaFiltro(e.target.value)}
            >
              {faixas.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <ScrollArea className="flex-1 bg-white rounded-md border p-2 shadow-inner">
            {loading ? (
              <p className="text-sm text-gray-500 p-4">Carregando...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-500 p-4">Nenhuma vivência encontrada para este filtro.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map(s => (
                  <Card 
                    key={s.id} 
                    className={`cursor-pointer transition-colors ${selectedSession?.id === s.id ? 'border-[#4A7C59] bg-[#E8F3EB]' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedSession(s)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-md text-[#2A4B3A]">{s.tema || 'Sem Tema Definido'}</CardTitle>
                      <CardDescription className="text-xs">
                        {s.faixaEtaria} • {s.cicloNatureza} <br/>
                        Por: {s.educador.nome}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Área Principal de Leitura */}
        <div className="flex-1 bg-white border rounded-md shadow-sm overflow-hidden flex flex-col">
          {selectedSession ? (
            <>
              <div className="bg-[#E8F3EB] p-4 border-b">
                <h2 className="text-xl font-bold text-[#2A4B3A]">{selectedSession.tema}</h2>
                <p className="text-sm text-gray-600">Criado por {selectedSession.educador.nome} | Atualizado em {new Date(selectedSession.updatedAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <ScrollArea className="flex-1 p-8 prose prose-emerald max-w-none">
                {selectedSession.finalContent?.content ? (
                  <ReactMarkdown>{selectedSession.finalContent.content}</ReactMarkdown>
                ) : (
                  <p className="text-gray-500 italic">Conteúdo vazio.</p>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Selecione uma vivência na lista para ler os detalhes.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
