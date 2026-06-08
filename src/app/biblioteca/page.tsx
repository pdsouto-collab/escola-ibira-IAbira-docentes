'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import UserMenu from '@/components/UserMenu';

type Session = {
  id: string;
  tema: string | null;
  faixaEtaria: string | null;
  cicloNatureza: string | null;
  educador: { nome: string };
  finalContent: { content: string } | null;
  updatedAt: string;
  classifications: { year: string; subcategory: string }[];
};

export default function BibliotecaPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [yearFilter, setYearFilter] = useState('TODAS');
  const [subFilter, setSubFilter] = useState('TODAS');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeMobileView, setActiveMobileView] = useState<'list' | 'detail'>('list');

  const faixasAnos = ["TODAS", "Infantil", "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
  const [subCategories, setSubCategories] = useState<string[]>(['TODAS']);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const url = yearFilter === 'TODAS' 
          ? '/api/subcategories' 
          : `/api/subcategories?year=${yearFilter}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const uniqueNames = Array.from(new Set(data.subcategories.map((s: any) => s.name))) as string[];
          uniqueNames.sort();
          setSubCategories(['TODAS', ...uniqueNames]);
          
          if (subFilter !== 'TODAS' && !uniqueNames.includes(subFilter)) {
            setSubFilter('TODAS');
          }
        }
      } catch (error) {
        console.error("Erro ao buscar sub-categorias para filtros:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [yearFilter]);

  useEffect(() => {
    fetchSessions();
  }, [yearFilter, subFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/biblioteca?year=${yearFilter}&subcategory=${subFilter}`);
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
        <div className="flex gap-3 items-center">
          <Button 
            variant="outline" 
            className="border-[#8fb39c] text-[#8fb39c] hover:bg-[#e8f0eb] hover:text-[#7a9e88] shadow-sm transition-all" 
            onClick={() => {
              if (typeof window !== 'undefined') {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/';
                }
              }
            }}
          >
            Voltar
          </Button>
          <Button className="bg-[#8fb39c] hover:bg-[#7a9e88] text-white shadow-sm transition-all" onClick={() => window.location.href = '/'}>Painel do Educador</Button>
          <Button className="bg-[#4a5d4e] hover:bg-[#394a3d] text-white shadow-sm transition-all" onClick={() => window.location.href = '/diretoria'}>Painel da Diretoria</Button>
          <UserMenu />
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 h-[calc(100vh-80px)] overflow-hidden">
        {/* Menu Lateral de Filtros e Lista */}
        <div className={`w-full md:w-1/3 flex-col gap-4 border-r md:pr-6 border-[#e3d8c8] ${
          activeMobileView === 'list' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Filtrar por Ano</label>
              <select 
                className="w-full border rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59] text-xs"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {faixasAnos.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Filtrar por Categoria</label>
              <select 
                className="w-full border rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59] text-xs"
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value)}
                disabled={loadingCategories}
              >
                {loadingCategories ? (
                  <option>Carregando...</option>
                ) : (
                  subCategories.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))
                )}
              </select>
            </div>
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
                    onClick={() => {
                      setSelectedSession(s);
                      setActiveMobileView('detail');
                    }}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm font-bold text-[#2A4B3A]">{s.tema || 'Sem Tema Definido'}</CardTitle>
                      <CardDescription className="text-xs">
                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                          {s.classifications && s.classifications.map((c, idx) => (
                            <span key={idx} className="bg-[#f2efe9] text-[#4a5d4e] px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                              {c.year} • {c.subcategory}
                            </span>
                          ))}
                        </div>
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
        <div className={`flex-1 bg-white border rounded-md shadow-sm overflow-hidden flex-col ${
          activeMobileView === 'detail' ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedSession ? (
            <>
              <div className="bg-[#E8F3EB] p-4 border-b">
                <button 
                  onClick={() => setActiveMobileView('list')}
                  className="md:hidden mb-2 text-xs font-semibold text-[#2A4B3A] flex items-center gap-1 hover:text-[#4A7C59] transition-all bg-white/50 px-2.5 py-1 rounded-lg border border-[#cbe1d3] w-fit"
                >
                  ← Voltar para a lista
                </button>
                <h2 className="text-xl font-bold text-[#2A4B3A]">{selectedSession.tema}</h2>
                <div className="flex flex-wrap gap-1.5 my-2">
                  {selectedSession.classifications && selectedSession.classifications.map((c, idx) => (
                    <span key={idx} className="bg-[#4a5d4e] text-white px-2 py-0.5 rounded text-[11px] font-medium">
                      {c.year} • {c.subcategory}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-600">Criado por {selectedSession.educador.nome} | Atualizado em {new Date(selectedSession.updatedAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <ScrollArea className="flex-1 p-6 md:p-8 prose prose-stone max-w-none prose-headings:text-[#2A4B3A] prose-h2:border-b-2 prose-h2:pb-2">
                {selectedSession.finalContent?.content ? (
                  <ReactMarkdown>{selectedSession.finalContent.content}</ReactMarkdown>
                ) : (
                  <p className="text-gray-500 italic">Conteúdo vazio.</p>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
              <button 
                onClick={() => setActiveMobileView('list')}
                className="md:hidden mb-4 text-xs font-semibold text-[#2A4B3A] flex items-center gap-1 bg-white/50 px-2.5 py-1 rounded-lg border border-[#cbe1d3]"
              >
                ← Voltar para a lista
              </button>
              <p>Selecione uma vivência na lista para ler os detalhes.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
