import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Star, TrendingUp, BookOpen, Clock, CheckCircle, XCircle, MessageSquare, ThumbsUp, FileText, NotebookPen, Loader2, ClipboardList, Download, CalendarCheck, Search, CheckSquare, Square, GraduationCap, Edit3 } from 'lucide-react';
import TopNav from '../TopNav';
import MessageModal from '../ui/MessageModal';
import ActionModal from '../ui/ActionModal';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import MinhasAnotacoesPainel from './MinhasAnotacoesPainel';
import MeusComentariosPainel from './MeusComentariosPainel';
import MinhasCurtidas from './MinhasCurtidas';
import MeusErrosPainel from './MeusErrosPainel';
import EstatisticasPage from './EstatisticasPage'; // Importar EstatisticasPage
import DOMPurify from "dompurify"; // Importação do DOMPurify
import MeusEditais from './MeusEditais'; // ajuste o caminho se necessário
import PlanoDeEstudos from "./PlanoDeEstudos";
import Calendario from './Calendario';

// Importação da lista de matérias
import { allMaterias } from '../../data/materias/materias';

// Importações dos assuntos específicos
import { assuntosDireitoAdministrativo } from '../../data/assuntos/Direito/DireitoAdministrativo';
import { assuntosDireitoCivil } from '../../data/assuntos/Direito/DireitoCivil';
import { assuntosDireitoPenal } from '../../data/assuntos/Direito/DireitoPenal';
import { assuntosDireitoConstitucional } from '../../data/assuntos/Direito/DireitoConstitucional';
import { assuntosDireitoProcessualCivil } from '../../data/assuntos/Direito/DireitoProcessualCivil';
import { assuntosDireitoProcessualPenal } from '../../data/assuntos/Direito/DireitoProcessualPenal';
import { assuntosDireitoPrevidenciario } from '../../data/assuntos/Direito/DireitoPrevidenciario';
import { assuntosDireitoTributário } from '../../data/assuntos/Direito/DireitoTributario'; 

// Constante para mapear matérias aos seus assuntos
const assuntosPorMateria = {
    'Direito Administrativo': assuntosDireitoAdministrativo,
    'Direito Civil': assuntosDireitoCivil,
    'Direito Penal': assuntosDireitoPenal,
    'Direito Constitucional': assuntosDireitoConstitucional,
    'Direito Processual Civil - Novo Código de Processo Civil - CPC 2015': assuntosDireitoProcessualCivil, 
    'Direito Processual Penal': assuntosDireitoProcessualPenal,
    'Direito Previdenciário': assuntosDireitoPrevidenciario,
    'Direito Tributário': assuntosDireitoTributário,
    // Adicionar aqui outros mapeamentos de matéria para assunto
};

// Utility function to remove <p> tags from HTML content
const removePTags = (html) => {
    if (typeof html !== 'string') return html;
    return html
        .replace(/^(\s*<p[^>]*>)+/i, '')
        .replace(/(<\/p>\s*)+$/i, '');
};

// Function to load the html2pdf.js script (mantido se ainda for usado em outras partes)
const loadHtml2PdfScript = () => {
    return new Promise((resolve, reject) => {
        if (window.html2pdf) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export default function App({ token, onLogout }) { 
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; 


    // Definindo 'estatisticas' como a seção ativa inicial
    const [activeSection, setActiveSection] = useState('estatisticas'); 
    const [overallStats, setOverallStats] = useState(null);
    const [favoriteQuestions, setFavoriteQuestions] = useState([]);
    const [myComments, setMyComments] = useState([]);
    const [likedComments, setLikedComments] = useState([]); 
    const [myNotes, setMyNotes] = useState([]);
    const [notes, setNotes] = useState([]); 

    const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingMyComments, setIsLoadingMyComments] = useState(true);
    const [isLoadingLikedComments, setIsLoadingLikedComments] = useState(true); 
    const [isLoadingNotes, setIsLoadingNotes] = useState(true); 

    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [favoriteToDelete, setFavoriteToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [searchTermLikes, setSearchTermLikes] = useState('');
    const [filteredLikedComments, setFilteredLikedComments] = useState([]);
    const [selectedLikeIds, setSelectedLikeIds] = new Set(); 
    
    const [searchTermMyComments, setSearchTermMyComments] = useState('');
    const [filteredMyComments, setFilteredMyComments] = useState([]);
    const [selectedMyCommentIds, setSelectedMyCommentIds] = new Set();

    // Estados para Conteúdo Teórico
    const [selectedMateria, setSelectedMateria] = useState('');
    const [theoriesForSelectedMateria, setTheoriesForSelectedMateria] = useState([]); // Assuntos da matéria selecionada
    const [isLoadingTheories, setIsLoadingTheories] = useState(false); // Para carregar os assuntos
    const [theorySearchMessage, setTheorySearchMessage] = useState('');
    // CORREÇÃO AQUI: Use useState para inicializar o Set
    const [selectedTheoryAssuntos, setSelectedTheoryAssuntos] = useState(new Set()); 
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [selectedPlano, setSelectedPlano] = useState(null);
    const [planos, setPlanos] = useState([]);

    const handleUnauthorized = useCallback(() => {
        setMessage('Sessão expirada ou não autorizada. Faça login novamente.');
        setMessageType('error');
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            console.error("onLogout não é uma função em StudentDashboard.");
        }
        navigate('/login');
    }, [onLogout, navigate, setMessage, setMessageType]); 

    const getLoggedInUserId = useCallback(() => {
        try {
            if (!token) return null;
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Token malformado');
            const payload = JSON.parse(atob(parts[1]));
            return payload.id;
        } catch (e) {
            console.error("Erro ao decodificar token para obter User ID:", e);
            return null;
        }
    }, [token]);

    const loggedInUserId = getLoggedInUserId();

    // Carregamento dos planos do backend quando a seção é ativada
useEffect(() => {
  const fetchPlanos = async () => {
    try {
      // A rota no backend é /api/plano-de-estudo, conforme seu main.py
      const res = await fetch(`${API_URL}/api/plano-de-estudo`, { 
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error("Erro ao buscar planos de estudo");
      
      const data = await res.json();
      setPlanos(data);
    } catch (err) {
      console.error("Erro ao buscar planos de estudo:", err);
      // Opcional: Adicionar uma mensagem de erro para o usuário
      setMessage('Não foi possível carregar os planos de estudo.');
      setMessageType('error');
    }
  };
  
  // Só busca os planos se a seção ativa for a correta
  if (activeSection === "meuPlanoDeEstudos") {
    fetchPlanos();
  }
}, [activeSection, API_URL, token, handleUnauthorized]); // Adiciona activeSection como dependência


    // Fetch Overall Stats - ATENÇÃO: Só busca se a seção NÃO for 'estatisticas'
    useEffect(() => {
        const fetchOverallStats = async () => {
            setIsLoadingStats(true);
            try {
                const res = await fetch(`${API_URL}/api/users/me/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    return;
                }
                if (!res.ok) {
                    throw new Error('Falha ao carregar estatísticas gerais.');
                }
                const data = await res.json();
                setOverallStats(data);
            } catch (err) {
                console.error('Erro ao buscar estatísticas gerais:', err);
                setMessage('Erro ao carregar estatísticas gerais.');
                setMessageType('error');
            } finally {
                setIsLoadingStats(false);
            }
        };

        // Só busca as estatísticas gerais se a seção ativa for 'overallStats'
        // A seção 'estatisticas' (EstatisticasPage) fará sua própria busca
        if (token && activeSection === 'overallStats') { 
            fetchOverallStats();
        }
    }, [token, API_URL, activeSection, handleUnauthorized, setMessage, setMessageType]); 

    // Fetch Favorite Questions
    const fetchFavoriteQuestions = useCallback(async () => {
        setIsLoadingFavorites(true);
        try {
            const res = await fetch(`${API_URL}/api/favorites/`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || `Falha ao carregar questões favoritas. Status: ${res.status}`);
            }
            const data = await res.json();
            setFavoriteQuestions(data);
        } catch (err) {
            console.error('Erro ao buscar questões favoritas:', err);
            setMessage(err.message || 'Erro ao carregar questões favoritas.');
            setMessageType('error');
        } finally {
            setIsLoadingFavorites(false);
        }
    }, [token, API_URL, handleUnauthorized, setMessage, setMessageType]); 

    useEffect(() => {
        if (token && activeSection === 'favorites') { 
            fetchFavoriteQuestions();
        }
    }, [token, activeSection, fetchFavoriteQuestions]);

    // Fetch My Comments (Mantido aqui para o componente MeusComentariosPainel)
    const fetchMyComments = useCallback(async () => {
        setIsLoadingMyComments(true);
        try {
            const url = `${API_URL}/api/users/me/comments`;
            console.log("Fetching My Comments from:", url);
            const res = await fetch(url, { 
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                throw new Error('Falha ao carregar meus comentários.');
            }
            const data = await res.json();
            setMyComments(data);
            setFilteredMyComments(data);
        } catch (err) {
            console.error('Erro ao buscar meus comentários:', err);
            setMessage('Erro ao carregar meus comentários.');
            setMessageType('error');
        } finally {
            setIsLoadingMyComments(false);
        }
    }, [token, API_URL, handleUnauthorized, setMessage, setMessageType]); 

    useEffect(() => {
        if (token && activeSection === 'myComments') { 
            fetchMyComments();
        }
    }, [token, activeSection, fetchMyComments]);

    // Fetch Liked Comments (Mantido aqui para o componente MinhasCurtidas)
    const fetchLikedComments = useCallback(async () => {
        setIsLoadingLikedComments(true);
        try {
            const url = `${API_URL}/api/users/me/liked-comments`;
            console.log("Fetching Liked Comments from:", url);
            const res = await fetch(url, { 
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                throw new Error('Falha ao carregar comentários curtidos.');
            }
            const data = await res.json();
            setLikedComments(data);
            setFilteredLikedComments(data);
        } catch (err) {
            console.error('Erro ao buscar comentários curtidos:', err);
            setMessage('Erro ao carregar comentários curtidos.');
            setMessageType('error');
        } finally {
            setIsLoadingLikedComments(false);
        }
    }, [token, API_URL, handleUnauthorized, setMessage, setMessageType]); 

    useEffect(() => {
        if (token && activeSection === 'likedComments') { 
            fetchLikedComments();
        }
    }, [token, activeSection, fetchLikedComments]);


    // Fetch My Notes
    const fetchNotes = useCallback(async () => {
        setIsLoadingNotes(true);
        try {
            const res = await fetch(`${API_URL}/api/notes/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                throw new Error('Falha ao carregar anotações.');
            }
            const data = await res.json();
            setNotes(data);
            setMyNotes(data);
        } catch (err) {
            console.error('Erro ao buscar anotações:', err);
            setMessage('Erro ao carregar anotações.');
            setMessageType('error');
        } finally {
            setIsLoadingNotes(false);
        }
    }, [token, API_URL, handleUnauthorized, setMessage, setMessageType]); 

    useEffect(() => {
        if (token && activeSection === 'myNotes') { 
            fetchNotes();
        }
    }, [token, activeSection, fetchNotes]);

    // Filter liked comments (Esta lógica deve ser movida para MinhasCurtidas.jsx)
    useEffect(() => {
        const lowercasedSearchTerm = searchTermLikes.toLowerCase();
        const filtered = likedComments.filter(c =>
          c.materia?.toLowerCase().includes(lowercasedSearchTerm) ||
          c.assunto?.toLowerCase().includes(lowercasedSearchTerm) ||
          String(c.question_id).includes(lowercasedSearchTerm) ||
            c.autor?.toLowerCase().includes(lowercasedSearchTerm) || 
            removePTags(c.content || '').toLowerCase().includes(lowercasedSearchTerm) 
        );
        setFilteredLikedComments(filtered);
    }, [searchTermLikes, likedComments]);

    // Filter my comments (Esta lógica deve ser movida para MeusComentariosPainel.jsx)
    useEffect(() => {
        const lowercasedSearchTerm = searchTermMyComments.toLowerCase();
        const filtered = myComments.filter(comment => {
            const commentMateria = comment.materia || '';
            const commentAssunto = comment.assunto || '';
            const commentQuestionId = String(comment.question_id || '');
            const commentAuthor = comment.user?.username || '';
            const commentContent = removePTags(comment.content || '');

            return (
                commentMateria.toLowerCase().includes(lowercasedSearchTerm) ||
                commentAssunto.toLowerCase().includes(lowercasedSearchTerm) ||
                commentQuestionId.includes(lowercasedSearchTerm) ||
                commentAuthor.toLowerCase().includes(lowercasedSearchTerm) ||
                commentContent.toLowerCase().includes(lowercasedSearchTerm)
            );
        });
        setFilteredMyComments(filtered);
    }, [searchTermMyComments, myComments]);

    const handleRemoveFavoriteClick = (favorite) => {
        setFavoriteToDelete(favorite);
        setShowDeleteModal(true);
    };

    const confirmRemoveFavorite = async () => {
        if (!favoriteToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/favorites/${favoriteToDelete.question_id}/${favoriteToDelete.notebook_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Falha ao remover dos favoritos.');
            }

            setMessage('Questão removida dos favoritos com sucesso!');
            setMessageType('success');
            fetchFavoriteQuestions();
        } catch (err) {
            console.error('Erro ao remover dos favoritos:', err);
            setMessage(err.message || 'Erro ao remover dos favoritos.');
            setMessageType('error');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setFavoriteToDelete(null);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleResolveFavorite = (notebookId) => {
        navigate(`/resolver-caderno/${notebookId}`);
    };

    const handleViewNoteDetails = (noteId) => {
        navigate(`/minhas-anotacoes/${noteId}`);
    };

    const handleViewCommentDetails = (id) => {
      navigate(`/comentarios/${id}`);
    };

    // --- Funções para Conteúdo Teórico ---
    
    // Função para buscar assuntos da matéria selecionada
    const handleMateriaChange = (materia) => {
        setSelectedMateria(materia);
        setSelectedTheoryAssuntos(new Set()); // Limpar seleções anteriores
        
        if (materia && assuntosPorMateria[materia]) {
            setIsLoadingTheories(true);
            // Simular carregamento (já que os dados são locais)
            setTimeout(() => {
                setTheoriesForSelectedMateria(assuntosPorMateria[materia]);
                setIsLoadingTheories(false);
            }, 300);
        } else {
            setTheoriesForSelectedMateria([]);
        }
    };

    // Função para alternar seleção de um assunto
    const handleToggleSelectTheory = (materia, assunto) => {
        const key = `${materia}|${assunto}`;
        setSelectedTheoryAssuntos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    // Função para selecionar/deselecionar todos os assuntos
    const handleSelectAllTheories = () => {
        if (selectedTheoryAssuntos.size === theoriesForSelectedMateria.length && theoriesForSelectedMateria.length > 0) {
            // Deselecionar todos
            setSelectedTheoryAssuntos(new Set());
        } else {
            // Selecionar todos
            const allKeys = theoriesForSelectedMateria.map(theory => `${theory.materia}|${theory.assunto}`);
            setSelectedTheoryAssuntos(new Set(allKeys));
        }
    };

    // Função para visualizar teoria individual
    const handleViewTheory = (materia, assunto) => {
        navigate(`/teoria/${encodeURIComponent(materia)}/${encodeURIComponent(assunto)}`);
    };

    // Função para gerar PDF das teorias selecionadas
    const handleGeneratePdf = async () => {
        if (selectedTheoryAssuntos.size === 0) {
            setMessage('Selecione pelo menos um assunto para gerar o PDF.');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setIsGeneratingPdf(true);
        try {
            await loadHtml2PdfScript();
            
            // Criar conteúdo HTML para o PDF
            let htmlContent = `
                <html>
                <head>
                    <title>Conteúdo Teórico - ${selectedMateria}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #2563eb; text-align: center; }
                        h2 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
                        .theory-content { margin-bottom: 30px; }
                        .page-break { page-break-before: always; }
                    </style>
                </head>
                <body>
                    <h1>Conteúdo Teórico - ${selectedMateria}</h1>
            `;

            // Buscar conteúdo de cada assunto selecionado
            for (const key of selectedTheoryAssuntos) {
                const [materia, assunto] = key.split('|');
                try {
                    const res = await fetch(`${API_URL}/api/teoria/${encodeURIComponent(materia)}/${encodeURIComponent(assunto)}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    
                    if (res.ok) {
                        const theoryData = await res.json();
                        htmlContent += `
                            <div class="theory-content page-break">
                                <h2>${assunto}</h2>
                                <div>${theoryData.content || 'Conteúdo não disponível.'}</div>
                            </div>
                        `;
                    } else {
                        htmlContent += `
                            <div class="theory-content page-break">
                                <h2>${assunto}</h2>
                                <p>Erro ao carregar conteúdo para este assunto.</p>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error(`Erro ao buscar teoria para ${assunto}:`, error);
                    htmlContent += `
                        <div class="theory-content page-break">
                            <h2>${assunto}</h2>
                            <p>Erro ao carregar conteúdo para este assunto.</p>
                        </div>
                    `;
                }
            }

            htmlContent += '</body></html>';

            // Gerar PDF
            const element = document.createElement('div');
            element.innerHTML = htmlContent;
            
            const opt = {
                margin: 1,
                filename: `conteudo-teorico-${selectedMateria.replace(/\s+/g, '-').toLowerCase()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            await window.html2pdf().set(opt).from(element).save();
            
            setMessage(`PDF gerado com sucesso! ${selectedTheoryAssuntos.size} assunto(s) incluído(s).`);
            setMessageType('success');
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            setMessage('Erro ao gerar PDF. Tente novamente.');
            setMessageType('error');
        } finally {
            setIsGeneratingPdf(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Monitorar mudanças na matéria selecionada
    useEffect(() => {
        handleMateriaChange(selectedMateria);
    }, [selectedMateria]);

    // --- Funções de Renderização ---

    const renderOverallStats = () => {
        if (isLoadingStats) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                </div>
            );
        }

        if (!overallStats) {
            return (
                <div className="text-center py-10 text-gray-600">
                    Erro ao carregar estatísticas.
                </div>
            );
        }

        const chartData = [
            { name: 'Corretas', value: overallStats.correct_answers, color: '#10b981' },
            { name: 'Incorretas', value: overallStats.incorrect_answers, color: '#ef4444' },
        ];

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <TrendingUp className="mr-3 text-blue-600" size={24} /> Estatísticas Gerais
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">Total de Questões</p>
                                <p className="text-3xl font-bold">{overallStats.total_questions}</p>
                            </div>
                            <BookOpen className="h-8 w-8 text-blue-200" />
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">Respostas Corretas</p>
                                <p className="text-3xl font-bold">{overallStats.correct_answers}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-200" />
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-100 text-sm">Respostas Incorretas</p>
                                <p className="text-3xl font-bold">{overallStats.incorrect_answers}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-200" />
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">Taxa de Acerto</p>
                                <p className="text-3xl font-bold">{overallStats.accuracy_rate}%</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-purple-200" />
                        </div>
                    </div>
                </div>

                {overallStats.total_questions > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Respostas</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderFavoriteQuestions = () => {
        if (isLoadingFavorites) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Star className="mr-3 text-yellow-500" size={24} /> Questões Favoritas
                </h2>
                
                {favoriteQuestions.length === 0 ? (
                    <div className="text-center py-10 text-gray-600">
                        <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p>Você ainda não tem questões favoritas.</p>
                        <p className="text-sm">Favorite questões durante a resolução para vê-las aqui.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {favoriteQuestions.map((fav) => (
                            <div key={`${fav.question_id}-${fav.notebook_id}`} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{fav.question.materia} - {fav.question.assunto}</h3>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-3" dangerouslySetInnerHTML={{ __html: fav.question.enunciado }}></p>
                                    <p className="text-xs text-gray-500 flex items-center">
                                        <BookOpen className="h-4 w-4 mr-1" /> Caderno: {fav.notebook_name}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center mt-1">
                                        <Clock className="h-4 w-4 mr-1" /> Favoritado em: {new Date(fav.favorited_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={() => handleResolveFavorite(fav.notebook_id)}
                                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors text-sm font-medium"
                                    >
                                        <BookOpen className="mr-1" size={16} /> Resolver Caderno
                                    </button>
                                    <button
                                        onClick={() => handleRemoveFavoriteClick(fav)}
                                        className="p-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition-colors"
                                    >
                                        <Star size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderMyComments = () => {
        return (
            <MeusComentariosPainel
                token={token}
                onUnauthorized={handleUnauthorized}
                API_URL={API_URL}
            />
        );
    };

    const renderLikedComments = () => {
        return (
            <MinhasCurtidas
                token={token}
                onUnauthorized={handleUnauthorized}
                API_URL={API_URL}
                message={message} 
                messageType={messageType} 
                setMessage={setMessage} 
                setMessageType={setMessageType} 
            />
        );
    };

    const renderMyNotes = () => {
        return (
            <MinhasAnotacoesPainel
                token={token}
                onUnauthorized={handleUnauthorized}
                API_URL={API_URL}
                notes={notes}
                setNotes={setNotes}
                isLoadingNotes={isLoadingNotes}
                fetchNotes={fetchNotes}
            />
        );
    };

    const renderMyErrors = () => {
    return (
        <MeusErrosPainel
            token={token}
            onUnauthorized={handleUnauthorized}
            API_URL={API_URL}
        />
    );
};



    const renderConteudoTeorico = () => {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 min-h-[400px]">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <GraduationCap className="mr-3 text-blue-600" size={24} /> Conteúdo Teórico
                </h2>

                {/* Filtro por Matéria */}
                <div className="mb-6">
                    <label htmlFor="selectMateria" className="block text-gray-700 text-sm font-bold mb-2">
                        Selecione a Matéria:
                    </label>
                    <input
                        type="text"
                        id="selectMateria"
                        value={selectedMateria}
                        onChange={(e) => setSelectedMateria(e.target.value)}
                        list="materias-list"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="Buscar matéria..."
                    />
                    <datalist id="materias-list">
                        {allMaterias.map((m) => (
                            <option key={m} value={m} />
                        ))}
                    </datalist>
                </div>

                {/* Exibição dos Assuntos da Matéria Selecionada */}
                {selectedMateria && theoriesForSelectedMateria.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800">Assuntos de {selectedMateria}</h3>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                        checked={selectedTheoryAssuntos.size === theoriesForSelectedMateria.length && theoriesForSelectedMateria.length > 0}
                                        onChange={handleSelectAllTheories}
                                    />
                                    <span className="ml-2">Marcar Todas</span>
                                </label>
                                <button
                                    onClick={handleGeneratePdf}
                                    disabled={selectedTheoryAssuntos.size === 0 || isGeneratingPdf}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingPdf ? (
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                    ) : (
                                        <Download className="mr-2" size={16} />
                                    )}
                                    Gerar PDF ({selectedTheoryAssuntos.size})
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4"> {/* Usando space-y-4 para espaçamento vertical */}
                            {theoriesForSelectedMateria.map((theory, index) => {
                                const key = `${theory.materia}|${theory.assunto}`;
                                const isSelected = selectedTheoryAssuntos.has(key);
                                return (
                                    <div key={key} className="bg-white p-4 rounded-xl shadow-md flex items-center justify-between border border-gray-100 transform transition-transform hover:scale-[1.01] hover:shadow-lg">
                                        <div className="flex items-center">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelectTheory(theory.materia, theory.assunto)}
                                                />
                                                <span className="ml-3 text-lg font-medium text-gray-800">{theory.assunto}</span>
                                            </label>
                                        </div>
                                        <button
                                            onClick={() => handleViewTheory(theory.materia, theory.assunto)}
                                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            <BookOpen className="mr-1" size={16} /> Ver Teoria
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : selectedMateria && theoriesForSelectedMateria.length === 0 ? (
                    <div className="text-center py-10 text-gray-600">
                        Nenhum assunto teórico encontrado para a matéria "{selectedMateria}".
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-600">
                        Selecione uma matéria para ver os assuntos teóricos disponíveis.
                    </div>
                )}
            </div>
        );
    };

     const renderMeusEditais = () => {
        return <MeusEditais />;
    };

    const renderMeusPlanos = () => {
  if (planos.length === 0) {
    return <p className="text-gray-500">Nenhum plano de estudo encontrado.</p>;
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <CalendarCheck className="mr-3 text-blue-600" size={24} /> Meus Planos de Estudo
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {planos.map((plano) => (
          <div
            key={plano.id}
            onClick={() => {
              // Define o ID do edital e muda a seção para mostrar os detalhes do plano
              setSelectedPlano(plano); 
              setActiveSection("planoDeEstudos");
            }}
            className="relative bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
          >
            {/* Botão Editar */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // evita abrir o plano ao clicar no botão
                navigate(`/calendario/${plano.edital_id}`);
              }}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-1 text-sm font-medium bg-white border border-gray-200 rounded-full hover:bg-gray-50"
              title="Editar plano de estudos"
            >
              <Edit3 size={14} />
              <span className="hidden md:inline">Editar</span>
            </button>

            {/* Conteúdo do card */}
            <h3 className="text-lg font-bold text-gray-800">{plano.titulo_edital}</h3>
            {plano.data_inicio && (
              <p className="text-gray-600 mt-2">
                Período: {new Date(plano.data_inicio).toLocaleDateString()} - {new Date(plano.data_fim).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Função para renderizar o conteúdo da seção ativa
const renderActiveSectionContent = () => {
  switch (activeSection) {
    case 'overallStats':
      return renderOverallStats();
    case 'estatisticas': // Novo case para a página de estatísticas
      return <EstatisticasPage token={token} />; // Renderiza EstatisticasPage
    case 'favorites':
      return renderFavoriteQuestions();
    case 'myComments':
      return renderMyComments();
    case 'likedComments':
      return renderLikedComments();
    case 'myNotes':
      return renderMyNotes();
    case 'myErrors':
      return renderMyErrors();
    case 'conteudoTeorico':
      return renderConteudoTeorico();
    case 'meusEditais': // Novo case para a página de editais
      return renderMeusEditais();
    case "meuPlanoDeEstudos":
      return renderMeusPlanos();
    case "planoDeEstudos":
      return (
        <PlanoDeEstudos
          plano={selectedPlano}
          onVoltar={() => setActiveSection("meuPlanoDeEstudos")}
        />
      );
    default:
      return <div className="text-center py-10 text-gray-600">Selecione uma opção no menu lateral.</div>;
  }
};

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <TopNav onLogout={onLogout} />
            <main className="flex-1 container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
                {/* Painel Lateral (Sidebar) */}
                <aside className="w-full md:w-64 p-4 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col items-start space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 self-center">Meu Painel</h2>
                    
                    {/* Botões de navegação lateral */}
                    <button
                        onClick={() => setActiveSection('estatisticas')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'estatisticas' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <TrendingUp className="mr-3" size={20} /> Estatísticas
                    </button>
                    <button
                        onClick={() => setActiveSection('favorites')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'favorites' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <Star className="mr-3" size={20} /> Favoritos
                    </button>
                    <button
                        onClick={() => setActiveSection('myComments')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'myComments' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <MessageSquare className="mr-3" size={20} /> Meus Comentários
                    </button>
                    <button
                        onClick={() => setActiveSection('likedComments')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'likedComments' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <ThumbsUp className="mr-3" size={20} /> Curtidos
                    </button>
                    <button
                        onClick={() => setActiveSection('myNotes')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'myNotes' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <ClipboardList className="mr-3" size={20} /> Minhas Anotações
                    </button>
                    <button
                        onClick={() => setActiveSection('myErrors')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'myErrors' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <XCircle className="mr-3" size={20} /> Meus Erros
                    </button>
                    <button
                        onClick={() => setActiveSection('conteudoTeorico')}
                        className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
                            ${activeSection === 'conteudoTeorico' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        <GraduationCap className="mr-3" size={20} /> Conteúdo Teórico
                    </button>
                    <button
    onClick={() => setActiveSection('meusEditais')}
    className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
        ${activeSection === 'meusEditais' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
>
    <FileText className="mr-3" size={20} /> Meus Editais
</button>
<button
    onClick={() => setActiveSection("meuPlanoDeEstudos")} // Verifique se está correto
    className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 
        ${activeSection === "meuPlanoDeEstudos" ? "bg-blue-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-100"}`}
>
    <CalendarCheck className="mr-3" size={20} /> Meu Plano de Estudos
</button>
                </aside>

                {/* Área de Conteúdo Principal */}
                <div className="flex-1 bg-white p-6 rounded-xl shadow-lg border border-gray-100 min-h-[600px]">
                    {message && (
                        <MessageModal
                            message={message}
                            type={messageType}
                            onClose={() => setMessage('')}
                        />
                    )}
                    {renderActiveSectionContent()} {/* Renderiza o conteúdo da seção ativa */}
                </div>
            </main>

            <ActionModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmRemoveFavorite}
                title="Confirmar Remoção"
                message={`Tem certeza que deseja remover a questão "${favoriteToDelete?.question?.materia} - ${favoriteToDelete?.question?.assunto}" dos seus favoritos?`}
                confirmText="Remover"
                cancelText="Cancelar"
                isProcessing={isDeleting}
            />
        </div>
    );
}




    