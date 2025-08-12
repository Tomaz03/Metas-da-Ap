import { useParams, useNavigate } from 'react-router-dom';
import { FilePlus2, Save, Trash2, LogOut, BookOpen, MessageSquare, FileText, BarChart, ChevronUp, ChevronDown, Edit, X, Loader2, CheckCircle, XCircle, ClipboardList, GraduationCap, BookText, LineChart, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Star } from 'lucide-react';
import TopNav from "../TopNav";
import React, { useState, useEffect, useCallback } from 'react';
import RichTextEditor from '../RichTextEditor';
import MessageModal from '../ui/MessageModal';
import DOMPurify from "dompurify";
import ActionModal from '../ui/ActionModal';
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import BarChartComponent from '../ui/BarChartComponent'; 

export default function NotebookResolver({ token, onLogout }) {
    const { id } = useParams(); // id do caderno
    const navigate = useNavigate();

    const [questoes, setQuestoes] = useState([]);
    const [indiceAtual, setIndiceAtual] = useState(0);
    const [respostaUsuario, setRespostaUsuario] = useState(null);
    const [mostrarFeedback, setMostrarFeedback] = useState(false);
    const [nomeCaderno, setNomeCaderno] = useState('');
    const [acertos, setAcertos] = useState(0);
    const [erros, setErros] = useState(0);
    const [resolvidas, setResolvidas] = useState(0);
    const [respostas, setRespostas] = useState({}); 
    const [modoAleatorio, setModoAleatorio] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState('questionContent');
    const [cliquesPorAlternativa, setCliquesPorAlternativa] = useState({});
    const [commentStatusType, setCommentStatusType] = useState(null);

    const [isCarregando, setIsCarregando] = useState(true);
    const [mensagem, setMensagem] = useState('');
    const [tipoMensagem, setTipoMensagem] = useState('info');

    const [estatisticasQuestao, setEstatisticasQuestao] = useState(null); 
    const [splitStats, setSplitStats] = useState(null);
    const [theoryContentForQuestion, setTheoryContentForQuestion] = useState(null);

    const [comments, setComments] = useState([]);
    const [showCommentEditor, setShowCommentEditor] = useState(false);
    const [newCommentContent, setNewCommentContent] = useState('');
    const [commentOrderBy, setCommentOrderBy] = useState('createdAt');
    const [commentOrderDirection, setCommentOrderDirection] = useState('desc');
    const [isVotingCommentId, setIsVotingCommentId] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);

    const [commentStatusMessage, setCommentStatusMessage] = useState('');

    const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [isDeletingComment, setIsDeletingComment] = useState(false);
    
    // Estados para anotações
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

    const questao = questoes[indiceAtual];
    const API_URL = import.meta.env.VITE_API_URL;
    const [stats, setStats] = useState(null);

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

    const ordenarQuestoes = useCallback((lista) => {
        return [...lista].sort((a, b) => {
            if (b.ano !== a.ano) return b.ano - a.ano;
            return (a.assunto || '').localeCompare(b.assunto || '');
        });
    }, []);

    const embaralharQuestoes = useCallback((lista) => [...lista].sort(() => Math.random() - 0.5), []);

    const atualizarFeedback = useCallback((questaoAtualParam, respostasSalvasParam) => {
        if (questaoAtualParam && respostasSalvasParam[questaoAtualParam.id] !== undefined) {
            setRespostaUsuario(respostasSalvasParam[questaoAtualParam.id]);
            setMostrarFeedback(true);
            setCliquesPorAlternativa((prev) => ({
                ...prev,
                [respostasSalvasParam[questaoAtualParam.id]]: 1,
            }));
        } else {
            setRespostaUsuario(null);
            setMostrarFeedback(false);
            setCliquesPorAlternativa({});
        }
    }, []);

    const fetchQuestoes = useCallback(async () => {
        setIsCarregando(true);
        setMensagem('');
        setTipoMensagem('info');
        try {
            const res = await fetch(`${API_URL}/api/notebooks/${id}/resolve_data`, {
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
            console.log("Dados do caderno e questões recebidos:", data);

            setNomeCaderno(data.nome);
            let listaQuestoes = data.questoes || [];

            // Mapeia os novos campos is_anulada e is_desatualizada e is_favorited
            listaQuestoes = listaQuestoes.map(q => ({
                ...q,
                isAnulada: q.is_anulada || false,
                isDesatualizada: q.is_desatualizada || false,
                isFavorited: q.is_favorited || false, // Mapeia o novo campo
            }));


            if (modoAleatorio) listaQuestoes = embaralharQuestoes(listaQuestoes);
            else listaQuestoes = ordenarQuestoes(listaQuestoes);

            setQuestoes(listaQuestoes);

            const progressoSalvo = data.progresso || { index: 0, respostas: {} };
            const indexAtual = progressoSalvo.index || 0;
            const respostasSalvas = progressoSalvo.respostas || {};

            setIndiceAtual(indexAtual);
            setRespostas(respostasSalvas);

            const respondidasIds = Object.keys(respostasSalvas);
            setResolvidas(respondidasIds.length);
            let totalAcertosTemp = 0;
            respondidasIds.forEach((key) => {
                const q = listaQuestoes.find(q => q.id === parseInt(key));
                if (q && respostasSalvas[key] === q.correta) totalAcertosTemp++;
            });
            setAcertos(totalAcertosTemp);
            setErros(respondidasIds.length - totalAcertosTemp);

            if (listaQuestoes.length > 0) {
                atualizarFeedback(listaQuestoes[indexAtual], respostasSalvas);
            }

        } catch (err) {
            console.error('Erro ao carregar questões do caderno:', err);
            setMensagem(err.message || 'Não foi possível carregar as questões. Verifique sua conexão.');
            setTipoMensagem('error');
        } finally {
            setIsCarregando(false);
        }
    }, [API_URL, id, token, modoAleatorio, embaralharQuestoes, ordenarQuestoes, atualizarFeedback, handleUnauthorized]);

  // Função para buscar anotação do usuário
    const fetchUserNote = useCallback(async () => {
        if (!questao?.id || !token) {
            console.log('[DEBUG - fetchUserNote] Condição de parada: questao.id ou token ausente.');
            return;
        }
        
        setIsLoadingNote(true);
        console.log(`[DEBUG - fetchUserNote] Buscando anotação para question_id: ${questao.id}`);
        try {
            const res = await fetch(`${API_URL}/api/notes/${questao.id}`, { 
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
    }, [questao?.id, token, API_URL, handleUnauthorized]); 

    // Função para salvar/atualizar anotação
    const saveNote = async () => {
        if (!questao?.id || !token) {
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
            const url = noteId ? `${API_URL}/api/notes/${noteId}` : `${API_URL}/api/notes`;
            
            console.log(`[DEBUG - saveNote] Enviando requisição: Método=${method}, URL=${url}, noteId=${noteId}`);

            const res = await fetch(url, {
                method, 
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    question_id: questao.id,
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

    useEffect(() => {
        if (token) {
            fetchQuestoes();
        } else {
            handleUnauthorized();
        }
    }, [token, fetchQuestoes, handleUnauthorized]);

   // Efeito para carregar anotação quando a questão muda
   useEffect(() => {
        console.log(`[DEBUG - useEffect Anotacoes] abaAtiva: ${abaAtiva}, questao?.id: ${questao?.id}`);
        if (abaAtiva === 'anotacoes' && questao?.id) { 
            fetchUserNote(); 
        } else if (abaAtiva === 'anotacoes' && !questao?.id) {
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
    }, [abaAtiva, questao, fetchUserNote]); 


    const fetchSplitStats = async () => {
    try {
        const res = await fetch(`${API_URL}/api/questions/${questao.id}/statistics/split`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSplitStats(data);
    } catch (err) {
        console.error("Erro ao buscar estatísticas detalhadas:", err);
    }
};


    useEffect(() => {
    if (!questao?.id || !token || abaAtiva !== 'estatistica') {
        setStats(null);
        setSplitStats(null);
        return;
    }

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/questions/${questao.id}/statistics`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) throw new Error("Erro ao buscar estatísticas");
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error("Erro ao carregar estatísticas:", err);
            setStats(null);
        }
    };

    fetchStats();
    fetchSplitStats();
}, [questao?.id, token, abaAtiva, API_URL]); 


    useEffect(() => {
        const fetchComments = async () => {
            if (abaAtiva === 'comentarioAluno' && questao?.id && token) {
                console.log(`[DEBUG] Tentando buscar comentários para questao.id: ${questao.id}`);
                console.log(`[DEBUG] Token de autenticação: ${token ? 'Presente' : 'Ausente'}`);
                console.log(`[DEBUG] Primeiro caractere do token: ${token ? token[0] : 'N/A'}`);
                try {
                    const res = await fetch(`${API_URL}/api/questions/${questao.id}/comments?orderBy=${commentOrderBy}&order=${commentOrderDirection}`, {
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
                console.log(`[DEBUG] Não buscando comentários. Aba ativa: ${abaAtiva}, Questao ID: ${questao?.id}, Token: ${token ? 'Presente' : 'Ausente'}`);
                setComments([]);
            }
            setCommentStatusMessage('');
            setCommentStatusType('');
        };
        fetchComments();
    }, [abaAtiva, questao?.id, token, commentOrderBy, commentOrderDirection, API_URL, handleUnauthorized]);

    useEffect(() => {
        const fetchTheoryForQuestion = async () => {
    if (abaAtiva === 'teoria' && questao?.materia && questao?.assunto && token) {
        console.log(`[DEBUG] Buscando teoria para Matéria: "${questao.materia}", Assunto: "${questao.assunto}"`);
        try {
            const res = await fetch(
                `${API_URL}/api/theories?materia=${encodeURIComponent(questao.materia)}&assunto=${encodeURIComponent(questao.assunto)}`,
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
                console.warn(`[DEBUG] Teoria não encontrada para Matéria: "${questao.materia}", Assunto: "${questao.assunto}"`);
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
};       fetchTheoryForQuestion();
    }, [abaAtiva, questao?.materia, questao?.assunto, token, API_URL, handleUnauthorized]);

    const handleAlternativaClick = (index) => {
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
    };

    const handleConfirmar = async () => {
        if (respostaUsuario === null) return;
        if (!questao?.id) {
            console.error('Erro: ID da questão é indefinido ao tentar confirmar resposta.');
            setMensagem('Erro interno: ID da questão ausente.');
            setTipoMensagem('error');
            return;
        }

        try {
            setMostrarFeedback(true);
            const acertou = respostaUsuario === questao.correta;

            setResolvidas((prev) => prev + 1);
            if (acertou) {
                setAcertos((prev) => prev + 1);
            } else {
                setErros((prev) => prev + 1);
            }

            const novasRespostas = { ...respostas, [questao.id]: respostaUsuario };
            setRespostas(novasRespostas);

            const resResposta = await fetch(`${API_URL}/api/questions/${questao.id}/statistics`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ is_correct: acertou }),
            });
            if (resResposta.status === 401 || resResposta.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!resResposta.ok) {
                const errorData = await resResposta.json();
                console.error('Erro ao registrar resposta individual:', errorData);
                throw new Error(errorData.detail || 'Erro ao registrar resposta individual.');
            }
            console.log('Resposta individual registrada com sucesso.');

            const resProgresso = await fetch(`${API_URL}/api/notebooks/${id}/progress`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ index: indiceAtual, respostas: novasRespostas }),
            });
            if (resProgresso.status === 401 || resProgresso.status === 403) {
                handleUnauthorized();
                return;
            }
            if (!resProgresso.ok) {
                const errorData = await resProgresso.json();
                console.error('Erro ao salvar progresso:', errorData);
                throw new Error(errorData.detail || 'Erro ao salvar progresso.');
            }
            setMensagem('Progresso do caderno salvo com sucesso!');
            setTipoMensagem('success');
            console.log('Progresso do caderno salvo com sucesso.');

        } catch (err) {
            console.error('Erro geral ao registrar resposta e progresso:', err);
            setMensagem(`Erro ao salvar: ${err.message}`);
            setTipoMensagem('error');
        } finally {
            setTimeout(() => setMensagem(''), 3000);
        }
    };

    const removePTags = (html) => {
        if (typeof html !== 'string') return html;
        return html
            .replace(/^(\s*<p[^>]*>)+/i, '')
            .replace(/(<\/p>\s*)+$/i, '');
    };

    const avancar = () => {
        if (indiceAtual < questoes.length - 1) {
            const novoIndex = indiceAtual + 1;
            setIndiceAtual(novoIndex);
            atualizarFeedback(questoes[novoIndex], respostas);
        }
    };

    const retroceder = () => {
        if (indiceAtual > 0) {
            const novoIndex = indiceAtual - 1;
            setIndiceAtual(novoIndex);
            atualizarFeedback(questoes[novoIndex], respostas);
        }
    };

    const getAssunto = useCallback(() => {
        const assuntos = [...new Set(questoes.map(q => q.assunto).filter(Boolean))];
        return assuntos.sort();
    }, [questoes]);

    const avancarAssunto = () => {
        const assuntos = getAssunto();
        if (!questao || !questao.assunto) return;
        const atualIndex = assuntos.indexOf(questao.assunto);
        if (atualIndex !== -1 && atualIndex < assuntos.length - 1) {
            const proximoAssunto = assuntos[atualIndex + 1];
            const novaIndex = questoes.findIndex(q => q.assunto === proximoAssunto);
            if (novaIndex !== -1) {
                setIndiceAtual(novaIndex);
                atualizarFeedback(questoes[novaIndex], respostas);
            }
        }
    };

    const retrocederAssunto = () => {
        const assuntos = getAssunto();
        if (!questao || !questao.assunto) return;
        const atualIndex = assuntos.indexOf(questao.assunto);
        if (atualIndex > 0) {
            const assuntoAnterior = assuntos[atualIndex - 1];
            const novaIndex = questoes.findIndex(q => q.assunto === assuntoAnterior);
            if (novaIndex !== -1) {
                setIndiceAtual(novaIndex);
                atualizarFeedback(questoes[novaIndex], respostas);
            }
        }
    };

    const handleAddComment = async () => {
        if (!questoes.length || !questoes[indiceAtual] || !questoes[indiceAtual].id) return;

        if (!newCommentContent.trim()) return;

        try {
            const res = await fetch(`${API_URL}/api/questions/${questoes[indiceAtual].id}/comments`, {
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
    };

    const handleVoteComment = async (commentId, voteType) => {
    if (isVotingCommentId === commentId) return; // evita cliques múltiplos
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
};

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
};
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
};


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
          ? dA - dB       // mais antigos primeiro
          : dB - dA;      // mais novos primeiro
      }
      return 0;
    });
}, [comments, commentOrderBy, commentOrderDirection, loggedInUserId]);

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

    // Renderização do conteúdo da aba ativa
    const renderActiveTabContent = () => {
        switch (abaAtiva) {
            case 'questionContent':
                return renderQuestionContent();
            case 'comentarioProfessor':
                return renderComentarioProfessor();
            case 'comentarioAluno':
                return renderComentarioAluno();
            case 'teoria':
                return renderTeoria();
            case 'estatistica':
                return renderEstatistica();
            case 'anotacoes': 
                return renderMinhasAnotacoes();
            default:
                return null;
        }
    };

    // Funções de renderização das abas (mantidas para clareza, mas agora chamadas por renderActiveTabContent)
    const renderQuestionContent = () => (
  <div className="relative pt-12"> {/* Contêiner relativo e espaçamento superior */}
    {/* Botão de Favoritar */}
    <button
      onClick={handleFavoriteToggle}
      className="absolute top-4 right-4 p-2 rounded-full transition-all duration-300 transform hover:scale-110"
      title={questao.isFavorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
    >
      <Star className={`w-8 h-8 ${questao.isFavorited ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
    </button>

    {/* Exibição do status Anulada/Desatualizada */}
    {questao.isAnulada && (
      <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 flex items-center justify-center font-semibold text-lg border border-red-300">
        <XCircle className="w-6 h-6 mr-2" /> Questão Anulada
      </div>
    )}
    {questao.isDesatualizada && !questao.isAnulada && (
      <div className="bg-yellow-100 text-yellow-700 p-3 rounded-lg mb-4 flex items-center justify-center font-semibold text-lg border border-yellow-300">
        <XCircle className="w-6 h-6 mr-2" /> Questão Desatualizada
      </div>
    )}

    {questao.informacoes && (
      <div
        className="text-sm text-gray-700 mb-4 font-bold prose prose-sm max-w-none break-words"
        dangerouslySetInnerHTML={{ __html: removePTags(questao.informacoes) }}
      />
    )}

    <div
      className="text-base text-gray-800 font-medium mb-6 leading-relaxed text-justify prose prose-sm max-w-none break-words"
      dangerouslySetInnerHTML={{ __html: removePTags(questao.enunciado) }}
    />

    {questao.tipo === 'multipla' && (
      <ul className="space-y-3 mb-6">
        {alternativas.map((alt, i) => (
          <li key={i}>
            <label
              className={`flex items-start space-x-3 p-4 rounded-lg transition-all duration-200 cursor-pointer ${
                mostrarFeedback && respostaUsuario === i
                  ? respostaUsuario === questao.correta
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
                className={`mt-1 h-4 w-4 ${cliquesPorAlternativa[i] === 1 ? 'text-white' : 'text-blue-600'} focus:ring-blue-500`}
                disabled={mostrarFeedback}
                checked={respostaUsuario === i}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAlternativaClick(i);
                }}
              />
              <span
                className={`text-sm ${cliquesPorAlternativa[i] === 0 ? 'line-through opacity-60 text-gray-500' : ''}`}
                dangerouslySetInnerHTML={{ __html: `<strong class="mr-1">${letras[i]}.</strong> ${removePTags(alt)}` }}
              />
            </label>
          </li>
        ))}
      </ul>
    )}

    {questao.tipo === 'certo_errado' && (
      <div className="flex flex-col space-y-2 mb-6">
        <label
          className={`flex items-center space-x-2 py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer ${
            cliquesPorAlternativa[1] === 1 && !mostrarFeedback
              ? 'bg-blue-100 border border-blue-300'
              : mostrarFeedback && respostaUsuario === 1
                ? (respostaUsuario === questao.correta ? 'bg-green-600 text-white shadow-md' : 'bg-red-600 text-white shadow-md')
                : mostrarFeedback && questao.correta === 1 && respostaUsuario !== questao.correta
                  ? 'bg-green-200 text-gray-800 opacity-70'
                  : 'bg-white hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="certoErrado"
            checked={cliquesPorAlternativa[1] === 1}
            onChange={() => handleAlternativaClick(1)}
            disabled={mostrarFeedback}
            className={`mt-1 h-4 w-4 ${(cliquesPorAlternativa[1] === 1 && !mostrarFeedback) ? 'text-blue-600' : 'text-gray-600'} focus:ring-blue-500`}
          />
          <span className={`${(mostrarFeedback && (questao.correta === 1 || respostaUsuario === 1)) ? 'text-white' : 'text-gray-800'}`}>Certo</span>
        </label>

        <label
          className={`flex items-center space-x-2 py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer ${
            cliquesPorAlternativa[0] === 1 && !mostrarFeedback
              ? 'bg-blue-100 border border-blue-300'
              : mostrarFeedback && respostaUsuario === 0
                ? (respostaUsuario === questao.correta ? 'bg-green-600 text-white shadow-md' : 'bg-red-600 text-white shadow-md')
                : mostrarFeedback && questao.correta === 0 && respostaUsuario !== questao.correta
                  ? 'bg-green-200 text-gray-800 opacity-70'
                  : 'bg-white hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="certoErrado"
            checked={cliquesPorAlternativa[0] === 1}
            onChange={() => handleAlternativaClick(0)}
            disabled={mostrarFeedback}
            className={`mt-1 h-4 w-4 ${(cliquesPorAlternativa[0] === 1 && !mostrarFeedback) ? 'text-blue-600' : 'text-gray-600'} focus:ring-blue-500`}
          />
          <span className={`${(mostrarFeedback && (questao.correta === 0 || respostaUsuario === 0)) ? 'text-white' : 'text-gray-800'}`}>Errado</span>
        </label>
      </div>
    )}

    {!mostrarFeedback && (
      <button
        onClick={handleConfirmar}
        disabled={respostaUsuario === null}
        className={`w-full py-3 rounded-lg font-semibold text-lg transition-all duration-300 ${
          respostaUsuario === null ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
        }`}
      >
        Confirmar Resposta
      </button>
    )}

    {mostrarFeedback && (
      <div className="mt-4 p-4 rounded-lg bg-gray-50">
        <div className="flex items-center">
          {respostaUsuario === questao.correta ? (
            <p className="text-green-600 font-semibold flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" /> Você acertou!
            </p>
          ) : (
            <p className="text-red-600 font-semibold flex items-center">
              <XCircle className="w-5 h-5 mr-2" /> Você errou.
            </p>
          )}
        </div>
        {questao.gabarito && (
          <p className="mt-2 text-sm text-gray-700">
            Gabarito: <strong>{questao.gabarito}</strong>
          </p>
        )}
      </div>
    )}

    <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <button
        onClick={retroceder}
        disabled={indiceAtual === 0}
        className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
          indiceAtual === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-x-1'
        }`}
      >
        <ChevronLeft className="w-5 h-5 mr-1" /> Anterior
      </button>

      <button
        onClick={avancar}
        disabled={indiceAtual >= questoes.length - 1}
        className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
          indiceAtual >= questoes.length - 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:translate-x-1'
        }`}
      >
        Próxima <ChevronRight className="w-5 h-5 ml-1" />
      </button>

      <button
        onClick={retrocederAssunto}
        disabled={getAssunto().indexOf(questao?.assunto) === 0}
        className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
          getAssunto().indexOf(questao?.assunto) === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-x-1'
        }`}
      >
        <ChevronsLeft className="w-5 h-5 mr-1" /> Assunto Anterior
      </button>

      <button
        onClick={avancarAssunto}
        disabled={getAssunto().indexOf(questao?.assunto) === getAssunto().length - 1}
        className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
          getAssunto().indexOf(questao?.assunto) === getAssunto().length - 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:translate-x-1'
        }`}
      >
        Próximo Assunto <ChevronsRight className="w-5 h-5 ml-1" />
      </button>
    </div>
  </div>
);

    const renderComentarioProfessor = () => (
        <div className="relative bg-white border-l-4 border-black-500 p-6 rounded-lg min-h-[400px]">
            <h2 className="text-lg font-bold text-black-700 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" /> Comentário do Professor
            </h2>
            {questao?.comentarioProfessor && questao.comentarioProfessor.trim().length > 0 ? (
                <div
                    className="prose prose-sm max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: removePTags(questao.comentarioProfessor) }}
                />
            ) : (
                <p className="text-gray-600">Nenhum comentário do professor disponível para esta questão.</p>
            )}
        </div>
    );

    const renderEstatistica = () => (
        <>
            {stats && (
                <div className="p-4 bg-white rounded-xl shadow space-y-2 mt-4">
                    <div className="flex flex-col items-center text-center">
                        <h4 className="font-semibold text-gray-800">Estatísticas da Questão</h4>
                        <PieChart width={220} height={200}>
                            <Pie
                                data={[
                                    { name: "Acertos", value: stats.correct_attempts },
                                    { name: "Erros", value: stats.total_attempts - stats.correct_attempts }
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
                    </div>
                    <div className="text-sm space-y-1">
                        <p className="text-green-600 font-medium">Acertos: {stats.correct_attempts}</p>
                        <p className="text-red-600 font-medium">Erros: {stats.total_attempts - stats.correct_attempts}</p>
                        <p className="text-blue-600 font-medium">
                            Taxa de Acerto: {stats.total_attempts > 0
                                ? ((stats.correct_attempts / stats.total_attempts) * 100).toFixed(1)
                                : "0.0"
                            }%
                        </p>
                        <p className="text-black-500">Total de respostas: {stats.total_attempts}</p>
                    </div>
                </div>
            )}
            {splitStats && (
                <div className="space-y-8 mt-6">
                    <div>
                        <h3 className="text-base font-bold text-gray-800 mb-2">Todos os Usuários</h3>
                        <BarChartComponent correct={splitStats.total.acertos} total={splitStats.total.tentativas} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-blue-700 mb-2">Seu Desempenho</h3>
                        <BarChartComponent correct={splitStats.usuario.acertos} total={splitStats.usuario.tentativas} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-green-700 mb-2">Outros Usuários</h3>
                        <BarChartComponent correct={splitStats.outros.acertos} total={splitStats.outros.tentativas} />
                    </div>
                </div>
            )}
        </>
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
            {commentStatusMessage && (
                <MessageModal
                    message={commentStatusMessage}
                    type={commentStatusType}
                    onClose={() => setCommentStatusMessage('')}
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
                            disabled={!(editingComment ? editingCommentContent.trim() : newCommentContent.trim())}
                        >
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
                    <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                        {filteredAndSortedComments.length > 0 ? (
                            filteredAndSortedComments.map((comment) => (
                                <div key={comment.id} className="bg-white p-4 rounded-lg shadow-md flex">
                                    <div className="flex flex-col items-center justify-center text-gray-500 mr-4 w-10">
                                        {comment.points > 0 && (
                                            <span className="text-xs font-semibold text-green-600 mb-1">
                                                +{comment.points}
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
                                            dangerouslySetInnerHTML={{ __html: comment.content }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-center py-10">Nenhum comentário ainda. Seja o primeiro a postar!</p>
                        )}
                    </div>
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


    useEffect(() => {
        if (questao) {
            console.log('Current Question Data:', questao);
            console.log('Professor Comment (Raw HTML):', questao.comentarioProfessor);
            if (typeof questao.comentarioProfessor === 'string' && questao.comentarioProfessor.trim().length > 0) {
                console.log('Status do Comentário do Professor: DETECTADO e NÃO VAZIO.');
            } else {
                console.log('Status do Comentário do Professor: AUSENTE ou VAZIO.');
            }
        }
    }, [questao]);

    // Função para favoritar/desfavoritar uma questão
    const handleFavoriteToggle = async () => {
        if (!questao?.id || !id) return; // 'id' aqui é o notebook_id

        const isCurrentlyFavorited = questao.isFavorited;
        let url;
        let method;
        let body;

        if (isCurrentlyFavorited) {
            // Se já está favoritado, queremos REMOVER
            url = `${API_URL}/api/favorites/${questao.id}/${id}`; // notebook_id é 'id'
            method = 'DELETE';
            body = undefined; // DELETE não envia corpo
        } else {
            // Se NÃO está favoritado, queremos ADICIONAR
            url = `${API_URL}/api/favorites/`; // Endpoint POST sem IDs na URL
            method = 'POST';
            body = JSON.stringify({ question_id: questao.id, notebook_id: parseInt(id) });
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: body,
            });

            if (response.status === 401 || response.status === 403) {
                handleUnauthorized();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Falha ao ${isCurrentlyFavorited ? 'desfavoritar' : 'favoritar'} a questão.`);
            }

            // Atualiza o estado da questão no frontend
            setQuestoes(prevQuestoes =>
                prevQuestoes.map((q, idx) =>
                    idx === indiceAtual ? { ...q, isFavorited: !isCurrentlyFavorited } : q
                )
            );
            setMensagem(`Questão ${isCurrentlyFavorited ? 'removida dos' : 'adicionada aos'} favoritos!`);
            setTipoMensagem('success');

        } catch (error) {
            console.error('Erro ao favoritar/desfavoritar questão:', error);
            setMensagem(`Erro ao ${isCurrentlyFavorited ? 'desfavoritar' : 'favoritar'} questão: ${error.message}`);
            setTipoMensagem('error');
        } finally {
            setTimeout(() => setMensagem(''), 3000);
        }
    };


    if (isCarregando) return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white font-inter flex items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            <p className="ml-4 text-xl text-gray-700">Carregando questões...</p>
        </div>
    );
    if (mensagem && tipoMensagem === 'error') return <div className="p-6 text-center text-red-600">{mensagem}</div>;
    if (!questoes.length || !questao) return <div className="p-6 text-center text-gray-500">Nenhuma questão encontrada para este caderno.</div>;

    const alternativas = [questao.item_a, questao.item_b, questao.item_c, questao.item_d, questao.item_e].filter(Boolean);
    const letras = ['A', 'B', 'C', 'D', 'E'];

    return (
    <>
        <TopNav onLogout={onLogout} />
        <main className="w-full px-0 py-0 bg-gray-50 min-h-screen">
            {/* Cabeçalho */}
            <div className="w-full bg-white shadow-sm py-4">
                <div className="w-full px-6">
                    <h1 className="text-2xl font-extrabold text-gray-900 text-center">
                        Caderno: <span className="text-blue-600">{nomeCaderno}</span>
                    </h1>
                    <div className="mt-2 text-sm font-bold text-center">
                        <span className="text-black">Questão {indiceAtual + 1} de {questoes.length}</span>
                        <span className="mx-2">|</span>
                        <span className="text-blue-600">Resolvidas: {resolvidas}</span>
                        <span className="mx-2">|</span>
                        <span className="text-green-600">Acertos: {acertos}</span>
                        <span className="mx-2">|</span>
                        <span className="text-red-600">Erros: {erros}</span>
                    </div>
                    {questao && (
                        <div className="mt-2 text-sm text-gray-700 text-center">
                            <p>
                                <span className="font-semibold">ID:</span> {questao.id}
                                <span className="mx-2">|</span>
                                <span className="font-semibold">Matéria:</span> {questao.materia}
                                <span className="mx-2">|</span>
                                <span className="font-semibold">Assunto:</span> {questao.assunto}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {mensagem && (
                <MessageModal
                    message={mensagem}
                    type={tipoMensagem}
                    onClose={() => setMensagem('')}
                />
            )}

            {/* Corpo Principal */}
            <div className="flex w-full">
                {/* Sidebar - Mantido igual mas removido rounded-l-xl */}
                <aside className="w-72 bg-blue-800 p-6 flex flex-col space-y-4 shadow-xl">
                    {[
                        { id: 'questionContent', icon: BookOpen, label: 'Questão' },
                        { id: 'comentarioProfessor', icon: BookOpen, label: 'Comentários do Professor' },
                        { id: 'comentarioAluno', icon: MessageSquare, label: 'Comentários dos Alunos' },
                        { id: 'teoria', icon: FileText, label: 'Teoria da Questão' },
                        { id: 'estatistica', icon: BarChart, label: 'Estatística da Questão' },
                        { id: 'anotacoes', icon: ClipboardList, label: 'Anotações' } 
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setAbaAtiva(tab.id);
                                if (tab.id !== 'comentarioAluno') {
                                    setShowCommentEditor(false);
                                    setEditingComment(null);
                                    setNewCommentContent('');
                                    setEditingCommentContent('');
                                }
                            }}
                            className={`w-full flex items-center px-6 py-4 rounded-xl text-base font-semibold transition-all duration-300 transform
                                ${abaAtiva === tab.id
                                    ? 'bg-white text-blue-800 shadow-lg ring-2 ring-blue-400'
                                    : 'text-blue-200 hover:bg-blue-700 hover:text-white hover:shadow-md hover:translate-x-1'
                                }`}
                        >
                            <tab.icon className={`w-6 h-6 mr-4 ${abaAtiva === tab.id ? 'text-blue-600' : 'text-blue-300'}`} />
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* Conteúdo Principal - Removido rounded-xl e ajustado padding */}
                <div className="flex-1 bg-white p-6 shadow-lg min-h-[calc(100vh-150px)]">
                    {renderActiveTabContent()}
                </div>
            </div>
        </main>

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
    </>
);
}







    





