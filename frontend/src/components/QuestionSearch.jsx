// frontend/src/components/QuestionSearch.jsx
import React, { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageModal from './ui/MessageModal';
import ActionModal from './ui/ActionModal';
import RichTextEditor from './RichTextEditor';
import TopNav from "./TopNav";
import DOMPurify from 'dompurify';
// Importação de todos os ícones necessários, incluindo os que estavam faltando
import { 
    Search, CheckCircle, XCircle, MessageSquare, BookText, BarChart, 
    ClipboardList, User, ThumbsUp, ThumbsDown, Edit, Loader2, ChevronUp, 
    ChevronDown, FilePlus2, Save, Trash2, BookOpen, GraduationCap, FileText // FileText adicionado aqui
} from 'lucide-react'; 
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import BarChartComponent from './ui/BarChartComponent'; // Certifique-se de que este componente existe e está no caminho correto

// Array de letras para mapear índices para letras de alternativas
const letras = ['A', 'B', 'C', 'D', 'E'];

// Função utilitária para remover tags <p> e <br> do HTML
const removePTags = (htmlString) => {
    if (!htmlString) return '';
    let cleanedString = htmlString.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '');
    cleanedString = cleanedString.replace(/<br\s*\/?>/g, ' ');
    return cleanedString.trim();
};

// Componente auxiliar para os botões das abas (mantido igual ao NotebookResolver.jsx)
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


export default function QuestionSearch({ token, onLogout }) {
    if (!token) {
        return <div className="text-center p-6 text-gray-700">Carregando token de autenticação...</div>;
    }

    const [searchTerm, setSearchTerm] = useState('');
    const [foundQuestion, setFoundQuestion] = useState(null);

    // Estados para controle dos itens da questão (mantidos como estão)
    const [respostaUsuario, setRespostaUsuario] = useState(null);
    const [mostrarFeedback, setMostrarFeedback] = useState(false);
    const [cliquesPorAlternativa, setCliquesPorAlternativa] = useState({});

    const [mensagem, setMensagem] = useState('');
    const [tipoMensagem, setTipoMensagem] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingTabContent, setIsLoadingTabContent] = useState(false);

    // ESTADOS COPIADOS E ADAPTADOS DO NOTEBOOKRESOLVER.JSX PARA AS ABAS
    const [abaAtiva, setAbaAtiva] = useState('comentarioProfessor');
    const [comentarioProfessorContent, setComentarioProfessorContent] = useState(null); 
    const [comments, setComments] = useState([]); // Comentários dos Alunos
    const [theoryContentForQuestion, setTheoryContentForQuestion] = useState(null);
    const [estatisticasQuestao, setEstatisticasQuestao] = useState(null);
    const [splitStats, setSplitStats] = useState(null); // Adicionado para estatísticas detalhadas


    // Estados para gerenciamento de comentários dos alunos
    const [newCommentContent, setNewCommentContent] = useState('');
    const [showCommentEditor, setShowCommentEditor] = useState(false); 
    const [isPostingComment, setIsPostingComment] = useState(false);

    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [editingComment, setEditingComment] = useState(null); 
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [isEditingComment, setIsEditingComment] = useState(false);
    const [commentStatusMessage, setCommentStatusMessage] = useState('');
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
    const [isDeletingComment, setIsDeletingComment] = useState(false);

    const [commentOrderBy, setCommentOrderBy] = useState('createdAt');
    const [commentOrderDirection, setCommentOrderDirection] = useState('desc');
    const [isVotingCommentId, setIsVotingCommentId] = useState(null);

    // Estados para gerenciamento de anotações
    const [noteContent, setNoteContent] = useState('');
    const [noteId, setNoteId] = useState(null);
    const [noteCreatedAt, setNoteCreatedAt] = useState(null);
    const [noteUpdatedAt, setNoteUpdatedAt] = useState(null);
    const [notebook, setNotebook] = useState(null); 
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteMessage, setNoteMessage] = useState('');
    const [isLoadingNote, setIsLoadingNote] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isDeletingNote, setIsDeletingNote] = useState(false);

    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL;

    // Função para obter o ID do usuário logado (para filtrar comentários)
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

    // Effect to reset state when foundQuestion changes
    useEffect(() => {
        setRespostaUsuario(null);
        setMostrarFeedback(false);
        setCliquesPorAlternativa({});
        setComentarioProfessorContent(null);
        setTheoryContentForQuestion('');
        setEstatisticasQuestao(null);
        setSplitStats(null);
        setNotebook(null);
        setNoteContent('');
        setNoteId(null);
        setNoteCreatedAt(null);
        setNoteUpdatedAt(null);
        setNotebook(null);
        setNoteMessage('');
        setIsLoadingNote(false);
        setIsSavingNote(false);
        setIsDeletingNote(false);
        setAbaAtiva('comentarioProfessor');
        setComments([]);
        setCommentStatusMessage('');
        setEditingCommentId(null);
        setShowDeleteCommentModal(false);
        setNewCommentContent('');
        setEditingCommentContent('');
        setEditingComment(null);
        setShowCommentEditor(false);
        setIsEditingNote(false);
    }, [foundQuestion]);

    // Lógica de clique para as alternativas (mantida como está)
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

    // Lógica para confirmar a resposta (mantida como está)
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
            console.error("onLogout não é uma função em NotebookResolver.");
        }
        navigate('/login');
    }, [onLogout, navigate]);

    // Function to search for the question (lógica unificada, mantida como está)
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

        if (!token) {
            handleUnauthorized();
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

            url = `${API_URL}/api/questions/buscar?q=${encodeURIComponent(searchTerm.trim())}`;
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


    // --- FUNÇÕES DE FETCH E INTERAÇÃO COPIADAS DIRETAMENTE DO NOTEBOOKRESOLVER.JSX ---

    useEffect(() => { 
    const fetchComments = async () => {
        if (abaAtiva === 'comentarioAluno' && foundQuestion?.id && token) {
            console.log(`[DEBUG] Tentando buscar comentários para questao.id: ${foundQuestion.id}`);
            console.log(`[DEBUG] Token de autenticação: ${token ? 'Presente' : 'Ausente'}`);
            console.log(`[DEBUG] Primeiro caractere do token: ${token ? token[0] : 'N/A'}`);
            try {
                const res = await fetch(`${API_URL}/api/questions/${foundQuestion.id}/comments?orderBy=${commentOrderBy}&order=${commentOrderDirection}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.status === 401 || res.status === 403) {
                    console.error("[DEBUG] Erro 401/403 ao buscar comentários. Token pode ser inválido ou expirado.");
                    handleUnauthorized();
                    return;
                }
                if (!res.ok) {
                    const errorData = await res.json();
                    console.error(`[DEBUG] Erro na resposta da API ao buscar comentários: ${res.status}`, errorData);
                    throw new Error(errorData.detail || 'Erro ao carregar comentários');
                }
                const data = await res.json();
                console.log("[DEBUG] Comentários recebidos (brutos):", data);
                // Mapeia created_at para createdAt
                const mappedData = data.map(comment => ({
                    ...comment,
                    createdAt: comment.created_at || comment.createdAt
                }));
                console.log("[DEBUG] Comentários após mapeamento:", mappedData);

                setComments(mappedData);
            } catch (err) {
                console.error('[DEBUG] Erro ao buscar comentários (catch):', err);
                setComments([]);
            }
        } else {
            console.log(`[DEBUG] Não buscando comentários. Aba ativa: ${abaAtiva}, Questao ID: ${foundQuestion?.id}, Token: ${token ? 'Presente' : 'Ausente'}`);
            setComments([]);
        }
        setCommentStatusMessage('');
        setCommentStatusType('');
    };
    fetchComments();
}, [abaAtiva, foundQuestion?.id, token, commentOrderBy, commentOrderDirection, API_URL, handleUnauthorized]);


    const handleAddComment = async () => {
    if (!foundQuestion?.id || !newCommentContent.trim()) return;

    try {
        const res = await fetch(`${API_URL}/api/questions/${foundQuestion.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: newCommentContent }),
        });

        if (res.status === 401 || res.status === 403) {
            handleUnauthorized();
            return;
        }

        if (!res.ok) {
            const errorData = await res.json();
            console.error('Erro detalhado ao adicionar comentário:', errorData);
            throw new Error(errorData.detail || 'Erro ao adicionar comentário');
        }

        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setNewCommentContent('');
        setShowCommentEditor(false);
        setAbaAtiva('comentarioAluno');
        setCommentStatusMessage('Comentário publicado com sucesso!');
        setCommentStatusType('success');
    } catch (err) {
        console.error('Erro ao postar comentário (catch):', err);
        setCommentStatusMessage('Não foi possível publicar o comentário. Tente novamente.');
        setCommentStatusType('error');
    }
    }

    const handleVoteComment = async (commentId, voteType) => {
    if (isVotingCommentId === commentId) return;
    setIsVotingCommentId(commentId);
    try {
        const res = await fetch(`${API_URL}/api/questions/comments/${commentId}/vote?type=${voteType}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            throw new Error("Erro ao votar no comentário.");
        }

        const updatedComment = await res.json();
        setComments((prev) =>
            prev.map((c) =>
                c.id === commentId
                    ? {
                        ...updatedComment,
                        voted_by_me: voteType === "upvote" ? "remove" : (voteType === "downvote" ? "remove" : voteType),
                    }
                    : c
            )
        );
    } catch (err) {
        console.error(err);
    } finally {
        setIsVotingCommentId(null);
    }
    }

    const handleEditCommentClick = (comment) => {
        setEditingComment(comment);
        setEditingCommentContent(comment.content);
        setShowCommentEditor(true);
    };

    const handleSaveEditedComment = async () => {
    if (!editingCommentContent.trim() || !editingCommentId) return;

    try {
        const res = await fetch(`${API_URL}/api/questions/comments/${editingCommentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content: editingCommentContent }),
        });

        const updatedComment = await res.json();
        setComments(comments.map(c => c.id === updatedComment.id ? updatedComment : c));
        setEditingCommentId(null);
        setEditingCommentContent('');
        setShowCommentEditor(false);
        setCommentStatusMessage('Comentário editado com sucesso!');
        setCommentStatusType('success');
    } catch (err) {
        console.error('Erro ao editar comentário:', err);
        setCommentStatusMessage('Não foi possível editar o comentário. Tente novamente.');
    } finally {
        setTimeout(() => {
            setCommentStatusMessage('');
            setCommentStatusType('');
        }, 5000);
    }
    }

    const handleDeleteCommentClick = (comment) => {
        setCommentToDelete(comment);
        setShowDeleteCommentModal(true);
    };

    const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    setIsDeletingComment(true);
    try {
        const res = await fetch(`${API_URL}/api/questions/comments/${commentToDelete.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.status === 401 || res.status === 403) {
            handleUnauthorized();
            return;
        }

        if (!res.ok) {
            console.error('Erro ao excluir comentário. Código:', res.status);
            throw new Error('Erro ao excluir comentário.');
        }

        setComments((prev) => prev.filter(c => c.id !== commentToDelete.id));
        setCommentStatusMessage('Comentário excluído com sucesso!');
        setCommentStatusType('success');
    } catch (err) {
        console.error('Erro ao excluir comentário:', err);
        setCommentStatusMessage('Não foi possível excluir o comentário. Tente novamente.');
        setCommentStatusType('error');
    } finally {
        setIsDeletingComment(false);
        setShowDeleteCommentModal(false);
        setCommentToDelete(null);
        setTimeout(() => {
            setCommentStatusMessage('');
            setCommentStatusType('');
        }, 5000);
    }
    }

    // Função utilitária para formatar a data do comentário
const formatCommentDate = (dateString) => {
    if (!dateString) {
        console.warn("formatCommentDate recebeu uma string de data vazia ou nula.");
        return 'Data Indisponível';
    }
    try {
        const date = new Date(dateString);
        // Verifica se a data é válida
        if (isNaN(date.getTime())) {
            console.error("String de data inválida para formatação:", dateString);
            return 'Data Inválida';
        }
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Erro ao formatar data:", e, "Input:", dateString);
        return 'Erro na Data';
    }
};

// Calcula comentários filtrados/ordenados apenas quando dependências mudarem
const filteredAndSortedComments = React.useMemo(() => {
  return comments
    .filter(c => {
      if (commentOrderBy === 'myVotes')   return c.voted_by_me !== null;
      if (commentOrderBy === 'myComments') return c.user_id === loggedInUserId;
      return true; // todos os demais casos
    })
    .sort((a, b) => {
      if (commentOrderBy === 'points') {
        return commentOrderDirection === 'asc'
          ? a.points - b.points
          : b.points - a.points;
      }
      if (commentOrderBy === 'createdAt') {
        const dA = new Date(a.createdAt);
        const dB = new Date(b.createdAt);
        return commentOrderDirection === 'asc'
          ? dA - dB      // mais antigos primeiro
          : dB - dA;      // mais novos primeiro
      }
      return 0;
    });
},
    // Dependências para o useMemo
    [comments, commentOrderBy, commentOrderDirection, loggedInUserId]
);

// Este serve para definir o comentário do professor assim que foundQuestion for carregada
useEffect(() => {
    setComentarioProfessorContent(foundQuestion?.comentarioProfessor || null);
    setAbaAtiva("comentarioProfessor"); // Define a aba inicial ao encontrar uma questão
}, [foundQuestion]); // <-- AQUI ESTAVA O PROBLEMA: O useEffect estava DENTRO do useMemo. Agora está FORA.

    useEffect(() => {
        const fetchTheoryForQuestion = async () => {
    if (abaAtiva === 'teoria' && foundQuestion?.materia && foundQuestion?.assunto && token) {
        console.log(`[DEBUG] Buscando teoria para Matéria: "${foundQuestion.materia}", Assunto: "${foundQuestion.assunto}"`);
        try {
            const res = await fetch(
                `${API_URL}/api/theories?materia=${encodeURIComponent(foundQuestion.materia)}&assunto=${encodeURIComponent(foundQuestion.assunto)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setTheoryContentForQuestion(data.content);
            } else if (res.status === 404) {
                console.warn(`[DEBUG] Teoria não encontrada para Matéria: "${foundQuestion.materia}", Assunto: "${foundQuestion.assunto}"`);
                setTheoryContentForQuestion(null);
            } else {
                console.error('Erro ao buscar teoria:', res.statusText);
                setTheoryContentForQuestion(null);
            }
        } catch (err) {
            console.error('Erro ao buscar teoria:', err);
            setTheoryContentForQuestion(null);
        }
    } else {
        setTheoryContentForQuestion(null);
    }
};     
        fetchTheoryForQuestion();
    }, [abaAtiva, foundQuestion?.materia, foundQuestion?.assunto, token, API_URL, handleUnauthorized]);

    console.log('[DEBUG] TOKEN em fetchEstatisticas:', token);
    const fetchEstatisticas = useCallback(async (foundQuestionId) => {
    if (!foundQuestionId || !token) {
        setIsLoadingTabContent(false);
        return;
    }
    setIsLoadingTabContent(true);
    try {
        // Criar headers com autenticação
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${token}`);
        
        // Fazer as duas requisições em paralelo
        const [resStats, resSplitStats] = await Promise.all([
            fetch(`${API_URL}/api/questions/${foundQuestionId}/statistics`, { headers }),
            fetch(`${API_URL}/api/questions/${foundQuestionId}/statistics/split`, { headers })
        ]);

        // Verificar status das respostas
        if (resStats.status === 401 || resStats.status === 403 || 
            resSplitStats.status === 401 || resSplitStats.status === 403) {
            handleUnauthorized();
            return;
        }
        
        // Verificar se as respostas estão OK
        if (!resStats.ok) {
            throw new Error('Erro ao carregar estatísticas gerais.');
        }
        if (!resSplitStats.ok) {
            throw new Error('Erro ao carregar estatísticas detalhadas.');
        }
        
        // Processar os dados
        const dataStats = await resStats.json();
        const dataSplitStats = await resSplitStats.json();

        setEstatisticasQuestao(dataStats);
        setSplitStats(dataSplitStats);

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        setMensagem('Erro ao carregar estatísticas.');
        setTipoMensagem('error');
    } finally {
        setIsLoadingTabContent(false);
    }
}, [token, API_URL, handleUnauthorized]);

useEffect(() => {
  if (abaAtiva === 'estatisticas' && foundQuestion && foundQuestion.id && token) {
    console.log('[DEBUG] Chamando fetchEstatisticas para a questão:', foundQuestion.id);
    fetchEstatisticas(foundQuestion.id);
  } else {
    console.log('[DEBUG] Não buscou estatísticas. Condições:',
      'abaAtiva:', abaAtiva,
      'foundQuestion?.id:', foundQuestion?.id,
      'token:', !!token
    );
  }
}, [abaAtiva, foundQuestion?.id, token]);


      // Função para buscar anotação do usuário
    const fetchUserNote = useCallback(async () => {
        if (!foundQuestion?.id || !token) {
            console.log('[DEBUG - fetchUserNote] Condição de parada: questao.id ou token ausente.');
            return;
        }
        
        setIsLoadingNote(true);
        console.log(`[DEBUG - fetchUserNote] Buscando anotação para question_id: ${foundQuestion.id}`);
        try {
            const res = await fetch(`${API_URL}/api/notes/${foundQuestion.id}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                console.warn('[DEBUG - fetchUserNote] Unauthorized/Forbidden ao buscar anotação.');
                handleUnauthorized();
                return;
            }

            if (res.status === 404) {
                console.log('[DEBUG - fetchUserNote] Anotação não encontrada (404). Resetando estados.');
                setNoteId(null);
                setNoteContent('');
                setNoteCreatedAt(null);
                setNoteUpdatedAt(null);
            } else if (res.ok) {
                const data = await res.json();
                console.log('[DEBUG - fetchUserNote] Anotação encontrada:', data);
                setNoteId(data.id);
                setNoteContent(data.content || '');
                setNoteCreatedAt(data.created_at);
                setNoteUpdatedAt(data.updated_at || data.created_at);
            } else {
                const error = await res.json();
                console.error('[DEBUG - fetchUserNote] Erro na resposta da API:', res.status, error);
                throw new Error(error.detail || 'Erro ao buscar anotação');
            }
        } catch (error) {
            console.error('[DEBUG - fetchUserNote] Erro ao buscar anotação (catch):', error);
            setNoteMessage('Erro ao carregar anotação');
        } finally {
            setIsLoadingNote(false);
            console.log('[DEBUG - fetchUserNote] Finalizado. isLoadingNote:', false);
        }
    }, [foundQuestion?.id, token, API_URL, handleUnauthorized]); 

          // Função para salvar/atualizar anotação
    const saveNote = async () => {
        if (!foundQuestion?.id || !token) {
            console.warn('[DEBUG - saveNote] Condição de parada: questao.id ou token ausente.');
            return;
        }
        if (!noteContent.trim()) {
            console.warn('[DEBUG - saveNote] Conteúdo da anotação vazio. Não salvando.');
            setNoteMessage('O conteúdo da anotação não pode ser vazio.');
            setTipoMensagem('error'); 
            setTimeout(() => setNoteMessage(''), 3000);
            return;
        }

        setIsSavingNote(true);
        try {
            const method = noteId ? 'PATCH' : 'POST'; 
            const url = noteId ? `${API_URL}/api/notes/${noteId}` : `${API_URL}/api/notes/`;
            
            console.log(`[DEBUG - saveNote] Enviando requisição: Método=${method}, URL=${url}, noteId=${noteId}`);

            const res = await fetch(url, {
                method, 
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    question_id: foundQuestion.id,
                    content: noteContent 
                }),
            });

            if (res.status === 401 || res.status === 403) {
                console.warn('[DEBUG - saveNote] Unauthorized/Forbidden ao salvar anotação.');
                handleUnauthorized();
                return;
            }

            if (!res.ok) {
                const error = await res.json();
                console.error('[DEBUG - saveNote] Erro na resposta da API:', res.status, error);
                throw new Error(error.detail || 'Erro ao salvar anotação');
            }

            const data = await res.json();
            console.log('[DEBUG - saveNote] Anotação salva com sucesso:', data);
            setNoteId(data.id);
            setNoteContent(data.content);
            setNoteCreatedAt(data.created_at);
            setNoteUpdatedAt(data.updated_at || data.created_at);
            setIsEditingNote(false);
            setNoteMessage('Anotação salva com sucesso!');
            setTipoMensagem('success'); 
        } catch (error) {
            console.error('Erro ao salvar anotação (catch):', error);
            setNoteMessage('Erro ao salvar anotação');
            setTipoMensagem('error'); 
        } finally {
            setIsSavingNote(false);
            setTimeout(() => setNoteMessage(''), 3000);
        }
    };

        // Função para excluir anotação
    const deleteNote = async () => {
        if (!noteId || !token) {
            console.warn('[DEBUG - deleteNote] Condição de parada: noteId ou token ausente.');
            return;
        }
        
        setIsDeletingNote(true);
        console.log(`[DEBUG - deleteNote] Excluindo anotação com ID: ${noteId}`);
        try {
            const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                console.warn('[DEBUG - deleteNote] Unauthorized/Forbidden ao excluir anotação.');
                handleUnauthorized();
                return;
            }

            if (!res.ok) {
                console.error('[DEBUG - deleteNote] Erro na resposta da API (DELETE):', res.status);
                throw new Error('Erro ao excluir anotação.');
            }

            console.log('[DEBUG - deleteNote] Anotação excluída com sucesso.');
            setNoteId(null);
            setNoteContent('');
            setNoteCreatedAt(null);
            setNoteUpdatedAt(null);
            setNoteMessage('Anotação excluída com sucesso!');
            setTipoMensagem('success'); 
        } catch (error) {
            console.error('Erro ao excluir anotação (catch):', error);
            setNoteMessage('Erro ao excluir anotação');
            setTipoMensagem('error'); 
        } finally {
            setIsDeletingNote(false);
            setTimeout(() => setNoteMessage(''), 3000);
        }
    };

       // Efeito para carregar anotação quando a questão muda
   useEffect(() => {
        if (abaAtiva === 'anotacoes' && foundQuestion?.id) { 
            fetchUserNote(); 
        } else if (abaAtiva === 'anotacoes' && !foundQuestion?.id) {
            console.log('[DEBUG - useEffect Anotacoes] Aba ativa, mas sem questao. Limpando estados de anotação.');
            setNoteId(null);
            setNoteContent('');
            setNoteCreatedAt(null);
            setNoteUpdatedAt(null);
            setIsEditingNote(false);
            setNoteMessage('');
            setIsLoadingNote(false);
            setIsSavingNote(false);
            setIsDeletingNote(false);
        }
    }, [abaAtiva, !foundQuestion?.id, fetchUserNote]); 

    

    // --- FUNÇÕES DE RENDERIZAÇÃO DE CONTEÚDO DAS ABAS (REMOVIDO useCallback para simplificar o escopo) ---

    const renderComentarioProfessor = () => (
        <div className="relative bg-white border-l-4 border-black-500 p-6 rounded-lg min-h-[400px]">
            <h2 className="text-lg font-bold text-black-700 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" /> Comentário do Professor
            </h2>
            {isLoadingTabContent ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                    <p className="ml-2 text-gray-600">Carregando comentário do professor...</p>
                </div>
            ) : comentarioProfessorContent && comentarioProfessorContent.trim().length > 0 ? (
                <div
                    className="prose prose-sm max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comentarioProfessorContent) }}
                />
            ) : (
                <p className="text-gray-600">Nenhum comentário do professor disponível para esta questão.</p>
            )}
        </div>
    );

    const renderComentarioAluno = () => (
        <div className="relative bg-white border-l-4 border-black-500 p-6 rounded-lg min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" /> Fórum de Discussão
                </h2>
                <button
                    onClick={() => {
                        setShowCommentEditor(true);
                        setEditingComment(null); 
                        setNewCommentContent('');
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all text-sm font-semibold"
                >
                    Adicionar Post
                </button>
            </div>

            {mensagem && tipoMensagem && ( 
                <MessageModal
                    message={mensagem}
                    type={tipoMensagem}
                    onClose={() => setMensagem('')}
                />
            )}

            {showCommentEditor ? (
                <div className="bg-white p-4 rounded-lg shadow-inner mb-6">
                    <h3 className="text-md font-semibold mb-3">
                        {editingComment ? 'Editar Comentário' : 'Escrever Comentário'}
                    </h3>
                    <RichTextEditor
                        value={editingComment ? editingCommentContent : newCommentContent}
                        onChange={editingComment ? setEditingCommentContent : setNewCommentContent}
                    />
                    <div className="mt-4 flex justify-end space-x-3">
                        <button
                            onClick={editingComment ? handleSaveEditedComment : handleAddComment}
                            className={`bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm ${
                                !(editingComment ? editingCommentContent.trim() : newCommentContent.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={!(editingComment ? editingCommentContent.trim() : newCommentContent.trim()) || isPostingComment || isEditingComment}
                        >
                            {(isPostingComment || isEditingComment) ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : ''}
                            {editingComment ? 'Salvar Edição' : 'Publicar Post'}
                        </button>
                        <button
                            onClick={() => {
                                setShowCommentEditor(false);
                                setEditingComment(null);
                                setNewCommentContent('');
                                setEditingCommentContent('');
                            }}
                            className="bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 transition-all font-semibold text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-end items-center text-sm mb-4">
                        <span className="mr-2 text-gray-700">Ordenar por:</span>
                        <select
                            value={`${commentOrderBy}_${commentOrderDirection}`}
                            onChange={(e) => {
                                const [by, dir] = e.target.value.split('_');
                                setCommentOrderBy(by);
                                setCommentOrderDirection(dir);
                            }}
                            className="p-1 border border-gray-300 rounded-md"
                        >
                            <option value="createdAt_desc">Mais recentes</option>
                            <option value="createdAt_asc">Mais antigos</option>
                            <option value="points_desc">Mais votados</option>
                            {comments.some(c => c.voted_by_me) && (
                                <option value="myVotes_desc">Meus Votos</option>
                            )}
                            {comments.some(c => c.user_id === loggedInUserId) && (
                                <option value="myComments_desc">Meus Comentários</option>
                            )}
                        </select>
                    </div>

                    {isLoadingTabContent ? (
                        <div className="flex items-center justify-center h-48 text-gray-600">
                            <Loader2 className="animate-spin h-8 w-8 mr-3" /> Carregando comentários...
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                            {filteredAndSortedComments.length > 0 ? (
                                filteredAndSortedComments.map((comment) => (
                                    <div key={comment.id} className="bg-white p-4 rounded-lg shadow-md flex">
                                        <div className="flex flex-col items-center justify-center text-gray-500 mr-4 w-10">
                                            {comment.points !== undefined && (
                                                <span className={`text-xs font-semibold ${comment.points >= 0 ? 'text-green-600' : 'text-red-600'} mb-1`}>
                                                    {comment.points >= 0 ? `+${comment.points}` : comment.points}
                                                </span>
                                            )}

                                            <button
                                                disabled={isVotingCommentId === comment.id}
                                                onClick={() =>
                                                    handleVoteComment(
                                                        comment.id,
                                                        comment.voted_by_me === "upvote" ? "remove" : "upvote"
                                                    )
                                                }
                                                className={`transition ${
                                                    comment.voted_by_me === "upvote"
                                                        ? "text-green-600"
                                                        : "text-gray-500 hover:text-green-600"
                                                } ${isVotingCommentId === comment.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                                title="Gostei"
                                            >
                                                <FaThumbsUp size={16} />
                                            </button>

                                            <button
                                                disabled={isVotingCommentId === comment.id}
                                                onClick={() =>
                                                    handleVoteComment(
                                                        comment.id,
                                                        comment.voted_by_me === "downvote" ? "remove" : "downvote"
                                                    )
                                                }
                                                className={`mt-1 transition ${
                                                    comment.voted_by_me === "downvote"
                                                        ? "text-red-600"
                                                        : "text-gray-500 hover:text-red-600"
                                                } ${isVotingCommentId === comment.id ? "opacity-50 cursor-not-allowed" : ""}`}
                                                title="Não gostei"
                                            >
                                                <FaThumbsDown size={16} />
                                            </button>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-baseline mb-2">
                                                <p className="font-semibold text-blue-700">
                                                    {comment.user?.username || 'Usuário Desconhecido'} -{' '}
                                                    <span className="text-gray-600 text-sm">
                                                        Postado em {formatCommentDate(comment.createdAt)}
                                                    </span>
                                                </p>
                                                {loggedInUserId === comment.user_id && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleEditCommentClick(comment)}
                                                            className="text-blue-600 hover:text-blue-800 p-1 rounded-md"
                                                            title="Editar Comentário"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCommentClick(comment)}
                                                            className="text-red-600 hover:text-red-800 p-1 rounded-md"
                                                            title="Excluir Comentário"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                className="prose prose-sm max-w-none break-words"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-600 text-center py-10">Nenhum comentário ainda. Seja o primeiro a postar!</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const renderTeoria = () => (
        <div className="relative bg-white border-l-4 border-black-500 p-6 rounded-lg min-h-[400px]">
            <h2 className="text-lg font-bold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" /> Teoria da Questão
            </h2>
            {theoryContentForQuestion ? (
                <div
                    className="prose prose-sm max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: theoryContentForQuestion }}
                />
            ) : (
                <p className="text-gray-600 italic">
                    Nenhuma teoria disponível para a matéria/assunto desta questão. 
                    Por favor, verifique se a teoria foi cadastrada no sistema com o título exato.
                </p>
            )}
        </div>
    );

    const renderEstatisticas = () => (
  <div className="relative bg-white border-l-4 border-black-500 p-6 rounded-lg min-h-[400px]">
    <h2 className="text-lg font-bold text-black-700 mb-4 flex items-center">
      <BarChart className="w-5 h-5 mr-2" /> Estatísticas da Questão
    </h2>
    {isLoadingTabContent ? (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <p className="ml-2 text-gray-600">Carregando estatísticas...</p>
      </div>
    ) : (
      <>
        {estatisticasQuestao && estatisticasQuestao.total ? (
          <div className="p-4 bg-white rounded-xl shadow space-y-2 mb-6">
            <div className="flex flex-col items-center text-center">
              <h4 className="font-semibold text-gray-800">Desempenho Geral na Questão</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Acertos", value: estatisticasQuestao.total.acertos },
                      { name: "Erros", value: estatisticasQuestao.total.tentativas - estatisticasQuestao.total.acertos }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name }) => name}
                    dataKey="value"
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-sm space-y-1">
              <p className="text-green-600 font-medium">Acertos: {estatisticasQuestao.total.acertos}</p>
              <p className="text-red-600 font-medium">Erros: {estatisticasQuestao.total.tentativas - estatisticasQuestao.total.acertos}</p>
              <p className="text-blue-600 font-medium">
                Taxa de Acerto: {estatisticasQuestao.total.tentativas > 0
                  ? ((estatisticasQuestao.total.acertos / estatisticasQuestao.total.tentativas) * 100).toFixed(1)
                  : "0.0"
                }%
              </p>
              <p className="text-black-500">Total de respostas: {estatisticasQuestao.total.tentativas}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-4">Ainda não há respostas para esta questão.</p>
        )}

        {splitStats && (
          <div className="space-y-8 mt-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-2">Todos os Usuários</h3>
              <BarChartComponent 
                correct={splitStats.total.acertos} 
                total={splitStats.total.tentativas} 
              />
            </div>

            <div>
              <h3 className="text-base font-bold text-blue-700 mb-2">Seu Desempenho</h3>
              <BarChartComponent 
                correct={splitStats.usuario.acertos} 
                total={splitStats.usuario.tentativas} 
              />
            </div>

            <div>
              <h3 className="text-base font-bold text-green-700 mb-2">Outros Usuários</h3>
              <BarChartComponent 
                correct={splitStats.outros.acertos} 
                total={splitStats.outros.tentativas} 
              />
            </div>
          </div>
        )}
      </>
    )}
  </div>
);

     // Renderização da aba de anotações
    const renderMinhasAnotacoes = () => {
        console.log(`[DEBUG - renderMinhasAnotacoes] isLoadingNote: ${isLoadingNote}, isEditingNote: ${isEditingNote}, noteId: ${noteId}, noteContent (length): ${noteContent.length}`);
        return (
            <div className="relative bg-white border-l-4 border-black-500 p-6 rounded-lg min-h-[400px]">
                <h2 className="text-lg font-bold text-black-700 mb-4 flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2" /> Minhas Anotações
                </h2>

                {noteMessage && (
                    <MessageModal
                        message={noteMessage}
                        type={tipoMensagem} 
                        onClose={() => setNoteMessage('')}
                    />
                )}

                {isLoadingNote ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                        <p className="ml-2 text-gray-600">Carregando anotação...</p>
                    </div>
                ) : isEditingNote ? (
                    <div className="space-y-4">
                        <RichTextEditor 
                            value={noteContent} 
                            onChange={setNoteContent} 
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    console.log('[DEBUG - Cancelar Edição] Clicado. Restaurando conteúdo original se noteId existe.');
                                    setIsEditingNote(false);
                                    // Ao cancelar a edição, se havia uma anotação existente, 
                                    // restaura o conteúdo original. Caso contrário, limpa.
                                    // Para restaurar o original, precisaríamos de um estado para o original.
                                    // Por simplicidade, vamos apenas sair do modo de edição.
                                    // Se o usuário quer descartar, ele pode clicar em "Nova Anotação" ou navegar para outra questão.
                                }}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveNote}
                                disabled={isSavingNote}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSavingNote ? (
                                    <span className="flex items-center">
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                        Salvando...
                                    </span>
                                ) : 'Salvar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {noteId && (
                            <p className="text-sm text-gray-500 mb-4">
                                {noteCreatedAt && `Criado em: ${new Date(noteCreatedAt).toLocaleDateString('pt-BR')}`}
                                {noteUpdatedAt && noteUpdatedAt !== noteCreatedAt && 
                                    ` | Atualizado em: ${new Date(noteUpdatedAt).toLocaleDateString('pt-BR')}`}
                            </p>
                        )}

                        {noteContent ? (
                            <div 
                                className="prose max-w-none bg-gray-50 p-4 rounded-lg mb-4"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(noteContent) }}
                            />
                        ) : (
                            <p className="text-gray-500 italic">Nenhuma anotação criada ainda.</p>
                        )}

                        <div className="flex justify-end gap-3">
                            {/* Renderiza "Criar Anotação" se não houver noteId */}
                            {!noteId && (
                                <button
                                    onClick={() => {
                                        console.log('[DEBUG - Nova Anotação] Clicado. Limpando estados para nova anotação.');
                                        setNoteId(null); // Limpa o ID para criar uma nova anotação
                                        setNoteContent(''); // Limpa o conteúdo
                                        setIsEditingNote(true); // Entra no modo de edição
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <FilePlus2 className="inline mr-2 h-4 w-4" />
                                    Criar Anotação
                                </button>
                            )}

                            {/* Renderiza "Editar" e "Excluir" se houver noteId */}
                            {noteId && (
                                <>
                                    <button
                                        onClick={() => {
                                            console.log('[DEBUG - Editar Anotação Existente] Clicado. Entrando em modo de edição.');
                                            setIsEditingNote(true);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        <Edit className="inline mr-2 h-4 w-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={deleteNote}
                                        disabled={isDeletingNote}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {isDeletingNote ? (
                                            <span className="flex items-center">
                                                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                                Excluindo...
                                            </span>
                                        ) : (
                                            <span>
                                                <Trash2 className="inline mr-2 h-4 w-4" />
                                                Excluir
                                            </span>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Função auxiliar para renderizar o conteúdo da aba ativa (agora chama as funções diretamente)
    const renderActiveTabContent = () => {
        switch (abaAtiva) {
            case 'comentarioProfessor':
                return renderComentarioProfessor();
            case 'comentarioAluno':
                return renderComentarioAluno();
            case 'teoria':
                return renderTeoria();
            case 'estatisticas':
                return renderEstatisticas();
            case 'anotacoes':
                return renderMinhasAnotacoes();
            default:
                return <div className="text-center py-4 text-gray-600">Selecione uma aba para ver o conteúdo.</div>;
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter">
            <TopNav onLogout={onLogout} />


            <Fragment>
                <div className="min-h-screen bg-gray-100 flex flex-col">
                    <div className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 w-full">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Buscar Questão</h1>

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

                        {/* Exibição da Questão - Mantida como está */}
                        {foundQuestion && (
                             <div className="bg-white rounded-lg shadow-md p-6 w-full mx-auto">
                                <div className="mb-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-base text-gray-700 mb-4">
                                        <div><strong className="text-gray-800">Questão ID:</strong> {foundQuestion.id}</div>
                                        <div><strong className="text-gray-800">Matéria:</strong> {foundQuestion.materia}</div>
                                        <div><strong className="text-gray-800">Assunto:</strong> {foundQuestion.assunto}</div>
                                        <div><strong className="text-gray-800">Banca:</strong> {foundQuestion.banca}</div>
                                        <div><strong className="text-gray-800">Órgão:</strong> {foundQuestion.orgao}</div>
                                        <div><strong className="text-gray-800">Cargo:</strong> {foundQuestion.cargo}</div>
                                        <div><strong className="text-gray-800">Ano:</strong> {foundQuestion.ano}</div>
                                        <div><strong className="text-gray-800">Escolaridade:</strong> {foundQuestion.escolaridade}</div>
                                        <div><strong className="text-gray-800">Dificuldade:</strong> {foundQuestion.dificuldade}</div>
                                        <div><strong className="text-gray-800">Região:</strong> {foundQuestion.regiao}</div>
                                        <div><strong className="text-gray-800">Tipo:</strong> {foundQuestion.tipo === 'multipla' ? 'Múltipla Escolha' : 'Certo/Errado'}</div>

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

                                    {foundQuestion.informacoes && (
                                        <div className="mt-6 mb-6 text-gray-700 prose max-w-none">
                                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Informações:</h3>
                                            <div className="text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(foundQuestion.informacoes) }}></div>
                                        </div>
                                    )}

                                    <div className="prose max-w-none mb-4 text-gray-700">
                                        <h3 className="font-semibold text-lg text-gray-800 mb-2">Enunciado:</h3>
                                        <div className="text-base" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(foundQuestion.enunciado) }}></div>
                                    </div>

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

                                <div className="mt-8 flex flex-col bg-white rounded-lg shadow-md border border-gray-200 w-full">
                                    <div className="flex border-b border-gray-200">
                                        <TabButton
                                            icon={<BookOpen className="w-5 h-5" />}
                                            label="Comentários Professor"
                                            isActive={abaAtiva === 'comentarioProfessor'}
                                            onClick={() => setAbaAtiva('comentarioProfessor')}
                                        />
                                        <TabButton
                                            icon={<MessageSquare className="w-5 h-5" />}
                                            label="Comentários Alunos"
                                            isActive={abaAtiva === 'comentarioAluno'}
                                            onClick={() => setAbaAtiva('comentarioAluno')}
                                        />
                                        <TabButton
                                            icon={<FileText className="w-5 h-5" />}
                                            label="Teoria da Questão"
                                            isActive={abaAtiva === 'teoria'}
                                            onClick={() => setAbaAtiva('teoria')}
                                        />
<TabButton
  icon={<BarChart className="w-4 h-4" />}
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
                                    <div className="p-6 flex-grow overflow-y-auto">
                                        {renderActiveTabContent()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <ActionModal
                    isOpen={showCommentEditor}
                    onClose={() => {
                        setShowCommentEditor(false);
                        setEditingComment(null);
                        setNewCommentContent('');
                        setEditingCommentContent('');
                        setIsPostingComment(false);
                        setIsEditingComment(false);
                    }}
                    title={editingComment ? "Editar Comentário" : "Novo Comentário"}
                    message={
                        <RichTextEditor
                            value={editingComment ? editingCommentContent : newCommentContent}
                            onChange={editingComment ? setEditingCommentContent : setNewCommentContent}
                            placeholder="Escreva seu comentário aqui..."
                        />
                    }
                    onConfirm={editingComment ? handleSaveEditedComment : handleAddComment}
                    confirmText={(isPostingComment || isEditingComment) ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> {editingComment ? 'Salvando...' : 'Postando...'}</span> : (editingComment ? 'Salvar' : 'Postar')}
                    isConfirming={isPostingComment || isEditingComment}
                    type="primary"
                />


                <ActionModal
                    isOpen={showDeleteCommentModal}
                    onClose={() => {
                        setShowDeleteCommentModal(false);
                        setIsDeletingComment(false);
                        setCommentToDelete(null);
                    }}
                    title={`Excluir Comentário?`}
                    message={`Você tem certeza que deseja excluir este comentário? Esta ação é irreversível.`}
                    onConfirm={confirmDeleteComment}
                    confirmText={isDeletingComment ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Excluindo...</span> : 'Excluir'}
                    isConfirming={isDeletingComment}
                    type="danger"
                />
            </Fragment>
        </div>
    );
}











