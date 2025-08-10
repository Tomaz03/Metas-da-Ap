import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, Save, Loader2, ArrowLeft, ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';
import MessageModal from '../ui/MessageModal';

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const Calendario = () => {
  const { editalId } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');

  const [calendario, setCalendario] = useState({});
  const [materiasComAtividades, setMateriasComAtividades] = useState([]);
  const [nomeEdital, setNomeEdital] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [expandedDay, setExpandedDay] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchDados = useCallback(async () => {
    setIsLoading(true);
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const [materiasRes, editalRes, calendarioRes] = await Promise.all([
        fetch(`${API_URL}/api/edital/${editalId}/materias`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/edital-verticalizado/${editalId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/calendario/${editalId}`, { headers: { Authorization: `Bearer ${token}` } }) // <-- URL GET correta
      ]);

      if (!materiasRes.ok) throw new Error('Falha ao buscar matérias.');
      const materiasData = await materiasRes.json();
      const materiasExpandidas = materiasData.flatMap(materia => [materia, `Exercícios - ${materia}`, `Revisão - ${materia}`]);
      setMateriasComAtividades(materiasExpandidas);

      if (editalRes.ok) {
        const editalData = await editalRes.json();
        setNomeEdital(editalData.nome);
      }

      if (calendarioRes.ok) {
        const calendarioData = await calendarioRes.json();
        setCalendario(calendarioData.data || {});
        setDataInicio(calendarioData.data_inicio || '');
        setDataFim(calendarioData.data_fim || '');
      } else if (calendarioRes.status === 404) {
        const calendarioVazio = DIAS_SEMANA.reduce((acc, dia) => ({ ...acc, [dia]: [] }), {});
        setCalendario(calendarioVazio);
      } else {
        throw new Error('Erro ao buscar dados do calendário.');
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  }, [editalId, token, API_URL, navigate]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  const handleAddBlock = (dia) => {
    const blocosDoDia = calendario[dia] || [];
    let novoInicio = '08:00';
    let novoFim = '09:30';

    if (blocosDoDia.length > 0) {
      const ultimoBloco = blocosDoDia[blocosDoDia.length - 1];
      novoInicio = ultimoBloco.fim;
      const [hours, minutes] = novoInicio.split(':').map(Number);
      const newEndTime = new Date(1970, 0, 1, hours, minutes + 90);
      novoFim = `${String(newEndTime.getHours()).padStart(2, '0')}:${String(newEndTime.getMinutes()).padStart(2, '0')}`;
    }
    const novoBloco = { materia: materiasComAtividades[0] || '', inicio: novoInicio, fim: novoFim, comentario: '' };
    setCalendario(prev => ({ ...prev, [dia]: [...blocosDoDia, novoBloco] }));
  };

  const handleRemoveBlock = (dia, index) => {
    setCalendario(prev => ({ ...prev, [dia]: prev[dia].filter((_, i) => i !== index) }));
  };

  const handleBlockChange = (dia, index, field, value) => {
    setCalendario(prev => {
      const novosBlocos = [...prev[dia]];
      novosBlocos[index] = { ...novosBlocos[index], [field]: value };
      return { ...prev, [dia]: novosBlocos };
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // AJUSTE FINAL: A URL do POST foi corrigida para /api/calendario/
      const response = await fetch(`${API_URL}/api/calendario/${editalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: calendario,
          data_inicio: dataInicio || null,
          data_fim: dataFim || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Falha ao salvar o calendário.' }));
        throw new Error(errorData.detail || 'Erro desconhecido');
      }

      setMessage('Calendário salvo com sucesso!');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const calcularHorasLiquidasDia = (dia) => {
    return (calendario[dia] || []).reduce((total, bloco) => {
      const inicio = new Date(`1970-01-01T${bloco.inicio}:00`);
      const fim = new Date(`1970-01-01T${bloco.fim}:00`);
      return fim > inicio ? total + (fim - inicio) / 3600000 : total;
    }, 0);
  };

  const horasLiquidasTotais = DIAS_SEMANA.reduce((total, dia) => total + calcularHorasLiquidasDia(dia), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {message && <MessageModal message={message} type={messageType} onClose={() => setMessage('')} />}
      <header className="flex items-center justify-between mb-8 md:mb-12">
        <button onClick={() => navigate('/meus-editais')} className="flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft size={20} className="mr-2" /> <span className="hidden md:inline">Voltar</span>
        </button>
        <div className="flex-1 text-center px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Meu Calendário de Estudos</h1>
          <p className="text-sm md:text-lg text-gray-600 font-medium">Edital: {nomeEdital}</p>
        </div>
        <div className="w-16 md:w-24"></div>
      </header>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center"><CalendarIcon size={20} className="mr-2 text-purple-600" /> Definir Período de Estudo</h2>
          <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
            <div className="flex-1">
              <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-600 mb-1">Data de Início</label>
              <input type="date" id="dataInicio" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="flex-1">
              <label htmlFor="dataFim" className="block text-sm font-medium text-gray-600 mb-1">Data de Término</label>
              <input type="date" id="dataFim" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 text-center">
          <h2 className="text-lg font-semibold text-gray-700">Horas Líquidas Totais por Semana</h2>
          <span className="text-4xl font-extrabold text-blue-600">{horasLiquidasTotais.toFixed(2).replace('.', ',')}h</span>
        </div>

        <div className="space-y-4">
          {DIAS_SEMANA.map(dia => {
            const isExpanded = expandedDay === dia;
            return (
              <div key={dia} className="bg-white rounded-xl shadow-md overflow-hidden">
                <button onClick={() => setExpandedDay(isExpanded ? null : dia)} className="w-full flex justify-between items-center p-5 font-semibold text-left">
                  <div className="flex items-center">
                    <span className="text-xl">{dia}</span>
                    <span className="ml-4 text-sm font-normal text-gray-500">{calcularHorasLiquidasDia(dia).toFixed(2).replace('.', ',')}h de estudo</span>
                  </div>
                  {isExpanded ? <ChevronUp size={24} className="text-blue-500" /> : <ChevronDown size={24} className="text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="p-5 border-t">
                    <div className="space-y-4">
                      {(calendario[dia] || []).map((bloco, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-xl border-l-4 border-blue-400 relative space-y-3">
                          <button onClick={() => handleRemoveBlock(dia, index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500" title="Remover bloco"><Trash2 size={20} /></button>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500">Matéria / Atividade</label>
                            <select value={bloco.materia} onChange={(e) => handleBlockChange(dia, index, 'materia', e.target.value)} className="w-full p-2 border rounded-lg mt-1">
                              {materiasComAtividades.map((m, i) => <option key={i} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div className="flex space-x-2">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-500">Início</label>
                              <input type="time" value={bloco.inicio} onChange={(e) => handleBlockChange(dia, index, 'inicio', e.target.value)} className="w-full p-2 border rounded-lg mt-1" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-500">Fim</label>
                              <input type="time" value={bloco.fim} onChange={(e) => handleBlockChange(dia, index, 'fim', e.target.value)} className="w-full p-2 border rounded-lg mt-1" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500">Comentário</label>
                            <textarea rows="2" value={bloco.comentario} onChange={(e) => handleBlockChange(dia, index, 'comentario', e.target.value)} placeholder="Anote o que será estudado..." className="w-full p-2 border rounded-lg mt-1 resize-y" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => handleAddBlock(dia)} className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200" disabled={materiasComAtividades.length === 0}>
                      <PlusCircle size={18} className="mr-2" /> Adicionar Bloco
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 flex justify-center sticky bottom-4">
        <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center px-8 py-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 disabled:bg-gray-400">
          {isSaving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-5 w-5" /> Salvar Calendário</>}
        </button>
      </div>
    </div>
  );
};

export default Calendario;


















