// frontend/src/components/QuestionSearch.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageModal from './ui/MessageModal';
import RichTextEditor from '../RichTextEditor'; // Necessário para exibir RichText
import DOMPurify from 'dompurify';
import { Search, CheckCircle, XCircle, MessageSquare, BookText, BarChart, ClipboardList, User } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts"; // Para estatísticas

// Array de letras para mapear índices para letras de alternativas
const letras = ['A', 'B', 'C', 'D', 'E'];

// Função utilitária para remover tags <p> e <br> do HTML
const removePTags = (htmlString) => {
    if (!htmlString) return '';
    let cleanedString = htmlString.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '');
    cleanedString = cleanedString.replace(/<br\s*\/?>/g, ' ');
    return cleanedString.trim();
};

export default function QuestionSearch({ token, onLogout }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundQuestion, setFoundQuestion] = useState(null);

    // Estados para controle dos itens da questão
    const [respostaUsuario, setRespostaUsuario] = useState(null);
    const [mostrarFeedback, setMostrarFeedback] = useState(false);
    const [cliquesPorAlternativa, setCliquesPorAlternativa] = useState({});

    const [mensagem, setMensagem] = useState('');
    const [tipoMensagem, setTipoMensagem] = useState('info');
    const [isSearching, setIsSearching] = useState(false);

    // Estados para as abas
    const [abaAtiva, setAbaAtiva] = useState('comentarioProfessor'); // Aba padrão
    const [commentsProfessor, setCommentsProfessor] = useState(null);
    const [commentsAlunos, setCommentsAlunos] = useState([]);
    const [theoryContentForQuestion, setTheoryContentForQuestion] = useState(null);
    const [estatisticasQuestao, setEstatisticasQuestao] = useState(null);
    const [noteContent, setNoteContent] = useState('');
    const [noteId, setNoteId] = useState(null);
    const [noteCreatedAt, setNoteCreatedAt] = useState(null);
    const [noteUpdatedAt, setNoteUpdatedAt] = useState(null);

    const [isLoadingTabContent, setIsLoadingTabContent] = useState(false); // Para carregamento do conteúdo das abas

    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;

    // Efeito para resetar o estado quando a questão buscada muda
    useEffect(() => {
        setRespostaUsuario(null);
        setMostrarFeedback(false);
        setCliquesPorAlternativa({});
        // Reseta o conteúdo das abas ao buscar nova questão
        setCommentsProfessor(null);
        setCommentsAlunos([]);
        setTheoryContentForQuestion(null);
        setEstatisticasQuestao(null);
        setNoteContent('');
        setNoteId(null);
        setNoteCreatedAt(null);
        setNoteUpdatedAt(null);
        setAbaAtiva('comentarioProfessor'); // Volta para a primeira aba ao carregar nova questão
    }, [foundQuestion]);

    // Lógica de clique para as alternativas
    const handleAlternativaClick = useCallback((index) => {
        if (mostrarFeedback) return;
        setCliquesPorAlternativa((prev) => {
            const novos = { ...prev };
            if (respostaUsuario === index) {
                novos[index] = 0;
                setRespostaUsuario(null);
            } else {
                novos[index] = 1;
                Object.keys(novos).forEach((k) => {
                    if (parseInt(k) !== index && novos[k] === 1) delete novos[k];
                });
                setRespostaUsuario(index);
            }
            return novos;
        });
    }, [mostrarFeedback, respostaUsuario]);

    // Lógica para confirmar a resposta
    const handleConfirmarResposta = useCallback(() => {
        if (respostaUsuario === null) {
            setMensagem('Por favor, selecione uma alternativa antes de resolver.');
            setTipoMensagem('warning');
            return;
        }
        setMostrarFeedback(true);
    }, [respostaUsuario]);

    // Function to handle unauthorized access or session expiration
    const handleUnauthorized = useCallback(() => {
        setMensagem('Sessão expirada ou não autorizada. Faça login novamente.');
        setTipoMensagem('error');
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            console.error("onLogout não é uma função em QuestionSearch.");
        }
        navigate('/login');
    }, [onLogout, navigate]);

    // Function to search for the question (lógica unificada)
    const handleSearch = useCallback(async () => {
        setFoundQuestion(null);
        setRespostaUsuario(null);
        setMostrarFeedback(false);
        setCliquesPorAlternativa({});
        setMensagem('');
        setTipoMensagem('info');
        setIsSearching(true);

        if (!searchTerm.trim()) {
            setMensagem('Por favor, digite um termo de busca.');
            setTipoMensagem('warning');
            setIsSearching(false);
            return;
        }

        let url = '';
        const isNumeric = /^\d+$/.test(searchTerm.trim());

        try {
            if (isNumeric) {
                url = `${API_URL}/api/questions/${searchTerm.trim()}`;
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setFoundQuestion({
                            ...data,
                            isAnulada: data.is_anulada || false,
                            isDesatualizada: data.is_desatualizada || false,
                        });
                        setMensagem('Questão encontrada por ID!');
                        setTipoMensagem('success');
                        setIsSearching(false);
                        return;
                    }
                }
                console.log('Questão não encontrada por ID ou erro, tentando por enunciado...');
            }

            url = `${API_URL}/api/questions/search?q=${encodeURIComponent(searchTerm.trim())}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || `Erro na API: ${res.status}`);
            }

            const data = await res.json();

            if (data && data.length > 0) {
                setFoundQuestion({
                    ...data[0],
                    isAnulada: data[0].is_anulada || false,
                    isDesatualizada: data[0].is_desatualizada || false,
                });
                setMensagem('Questão encontrada por enunciado!');
                setTipoMensagem('success');
            } else {
                setMensagem('Nenhuma questão encontrada com o termo fornecido.');
                setTipoMensagem('error');
            }
        } catch (err) {
            console.error('Erro ao buscar questão:', err);
            setMensagem(err.message || 'Não foi possível buscar a questão. Verifique sua conexão.');
            setTipoMensagem('error');
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm, token, API_URL, handleUnauthorized]);

    // --- Funções de Fetch para o conteúdo das abas ---

    const fetchCommentsForQuestion = useCallback(async (questionId) => {
        if (!questionId || !token) return;
        setIsLoadingTabContent(true);
        try {
            const res = await fetch(`${API_URL}/api/questions/${questionId}/comments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) { handleUnauthorized(); return; }
            if (!res.ok) { throw new Error('Erro ao carregar comentários.'); }
            const data = await res.json();
            // Filtrar comentários do professor e de alunos
            const professorComments = data.filter(c => c.is_professor_comment);
            const studentComments = data.filter(c => !c.is_professor_comment);
            setCommentsProfessor(professorComments.length > 0 ? professorComments[0].content : null); // Assumindo 1 comentário de professor por questão
            setCommentsAlunos(studentComments);
        } catch (error) {
            console.error('Erro ao buscar comentários:', error);
            setMensagem('Erro ao carregar comentários.');
            setTipoMensagem('error');
        } finally {
            setIsLoadingTabContent(false);
        }
    }, [token, API_URL, handleUnauthorized]);

    const fetchTheoryContent = useCallback(async (questionId) => {
        if (!questionId || !token) return;
        setIsLoadingTabContent(true);
        try {
            const res = await fetch(`${API_URL}/api/questions/${questionId}/theory`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) { handleUnauthorized(); return; }
            if (res.status === 404) { setTheoryContentForQuestion(null); return; } // Teoria não encontrada
            if (!res.ok) { throw new Error('Erro ao carregar teoria.'); }
            const data = await res.json();
            setTheoryContentForQuestion(data.content);
        } catch (error) {
            console.error('Erro ao buscar teoria:', error);
            setMensagem('Erro ao carregar teoria.');
            setTipoMensagem('error');
        } finally {
            setIsLoadingTabContent(false);
        }
    }, [token, API_URL, handleUnauthorized]);

    const fetchStatisticsForQuestion = useCallback(async (questionId) => {
        if (!questionId || !token) return;
        setIsLoadingTabContent(true);
        try {
            const res = await fetch(`${API_URL}/api/questions/${questionId}/statistics`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) { handleUnauthorized(); return; }
            if (res.status === 404) { setEstatisticasQuestao(null); return; } // Estatísticas não encontradas
            if (!res.ok) { throw new Error('Erro ao carregar estatísticas.'); }
            const data = await res.json();
            setEstatisticasQuestao(data);
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            setMensagem('Erro ao carregar estatísticas.');
            setTipoMensagem('error');
        } finally {
            setIsLoadingTabContent(false);
        }
    }, [token, API_URL, handleUnauthorized]);

    // Função para buscar anotação do usuário (adaptada para esta página)
    const fetchUserNote = useCallback(async (questionId) => {
        if (!questionId || !token) return;
        setIsLoadingTabContent(true); // Usar o mesmo estado de carregamento para as abas
        try {
            const res = await fetch(`${API_URL}/api/notes/${questionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) { handleUnauthorized(); return; }
            if (res.status === 404) {
                setNoteId(null);
                setNoteContent('');
                setNoteCreatedAt(null);
                setNoteUpdatedAt(null);
            } else if (res.ok) {
                const data = await res.json();
                setNoteId(data.id);
                setNoteContent(data.content || '');
                setNoteCreatedAt(data.created_at);
                setNoteUpdatedAt(data.updated_at || data.created_at);
            } else {
                const error = await res.json();
                throw new Error(error.detail || 'Erro ao buscar anotação');
            }
        } catch (error) {
            console.error('Erro ao buscar anotação (catch):', error);
            setMensagem('Erro ao carregar anotação');
            setTipoMensagem('error');
        } finally {
            setIsLoadingTabContent(false);
        }
    }, [token, API_URL, handleUnauthorized]);

    // Efeito para carregar o conteúdo da aba ativa quando a aba ou a questão muda
    useEffect(() => {
        if (foundQuestion?.id) {
            switch (abaAtiva) {
                case 'comentarioProfessor':
                    fetchCommentsForQuestion(foundQuestion.id);
                    break;
                case 'comentariosAlunos':
                    fetchCommentsForQuestion(foundQuestion.id); // Busca os mesmos comentários, mas filtraremos na renderização
                    break;
                case 'teoriaQuestao':
                    fetchTheoryContent(foundQuestion.id);
                    break;
                case 'estatisticas':
                    fetchStatisticsForQuestion(foundQuestion.id);
                    break;
                case 'anotacoes':
                    fetchUserNote(foundQuestion.id);
                    break;
                default:
                    break;
            }
        }
    }, [abaAtiva, foundQuestion?.id, fetchCommentsForQuestion, fetchTheoryContent, fetchStatisticsForQuestion, fetchUserNote]);


    // --- Funções de Renderização do Conteúdo das Abas ---

    const renderComentarioProfessor = () => {
        if (isLoadingTabContent) return <p className="text-center py-4 text-gray-600">Carregando comentário do professor...</p>;
        if (!commentsProfessor) return <p className="text-center py-4 text-gray-600">Nenhum comentário de professor disponível para esta questão.</p>;
        return (
            <div className="prose max-w-none text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(commentsProfessor) }}></div>
            </div>
        );
    };

    const renderComentariosAlunos = () => {
        if (isLoadingTabContent) return <p className="text-center py-4 text-gray-600">Carregando comentários dos alunos...</p>;
        if (commentsAlunos.length === 0) return <p className="text-center py-4 text-gray-600">Nenhum comentário de aluno disponível para esta questão.</p>;
        return (
            <div className="space-y-4">
                {commentsAlunos.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-800 flex items-center">
                                <User className="w-4 h-4 mr-1 text-blue-500" /> {comment.username || 'Aluno Anônimo'}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="prose max-w-none text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }}></div>
                    </div>
                ))}
            </div>
        );
    };

    const renderTeoriaQuestao = () => {
        if (isLoadingTabContent) return <p className="text-center py-4 text-gray-600">Carregando teoria da questão...</p>;
        if (!theoryContentForQuestion) return <p className="text-center py-4 text-gray-600">Teoria não disponível para esta questão.</p>;
        return (
            <div className="prose max-w-none text-gray-700">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(theoryContentForQuestion) }}></div>
            </div>
        );
    };

    const renderEstatisticas = () => {
        if (isLoadingTabContent) return <p className="text-center py-4 text-gray-600">Carregando estatísticas...</p>;
        if (!estatisticasQuestao) return <p className="text-center py-4 text-gray-600">Estatísticas não disponíveis para esta questão.</p>;

        const totalRespostas = estatisticasQuestao.total_respostas || 0;
        const acertos = estatisticasQuestao.acertos || 0;
        const erros = totalRespostas - acertos;

        const data = [
            { name: 'Acertos', value: acertos },
            { name: 'Erros', value: erros },
        ];
        const COLORS = ['#4CAF50', '#F44336']; // Verde para acertos, Vermelho para erros

        return (
            <div className="flex flex-col items-center justify-center py-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Desempenho Geral na Questão</h4>
                {totalRespostas > 0 ? (
                    <>
                        <PieChart width={200} height={200}>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                        <p className="text-base text-gray-700 mt-4">
                            Total de respostas: <strong className="font-semibold">{totalRespostas}</strong>
                        </p>
                        <p className="text-base text-green-600">
                            Acertos: <strong className="font-semibold">{acertos}</strong>
                        </p>
                        <p className="text-base text-red-600">
                            Erros: <strong className="font-semibold">{erros}</strong>
                        </p>
                    </>
                ) : (
                    <p className="text-gray-600">Ainda não há respostas para esta questão.</p>
                )}
            </div>
        );
    };

    const renderAnotacoes = () => {
        if (isLoadingTabContent) return <p className="text-center py-4 text-gray-600">Carregando anotações...</p>;
        return (
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Minha Anotação</h4>
                {noteContent ? (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="prose max-w-none text-gray-700 text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(noteContent) }}></div>
                        <p className="text-xs text-gray-500 mt-2">
                            Criado em: {noteCreatedAt ? new Date(noteCreatedAt).toLocaleDateString() : 'N/A'} -
                            Última atualização: {noteUpdatedAt ? new Date(noteUpdatedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-sm text-blue-600 mt-2">
                            * As anotações não podem ser editadas ou salvas nesta página.
                        </p>
                    </div>
                ) : (
                    <p className="text-center py-4 text-gray-600">Nenhuma anotação para esta questão.</p>
                )}
            </div>
        );
    };

    // Função auxiliar para renderizar o conteúdo da aba ativa
    const renderActiveTabContent = useCallback(() => {
        switch (abaAtiva) {
            case 'comentarioProfessor':
                return renderComentarioProfessor();
            case 'comentariosAlunos':
                return renderComentariosAlunos();
            case 'teoriaQuestao':
                return renderTeoriaQuestao();
            case 'estatisticas':
                return renderEstatisticas();
            case 'anotacoes':
                return renderAnotacoes();
            default:
                return <p className="text-center py-4 text-gray-600">Selecione uma aba para ver o conteúdo.</p>;
        }
    }, [abaAtiva, isLoadingTabContent, commentsProfessor, commentsAlunos, theoryContentForQuestion, estatisticasQuestao, noteContent, noteCreatedAt, noteUpdatedAt]);


    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Buscar Questão</h1>

                {/* Área de Busca - Redesenhada */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-10 w-full max-w-3xl mx-auto border border-gray-200">
                    <div className="flex items-center space-x-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Digite o ID da questão ou parte do enunciado..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed text-base"
                            disabled={isSearching}
                        >
                            {isSearching ? (
                                <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                'Buscar'
                            )}
                        </button>
                    </div>
                    {mensagem && (
                        <MessageModal
                            message={mensagem}
                            type={tipoMensagem}
                            onClose={() => setMensagem('')}
                        />
                    )}
                </div>

                {/* Exibição da Questão */}
                {foundQuestion && (
                    <div className="bg-white rounded-lg shadow-md p-6 w-full mx-auto">
                        <div className="mb-6">
                            {/* Reorganização das informações da questão com grid para melhor layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-base text-gray-700 mb-4">
                                {/* Linha 1: ID, Matéria, Assunto - Agora com o mesmo estilo das linhas de baixo */}
                                <div><strong className="text-gray-800">Questão ID:</strong> {foundQuestion.id}</div>
                                <div><strong className="text-gray-800">Matéria:</strong> {foundQuestion.materia}</div>
                                <div><strong className="text-gray-800">Assunto:</strong> {foundQuestion.assunto}</div>
                                {/* Segunda linha: Banca, Órgão, Cargo */}
                                <div><strong className="text-gray-800">Banca:</strong> {foundQuestion.banca}</div>
                                <div><strong className="text-gray-800">Órgão:</strong> {foundQuestion.orgao}</div>
                                <div><strong className="text-gray-800">Cargo:</strong> {foundQuestion.cargo}</div>
                                {/* Terceira linha: Ano, Escolaridade, Dificuldade */}
                                <div><strong className="text-gray-800">Ano:</strong> {foundQuestion.ano}</div>
                                <div><strong className="text-gray-800">Escolaridade:</strong> {foundQuestion.escolaridade}</div>
                                <div><strong className="text-gray-800">Dificuldade:</strong> {foundQuestion.dificuldade}</div>
                                {/* Quarta linha: Região, Tipo */}
                                <div><strong className="text-gray-800">Região:</strong> {foundQuestion.regiao}</div>
                                <div><strong className="text-gray-800">Tipo:</strong> {foundQuestion.tipo === 'multipla' ? 'Múltipla Escolha' : 'Certo/Errado'}</div>

                                {/* Status de Anulada/Desatualizada */}
                                {foundQuestion.isAnulada && (
                                    <div className="col-span-full text-red-500 font-bold flex items-center mt-2">
                                        <XCircle className="h-4 w-4 mr-1" /> Anulada
                                    </div>
                                )}
                                {foundQuestion.isDesatualizada && (
                                    <div className="col-span-full text-orange-500 font-bold flex items-center mt-2">
                                        <XCircle className="h-4 w-4 mr-1" /> Desatualizada
                                    </div>
                                )}
                            </div>

                            {/* Informações Adicionais (se existirem) */}
                            {foundQuestion.informacoes && (
                                <div className="mt-6 mb-6 text-gray-700 prose max-w-none">
                                    <h3 className="font-semibold text-lg text-gray-800 mb-2">Informações:</h3>
                                    <div className="text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(foundQuestion.informacoes) }}></div>
                                </div>
                            )}

                            {/* Enunciado */}
                            <div className="prose max-w-none mb-4 text-gray-700">
                                <h3 className="font-semibold text-lg text-gray-800 mb-2">Enunciado:</h3>
                                <div className="text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(foundQuestion.enunciado) }}></div>
                            </div>

                            {/* Lógica de renderização de alternativas com base no tipo de questão */}
                            {foundQuestion.tipo === 'multipla' && (
                                <ul className="space-y-3 mb-6">
                                    {['item_a', 'item_b', 'item_c', 'item_d', 'item_e'].map((itemKey, i) => {
                                        const altText = foundQuestion[itemKey];
                                        const correctIndex = letras.indexOf(foundQuestion.gabarito);

                                        if (altText === null || altText === undefined) return null;

                                        return (
                                            <li key={i}>
                                                <label
                                                    className={`flex items-start space-x-3 p-4 rounded-lg transition-all duration-200 cursor-pointer ${
                                                        mostrarFeedback && respostaUsuario === i
                                                            ? respostaUsuario === correctIndex
                                                                ? 'bg-green-100 border border-green-300'
                                                                : 'bg-red-100 border border-red-300'
                                                            : cliquesPorAlternativa[i] === 1
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-white hover:bg-gray-50'
                                                    }`}
                                                    onClick={(e) => {
                                                        if (!mostrarFeedback) {
                                                            e.preventDefault();
                                                            handleAlternativaClick(i);
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="alternativa"
                                                        className={`mt-1 h-4 w-4 ${
                                                            cliquesPorAlternativa[i] === 1 ? 'text-white' : 'text-blue-600'
                                                        } focus:ring-blue-500`}
                                                        disabled={mostrarFeedback}
                                                        checked={respostaUsuario === i}
                                                        onChange={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleAlternativaClick(i);
                                                        }}
                                                    />
                                                    <span
                                                        className={`text-base ${
                                                            cliquesPorAlternativa[i] === 0
                                                                ? 'line-through opacity-60 text-gray-500'
                                                                : ''
                                                        } ${cliquesPorAlternativa[i] === 1 && !mostrarFeedback ? 'text-white' : 'text-gray-700'}`}
                                                        dangerouslySetInnerHTML={{ __html: `<strong class="mr-1">${letras[i]}.</strong> ${removePTags(altText)}` }}
                                                    />
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {foundQuestion.tipo === 'certo_errado' && (
                                <div className="flex flex-col space-y-2 mb-6">
                                    {(() => {
                                        let correctIndex = null;
                                        if (foundQuestion.gabarito === 'Certo') {
                                            correctIndex = 1;
                                        } else if (foundQuestion.gabarito === 'Errado') {
                                            correctIndex = 0;
                                        }

                                        return (
                                            <>
                                                <label
                                                    className={`flex items-center space-x-2 py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer ${
                                                        mostrarFeedback && respostaUsuario === 1 // 'Certo'
                                                            ? (respostaUsuario === correctIndex ? 'bg-green-600 text-white shadow-md' : 'bg-red-600 text-white shadow-md')
                                                            : cliquesPorAlternativa[1] === 1
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-white hover:bg-gray-50'
                                                    }`}
                                                    onClick={(e) => {
                                                        if (!mostrarFeedback) {
                                                            e.preventDefault();
                                                            handleAlternativaClick(1); // Índice para 'Certo'
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="certoErrado"
                                                        checked={respostaUsuario === 1}
                                                        onChange={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleAlternativaClick(1);
                                                        }}
                                                        disabled={mostrarFeedback}
                                                        className={`mt-1 h-4 w-4 ${
                                                            (cliquesPorAlternativa[1] === 1 && !mostrarFeedback) ? 'text-white' : 'text-blue-600'
                                                        } focus:ring-blue-500`}
                                                    />
                                                    <span className={`text-base ${
                                                        (mostrarFeedback && (correctIndex === 1 || respostaUsuario === 1)) ? 'text-white' : 'text-gray-800'
                                                    }`}>Certo</span>
                                                </label>
                                                <label
                                                    className={`flex items-center space-x-2 py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer ${
                                                        mostrarFeedback && respostaUsuario === 0 // 'Errado'
                                                            ? (respostaUsuario === correctIndex ? 'bg-green-600 text-white shadow-md' : 'bg-red-600 text-white shadow-md')
                                                            : cliquesPorAlternativa[0] === 1
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-white hover:bg-gray-50'
                                                    }`}
                                                    onClick={(e) => {
                                                        if (!mostrarFeedback) {
                                                            e.preventDefault();
                                                            handleAlternativaClick(0); // Índice para 'Errado'
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="certoErrado"
                                                        checked={respostaUsuario === 0}
                                                        onChange={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleAlternativaClick(0);
                                                        }}
                                                        disabled={mostrarFeedback}
                                                        className={`mt-1 h-4 w-4 ${
                                                            (cliquesPorAlternativa[0] === 1 && !mostrarFeedback) ? 'text-white' : 'text-blue-600'
                                                        } focus:ring-blue-500`}
                                                    />
                                                    <span className={`text-base ${
                                                        (mostrarFeedback && (correctIndex === 0 || respostaUsuario === 0)) ? 'text-white' : 'text-gray-800'
                                                    }`}>Errado</span>
                                                </label>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Botão Confirmar Resposta */}
                            {!mostrarFeedback && (
                                <div className="mt-6 flex justify-center">
                                    <button
                                        onClick={handleConfirmarResposta}
                                        disabled={respostaUsuario === null}
                                        className={`w-full py-3 rounded-lg font-semibold text-lg transition-all duration-300
                                            ${respostaUsuario === null
                                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                            }`}
                                    >
                                        Confirmar Resposta
                                    </button>
                                </div>
                            )}

                            {/* Feedback e Gabarito */}
                            {mostrarFeedback && (
                                <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">Resultado:</h3>
                                    {(() => {
                                        let correctIndexForFeedback = null;
                                        if (foundQuestion.tipo === 'multipla') {
                                            correctIndexForFeedback = letras.indexOf(foundQuestion.gabarito);
                                        } else if (foundQuestion.tipo === 'certo_errado') {
                                            correctIndexForFeedback = foundQuestion.gabarito === 'Certo' ? 1 : 0;
                                        }
                                        return respostaUsuario === correctIndexForFeedback ? (
                                            <p className="text-green-600 font-semibold text-base flex items-center">
                                                <CheckCircle className="h-6 w-6 mr-2" /> Parabéns! Sua resposta está correta.
                                            </p>
                                        ) : (
                                            <p className="text-red-600 font-semibold text-base flex items-center">
                                                <XCircle className="h-6 w-6 mr-2" /> Sua resposta está incorreta.
                                            </p>
                                        );
                                    })()}
                                    <p className="text-gray-700 mt-4 text-base">
                                        <strong className="font-semibold">Gabarito:</strong> {foundQuestion.gabarito}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Seção de Abas na parte inferior */}
                        <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-md">
                            <div className="flex border-b border-gray-200">
                                <TabButton
                                    icon={<User className="w-5 h-5" />}
                                    label="Comentários Professor"
                                    isActive={abaAtiva === 'comentarioProfessor'}
                                    onClick={() => setAbaAtiva('comentarioProfessor')}
                                />
                                <TabButton
                                    icon={<MessageSquare className="w-5 h-5" />}
                                    label="Comentários Alunos"
                                    isActive={abaAtiva === 'comentariosAlunos'}
                                    onClick={() => setAbaAtiva('comentariosAlunos')}
                                />
                                <TabButton
                                    icon={<BookText className="w-5 h-5" />}
                                    label="Teoria da Questão"
                                    isActive={abaAtiva === 'teoriaQuestao'}
                                    onClick={() => setAbaAtiva('teoriaQuestao')}
                                />
                                <TabButton
                                    icon={<BarChart className="w-5 h-5" />}
                                    label="Estatísticas"
                                    isActive={abaAtiva === 'estatisticas'}
                                    onClick={() => setAbaAtiva('estatisticas')}
                                />
                                <TabButton
                                    icon={<ClipboardList className="w-5 h-5" />}
                                    label="Anotações"
                                    isActive={abaAtiva === 'anotacoes'}
                                    onClick={() => setAbaAtiva('anotacoes')}
                                />
                            </div>
                            <div className="p-6">
                                {renderActiveTabContent()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Componente auxiliar para os botões das abas
const TabButton = ({ icon, label, isActive, onClick }) => (
    <button
        className={`flex-1 flex items-center justify-center p-4 text-sm font-medium transition-colors duration-200
            ${isActive
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
        onClick={onClick}
    >
        {icon && <span className="mr-2">{icon}</span>}
        {label}
    </button>
);


