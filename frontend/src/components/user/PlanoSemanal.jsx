import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Clock, BookOpen, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIAS_DA_SEMANA_MAP = {
    'Sunday': 'Domingo', 'Monday': 'Segunda', 'Tuesday': 'Terça',
    'Wednesday': 'Quarta', 'Thursday': 'Quinta', 'Friday': 'Sexta', 'Saturday': 'Sábado'
};

const PlanoSemanal = ({ token, API_URL, onUnauthorized }) => {
    const { editalId } = useParams();
    const navigate = useNavigate();
    const [calendario, setCalendario] = useState(null);
    const [nomeEdital, setNomeEdital] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentWeek, setCurrentWeek] = useState(new Date());

    const fetchDados = useCallback(async () => {
        setIsLoading(true);
        try {
            // Buscar nome do edital
            const editalRes = await fetch(`${API_URL}/api/edital-verticalizado/${editalId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (editalRes.ok) setNomeEdital((await editalRes.json()).nome);

            // Buscar calendário
            const calRes = await fetch(`${API_URL}/api/calendario/${editalId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (calRes.status === 401) return onUnauthorized();
            if (!calRes.ok) throw new Error('Calendário não encontrado.');
            setCalendario((await calRes.json()).data);

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token, API_URL, editalId, onUnauthorized]);

    useEffect(() => {
        fetchDados();
    }, [fetchDados]);

    const renderHeader = () => {
        const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Segunda
        const end = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Domingo
        const formato = "d 'de' MMMM";
        return (
            <div className="flex justify-between items-center p-4 bg-white rounded-t-xl border-b">
                <button onClick={() => navigate('/painel-estudante')} className="flex items-center text-blue-600 hover:underline">
                    <ArrowLeft size={18} className="mr-2" />
                    Voltar ao Painel
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2 rounded-full hover:bg-gray-100">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 text-center">
                        {format(start, formato, { locale: ptBR })} - {format(end, formato, { locale: ptBR })}
                    </h2>
                    <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2 rounded-full hover:bg-gray-100">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
                 <div className="w-32"></div> {/* Espaçador para centralizar o título */}
            </div>
        );
    };

    const renderWeek = () => {
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Começa na Segunda
        const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

        return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2 p-4">
                {weekDays.map(day => {
                    const diaSemanaIngles = format(day, 'EEEE');
                    const diaSemanaPortugues = DIAS_DA_SEMANA_MAP[diaSemanaIngles];
                    const blocosDoDia = calendario ? (calendario[diaSemanaPortugues] || []) : [];

                    return (
                        <div key={day.toString()} className="bg-gray-50 rounded-lg p-3 min-h-[200px]">
                            <h3 className="font-bold text-center text-gray-700 mb-3">
                                {format(day, 'EEEE', { locale: ptBR })}
                                <span className="block text-2xl text-blue-600">{format(day, 'd')}</span>
                            </h3>
                            <div className="space-y-2">
                                {blocosDoDia.map((bloco, index) => (
                                    <div key={index} className="bg-white p-2 rounded-md shadow border-l-4 border-blue-400">
                                        <p className="font-semibold text-sm text-blue-900 truncate">{bloco.materia}</p>
                                        <p className="text-xs text-gray-600 flex items-center mt-1"><Clock size={12} className="mr-1"/>{bloco.inicio} - {bloco.fim}</p>
                                        {bloco.comentario && <p className="text-xs text-gray-600 flex items-center mt-1"><BookOpen size={12} className="mr-1"/>{bloco.comentario}</p>}
                                    </div>
                                ))}
                                {blocosDoDia.length === 0 && <div className="text-center text-xs text-gray-400 pt-8">Nenhum estudo agendado.</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-12 w-12 text-blue-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">{nomeEdital}</h1>
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl mx-auto">
                {renderHeader()}
                {renderWeek()}
            </div>
        </div>
    );
};

export default PlanoSemanal;



