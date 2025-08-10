import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle, XCircle, Loader2, Timer, BookOpen, BarChart2 } from 'lucide-react';
import MessageModal from '../ui/MessageModal';
import DOMPurify from 'dompurify';
import TopNav from "../TopNav"; // Importação adicionada

export default function SimuladoPage({ token, onLogout }) { // Adicionei onLogout nas props
    const location = useLocation();
    const navigate = useNavigate();
    const { simuladoData, tempoLimite } = location.state || {};

    const [questoes, setQuestoes] = useState([]);
    const [indiceAtual, setIndiceAtual] = useState(0);
    const [respostasUsuario, setRespostasUsuario] = useState({});
    const [tempoRestante, setTempoRestante] = useState(tempoLimite * 60);
    const [simuladoFinalizado, setSimuladoFinalizado] = useState(false);
    const [resultados, setResultados] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const timerRef = useRef(null);

    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [mostrarEstatisticas, setMostrarEstatisticas] = useState(false);

    const letraAlternativa = (idx) => String.fromCharCode(97 + idx);

    const handleSubmitSimulado = useCallback(async (tempoEsgotado = false) => {
        console.log("? handleSubmitSimulado() chamado | tempoEsgotado:", tempoEsgotado);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (simuladoFinalizado || isSubmitting) {
            console.warn("⛔ Já finalizado ou em envio. Abortando submissão duplicada.");
            return;
        }

        setSimuladoFinalizado(true);
        setIsSubmitting(true);

        if (!simuladoData || !simuladoData.simulado_id) {
            console.error("simulado_id ausente. Dados recebidos:", simuladoData);
            setMessage("Erro interno: ID do simulado não encontrado.");
            setMessageType("error");
            setIsSubmitting(false);
            return;
        }

        const respostas = questoes.map((q) => ({
            question_id: q.id,
            selected_alternative_id: respostasUsuario[q.id] ?? -1,
        }));

        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL;
            console.log("? Enviando requisição para:", `${apiBaseUrl}/api/simulados/${simuladoData.simulado_id}/submit/`);

            const response = await fetch(`${apiBaseUrl}/api/simulados/${simuladoData.simulado_id}/submit/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    answers: respostas,
                    time_taken_seconds: (tempoLimite * 60) - tempoRestante,
                }),
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    console.warn("Não foi possível parsear a resposta de erro como JSON:", jsonError);
                    errorData = { detail: `Erro do servidor: ${response.status} ${response.statusText}` };
                }
                if (Array.isArray(errorData.detail)) {
                    const validationErrors = errorData.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join('; ');
                    throw new Error(`Erros de validação: ${validationErrors}`);
                }
                throw new Error(errorData.detail || 'Erro desconhecido ao submeter simulado.');
            }

            const resultado = await response.json();
            console.log("✅ Resultado recebido:", resultado);

            setResultados(resultado);
        } catch (error) {
            console.error("❌ Erro ao submeter simulado:", error);
            setMessage("Erro ao submeter o simulado: " + error.message);
            setMessageType("error");
        } finally {
            setIsSubmitting(false);
        }
    }, [token, simuladoData, tempoLimite, tempoRestante, questoes, respostasUsuario]);

    useEffect(() => {
        console.log("[SimuladoPage DEBUG] useEffect de inicialização. location.state:", location.state);
        console.log("[SimuladoPage DEBUG] simuladoData recebido:", simuladoData);
        console.log("[SimuladoPage DEBUG] tempoLimite recebido:", tempoLimite);

        if (!simuladoData || !simuladoData.questoes || simuladoData.questoes.length === 0) {
            setMessage('Nenhum simulado encontrado ou simulado gerado não possui questões. Por favor, configure um simulado primeiro.');
            setMessageType('error');
            console.warn("[SimuladoPage WARNING] Redirecionando para /simulado-config devido a dados ausentes ou simulado vazio.");
            navigate('/simulado-config', { replace: true });
            setIsLoading(false);
            return;
        }

        setQuestoes(simuladoData.questoes);
        setTempoRestante(tempoLimite * 60);
        setIsLoading(false);

    }, [simuladoData, tempoLimite, navigate]);

    useEffect(() => {
        if (!simuladoFinalizado && !isSubmitting) {
            timerRef.current = setInterval(() => {
                setTempoRestante(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                        handleSubmitSimulado(true); 
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [simuladoFinalizado, isSubmitting, handleSubmitSimulado]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const handleAlternativeSelect = (questionId, alternativeId) => {
        setRespostasUsuario(prev => ({
            ...prev,
            [questionId]: alternativeId
        }));
    };

    const handleNextQuestion = () => {
        if (indiceAtual < questoes.length - 1) {
            setIndiceAtual(prev => prev + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (indiceAtual > 0) {
            setIndiceAtual(prev => prev - 1);
        }
    };

    const handleFirstQuestion = () => {
        setIndiceAtual(0);
    };

    const handleLastQuestion = () => {
        setIndiceAtual(questoes.length - 1);
    };

    const closeMessageModal = () => {
        setMessage('');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600">Carregando simulado...</span>
            </div>
        );
    }

    const currentQuestion = questoes[indiceAtual];
    if (!currentQuestion && !simuladoFinalizado) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-lg text-gray-600">Erro: Questão atual inválida ou simulado vazio.</p>
            </div>
        );
    }

    if (simuladoFinalizado) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
                <TopNav onLogout={onLogout} /> {/* TopNav adicionado */}
                <MessageModal message={message} type={messageType} onClose={closeMessageModal} />
                <main className="flex-grow container mx-auto p-6">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Seu Desempenho:</h2>
                        {resultados ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                                    <p className="text-sm text-gray-600">Questões Totais</p>
                                    <p className="text-2xl font-bold text-blue-800">{resultados.acertos_total + resultados.erros_total}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                                    <p className="text-sm text-gray-600">Acertos</p>
                                    <p className="text-2xl font-bold text-green-800">{resultados.acertos_total}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg shadow-sm">
                                    <p className="text-sm text-gray-600">Erros</p>
                                    <p className="text-2xl font-bold text-red-800">{resultados.erros_total}</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
                                    <p className="text-sm text-gray-600">Percentual de Acertos</p>
                                    <p className="text-2xl font-bold text-purple-800">{resultados.percentual_acerto.toFixed(2)}%</p>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg shadow-sm flex flex-col justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Tempo Utilizado</p>
                                        <p className="text-2xl font-bold text-yellow-800">{formatTime(resultados.tempo_utilizado)}</p>
                                    </div>
                                    <button
                                        onClick={() => setMostrarEstatisticas(prev => !prev)}
                                        className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-300 shadow-md flex items-center justify-center"
                                    >
                                        <BarChart2 className="h-5 w-5 mr-2" />
                                        {mostrarEstatisticas ? 'Ocultar Estatísticas' : 'Mais Estatísticas'}
                                    </button>
                                </div>

                                {mostrarEstatisticas && (
                                    <div className="md:col-span-2 mt-6 p-4 bg-gray-100 rounded-lg shadow-inner">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4">Estatísticas Detalhadas:</h3>
                                        
                                        <div className="mb-6">
                                            <h4 className="text-lg font-semibold text-gray-700 mb-2">Por Tipo de Conhecimento:</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-blue-100 p-3 rounded-md">
                                                    <p className="text-blue-800 font-medium">Básicos:</p>
                                                    <p>Acertos: {resultados.acertos_basicos}</p>
                                                    <p>Erros: {resultados.erros_basicos}</p>
                                                </div>
                                                <div className="bg-purple-100 p-3 rounded-md">
                                                    <p className="text-purple-800 font-medium">Específicos:</p>
                                                    <p>Acertos: {resultados.acertos_especificos}</p>
                                                    <p>Erros: {resultados.erros_especificos}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h4 className="text-lg font-semibold text-gray-700 mb-2">Por Matéria:</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {Object.keys(resultados.acertos_por_materia || {}).map(materia => (
                                                    <div key={materia} className="bg-gray-200 p-3 rounded-md">
                                                        <p className="font-medium text-gray-800">{materia}:</p>
                                                        <p>Acertos: {resultados.acertos_por_materia[materia]}</p>
                                                        <p>Erros: {resultados.erros_por_materia[materia] ?? 0}</p>
                                                    </div>
                                                ))}
                                                {Object.keys(resultados.acertos_por_materia || {}).length === 0 && (
                                                    <p className="text-gray-600">Nenhuma estatística por matéria disponível.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-700 mb-2">Por Assunto:</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {Object.keys(resultados.acertos_por_assunto || {}).map(assunto => (
                                                    <div key={assunto} className="bg-gray-200 p-3 rounded-md">
                                                        <p className="font-medium text-gray-800">{assunto}:</p>
                                                        <p>Acertos: {resultados.acertos_por_assunto[assunto]}</p>
                                                        <p>Erros: {resultados.erros_por_assunto[assunto] ?? 0}</p>
                                                    </div>
                                                ))}
                                                {Object.keys(resultados.acertos_por_assunto || {}).length === 0 && (
                                                    <p className="text-gray-600">Nenhuma estatística por assunto disponível.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2 mt-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">Feedback Detalhado das Questões:</h3>
                                    {resultados.feedback_questoes.map((fb, index) => (
                                        <div key={fb.question_id} className="mb-6 p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
                                            <p className="font-semibold text-lg text-gray-700 mb-2">Questão {index + 1}:</p>
                                            <div
                                                className="text-gray-800 mb-3 prose max-w-none text-justify"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fb.content) }}
                                            />
                                            <ul className="space-y-2 mb-3">
                                                {fb.alternatives.map((alt) => (
                                                    <li
                                                        className={`grid grid-cols-[auto_1fr] gap-2 items-start p-2 rounded-md transition-colors duration-200
                                                            ${alt.id === fb.correct_alternative_id ? 'bg-green-100 font-bold text-green-800' : ''}
                                                            ${!fb.is_correct && (alt.id -1) === fb.selected_alternative_id ? 'bg-red-100 text-red-800 line-through' : ''}
                                                            ${(alt.id !== fb.correct_alternative_id && (alt.id -1) !== fb.selected_alternative_id) ? 'text-gray-700' : ''}
                                                        `}
                                                    >
                                                        <span className="font-mono mt-1">{letraAlternativa(alt.id - 1)}.</span>
                                                        <span className="text-justify">{alt.text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className={`font-bold flex items-center ${fb.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                                                {fb.is_correct ? <CheckCircle className="mr-2" size={20} /> : <XCircle className="mr-2" size={20} />}
                                                Você {fb.is_correct ? 'Acertou' : 'Errou'}!
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-lg text-gray-600">Carregando resultados...</p>
                        )}

                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => navigate('/simulado-config')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300 shadow-md"
                            >
                                Criar Novo Simulado
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter flex flex-col">
            <TopNav onLogout={onLogout} /> {/* TopNav adicionado */}
            
            {message && (
                <MessageModal
                    message={message}
                    type={messageType}
                    onClose={closeMessageModal} />
            )}

            <main className="flex-grow container mx-auto p-6">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center text-lg font-semibold text-gray-700 bg-blue-100 px-4 py-2 rounded-full shadow-inner">
                            <Timer className="h-5 w-5 mr-2 text-blue-600" />
                            Tempo Restante: {formatTime(tempoRestante)}
                        </div>
                    </div>

                    {currentQuestion.tipo === 'basico' && (
                        <p className="text-md font-semibold text-blue-700 mb-1">Conhecimentos Básicos</p>
                    )}
                    {currentQuestion.tipo === 'especifico' && (
                        <p className="text-md font-semibold text-purple-700 mb-1">Conhecimentos Específicos</p>
                    )}
                    {!currentQuestion.tipo && (
                        <p className="text-md font-semibold text-gray-500 mb-1">Tipo de Conhecimento Não Definido</p>
                    )}

                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Questão {indiceAtual + 1} de {questoes.length}
                        <span className="ml-2 text-gray-600 text-base font-normal">({currentQuestion.materia} - {currentQuestion.assunto})</span>
                    </h2>

                    <div
                        className="prose lg:prose-lg max-w-none mb-6 p-4 border border-gray-200 rounded-md bg-gray-50 text-justify"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQuestion.content) }}
                    />

                    <div className="space-y-3">
                        {currentQuestion.alternativas && currentQuestion.alternativas.map((alt) => (
                            <label
                                key={alt.id}
                                className={`grid grid-cols-[auto_1fr] gap-3 p-3 border rounded-lg cursor-pointer transition-colors duration-200 
                                    ${respostasUsuario[currentQuestion.id] === (alt.id - 1)
                                        ? 'bg-blue-100 border-blue-500 shadow-md'
                                        : 'bg-white border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${currentQuestion.id}`}
                                    value={alt.id - 1}
                                    checked={respostasUsuario[currentQuestion.id] === (alt.id - 1)}
                                    onChange={() => handleAlternativeSelect(currentQuestion.id, alt.id - 1)}
                                    className="form-radio h-5 w-5 text-blue-600 mt-1"
                                />
                                <div className="flex">
                                    <span className="font-semibold text-gray-800 mr-2">{letraAlternativa(alt.id - 1)}.</span>
                                    <span className="text-gray-700 text-justify">{alt.text}</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-between items-center">
                        <div className="flex space-x-2">
                            <button
                                onClick={handleFirstQuestion}
                                disabled={indiceAtual === 0}
                                className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                title="Primeira Questão"
                            >
                                <ChevronsLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handlePreviousQuestion}
                                disabled={indiceAtual === 0}
                                className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                title="Questão Anterior"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => handleSubmitSimulado()}
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Finalizando...
                                </>
                            ) : (
                                'Finalizar Simulado'
                            )}
                        </button>

                        <div className="flex space-x-2">
                            <button
                                onClick={handleNextQuestion}
                                disabled={indiceAtual === questoes.length - 1}
                                className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                title="Próxima Questão"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleLastQuestion}
                                disabled={indiceAtual === questoes.length - 1}
                                className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                title="Última Questão"
                            >
                                <ChevronsRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}







    





